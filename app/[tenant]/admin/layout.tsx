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
      if (user.role !== 'admin') { router.push(`/${tenantSlug}/login`); }
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