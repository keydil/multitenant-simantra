'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { publicQueries } from '@/lib/api/queries';
import {
  LayoutDashboard, Users, ListOrdered, ListChecks,
  BookOpen, Settings, Loader2, BarChart3,
} from 'lucide-react';
import { AppSidebar, type SidebarNavGroup } from '@/components/app-sidebar';
import { AnnouncementBell } from '@/components/announcement-bell';
import { ForcePasswordChange } from '@/components/force-password-change';
import { toast } from 'sonner';

interface TenantInfo {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
}

const getNav = (slug: string): SidebarNavGroup[] => [
  {
    group: 'Utama',
    items: [
      { name: 'Dashboard', href: `/${slug}/admin`, icon: LayoutDashboard },
      { name: 'Buku Tamu', href: `/${slug}/admin/guest-book`, icon: BookOpen },
    ],
  },
  {
    group: 'Manajemen',
    items: [
      { name: 'Kelola Loket', href: `/${slug}/admin/counters`, icon: ListOrdered },
      { name: 'Kelola Keperluan', href: `/${slug}/admin/visit-purposes`, icon: ListChecks },
      { name: 'Kelola Operator', href: `/${slug}/admin/operators`, icon: Users },
      { name: 'Analitik', href: `/${slug}/admin/analytics`, icon: BarChart3 },
    ],
  },
  {
    group: 'Sistem',
    items: [
      { name: 'Pengaturan', href: `/${slug}/admin/settings`, icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signingOut, signOut } = useAuth();
  const tenantSlug = params.tenant as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !signingOut) {
      if (!user) { router.push(`/${tenantSlug}/login`); return; }
      if (user.role === 'operator') { router.push(`/${tenantSlug}/operator`); return; }
      if (user.role !== 'admin') { router.push(`/${tenantSlug}/login`); return; }
      // Guard batas tenant: JWT admin terikat ke SATU tenant (user.tenant),
      // tapi slug di URL bisa ketik/klik bebas ke tenant manapun (bahkan yang
      // tidak eksis) — dulu tidak pernah dicek di sini, cuma role yang
      // divalidasi. Data tetap aman (TenantScopeGuard di backend menahan
      // semua baca/tulis lintas-tenant, sudah diverifikasi empiris), tapi
      // UI bisa nampilin sidebar/branding tenant lain yang membingungkan.
      // Redirect ke tenant yang benar + wrong_tenant=1, dibaca effect di
      // bawah utk kasih toast (bukan diam-diam) setelah mendarat.
      if (user.tenant?.subdomain !== tenantSlug) {
        // user.tenant harusnya selalu ada utk role admin (FK tenant_id wajib) —
        // fallback ke login kalau ternyata tidak, biar tak redirect ke "/undefined/admin".
        router.push(user.tenant?.subdomain ? `/${user.tenant.subdomain}/admin?wrong_tenant=1` : `/${tenantSlug}/login`);
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

  // ── FULL SCREEN: Signing Out ──
  if (signingOut || isLoggingOut) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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

  // ── FULL SCREEN: Loading Auth ──
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
            <Loader2 className="w-12 h-12 animate-spin text-slate-400 absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">Memuat panel admin...</p>
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

  const nav = getNav(tenantSlug);
  const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar
        identityBg={color}
        logoContent={tenant?.name?.slice(0, 2).toUpperCase() || 'IN'}
        title={tenant?.name || tenantSlug}
        subtitle="Admin"
        nav={nav}
        activePathname={pathname}
        activeStyle="brand"
        userInitials={initials}
        userName={user.full_name || 'Admin'}
        userEmail={user.email}
        onLogout={handleLogout}
      />

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {tenant?.id && (
            <div className="flex justify-end mb-4">
              <AnnouncementBell tenantId={tenant.id} brandColor={color} />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}