'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import type { QueueEntry, Queue, QueueStatus } from '@/lib/types/queue';
import { Clock, CheckCircle2, AlertCircle, Volume2, MapPin, Star, Loader2 } from 'lucide-react';

type StatusConfig = {
  label: string;
  icon: React.ReactNode;
  headerGradient: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
};

const STATUS_CONFIGS: Record<QueueStatus, StatusConfig> = {
  waiting: {
    label: 'Menunggu Giliran',
    icon: <Clock size={18} />,
    headerGradient: 'from-blue-500 to-cyan-500',
    badgeBg: 'bg-blue-50', badgeText: 'text-blue-600', badgeBorder: 'border-blue-200',
  },
  serving: {
    label: 'Dipanggil!',
    icon: <Volume2 size={18} />,
    headerGradient: 'from-orange-400 to-amber-500',
    badgeBg: 'bg-orange-50', badgeText: 'text-orange-600', badgeBorder: 'border-orange-300 animate-pulse',
  },
  completed: {
    label: 'Layanan Selesai',
    icon: <CheckCircle2 size={18} />,
    headerGradient: 'from-emerald-500 to-green-600',
    badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600', badgeBorder: 'border-emerald-200',
  },
  no_show: {
    label: 'Tidak Hadir',
    icon: <AlertCircle size={18} />,
    headerGradient: 'from-red-500 to-red-600',
    badgeBg: 'bg-red-50', badgeText: 'text-red-600', badgeBorder: 'border-red-200',
  },
  cancelled: {
    label: 'Dibatalkan',
    icon: <AlertCircle size={18} />,
    headerGradient: 'from-slate-400 to-slate-500',
    badgeBg: 'bg-slate-50', badgeText: 'text-slate-500', badgeBorder: 'border-slate-200',
  },
};

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'id-ID';
  utt.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(v => v.lang.startsWith('id'));
  if (idVoice) utt.voice = idVoice;
  window.speechSynthesis.speak(utt);
}

export default function StatusCard() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const entryId = params.id as string;
  const { tenant } = useTenant(tenantSlug);

  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [positionAhead, setPositionAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Selamat Datang');
  const prevStatusRef = useRef<QueueStatus | null>(null);
  const supabase = createClient();

  const updatePositionAhead = useCallback(async (e: QueueEntry) => {
    const { data } = await supabase.rpc('count_public_queue_position_ahead', { p_entry_id: e.id });
    setPositionAhead(data ?? 0);
  }, [supabase]);

  const loadInitial = useCallback(async () => {
    const { data: entryData } = await supabase.rpc('get_public_queue_entry', { p_entry_id: entryId });
    if (!entryData) { setLoading(false); return; }
    setEntry(entryData as QueueEntry);
    prevStatusRef.current = (entryData as QueueEntry).status as QueueStatus;

    const { data: queueData } = await supabase.rpc('get_public_queue', { p_queue_id: (entryData as QueueEntry).queue_id });
    if (queueData) setQueue(queueData as Queue);

    await updatePositionAhead(entryData as QueueEntry);
    setLoading(false);
  }, [entryId, supabase, updatePositionAhead]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 3 && hour < 11) setGreeting('Selamat Pagi');
    else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang');
    else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');

    loadInitial();
  }, [loadInitial]);

  // Polling every 3s (replaces realtime — Supabase Realtime enforces RLS,
  // and anon no longer has direct SELECT on queue_entries; see
  // MIGRATION_AUDIT.md Kritis #2). Also covers what the old separate
  // "position ahead" poll did, so that effect was folded into this one.
  useEffect(() => {
    const poll = async () => {
      const { data: updated } = await supabase.rpc('get_public_queue_entry', { p_entry_id: entryId });
      if (!updated) return;
      const entryData = updated as QueueEntry;
      const newStatus = entryData.status as QueueStatus;
      const oldStatus = prevStatusRef.current;

      if (newStatus === 'serving' && oldStatus !== 'serving' && queue) {
        const loket = entryData.service_window;
        const msg = loket
          ? `Nomor antrian ${entryData.ticket_number}, silakan menuju loket ${loket}.`
          : `Nomor antrian ${entryData.ticket_number}, silakan menuju loket.`;
        speak(msg);
      }

      prevStatusRef.current = newStatus;
      setEntry(entryData);
      if (newStatus === 'waiting') await updatePositionAhead(entryData);
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [entryId, supabase, queue, updatePositionAhead]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={36} />
      </div>
    );
  }

  if (!entry || !queue || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-semibold">Tiket tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const status = entry.status as QueueStatus;
  const cfg = STATUS_CONFIGS[status];
  const brand = tenant.brand_color ?? '#1e40af';
  const estWait = positionAhead * (queue.estimated_service_time_minutes ?? 5);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden pb-10">

      {/* Header gradient */}
      <div className={`h-52 rounded-b-[3rem] shadow-md relative bg-gradient-to-br ${cfg.headerGradient}`}>
        <div className="absolute top-5 right-6 text-white font-medium text-sm opacity-90">{greeting}</div>
      </div>

      <main className="max-w-sm mx-auto px-4 -mt-32 relative z-10">

        {/* Ticket logo */}
        <div className="text-center mb-4">
          {tenant.logo_url && (
            <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-auto mx-auto object-contain drop-shadow" />
          )}
        </div>

        <div className={`bg-white rounded-3xl shadow-xl border-2 overflow-hidden ${cfg.badgeBorder}`}>

          {/* Status badge */}
          <div className="px-6 pt-5 pb-3 flex justify-center">
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}>
              {status === 'waiting' && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
              )}
              {cfg.icon}
              <span>{cfg.label}</span>
            </div>
          </div>

          {/* WAITING */}
          {status === 'waiting' && (
            <div className="px-6 pb-5">
              <div className="text-center mb-6">
                <p className="text-7xl font-black text-slate-800 tabular-nums">{positionAhead}</p>
                <p className="text-slate-500 font-medium">Orang di depan Anda</p>
                {positionAhead > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Estimasi tunggu ~{estWait} menit</p>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-600 leading-relaxed">
                  💡 Tidak perlu refresh halaman. Notifikasi otomatis muncul saat dipanggil.
                </p>
              </div>
            </div>
          )}

          {/* SERVING */}
          {status === 'serving' && (
            <div className="px-6 pb-5 text-center">
              <div className="mb-4 relative inline-block">
                <div className="absolute inset-0 bg-orange-200 rounded-full animate-ping opacity-20" />
                <Volume2 className="w-16 h-16 text-orange-500 mx-auto relative z-10 animate-bounce" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">GILIRAN ANDA!</h3>
              <p className="text-slate-500 mb-4">Segera menuju loket layanan</p>
              {entry.service_window && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <p className="text-sm text-orange-600 font-semibold uppercase mb-1">Silakan Menuju</p>
                  <div className="text-4xl font-black text-slate-800 flex items-center justify-center gap-2">
                    <MapPin className="w-6 h-6 text-orange-500" />
                    LOKET {entry.service_window}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMPLETED */}
          {status === 'completed' && (
            <div className="px-6 pb-5 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Pelayanan Selesai</h3>
              <p className="text-slate-500 text-sm mb-4 px-2">
                Terima kasih telah menggunakan layanan {tenant.name}.
              </p>
              <button
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: brand }}
              >
                <Star size={16} /> Isi Survei Kepuasan
              </button>
            </div>
          )}

          {/* NO_SHOW / CANCELLED */}
          {(status === 'no_show' || status === 'cancelled') && (
            <div className="px-6 pb-5 text-center">
              <AlertCircle className="w-14 h-14 text-slate-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">
                {status === 'no_show' ? 'Tidak Hadir' : 'Antrian Dibatalkan'}
              </h3>
              <p className="text-slate-400 text-sm">Silakan ambil nomor antrian baru di kiosk.</p>
              <a href={`/${tenantSlug}`}
                className="mt-4 inline-block px-6 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: brand }}>
                Kembali ke Kiosk
              </a>
            </div>
          )}

          {/* Ticket number (not completed/cancelled) */}
          {status !== 'completed' && status !== 'cancelled' && (
            <>
              <hr className="border-slate-100 mx-6" />
              <div className="text-center py-4 px-6">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Nomor Antrian Anda</p>
                <p className="text-5xl font-black tracking-tight" style={{ color: brand }}>
                  {entry.ticket_number}
                </p>
              </div>
            </>
          )}

          {/* Realtime indicator */}
          <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-100">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400">Pembaruan otomatis aktif</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">{tenant.name}</p>
          <p className="text-[10px] text-slate-300 mt-0.5">© {new Date().getFullYear()} Sistem Antrian Digital</p>
        </div>
      </main>
    </div>
  );
}
