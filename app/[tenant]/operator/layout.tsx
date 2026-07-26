'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { publicQueries } from '@/lib/api/queries';
import { LogOut, Activity } from 'lucide-react';
import { AnnouncementBell } from '@/components/announcement-bell';
import { ForcePasswordChange } from '@/components/force-password-change';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { toast } from 'sonner';

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
      if (user.role !== 'operator') { router.push(`/${tenantSlug}/login`); return; }
      // Guard batas tenant — sama seperti admin/layout.tsx. Data tetap aman
      // (TenantScopeGuard backend menahan semua baca/tulis lintas-tenant,
      // sudah diverifikasi empiris), tapi UI bisa nampilin sidebar/branding
      // tenant lain yang membingungkan kalau slug URL tidak dicek.
      if (user.tenant?.subdomain !== tenantSlug) {
        // user.tenant harusnya selalu ada utk role operator (FK tenant_id wajib) —
        // fallback ke login kalau ternyata tidak, biar tak redirect ke "/undefined/operator".
        router.push(user.tenant?.subdomain ? `/${user.tenant.subdomain}/operator?wrong_tenant=1` : `/${tenantSlug}/login`);
      }
    }
  }, [user, loading, signingOut, tenantSlug, router]);

  // Sinyal setelah dikoreksi otomatis ke tenant yang benar (lihat guard di
  // atas). Dibaca dari window (bukan useSearchParams) — pola yang sama
  // dengan `sessionExpired` di halaman login, supaya layout ini tidak butuh
  // Suspense boundary saat prerender.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('wrong_tenant') === '1') {
      toast.info('Anda diarahkan ke instansi Anda sendiri — URL sebelumnya bukan milik Anda.');
      url.searchParams.delete('wrong_tenant');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

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
    return <FullScreenLoader title="Sedang keluar..." subtitle="Menghapus sesi Anda" spinnerColor="text-blue-500" />;
  }

  // ── Loading Auth ──
  if (loading || !user) {
    return <FullScreenLoader title="Memuat panel operator..." subtitle="Memverifikasi sesi" />;
  }

  // Gerbang render — efek redirect di atas baru jalan SETELAH render pertama,
  // jadi tanpa ini panel operator sempat berkedip terlihat oleh admin atau oleh
  // operator instansi lain. Menutup dua hal yang dijaga efek itu sekaligus:
  // role dan batas tenant. Pola sama dengan app/dashboard/layout.tsx.
  if (user.role !== 'operator' || user.tenant?.subdomain !== tenantSlug) return null;

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