'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export interface AuthUser extends User {
  tenant_id?: string | null;
  full_name?: string;
  role?: 'superadmin' | 'admin' | 'operator';
  tenant_slug?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, fullName: string, tenantId: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Fetch tenant user data
          const { data: tenantUser } = await (supabase
            .from('tenant_users')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .single() as any);

          setUser({
            ...session.user,
            tenant_id: (tenantUser as any)?.tenant_id,
            full_name: (tenantUser as any)?.full_name,
            role: (tenantUser as any)?.role,
          } as AuthUser);
        }
      } catch (err) {
        console.error('[v0] Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        const { data: tenantUser } = await (supabase
          .from('tenant_users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single() as any);

        setUser({
          ...session.user,
          tenant_id: (tenantUser as any)?.tenant_id,
          full_name: (tenantUser as any)?.full_name,
          role: (tenantUser as any)?.role,
        } as AuthUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    tenantId: string
  ) => {
    setError(null);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create tenant user record
      const { error: dbError } = await (supabase.from('tenant_users').insert([
        {
          tenant_id: tenantId,
          auth_user_id: authData.user.id,
          email,
          full_name: fullName,
          role: 'operator', // Default role for new users
        },
      ] as any) as any);

      if (dbError) throw dbError;

      setUser({
        ...authData.user,
        tenant_id: tenantId,
        full_name: fullName,
        role: 'operator',
      } as AuthUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch tenant user data and redirect based on role
      if (data.user) {
        const { data: tenantUser } = await (supabase
          .from('tenant_users')
          .select('role, tenant_id, tenants(subdomain)')
          .eq('auth_user_id', data.user.id)
          .single() as any);

        if (tenantUser) {
          const role = (tenantUser as any).role;
          const tenantSlug = ((tenantUser as any).tenants as any)?.subdomain;

          // Redirect based on role
          if (typeof window !== 'undefined') {
            if (role === 'superadmin') {
              window.location.href = '/dashboard';
            } else if (role === 'admin' && tenantSlug) {
              window.location.href = `/${tenantSlug}/admin`;
            } else if (role === 'operator' && tenantSlug) {
              window.location.href = `/${tenantSlug}/operator`;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        isAuthenticated: !!user,
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
