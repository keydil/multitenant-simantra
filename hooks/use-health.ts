'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

// B2: mengganti badge status yang dulu HARDCODED selalu hijau ("Semua sistem
// normal" / "Sistem aktif") dengan keadaan nyata dari GET /health. Indikator
// yang selalu hijau memberi rasa aman palsu — lebih buruk daripada tidak ada.

export type HealthState = 'checking' | 'ok' | 'degraded' | 'down';

interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
}

/**
 * Poll ringan ke /health. `{ auth: false }` — endpoint-nya publik, dan ini
 * mencegah polling latar menyentuh jalur refresh/sesi-habis saat token basi.
 * 'down' = server tak terjangkau sama sekali (fetch melempar).
 */
export function useHealth(intervalMs = 30000): HealthState {
  const [state, setState] = useState<HealthState>('checking');

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await api.get<HealthResponse>('/health', { auth: false });
        if (!cancelled) setState(res.status === 'ok' ? 'ok' : 'degraded');
      } catch {
        if (!cancelled) setState('down');
      }
    };

    ping();
    const timer = setInterval(ping, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return state;
}

/** Teks + warna titik untuk tiap keadaan — dipakai indikator sidebar & admin. */
export const HEALTH_LABEL: Record<HealthState, string> = {
  checking: 'Memeriksa status...',
  ok: 'Semua sistem normal',
  degraded: 'Layanan terganggu',
  down: 'Tidak terhubung ke server',
};

export const HEALTH_DOT: Record<HealthState, string> = {
  checking: 'bg-slate-300',
  ok: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
};
