'use client';

import { toast } from 'sonner';

// Dipanggil dari lib/api/client.ts saat request ber-token kena 401 DAN
// refresh lewat cookie `simantra_refresh` juga gagal — artinya sesi benar-benar
// mati (refresh token kedaluwarsa / dirotasi / dicabut), bukan sekadar access
// token 15 menit yang basi.
//
// Sebelum ini, kondisi tsb cuma melempar ApiError "Unauthorized" ke call site,
// jadi user melihat toast merah "Gagal menyimpan: Unauthorized" lalu terjebak
// di halaman yang semua aksinya gagal, tanpa tahu harus login ulang.

let redirecting = false;

/** Login mana yang benar untuk konteks halaman saat ini. */
function resolveLoginUrl(pathname: string): string {
  // /{slug}/admin/... dan /{slug}/operator/... → portal login tenant tsb,
  // supaya user tidak dilempar ke portal superadmin yang menolak akunnya.
  const tenantArea = pathname.match(/^\/([^/]+)\/(?:admin|operator)(?:\/|$)/);
  return tenantArea ? `/${tenantArea[1]}/login` : '/auth/login';
}

export function handleSessionExpired() {
  if (typeof window === 'undefined') return;

  // Satu halaman bisa menembakkan banyak request paralel yang 401 bersamaan.
  // Tanpa guard ini, tiap request memunculkan toast + menjadwalkan redirect.
  if (redirecting) return;

  const { pathname } = window.location;

  // Sudah di halaman login (mis. bootstrap sesi gagal) — tidak ada yang perlu
  // diberitahu, halaman login sendiri sudah jadi tujuan akhirnya.
  if (pathname.endsWith('/login')) return;

  redirecting = true;

  toast.warning('Sesi Anda telah berakhir', {
    description: 'Demi keamanan, silakan masuk kembali untuk melanjutkan.',
    duration: 4000,
  });

  // Jeda supaya toast sempat terbaca sebelum halaman berpindah. Alasan
  // dibawa sebagai query param `?expired=1` agar halaman login bisa
  // menjelaskan ulang kenapa user tiba-tiba ada di sana.
  window.setTimeout(() => {
    window.location.href = `${resolveLoginUrl(pathname)}?expired=1`;
  }, 1800);
}
