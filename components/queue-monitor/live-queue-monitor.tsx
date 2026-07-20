'use client';

import { useState, useEffect } from 'react';
import { KioskDisplay } from './kiosk-display';
import { TVDisplay } from './tv-display';
import { useQueueEntries, useQueues } from '@/hooks/use-queue-data';
import { useAnnouncements } from '@/hooks/use-tenant-data';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface LiveQueueMonitorProps {
  tenantId: string;
  queueId?: string;
  layout?: 'split' | 'kiosk' | 'tv';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function LiveQueueMonitor({
  tenantId,
  queueId,
  layout = 'split',
  autoRefresh = true,
  refreshInterval = 2000,
}: LiveQueueMonitorProps) {
  const { queues, loading: queuesLoading } = useQueues(tenantId);
  const [selectedQueueId, setSelectedQueueId] = useState<string>(queueId || '');
  const { entries, loading: entriesLoading, refetch } = useQueueEntries(tenantId, selectedQueueId, refreshInterval);
  const { announcements } = useAnnouncements(tenantId);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!selectedQueueId && queues.length > 0) {
      setSelectedQueueId(queues[0].id);
    }
  }, [queues, selectedQueueId]);

  const selectedQueue = queues.find((q) => q.id === selectedQueueId);
  const currentEntry = entries.find((e) => e.status === 'serving');
  const nextEntries = entries.filter((e) => e.status === 'waiting');

  const QueueSelector = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">Pilih Antrian:</label>
        <select
          value={selectedQueueId}
          onChange={(e) => setSelectedQueueId(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {queues.map((q) => (
            <option key={q.id} value={q.id}>{q.display_name || q.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => setIsPaused(!isPaused)} className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg text-slate-500">
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg text-slate-500">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  if (queuesLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-400">Memuat data antrian...</p>
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-400">Belum ada antrian untuk tenant ini</p>
      </div>
    );
  }

  if (layout === 'kiosk') {
    return (
      <div className="h-full flex flex-col gap-4">
        <QueueSelector />
        <div className="flex-1">
          <KioskDisplay currentEntry={currentEntry || null} nextEntries={nextEntries} queue={selectedQueue || null} loading={entriesLoading} />
        </div>
      </div>
    );
  }

  if (layout === 'tv') {
    return (
      <div className="h-full flex flex-col gap-4">
        <QueueSelector />
        <div className="flex-1">
          <TVDisplay entries={entries} queue={selectedQueue || null} announcements={announcements} loading={entriesLoading} />
        </div>
      </div>
    );
  }

  // Split layout
  return (
    <div className="h-full flex flex-col gap-4">
      <QueueSelector />
      <div className="flex-1 grid grid-cols-2 gap-4">
        <KioskDisplay currentEntry={currentEntry || null} nextEntries={nextEntries} queue={selectedQueue || null} loading={entriesLoading} />
        <TVDisplay entries={entries} queue={selectedQueue || null} announcements={announcements} loading={entriesLoading} />
      </div>
    </div>
  );
}
