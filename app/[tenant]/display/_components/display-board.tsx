'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import type { Queue, QueueEntry } from '@/lib/types/queue';
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
  const { tenant } = useTenant(tenantSlug);

  const [queues, setQueues] = useState<Queue[]>([]);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');
  const prevServingRef = useRef<Set<string>>(new Set());

  const supabase = createClient();

  const loadData = useCallback(async () => {
    if (!tenant) return;
    const { data: qData } = await supabase.from('queues').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('service_code');
    if (qData) setQueues(qData as Queue[]);

    const { data: eData } = await supabase.from('queue_entries').select('*')
      .eq('tenant_id', tenant.id).in('status', ['waiting', 'serving', 'completed'])
      .order('entered_at', { ascending: true });
    if (eData) {
      const newEntries = eData as QueueEntry[];
      // TTS for newly serving
      const nowServing = new Set(newEntries.filter(e => e.status === 'serving').map(e => e.id));
      nowServing.forEach(id => {
        if (!prevServingRef.current.has(id)) {
          const e = newEntries.find(x => x.id === id);
          if (e) {
            const q = (qData ?? queues).find((q: Queue) => q.id === e.queue_id);
            const loket = e.service_window ?? 1;
            speak(`Nomor antrian ${e.ticket_number}, ${q?.display_name ?? q?.name ?? ''}, silakan menuju loket ${loket}.`);
          }
        }
      });
      prevServingRef.current = nowServing;
      setEntries(newEntries);
    }
  }, [tenant, supabase, queues]);

  useEffect(() => {
    loadData();
    const ch = supabase.channel(`display-${tenant?.id ?? ''}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, loadData)
      .subscribe();
    const t = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 1000);
    const switchView = setInterval(() => setViewMode(v => v === 'grid' ? 'split' : 'grid'), 20000);
    return () => { supabase.removeChannel(ch); clearInterval(t); clearInterval(switchView); };
  }, [loadData, supabase, tenant?.id]);

  const brand = tenant?.brand_color ?? '#1e40af';

  const serving = entries.filter(e => e.status === 'serving');
  const entriesByQueue = (qId: string) => entries.filter(e => e.queue_id === qId);

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

      {/* Main */}
      <main className="flex-grow p-8 overflow-hidden">
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
                      <motion.div key={e.id} layout
                        className="relative rounded-xl overflow-hidden shadow-2xl"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}>
                        {/* Magic conic border */}
                        <motion.div className="absolute inset-[-150%]"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${queue.color_code ?? brand} 90deg, transparent 180deg, ${queue.color_code ?? brand} 270deg, transparent 360deg)` }}
                        />
                        <div className="absolute inset-[4px] rounded-lg flex flex-col items-center justify-center py-6 text-center"
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
      </main>

      {/* Running text (split view) */}
      <AnimatePresence>
        {viewMode === 'split' && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            className="fixed bottom-0 left-0 w-full h-14 bg-red-600 flex items-center overflow-hidden z-50">
            <div className="w-full h-[2px] bg-white/50 absolute top-0" />
            <motion.p
              initial={{ x: '100vw' }}
              animate={{ x: '-100%' }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="whitespace-nowrap text-white font-black text-xl uppercase tracking-widest"
            >
              SELAMAT DATANG DI {tenant?.name?.toUpperCase() ?? 'SIMANTRA'} &nbsp;•&nbsp;
              MELAYANI DENGAN SEPENUH HATI &nbsp;•&nbsp; BUDAYAKAN ANTRE &nbsp;•&nbsp;
            </motion.p>
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
