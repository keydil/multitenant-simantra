'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, ApiError, setAccessToken, refreshSession } from '@/lib/api/client';

export interface AuthTenant {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  logo_url: string | null;
  brand_color: string;
  is_active: boolean;
  subscription_tier: 'free' | 'standard' | 'premium';
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  tenant_id: string | null;
  email: string;
  full_name: string | null;
  role: 'superadmin' | 'admin' | 'operator' | 'viewer';
  is_active: boolean;
  must_change_password: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  tenant: AuthTenant | null;
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
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bootstrap sesi dari cookie httpOnly `simantra_refresh` — access token
  // cuma hidup di memory (module-level di lib/api/client.ts), jadi ilang
  // tiap reload dan harus ditarik ulang lewat cookie ini.
  useEffect(() => {
    let cancelled = false;

    refreshSession<AuthUser>()
      .then((result) => {
        if (cancelled) return;
        setUser(result?.user ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================================
  // SIGN IN SUPERADMIN — khusus untuk /auth/login
  // Backend tidak menolak role lain login tanpa tenant_slug, jadi guard
  // "hanya superadmin" ditegakkan di sini (UX portal, bukan security
  // boundary — enforcement asli tetap di guard backend per endpoint).
  // =========================================================================
  const signInSuperadmin = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await api.post<{ access_token: string; user: AuthUser }>(
        '/auth/login',
        { email, password },
        { auth: false }
      );

      if (result.user.role !== 'superadmin') {
        setAccessToken(result.access_token);
        await api.post('/auth/logout', undefined, { auth: false }).catch(() => {});
        setAccessToken(null);
        throw new Error('Akses ditolak. Halaman ini hanya untuk Superadmin.');
      }

      setAccessToken(result.access_token);
      setUser(result.user);
      window.location.href = '/dashboard';
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Login gagal';
      setError(message);
      throw new Error(message);
    }
  };

  // =========================================================================
  // SIGN IN TENANT — khusus untuk /[tenant]/login
  // tenant_slug dikirim ke backend supaya akun tenant lain ditolak di sana
  // (superadmin bebas — lihat FRONTEND_MIGRATION.md §2).
  // =========================================================================
  const signInTenant = async (email: string, password: string, tenantSlug: string) => {
    setError(null);
    try {
      const result = await api.post<{ access_token: string; user: AuthUser }>(
        '/auth/login',
        { email, password, tenant_slug: tenantSlug },
        { auth: false }
      );

      const destination =
        result.user.role === 'admin'
          ? `/${tenantSlug}/admin`
          : result.user.role === 'operator'
            ? `/${tenantSlug}/operator`
            : result.user.role === 'superadmin'
              ? '/dashboard'
              : null;

      // E5: dulu rantai if/else ini tidak punya cabang penutup. Role yang tidak
      // dikenal — terutama `viewer`, yang ditawarkan di form "Tambah Pengguna"
      // tapi tidak pernah diimplementasikan (0 @Roles('viewer') di backend) —
      // membuat login BERHASIL (token terbit, sesi aktif) lalu halaman diam
      // membeku di layar login tanpa pesan apa pun. Sekarang sesinya ditutup
      // lagi dan user diberi tahu alasannya.
      if (!destination) {
        setAccessToken(result.access_token);
        await api.post('/auth/logout', undefined, { auth: false }).catch(() => {});
        setAccessToken(null);
        throw new Error(
          `Akun Anda punya role "${result.user.role}" yang belum memiliki halaman kerja di aplikasi ini. Hubungi superadmin untuk mengubah role akun Anda.`
        );
      }

      setAccessToken(result.access_token);
      setUser(result.user);
      window.location.href = destination;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Login gagal';
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
      const redirectUrl = user?.tenant?.subdomain ? `/${user.tenant.subdomain}/login` : '/auth/login';

      await api.post('/auth/logout', undefined, { auth: false });
      setAccessToken(null);
      setUser(null);
      // Small delay so the "Logging out" overlay is visible
      await new Promise((r) => setTimeout(r, 500));
      window.location.href = redirectUrl;
    } catch (err) {
      setSigningOut(false);
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Logout gagal';
      setError(message);
      throw err;
    }
  };

  // Dipanggil dari components/force-password-change.tsx. Backend memvalidasi
  // old_password (password sementara) lalu balas pasangan token baru +
  // user dengan must_change_password=false — gate-nya langsung hilang tanpa
  // reload/login ulang.
  const changePassword = async (oldPassword: string, newPassword: string) => {
    const result = await api.post<{ access_token: string; user: AuthUser }>('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    setAccessToken(result.access_token);
    setUser(result.user);
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
        changePassword,
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
