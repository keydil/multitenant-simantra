'use client';

// WebSocket realtime (socket.io) — pengganti supabase.channel(postgres_changes).
// Kontrak server: FRONTEND_MIGRATION.md §4 + realtime.gateway.ts backend.
// Pola pemakaian: pertahankan polling sebagai fallback, skip saat `connected`.

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/api/client';

export type RealtimeJoin =
  | { type: 'tenant_public'; slug: string }
  | { type: 'entry'; entry_id: string }
  | { type: 'staff' };

export type RealtimeEvent =
  | 'entry.created'
  | 'entry.updated'
  | 'entry.called'
  | 'queue.updated'
  | 'announcement.updated';

const EVENTS: RealtimeEvent[] = [
  'entry.created',
  'entry.updated',
  'entry.called',
  'queue.updated',
  'announcement.updated',
];

export type RealtimeHandlers = Partial<Record<RealtimeEvent, (payload: any) => void>>;

/**
 * `connected` = socket tersambung DAN join room di-ack ok — baru aman
 * mematikan polling. join `null` = tidak konek sama sekali.
 */
export function useRealtime(join: RealtimeJoin | null, handlers: RealtimeHandlers): boolean {
  const [connected, setConnected] = useState(false);
  // Handler selalu baca versi terbaru tanpa perlu re-connect socket
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const joinKey = join ? JSON.stringify(join) : null;

  useEffect(() => {
    if (!joinKey) return;
    const joinSpec = JSON.parse(joinKey) as RealtimeJoin;

    const token = getAccessToken();
    const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      // token opsional — anon utk kiosk/TV; staff wajib token
      auth: token ? { token } : {},
    });

    for (const ev of EVENTS) {
      socket.on(ev, (payload: unknown) => handlersRef.current[ev]?.(payload));
    }

    // 'connect' juga fire saat reconnect otomatis → join ulang room
    socket.on('connect', () => {
      socket.emit('join', joinSpec, (ack: { ok: boolean; room?: string }) => {
        setConnected(Boolean(ack?.ok));
      });
    });
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [joinKey]);

  return connected;
}
