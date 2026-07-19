'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export interface AuthUser extends User {
  tenant_id?: string | null;
  full_name?: string;
  role?: 'superadmin' | 'admin' | 'operator' | 'viewer';
  tenant_slug?: string;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signingOut: boolean;
  error: string | null;
  signInSuperadmin: (email: string, password: string) => Promise<void>;
  signInTenant: (email: string, password: string, tenantSlug: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper: fetch user profile dari tenant_users
async function fetchUserProfile(authUserId: string) {
  const { data, error } = await supabase
    .from('tenant_users')
    .select('role, tenant_id, full_name, must_change_password, tenants(subdomain)')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) throw new Error('Profil pengguna tidak ditemukan');
  return data as any;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cek session aktif saat pertama load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // getSession() (baca lokal, tanpa network round-trip) cukup di
        // sini — ini bukan security boundary. middleware.ts sudah jadi
        // gate sebenarnya lewat getUser() (revalidasi ke server Supabase)
        // sebelum halaman manapun yang protected diizinkan render. Cek di
        // client ini murni buat isi state UI (nama/role/tenant di layout),
        // jadi getSession() aman dipakai dan jauh lebih cepat.
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;

        if (authUser) {
          const profile = await fetchUserProfile(authUser.id);
          setUser({
            ...authUser,
            tenant_id: profile.tenant_id,
            full_name: profile.full_name,
            role: profile.role,
            tenant_slug: profile.tenants?.subdomain,
            must_change_password: profile.must_change_password ?? false,
          } as AuthUser);
        }
      } catch (err) {
        console.error('[auth] Session check error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen perubahan auth state (logout, token refresh, dll)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            setUser({
              ...session.user,
              tenant_id: profile.tenant_id,
              full_name: profile.full_name,
              role: profile.role,
              tenant_slug: profile.tenants?.subdomain,
            } as AuthUser);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // =========================================================================
  // SIGN IN SUPERADMIN — khusus untuk /auth/login
  // Tolak kalau bukan superadmin
  // =========================================================================
  const signInSuperadmin = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error('Email atau password salah');
      if (!data.user) throw new Error('Login gagal');

      const profile = await fetchUserProfile(data.user.id);

      // Guard: tolak kalau bukan superadmin
      if (profile.role !== 'superadmin') {
        await supabase.auth.signOut();
        throw new Error('Akses ditolak. Halaman ini hanya untuk Superadmin.');
      }

      setUser({
        ...data.user,
        tenant_id: null,
        full_name: profile.full_name,
        role: 'superadmin',
        tenant_slug: undefined,
        must_change_password: profile.must_change_password ?? false,
      } as AuthUser);

      window.location.href = '/dashboard';

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      setError(message);
      throw new Error(message);
    }
  };

  // =========================================================================
  // SIGN IN TENANT — khusus untuk /[tenant]/login
  // Tolak kalau superadmin, atau tenant tidak cocok
  // =========================================================================
  const signInTenant = async (
    email: string,
    password: string,
    tenantSlug: string
  ) => {
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error('Email atau password salah');
      if (!data.user) throw new Error('Login gagal');

      const profile = await fetchUserProfile(data.user.id);

      // Guard 1: tolak superadmin
      if (profile.role === 'superadmin') {
        await supabase.auth.signOut();
        throw new Error('Superadmin tidak dapat login melalui portal instansi. Gunakan halaman login Superadmin.');
      }

      // Guard 2: tolak kalau tenant tidak cocok
      const userTenantSlug = profile.tenants?.subdomain;
      if (userTenantSlug !== tenantSlug) {
        await supabase.auth.signOut();
        throw new Error('Anda bukan petugas instansi ini.');
      }

      // Guard 3: tolak kalau role tidak dikenal
      if (!['admin', 'operator'].includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error('Role tidak valid.');
      }

      setUser({
        ...data.user,
        tenant_id: profile.tenant_id,
        full_name: profile.full_name,
        role: profile.role,
        tenant_slug: userTenantSlug,
        must_change_password: profile.must_change_password ?? false,
      } as AuthUser);

      // Redirect sesuai role
      if (profile.role === 'admin') {
        window.location.href = `/${tenantSlug}/admin`;
      } else if (profile.role === 'operator') {
        window.location.href = `/${tenantSlug}/operator`;
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      setError(message);
      throw new Error(message);
    }
  };

  // =========================================================================
  // SIGN OUT
  // =========================================================================
  const signOut = async () => {
    setError(null);
    setSigningOut(true);
    try {
      // Simpan info redirect sebelum clear state
      const redirectUrl = user?.tenant_slug
        ? `/${user.tenant_slug}/login`
        : '/auth/login';

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
      // Small delay so the "Logging out" overlay is visible
      await new Promise((r) => setTimeout(r, 500));
      window.location.href = redirectUrl;
    } catch (err) {
      setSigningOut(false);
      const message = err instanceof Error ? err.message : 'Logout gagal';
      setError(message);
      throw err;
    }
  };

  // Dipanggil setelah user berhasil ganti password sendiri (lihat
  // components/force-password-change.tsx), supaya gate-nya langsung hilang
  // tanpa perlu reload/login ulang.
  const clearMustChangePassword = () => {
    setUser((prev) => (prev ? { ...prev, must_change_password: false } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signingOut,
        error,
        signInSuperadmin,
        signInTenant,
        signOut,
        isAuthenticated: !!user,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}