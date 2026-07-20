'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { publicQueries } from '@/lib/api/queries';
import { LogOut, Loader2, Activity } from 'lucide-react';
import { AnnouncementBell } from '@/components/announcement-bell';
import { ForcePasswordChange } from '@/components/force-password-change';

interface TenantInfo {
  id: string;
  name: string;
  brand_color: string;
}

export default function OperatorLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { user, loading, signingOut, signOut } = useAuth();
  const tenantSlug = params.tenant as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !signingOut) {
      if (!user) { router.push(`/${tenantSlug}/login`); return; }
      if (user.role === 'admin') { router.push(`/${tenantSlug}/admin`); return; }
      if (user.role !== 'operator') { router.push(`/${tenantSlug}/login`); }
    }
  }, [user, loading, signingOut, tenantSlug, router]);

  useEffect(() => {
    publicQueries.getTenant(tenantSlug)
      .then((data) => setTenant(data))
      .catch(() => {});
  }, [tenantSlug]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch {
      setIsLoggingOut(false);
    }
  };

  // ── Signing Out ──
  if (signingOut || isLoggingOut) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
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
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
            <Loader2 className="w-12 h-12 animate-spin text-slate-400 absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">Memuat panel operator...</p>
            <p className="text-xs text-slate-400 mt-0.5">Memverifikasi sesi</p>
          </div>
        </div>
      </div>
    );
  }

  const color = tenant?.brand_color || '#1e3a5f';

  // ── Wajib Ganti Password ──
  if (user.must_change_password) {
    return <ForcePasswordChange brandColor={color} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Topbar operator — simpel, fokus ke fungsi */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Kiri: nama instansi */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: color }}>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-slate-800">{tenant?.name || tenantSlug}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Operator</p>
            </div>
          </div>

          {/* Kanan: info user + logout */}
          <div className="flex items-center gap-3">
            {tenant?.id && <AnnouncementBell tenantId={tenant.id} brandColor={color} />}
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-medium text-slate-700">{user.full_name || 'Operator'}</p>
              <p className="text-[10px] text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Accent line */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}