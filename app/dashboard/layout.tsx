'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { useAuth } from '@/lib/auth/auth-context';
import { ForcePasswordChange } from '@/components/force-password-change';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, isAuthenticated, signingOut } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && !signingOut) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, signingOut, router]);

  // ── Signing Out ──
  if (signingOut) {
    return <FullScreenLoader title="Sedang keluar..." subtitle="Menghapus sesi Anda" spinnerColor="text-blue-500" />;
  }

  // ── Loading Auth ──
  if (loading) {
    return <FullScreenLoader title="Memuat dashboard..." subtitle="Memverifikasi sesi superadmin" />;
  }

  if (!isAuthenticated) return null;

  // ── Wajib Ganti Password ──
  if (user?.must_change_password) {
    return <ForcePasswordChange brandColor="#1e3a5f" />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
