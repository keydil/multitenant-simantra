'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { systemQueries } from '@/lib/api/queries';
import { MaintenanceScreen } from '@/components/maintenance-screen';

// Titik tunggal gerbang Mode Maintenance untuk SEMUA halaman di bawah /[tenant].
// Sebelumnya tidak ada layout bersama di sini — tiap area (admin/operator)
// punya layout sendiri, halaman publik tak punya sama sekali. Menaruh check di
// satu layout induk menghindari pengulangan di ~4 halaman publik.
//
// PENTING: maintenance HANYA memblokir halaman pengunjung (kiosk, antrian,
// display, buku tamu). Portal staff (/admin, /operator) & /login WAJIB tetap
// bisa diakses — kalau tidak, operator tak bisa kerja dan superadmin tak bisa
// mematikan maintenance-nya. Gating berdasarkan pathname.

// Path yang TIDAK pernah diblokir maintenance.
const STAFF_PATH = /\/(admin|operator|login)(\/|$)/;

export default function TenantLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicVisitorPath = !STAFF_PATH.test(pathname);

  // 'checking' sampai status pertama tiba — hanya relevan untuk path publik.
  const [maintenance, setMaintenance] = useState<{ active: boolean; message?: string } | null>(null);

  useEffect(() => {
    // Portal staff & login tidak butuh status ini — jangan buang request.
    if (!isPublicVisitorPath) return;
    let cancelled = false;
    systemQueries
      .getMaintenanceStatus()
      .then((res) => {
        if (!cancelled) setMaintenance(res);
      })
      .catch(() => {
        // Gagal cek (mis. backend belum siap) → jangan kunci pengunjung keluar;
        // perlakukan sebagai tidak-maintenance.
        if (!cancelled) setMaintenance({ active: false });
      });
    return () => {
      cancelled = true;
    };
  }, [isPublicVisitorPath, pathname]);

  if (isPublicVisitorPath) {
    // Tahan render konten publik sampai status diketahui, supaya tidak ada
    // kedipan halaman asli sebelum layar pemeliharaan muncul.
    if (maintenance === null) {
      return <div className="min-h-screen bg-slate-50" />;
    }
    if (maintenance.active) {
      return <MaintenanceScreen message={maintenance.message} />;
    }
  }

  return <>{children}</>;
}
