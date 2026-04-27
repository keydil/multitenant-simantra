'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import type { QueueEntry, Queue } from '@/lib/supabase/types';

interface KioskDisplayProps {
  currentEntry: QueueEntry | null;
  nextEntries: QueueEntry[];
  queue: Queue | null;
  loading?: boolean;
}

export function KioskDisplay({
  currentEntry,
  nextEntries,
  queue,
  loading = false,
}: KioskDisplayProps) {
  const [displayNumber, setDisplayNumber] = useState<string>('---');

  useEffect(() => {
    if (currentEntry?.ticket_number) {
      setDisplayNumber(currentEntry.ticket_number);
    } else {
      setDisplayNumber('---');
    }
  }, [currentEntry?.id]);

  if (loading) {
    return (
      <Card className="flex flex-col items-center justify-center h-full bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-center">
          <div className="text-6xl font-bold text-slate-200 mb-4">--</div>
          <p className="text-sm text-slate-400">Memuat antrian...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          {queue?.display_name || queue?.name || 'Sistem Antrian'}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
          Sedang Dilayani
        </p>

        {/* Ticket Number */}
        <div className="mb-8">
          <div
            className="text-9xl font-bold tabular-nums"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {displayNumber}
          </div>
        </div>

        {currentEntry && (
          <div className="mb-8">
            <p className="text-xs text-slate-400 mb-1">Nama</p>
            <p className="text-lg font-semibold text-slate-800">{currentEntry.customer_name || 'N/A'}</p>
          </div>
        )}

        {/* Next in Queue */}
        <div className="mt-auto w-full bg-slate-50 rounded-xl p-5 border border-slate-200">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Berikutnya
          </p>
          {nextEntries.length > 0 ? (
            <div className="space-y-2">
              {nextEntries.slice(0, 3).map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-slate-200"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {idx + 1}. {entry.ticket_number}
                  </span>
                  <span className="text-xs text-slate-400">
                    {entry.customer_name || 'Menunggu'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Tidak ada yang menunggu</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-center">
        <p className="text-xs text-slate-400">
          {new Date().toLocaleTimeString('id-ID')}
        </p>
      </div>
    </Card>
  );
}
