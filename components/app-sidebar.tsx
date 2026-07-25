'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHealth, HEALTH_LABEL, HEALTH_DOT } from '@/hooks/use-health';

export interface SidebarNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface SidebarNavGroup {
  group: string;
  items: SidebarNavItem[];
}

interface AppSidebarProps {
  /** Warna identitas logo/avatar — gradient CSS (superadmin, platform
   *  navy→biru, TETAP) atau warna solid (admin, tenant.brand_color). Sumber
   *  beda ini SENGAJA (audit UI template §D) — jangan dipaksa seragam. */
  identityBg: string;
  /** Isi kotak logo: ikon (superadmin) atau inisial tenant (admin). */
  logoContent: ReactNode;
  title: string;
  subtitle: string;
  nav: SidebarNavGroup[];
  activePathname: string;
  /**
   * 'pill'  = superadmin: bg-blue-50 text-blue-700 + titik indikator biru.
   * 'brand' = admin: fill solid `identityBg` + teks putih + ChevronRight.
   * Beda ini SENGAJA (identitas platform vs brand tenant), bukan bug —
   * lihat audit UI template.
   */
  activeStyle: 'pill' | 'brand';
  /** Health pill cuma tampil di superadmin (bukan oversight, footprint asli). */
  showHealth?: boolean;
  userInitials: string;
  userName: string;
  userEmail?: string;
  onLogout: () => void;
}

/**
 * Sidebar bersama superadmin (`/dashboard`) & admin (`/[tenant]/admin`) —
 * step #2 audit UI template. Dulu dua implementasi ~130 baris nyaris
 * identik strukturnya tapi beda tinggi header (h-16/h-14), border-radius
 * (rounded-md/rounded-lg), dan ukuran font arbitrer (text-[13px] vs
 * text-[12.5px], dst) tanpa alasan — drift itu yang disatukan di sini.
 * Yang SENGAJA beda (brand gradient vs warna tenant, gaya active-nav,
 * health pill) tetap dipertahankan lewat props di atas.
 */
export function AppSidebar({
  identityBg, logoContent, title, subtitle, nav, activePathname,
  activeStyle, showHealth = false, userInitials, userName, userEmail, onLogout,
}: AppSidebarProps) {
  const health = useHealth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-100">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: identityBg }}
        >
          {logoContent}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 tracking-tight truncate">{title}</p>
          <p className="text-3xs text-slate-400 tracking-widest uppercase">{subtitle}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {nav.map((navGroup) => (
          <div key={navGroup.group}>
            <p className="px-3 mb-1.5 text-3xs font-semibold tracking-widest text-slate-400 uppercase">
              {navGroup.group}
            </p>
            <div className="space-y-0.5">
              {navGroup.items.map((item) => {
                const active = activePathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                        activeStyle === 'pill'
                          ? active
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          : active
                            ? 'text-white'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      )}
                      style={activeStyle === 'brand' && active ? { background: identityBg } : undefined}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0 transition-colors',
                          activeStyle === 'pill' &&
                            (active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600')
                        )}
                      />
                      <span className="flex-1">{item.name}</span>
                      {active && activeStyle === 'pill' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      {active && activeStyle === 'brand' && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-1">
        {showHealth && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div
              className={cn('w-1.5 h-1.5 rounded-full', HEALTH_DOT[health], health === 'checking' && 'animate-pulse')}
            />
            <span className="text-2xs text-slate-400">{HEALTH_LABEL[health]}</span>
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-3xs font-bold"
            style={{ background: identityBg }}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{userName}</p>
            {userEmail && <p className="text-3xs text-slate-400 truncate">{userEmail}</p>}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
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
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: identityBg }}
          >
            {logoContent}
          </div>
          <span className="text-sm font-semibold text-slate-800 truncate">{title}</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0"
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

      {/* Mobile spacer — supaya konten tidak ketutup topbar fixed */}
      <div className="lg:hidden h-14" />
    </>
  );
}
