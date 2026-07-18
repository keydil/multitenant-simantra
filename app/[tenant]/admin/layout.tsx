'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, Users, ListOrdered,
  BookOpen, Settings, LogOut, Menu, X, ChevronRight, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantInfo {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
}

const getNav = (slug: string) => [
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
      { name: 'Kelola Operator', href: `/${slug}/admin/operators`, icon: Users },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !signingOut) {
      if (!user) { router.push(`/${tenantSlug}/login`); return; }
      if (user.role === 'operator') { router.push(`/${tenantSlug}/operator`); return; }
      if (user.role !== 'admin') { router.push(`/${tenantSlug}/login`); }
    }
  }, [user, loading, signingOut, tenantSlug, router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('tenants').select('id,name,logo_url,brand_color')
      .eq('subdomain', tenantSlug).single()
      .then(({ data }) => { if (data) setTenant(data); });
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
  const nav = getNav(tenantSlug);
  const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: color }}>
          {tenant?.name?.slice(0, 2).toUpperCase() || 'IN'}
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-slate-800 truncate">{tenant?.name || tenantSlug}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {nav.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-[9.5px] font-semibold tracking-widest text-slate-400 uppercase">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12.5px] font-medium transition-all cursor-pointer',
                      active ? 'text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    )} style={active ? { background: color } : {}}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — user info + logout */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
            style={{ background: color }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-slate-700 truncate">{user.full_name || 'Admin'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-56 flex-shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0">
        <Sidebar />
      </aside>

      {/* Mobile topbar */}
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: color }}>
            {tenant?.name?.slice(0, 2).toUpperCase() || 'IN'}
          </div>
          <span className="text-[13px] font-semibold text-slate-800">{tenant?.name || tenantSlug}</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-slate-200 lg:hidden transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="lg:hidden h-14" />
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}