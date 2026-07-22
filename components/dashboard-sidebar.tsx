'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Settings,
  Monitor,
  BarChart3,
  Users,
  Megaphone,
  Palette,
  Menu,
  X,
  LogOut,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHealth, HEALTH_LABEL, HEALTH_DOT } from '@/hooks/use-health';
import { useAuth } from '@/lib/auth/auth-context';

const navigation = [
  {
    group: 'Utama',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Monitor Antrian', href: '/dashboard/queue-monitor', icon: Monitor },
    ],
  },
  {
    group: 'Manajemen',
    items: [
      { name: 'Kelola Antrian', href: '/dashboard/queue-management', icon: Building2 },
      { name: 'Analitik', href: '/dashboard/analytics', icon: BarChart3 },
      { name: 'Pengguna', href: '/dashboard/users', icon: Users },
      { name: 'Pengumuman', href: '/dashboard/announcements', icon: Megaphone },
    ],
  },
  {
    group: 'Sistem',
    items: [
      { name: 'Instansi', href: '/dashboard/tenants', icon: Palette },
      { name: 'Pengaturan', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const health = useHealth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SA';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200">
        <div className="w-8 h-8 bg-navy-700 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}>
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800 tracking-tight">SIMANTRA</p>
          <p className="text-[10px] text-slate-400 tracking-widest uppercase">Superadmin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navigation.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0 transition-colors',
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        )}
                      />
                      <span className="flex-1">{item.name}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="px-3 py-3 border-t border-slate-200 space-y-1">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              HEALTH_DOT[health],
              health === 'checking' && 'animate-pulse',
            )}
          />
          <span className="text-[11px] text-slate-400">{HEALTH_LABEL[health]}</span>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 rounded-md">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-slate-700 truncate">
              {user?.full_name || 'Superadmin'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile topbar */}
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}>
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-bold text-slate-800">SIMANTRA</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col w-56 flex-shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-slate-200 lg:hidden transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile spacer */}
      <div className="lg:hidden h-14" />
    </>
  );
}
