'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { queueQueries, queueEntryQueries } from '@/lib/api/queries';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useRealtime } from '@/hooks/use-realtime';
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

  const { user } = useAuth();

  // Fetch queues for tenant
  useEffect(() => {
    if (!tenant) return;
    queueQueries.getByTenant(tenant.id).then((data) => {
      if (data.length > 0) {
        const sorted = [...data].sort((a, b) => (a.service_code ?? '').localeCompare(b.service_code ?? ''));
        setQueues(sorted as Queue[]);
        setSelectedQueueId(sorted[0].id);
      }
    }).catch(() => {});
  }, [tenant]);

  const loadData = useCallback(async () => {
    if (!selectedQueueId || !tenant) return;

    try {
      // Satu call utk semua list + stats/today pengganti 4 count paralel lama
      const [entries, statsToday] = await Promise.all([
        queueEntryQueries.getByQueue(tenant.id, selectedQueueId, {
          status: 'waiting,serving,no_show',
          limit: 100,
        }),
        queueEntryQueries.getStatsToday(selectedQueueId),
      ]);

      const serving = entries
        .filter(e => e.status === 'serving')
        .sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''));
      if (serving.length > 0) {
        setCurrentEntry(serving[0] as QueueEntry);
        setCallCount(c => (c > 0 ? c : 1));
      } else {
        setCurrentEntry(null); setCallCount(0);
      }

      setWaitingEntries(entries.filter(e => e.status === 'waiting').slice(0, 15) as QueueEntry[]);
      setHoldEntries(entries.filter(e => e.status === 'no_show') as QueueEntry[]);
      setStats({
        waiting: statsToday.waiting,
        completed: statsToday.completed,
        no_show: statsToday.no_show,
        cancelled: statsToday.cancelled,
      });
    } catch {
      // network error — pertahankan state terakhir, tick berikut mencoba lagi
    }
  }, [selectedQueueId, tenant]);

  // WS room staff (wajib token — tunggu user siap); polling 5s jadi fallback
  const wsConnected = useRealtime(
    user && tenant ? { type: 'staff' } : null,
    {
      'entry.created': () => loadData(),
      'entry.updated': () => loadData(),
      'entry.called': () => loadData(),
      'queue.updated': () => loadData(),
    }
  );
  const wsConnectedRef = useRef(wsConnected);
  wsConnectedRef.current = wsConnected;

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (!wsConnectedRef.current) loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const selectedQueue = queues.find(q => q.id === selectedQueueId);

  // ACTIONS
  const handleCallNext = async () => {
    if (waitingEntries.length === 0 || isLoading) return;
    setIsLoading(true);
    try {
      // Atomik di server — dua operator tidak mungkin memanggil nomor yang
      // sama. Nomor yang dipanggil = respons server, bukan waitingEntries[0].
      const called = await queueEntryQueries.callNext(selectedQueueId, windowNumber);
      speak(`Nomor antrian ${called.ticket_number}, silakan menuju loket ${windowNumber}.`);
      await loadData();
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 404) {
        // Tidak ada yang menunggu (mungkin diserobot operator lain barusan)
        await loadData();
      } else {
        console.error(e);
        alert('Gagal memanggil antrian. Coba lagi.');
      }
    }
    setIsLoading(false);
  };

  const handleRecall = async () => {
    if (!currentEntry) return;
    speak(`Nomor antrian ${currentEntry.ticket_number}, silakan menuju loket ${windowNumber}.`);
    setCallCount(c => c + 1);
  };

  const updateStatus = async (status: 'completed' | 'no_show' | 'cancelled') => {
    if (!currentEntry || isLoading) return;
    setIsLoading(true);
    try {
      // Transisi divalidasi & timestamp diisi server
      await queueEntryQueries.updateStatus(currentEntry.id, status);
      setCurrentEntry(null); setCallCount(0);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Gagal memperbarui status antrian.');
      await loadData();
    }
    setIsLoading(false);
  };

  const handleComplete = () => updateStatus('completed');

  const handleHold = () => {
    if (!currentEntry || isLoading) return;
    if (!confirm('Tandai tidak hadir? (Antrian tidak bisa dipanggil ulang — pengunjung harus ambil nomor baru)')) return;
    updateStatus('no_show');
  };

  const handleCancel = () => {
    if (!currentEntry || isLoading) return;
    if (!confirm('Batalkan antrian ini secara permanen?')) return;
    updateStatus('cancelled');
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

        {/* Hold list — informasi saja; no_show terminal di state machine
            server, tidak bisa dipanggil ulang */}
        {holdEntries.length > 0 && <HoldList entries={holdEntries} />}

        {/* Waiting list */}
        <WaitingList entries={waitingEntries} brand={brand} />
      </main>
    </div>
  );
}
