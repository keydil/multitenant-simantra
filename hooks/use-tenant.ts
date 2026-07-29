'use client';

import { useEffect, useState, useCallback } from 'react';
import { publicQueries } from '@/lib/api/queries';
import { ApiError } from '@/lib/api/client';
import type { Tenant } from '@/lib/types/tenant';

/**
 * `pollMs` OPSIONAL — dipakai HANYA oleh halaman publik tak terjaga (kiosk),
 * bukan default untuk semua 10+ pemanggil hook ini (panel admin/operator dll
 * tak butuh polling; refresh manual sudah wajar di sesi staf yang aktif).
 * Tanpa `pollMs`, perilaku identik seperti sebelumnya — tak ada interval sama
 * sekali.
 *
 * Kenapa perlu: superadmin bisa mengubah theme/judul kiosk kapan saja lewat
 * dashboard, tapi kiosk fisik di lapangan biasa menyala tanpa siapa pun
 * me-refresh browsernya. Tanpa polling, perubahan itu baru tampil kalau ada
 * yang kebetulan reload — tak masuk akal untuk instansi produksi.
 */
export function useTenant(slug: string, options?: { pollMs?: number }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (opts?: { silent?: boolean }) => {
    if (!slug) return;
    // silent = dipanggil dari polling, BUKAN load pertama. Kalau loading di-
    // set true di sini juga, seluruh halaman kiosk akan berkedip balik ke
    // layar spinner tiap tick polling — itu sendiri jadi bug baru yang lebih
    // mengganggu daripada masalah yang mau diperbaiki.
    if (!opts?.silent) setLoading(true);
    try {
      const data = await publicQueries.getTenant(slug);
      setTenant(data as Tenant);
      setError(null);
    } catch (err) {
      // Poll diam-diam yang gagal (network blip sesaat) TIDAK menimpa data
      // lama dengan pesan error — kiosk tetap menampilkan versi terakhir yang
      // berhasil dimuat, coba lagi tick berikutnya. Pola sama dengan
      // display-board.tsx: "gagal — pertahankan data terakhir".
      if (!opts?.silent) {
        // 404 beneran dari server — tidak ada lagi workaround "1 row semua NULL"
        setError(
          err instanceof ApiError && err.statusCode === 404
            ? 'Tenant tidak ditemukan.'
            : 'Gagal memuat data instansi.'
        );
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!options?.pollMs) return;
    const id = setInterval(() => fetch({ silent: true }), options.pollMs);
    return () => clearInterval(id);
    // Deps ke primitif `options?.pollMs`, BUKAN objek `options` itu sendiri —
    // pemanggil lazim mengirim literal `{ pollMs: 5000 }` inline yang jadi
    // referensi baru tiap render; depek objeknya akan reset interval terus.
  }, [fetch, options?.pollMs]);

  return { tenant, loading, error };
}
