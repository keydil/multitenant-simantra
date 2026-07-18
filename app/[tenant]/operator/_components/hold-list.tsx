'use client';

import type { QueueEntry } from '@/lib/types/queue';
import { RotateCcw, PauseCircle } from 'lucide-react';

interface HoldListProps {
  entries: QueueEntry[];
  brand: string;
  isLoading: boolean;
  currentEntry: QueueEntry | null;
  onRecall: (id: string) => void;
}

export default function HoldList({ entries, brand, isLoading, currentEntry, onRecall }: HoldListProps) {
  return (
    <div className="bg-orange-50 rounded-2xl border border-orange-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-orange-100 flex items-center gap-2">
        <PauseCircle size={16} className="text-orange-600" />
        <h2 className="font-bold text-orange-700">Antrian Hold/Terlewat ({entries.length})</h2>
      </div>
      <div className="p-4 space-y-2">
        {entries.map(entry => (
          <div key={entry.id}
            className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-orange-100 shadow-sm">
            <span className="font-bold text-slate-700">{entry.ticket_number}</span>
            <button
              onClick={() => onRecall(entry.id)}
              disabled={isLoading || !!currentEntry}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={12} /> Panggil
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
