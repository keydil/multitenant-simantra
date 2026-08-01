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

    const check = () => {
      systemQueries
        .getMaintenanceStatus()
        .then((res) => {
          if (!cancelled) setMaintenance(res);
        })
        .catch(() => {
          // Gagal cek → JANGAN flip status yang sudah diketahui (blip jaringan
          // tak boleh melepas pengunjung dari layar maintenance yang aktif).
          // Hanya kegagalan PERTAMA (prev === null) yang default ke tidak-
          // maintenance, supaya backend belum-siap tak mengunci pengunjung.
          if (!cancelled) setMaintenance((prev) => prev ?? { active: false });
        });
    };

    check(); // langsung saat mount
    // Poll 5s SELALU: toggle maintenance superadmin tidak punya event WS, jadi
    // halaman publik yang sudah terbuka (mis. /display di TV) harus menariknya
    // sendiri. Tanpa ini, efek toggle baru terasa setelah refresh manual —
    // konsisten dengan poll theme (video_url/running_text) di display-board.
    // setMaintenance dipanggil dgn nilai non-null tiap poll, jadi hold 'null'
    // (layar checking) hanya berlaku sebelum respons pertama, tak blank per-tick.
    const poll = setInterval(check, 5000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [isPublicVisitorPath, pathname]);

  if (isPublicVisitorPath) {
    // Tahan render konten publik sampai status diketahui, supaya tidak ada
    // kedipan halaman asli sebelum layar pemeliharaan muncul.
    if (maintenance === null) {
      // Latar disesuaikan tujuan: display board itu TV bertema navy yang
      // menyala terus. Placeholder terang bikin kilatan putih layar penuh tiap
      // kali menyala dan tiap reload — menyilaukan ruang tunggu. Halaman
      // pengunjung lain (kiosk/antrian/buku tamu) memang bertema terang, jadi
      // tetap slate-50 supaya tak ada kilatan gelap di sana.
      return (
        <div
          className={`min-h-screen ${/\/display(\/|$)/.test(pathname) ? 'bg-slate-900' : 'bg-slate-50'}`}
        />
      );
    }
    if (maintenance.active) {
      return <MaintenanceScreen message={maintenance.message} />;
    }
  }

  return <>{children}</>;
}
