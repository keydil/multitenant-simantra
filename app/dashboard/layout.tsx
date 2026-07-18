'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { useAuth } from '@/lib/auth/auth-context';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { loading, isAuthenticated, signingOut } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && !signingOut) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, signingOut, router]);

  // ── Signing Out ──
  if (signingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">Sedang keluar...</p>
            <p className="text-xs text-slate-400 mt-0.5">Menghapus sesi Anda</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading Auth ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
            <Loader2 className="w-12 h-12 animate-spin text-slate-400 absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">Memuat dashboard...</p>
            <p className="text-xs text-slate-400 mt-0.5">Memverifikasi sesi superadmin</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

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
