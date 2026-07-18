'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import type { Queue, QueueEntry } from '@/lib/types/queue';
import { Loader2, ArrowLeft } from 'lucide-react';
import StatsBar from './stats-bar';
import ServingCard from './serving-card';
import WaitingList from './waiting-list';
import HoldList from './hold-list';

interface Stats { waiting: number; completed: number; no_show: number; cancelled: number; }

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'id-ID'; utt.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const id = voices.find(v => v.lang.startsWith('id'));
  if (id) utt.voice = id;
  window.speechSynthesis.speak(utt);
}

export default function OperatorPanel() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const router = useRouter();
  const { tenant, loading: tenantLoading } = useTenant(tenantSlug);

  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [windowNumber, setWindowNumber] = useState<number>(1);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [currentEntry, setCurrentEntry] = useState<QueueEntry | null>(null);
  const [waitingEntries, setWaitingEntries] = useState<QueueEntry[]>([]);
  const [holdEntries, setHoldEntries] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ waiting: 0, completed: 0, no_show: 0, cancelled: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [callCount, setCallCount] = useState(0);

  const supabase = createClient();

  // Fetch queues for tenant
  useEffect(() => {
    if (!tenant) return;
    supabase.from('queues').select('*')
      .eq('tenant_id', tenant.id).eq('is_active', true)
      .order('service_code')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setQueues(data as Queue[]);
          setSelectedQueueId((data[0] as any).id);
        }
      });
  }, [tenant, supabase]);

  const todayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); };

  const loadData = useCallback(async () => {
    if (!selectedQueueId || !tenant) return;

    // Current serving
    const { data: serving } = await supabase
      .from('queue_entries').select('*')
      .eq('queue_id', selectedQueueId).eq('status', 'serving')
      .order('started_at', { ascending: false }).limit(1);
    if (serving && serving.length > 0) {
      setCurrentEntry(serving[0] as QueueEntry);
      setCallCount(1);
    } else {
      setCurrentEntry(null); setCallCount(0);
    }

    // Waiting
    const { data: waiting } = await supabase
      .from('queue_entries').select('*')
      .eq('queue_id', selectedQueueId).eq('status', 'waiting')
      .order('entered_at', { ascending: true }).limit(15);
    setWaitingEntries((waiting ?? []) as QueueEntry[]);

    // Hold (no_show that can be recalled)
    const { data: hold } = await supabase
      .from('queue_entries').select('*')
      .eq('queue_id', selectedQueueId).eq('status', 'no_show')
      .order('entered_at', { ascending: true });
    setHoldEntries((hold ?? []) as QueueEntry[]);

    // Stats today
    const today = todayStart();
    const [w, c, ns, ca] = await Promise.all([
      supabase.from('queue_entries').select('*', { count: 'exact', head: true }).eq('queue_id', selectedQueueId).eq('status', 'waiting').gte('entered_at', today),
      supabase.from('queue_entries').select('*', { count: 'exact', head: true }).eq('queue_id', selectedQueueId).eq('status', 'completed').gte('entered_at', today),
      supabase.from('queue_entries').select('*', { count: 'exact', head: true }).eq('queue_id', selectedQueueId).eq('status', 'no_show').gte('entered_at', today),
      supabase.from('queue_entries').select('*', { count: 'exact', head: true }).eq('queue_id', selectedQueueId).eq('status', 'cancelled').gte('entered_at', today),
    ]);
    setStats({ waiting: w.count ?? 0, completed: c.count ?? 0, no_show: ns.count ?? 0, cancelled: ca.count ?? 0 });
  }, [selectedQueueId, tenant, supabase]);

  useEffect(() => {
    loadData();
    const ch = supabase.channel(`operator-${selectedQueueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedQueueId, loadData, supabase]);

  const selectedQueue = queues.find(q => q.id === selectedQueueId);

  // ACTIONS
  const handleCallNext = async () => {
    if (waitingEntries.length === 0 || isLoading) return;
    setIsLoading(true);
    const next = waitingEntries[0];
    try {
      await (supabase as any).from('queue_entries').update({
        status: 'serving', started_at: new Date().toISOString(), service_window: windowNumber,
      }).eq('id', next.id);
      speak(`Nomor antrian ${next.ticket_number}, silakan menuju loket ${windowNumber}.`);
      await loadData();
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleRecall = async () => {
    if (!currentEntry) return;
    speak(`Nomor antrian ${currentEntry.ticket_number}, silakan menuju loket ${windowNumber}.`);
    setCallCount(c => c + 1);
  };

  const handleComplete = async () => {
    if (!currentEntry || isLoading) return;
    setIsLoading(true);
    await (supabase as any).from('queue_entries').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', currentEntry.id);
    setCurrentEntry(null); setCallCount(0);
    await loadData();
    setIsLoading(false);
  };

  const handleHold = async () => {
    if (!currentEntry || isLoading) return;
    if (!confirm('Lewati/hold antrian ini?')) return;
    setIsLoading(true);
    await (supabase as any).from('queue_entries').update({ status: 'no_show' }).eq('id', currentEntry.id);
    setCurrentEntry(null); setCallCount(0);
    await loadData();
    setIsLoading(false);
  };

  const handleCancel = async () => {
    if (!currentEntry || isLoading) return;
    if (!confirm('Batalkan antrian ini secara permanen?')) return;
    setIsLoading(true);
    await (supabase as any).from('queue_entries').update({ status: 'cancelled' }).eq('id', currentEntry.id);
    setCurrentEntry(null); setCallCount(0);
    await loadData();
    setIsLoading(false);
  };

  const handleRecallFromHold = async (entryId: string) => {
    if (currentEntry) { alert('Selesaikan antrian yang sedang berjalan dulu.'); return; }
    setIsLoading(true);
    await (supabase as any).from('queue_entries').update({
      status: 'serving', started_at: new Date().toISOString(), service_window: windowNumber,
    }).eq('id', entryId);
    const held = holdEntries.find(e => e.id === entryId);
    if (held) speak(`Nomor antrian ${held.ticket_number}, silakan menuju loket ${windowNumber}.`);
    await loadData();
    setIsLoading(false);
  };

  const brand = tenant?.brand_color ?? '#1e40af';

  if (tenantLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={36} /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push(`/${tenantSlug}/admin`)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={20} />
          </button>
          {tenant?.logo_url && <img src={tenant.logo_url} alt={tenant.name} className="h-9 w-auto object-contain" />}
          <div>
            <h1 className="text-lg font-bold" style={{ color: brand }}>PANEL OPERATOR</h1>
            <p className="text-xs text-slate-400">{tenant?.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Queue + Window selector */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Antrian / Layanan</label>
            <select
              value={selectedQueueId}
              onChange={e => setSelectedQueueId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ focusRingColor: brand } as React.CSSProperties}
            >
              {queues.map(q => (
                <option key={q.id} value={q.id}>{q.display_name ?? q.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Nomor Loket</label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5,6].map(n => (
                <button
                  key={n}
                  onClick={() => setWindowNumber(n)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold border transition-all ${windowNumber === n ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
                  style={windowNumber === n ? { backgroundColor: brand, borderColor: brand } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsBar stats={stats} brand={brand} />

        {/* Serving card */}
        <ServingCard
          currentEntry={currentEntry}
          callCount={callCount}
          brand={brand}
          isLoading={isLoading}
          onRecall={handleRecall}
          onComplete={handleComplete}
          onHold={handleHold}
          onCancel={handleCancel}
        />

        {/* Call next button */}
        <button
          onClick={handleCallNext}
          disabled={isLoading || waitingEntries.length === 0 || !!currentEntry}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          style={{ backgroundColor: brand }}
        >
          📢 Panggil Antrian Selanjutnya
          {waitingEntries.length > 0 && ` — ${waitingEntries[0]?.ticket_number}`}
        </button>

        {/* Hold list */}
        {holdEntries.length > 0 && (
          <HoldList entries={holdEntries} brand={brand} isLoading={isLoading} currentEntry={currentEntry} onRecall={handleRecallFromHold} />
        )}

        {/* Waiting list */}
        <WaitingList entries={waitingEntries} brand={brand} />
      </main>
    </div>
  );
}
