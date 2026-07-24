'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { publicQueries } from '@/lib/api/queries';
import { useRealtime } from '@/hooks/use-realtime';
import type { Tenant } from '@/lib/types/tenant';
import type { Queue } from '@/lib/types/queue';
import type { PublicQueueEntry } from '@/lib/api/types';
import { motion, AnimatePresence } from 'framer-motion';

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'id-ID'; utt.rate = 0.8;
  const voices = window.speechSynthesis.getVoices();
  const id = voices.find(v => v.lang.startsWith('id'));
  if (id) utt.voice = id;
  window.speechSynthesis.speak(utt);
}

export default function DisplayBoard() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  // Tenant + theme ikut siklus polling (bukan fetch-sekali) supaya perubahan
  // video_url/running_text/logo/brand langsung tampil tanpa reload manual —
  // konsisten dengan strategi realtime data antrian.
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [entries, setEntries] = useState<PublicQueueEntry[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');
  const prevServingRef = useRef<Set<string>>(new Set());

  // Theme (video_url/running_text/logo/brand) = config admin, TIDAK punya event
  // WS dan tidak ikut aktivitas antrian. Karena itu di-poll sendiri dengan
  // interval tetap yang SELALU jalan (lihat useEffect) — beda dari loadData
  // yang digerakkan event WS + fallback 3s hanya saat WS putus. Menempelkan
  // theme ke loadData bikin ia stale saat WS sehat & antrian idle.
  const loadTenant = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      const tenantData = (await publicQueries.getTenant(tenantSlug)) as Tenant;
      setTenant(tenantData);
    } catch {
      // gagal — pertahankan tenant terakhir, coba lagi tick berikut
    }
  }, [tenantSlug]);

  const loadData = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      // Endpoint publik: entries TANPA customer_name/notes
      const [qData, newEntries] = await Promise.all([
        publicQueries.getQueues(tenantSlug) as Promise<Queue[]>,
        publicQueries.getEntries(tenantSlug, 'waiting,serving,completed'),
      ]);
      setQueues(qData);

      // TTS for newly serving
      const nowServing = new Set(newEntries.filter(e => e.status === 'serving').map(e => e.id));
      nowServing.forEach(id => {
        if (!prevServingRef.current.has(id)) {
          const e = newEntries.find(x => x.id === id);
          if (e) {
            const q = qData.find((q: Queue) => q.id === e.queue_id);
            const loket = e.service_window ?? 1;
            speak(`Nomor antrian ${e.ticket_number}, ${q?.display_name ?? q?.name ?? ''}, silakan menuju loket ${loket}.`);
          }
        }
      });
      prevServingRef.current = nowServing;
      setEntries(newEntries);
    } catch {
      // gagal memuat — pertahankan tampilan terakhir, coba lagi di tick berikut
    }
  }, [tenantSlug]);

  // WebSocket room tenant_public:{slug}. entry.called men-trigger TTS
  // langsung; event lain cukup refresh data. prevServingRef ditandai dulu
  // supaya diff di loadData tidak menyuarakan nomor yang sama dua kali.
  const wsConnected = useRealtime(
    tenant ? { type: 'tenant_public', slug: tenantSlug } : null,
    {
      'entry.called': (payload) => {
        const { entry: e, queue: q } = payload as { entry: PublicQueueEntry; queue: Queue | null };
        if (!prevServingRef.current.has(e.id)) {
          prevServingRef.current.add(e.id);
          const loket = e.service_window ?? 1;
          speak(`Nomor antrian ${e.ticket_number}, ${q?.display_name ?? q?.name ?? ''}, silakan menuju loket ${loket}.`);
        }
        loadData();
      },
      'entry.created': () => loadData(),
      'entry.updated': () => loadData(),
      'queue.updated': () => loadData(),
    }
  );
  const wsConnectedRef = useRef(wsConnected);
  wsConnectedRef.current = wsConnected;

  useEffect(() => {
    loadTenant();
    loadData();
    // Theme di-poll SENDIRI tiap 5s dan SELALU (tak peduli WS), karena tak ada
    // event WS untuk perubahan video/running text. Refetch tenant tidak memicu
    // reconnect WS: useRealtime nge-key ke nilai join, bukan identitas objek.
    const themePoll = setInterval(loadTenant, 5000);
    // Polling data antrian 3s = fallback saat socket disconnect; skip saat connected
    const dataPoll = setInterval(() => {
      if (!wsConnectedRef.current) loadData();
    }, 3000);
    const t = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 1000);
    const switchView = setInterval(() => setViewMode(v => v === 'grid' ? 'split' : 'grid'), 20000);
    return () => { clearInterval(themePoll); clearInterval(dataPoll); clearInterval(t); clearInterval(switchView); };
  }, [loadData, loadTenant]);

  const brand = tenant?.brand_color ?? '#1e40af';
  // E7: video signage dari theme instansi (endpoint publik menyertakan theme).
  // Ada → area besar diisi video + strip antrian ringkas. Kosong → fallback ke
  // layout nomor antrian grid/split seperti biasa.
  const videoUrl = tenant?.theme?.video_url ?? null;
  // Teks berjalan admin-managed; fallback ke default kalau belum diisi.
  const runningText =
    tenant?.theme?.running_text?.trim() || 'MELAYANI DENGAN SEPENUH HATI • BUDAYAKAN ANTRE';

  const serving = entries.filter(e => e.status === 'serving');
  const entriesByQueue = (qId: string) => entries.filter(e => e.queue_id === qId);

  // Isi marquee dipakai dua tempat: strip fixed (mode split) & strip in-flow
  // di bawah video (mode video). Didefinisikan sekali supaya tidak dobel.
  const marquee = (
    <motion.p
      initial={{ x: '100vw' }}
      animate={{ x: '-100%' }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      className="whitespace-nowrap text-white font-black text-xl uppercase tracking-widest"
    >
      SELAMAT DATANG DI {tenant?.name?.toUpperCase() ?? 'SIMANTRA'} &nbsp;•&nbsp; {runningText} &nbsp;•&nbsp;
    </motion.p>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans overflow-hidden text-white">
      {/* Header */}
      <header className="px-10 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt={tenant.name} className="h-14 w-auto object-contain drop-shadow" />
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: brand }}>{tenant?.name?.toUpperCase()}</h1>
            <p className="text-xs text-slate-400 tracking-widest uppercase">SISTEM ANTRIAN DIGITAL</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-black text-white tabular-nums">{currentTime}</p>
          <p className="text-xs text-slate-400 mt-0.5">{currentDate}</p>
        </div>
      </header>

      {/* Main — E7: video besar + strip antrian kalau video di-set; kalau
          tidak, kembali ke grid/split nomor antrian. */}
      <main className="flex-grow p-8 overflow-hidden">
        {videoUrl ? (
          <div className="flex flex-col gap-4 h-full">
            <div className="grid grid-cols-12 gap-6 flex-grow min-h-0">
            <div className="col-span-9 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video src={videoUrl} autoPlay muted loop playsInline className="w-full h-full object-contain" />
            </div>
            <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
              {queues.map(queue => {
                const qEntries = entriesByQueue(queue.id);
                const servingNow = qEntries.find(e => e.status === 'serving');
                const waitingCount = qEntries.filter(e => e.status === 'waiting').length;
                return (
                  <div key={queue.id} className="rounded-2xl bg-slate-800 border border-slate-700 p-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
                      style={{ backgroundColor: queue.color_code ?? brand }}>
                      {queue.service_code ?? queue.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 truncate">{queue.display_name ?? queue.name}</p>
                      <p className="font-black text-2xl">{servingNow ? servingNow.ticket_number : '---'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-300">{waitingCount}</p>
                      <p className="text-[10px] text-slate-500">menunggu</p>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            {/* Running text — ruang tetap di bawah (video digeser ke atas) */}
            <div className="h-14 rounded-xl bg-red-600 flex items-center overflow-hidden flex-shrink-0 relative">
              <div className="w-full h-[2px] bg-white/50 absolute top-0" />
              {marquee}
              <div className="w-full h-[2px] bg-white/50 absolute bottom-0" />
            </div>
          </div>
        ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid gap-6 h-full" style={{ gridTemplateColumns: `repeat(${Math.min(queues.length, 4)}, 1fr)` }}>
              {queues.map(queue => {
                const qEntries = entriesByQueue(queue.id);
                const servingNow = qEntries.filter(e => e.status === 'serving');
                const waiting = qEntries.filter(e => e.status === 'waiting').slice(0, 6);
                return (
                  <div key={queue.id} className="flex flex-col gap-3">
                    {/* Column header */}
                    <div className="rounded-xl px-4 py-2 text-center font-black text-lg tracking-wider"
                      style={{ backgroundColor: queue.color_code ?? brand }}>
                      {queue.service_code ?? queue.name.charAt(0)} — {queue.display_name ?? queue.name}
                    </div>

                    {/* Serving */}
                    {servingNow.map(e => (
                      // BUGFIX: dulu kartu ini TIDAK PERNAH terlihat di mode grid.
                      // Pembungkusnya `relative` tanpa tinggi, sementara KEDUA
                      // anaknya `absolute` (border konik + isi) — jadi tidak ada
                      // yang mengisi tinggi dan kartunya kolaps jadi 0px di dalam
                      // flex column. Nomor yang sedang dipanggil baru muncul saat
                      // board berganti ke mode split (yang isinya normal flow).
                      // Sekarang: isi kartu dikembalikan ke normal flow (`relative`,
                      // bukan `absolute`) supaya dialah yang menentukan tinggi, dan
                      // celah 4px untuk border didapat dari padding pembungkus.
                      <motion.div key={e.id} layout
                        className="relative rounded-xl overflow-hidden shadow-2xl p-[4px]"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}>
                        {/* Magic conic border */}
                        <motion.div className="absolute inset-[-150%]"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${queue.color_code ?? brand} 90deg, transparent 180deg, ${queue.color_code ?? brand} 270deg, transparent 360deg)` }}
                        />
                        <div className="relative rounded-lg flex flex-col items-center justify-center py-6 text-center"
                          style={{ backgroundColor: '#0f172a' }}>
                          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">DIPANGGIL</p>
                          <p className="text-5xl font-black" style={{ color: queue.color_code ?? brand }}>{e.ticket_number}</p>
                          {e.service_window && <p className="text-xs text-slate-400 mt-2">Loket {e.service_window}</p>}
                        </div>
                      </motion.div>
                    ))}

                    {/* Waiting entries */}
                    {waiting.map((e, i) => (
                      <div key={e.id} className={`rounded-xl px-4 py-3 text-center font-bold ${i === 0 && servingNow.length === 0 ? 'text-white' : 'bg-slate-800 text-slate-300'}`}
                        style={i === 0 && servingNow.length === 0 ? { backgroundColor: `${queue.color_code ?? brand}40`, borderLeft: `3px solid ${queue.color_code ?? brand}` } : {}}>
                        {e.ticket_number}
                      </div>
                    ))}

                    {servingNow.length === 0 && waiting.length === 0 && (
                      <div className="rounded-xl bg-slate-800 border border-dashed border-slate-600 py-6 text-center text-slate-500 text-sm">
                        Menunggu antrian...
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-12 gap-8 h-full">
              {/* Left: compact queue status */}
              <div className="col-span-4 flex flex-col gap-4">
                {queues.map(queue => {
                  const qEntries = entriesByQueue(queue.id);
                  const servingNow = qEntries.find(e => e.status === 'serving');
                  const waitingCount = qEntries.filter(e => e.status === 'waiting').length;
                  return (
                    <div key={queue.id} className="rounded-2xl bg-slate-800 border border-slate-700 p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                        style={{ backgroundColor: queue.color_code ?? brand }}>
                        {queue.service_code ?? queue.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 truncate">{queue.display_name ?? queue.name}</p>
                        <p className="font-black text-2xl">{servingNow ? servingNow.ticket_number : '---'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-slate-300">{waitingCount}</p>
                        <p className="text-xs text-slate-500">menunggu</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: currently serving big display */}
              <div className="col-span-8 flex flex-col gap-4">
                <div className="flex-grow rounded-3xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center p-8 text-center">
                  {serving.length > 0 ? (
                    <>
                      <p className="text-sm text-slate-400 uppercase tracking-widest mb-3">SEDANG DIPANGGIL</p>
                      {serving.map(e => {
                        const q = queues.find(q => q.id === e.queue_id);
                        return (
                          <div key={e.id} className="mb-4">
                            <p className="text-9xl font-black" style={{ color: q?.color_code ?? brand }}>{e.ticket_number}</p>
                            <p className="text-xl text-slate-300 mt-2">{q?.display_name ?? q?.name}</p>
                            {e.service_window && <p className="text-slate-500 text-sm mt-1">Loket {e.service_window}</p>}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div>
                      <p className="text-6xl mb-4">📢</p>
                      <p className="text-slate-500 text-xl font-semibold">Belum ada panggilan</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      {/* Running text (split view) */}
      <AnimatePresence>
        {viewMode === 'split' && !videoUrl && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            className="fixed bottom-0 left-0 w-full h-14 bg-red-600 flex items-center overflow-hidden z-50">
            <div className="w-full h-[2px] bg-white/50 absolute top-0" />
            {marquee}
            <div className="w-full h-[2px] bg-white/50 absolute bottom-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* View mode indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-xs text-slate-400">Live · {viewMode === 'grid' ? 'Grid' : 'Split'}</span>
      </div>
    </div>
  );
}
