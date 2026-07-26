'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { useAuth } from '@/lib/auth/auth-context';
import { ForcePasswordChange } from '@/components/force-password-change';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { toast } from 'sonner';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, isAuthenticated, signingOut } = useAuth();

  // Guard area superadmin. Dulu di sini HANYA ada cek isAuthenticated, padahal
  // teks loader di bawah sudah mengklaim "Memverifikasi sesi superadmin" —
  // klaim yang tidak pernah dikerjakan. Akibatnya admin/operator yang login
  // lewat /[tenant]/login memegang token sah dan bisa mengetik /dashboard/* di
  // URL, lalu seluruh UI superadmin ikut ter-render (termasuk form 5 warna
  // theme yang tampak bisa diedit). Data tak pernah bocor — RolesGuard backend
  // menolak semua endpoint superadmin dengan 403 — tapi menampilkan form yang
  // mustahil berhasil persis masalah yang reversal B1 berusaha hilangkan.
  //
  // Ini layout SATU-SATUNYA di bawah /dashboard (tak ada layout bersarang),
  // jadi cek di sini menutup kedelapan rute anaknya sekaligus. Jangan
  // mengandalkan guard backend saja untuk urusan tampilan.
  useEffect(() => {
    if (loading || signingOut) return;

    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    if (user.role !== 'superadmin') {
      // Toast dilepas SEBELUM pindah halaman: <Toaster> dipasang di root
      // app/layout.tsx, di luar pohon yang di-unmount, jadi ia tetap hidup
      // melewati navigasi client-side ini.
      toast.error('Halaman itu khusus superadmin. Anda dikembalikan ke halaman Anda.');
      // Dikembalikan ke area miliknya sendiri, bukan dibuang ke halaman 403
      // buntu. subdomain bisa saja kosong kalau data tak konsisten — jangan
      // sampai jadi redirect ke "/undefined/admin" (pola sama dengan guard di
      // [tenant]/admin/layout.tsx).
      const slug = user.tenant?.subdomain;
      router.push(
        slug && user.role === 'admin'
          ? `/${slug}/admin`
          : slug && user.role === 'operator'
            ? `/${slug}/operator`
            : '/auth/login',
      );
    }
  }, [user, loading, isAuthenticated, signingOut, router]);

  // ── Signing Out ──
  if (signingOut) {
    return <FullScreenLoader title="Sedang keluar..." subtitle="Menghapus sesi Anda" spinnerColor="text-blue-500" />;
  }

  // ── Loading Auth ──
  if (loading) {
    return <FullScreenLoader title="Memuat dashboard..." subtitle="Memverifikasi sesi superadmin" />;
  }

  // Efek redirect di atas baru jalan SETELAH render pertama, jadi tanpa gerbang
  // ini UI superadmin sempat terlihat sekejap oleh sesi yang tidak berhak.
  if (!isAuthenticated || user?.role !== 'superadmin') return null;

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
