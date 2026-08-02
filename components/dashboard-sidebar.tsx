'use client';

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
  Activity,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { AppSidebar, type SidebarNavGroup } from '@/components/app-sidebar';

const navigation: SidebarNavGroup[] = [
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
      { name: 'Rekap Antrean', href: '/dashboard/queue-recap', icon: FileText },
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

// Identitas platform — SENGAJA navy→biru tetap, BUKAN brand tenant manapun
// (audit UI template §D). Jangan diganti warna dinamis.
const PLATFORM_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SA';

  return (
    <AppSidebar
      identityBg={PLATFORM_GRADIENT}
      logoContent={<Activity className="w-4 h-4 text-white" />}
      title="SIMANTRA"
      subtitle="Superadmin"
      nav={navigation}
      activePathname={pathname}
      activeStyle="pill"
      showHealth
      userInitials={initials}
      userName={user?.full_name || 'Superadmin'}
      userEmail={user?.email}
      onLogout={() => signOut()}
    />
  );
}
