'use client';

import type { QueueEntry } from '@/lib/types/queue';
import { PauseCircle } from 'lucide-react';

interface HoldListProps {
  entries: QueueEntry[];
}

// Daftar informasi saja: status no_show terminal di state machine server
// (waiting→serving→completed/no_show; no_show tidak bisa kembali serving),
// jadi tombol "Panggil Ulang" lama dihapus — pengunjung ambil nomor baru.
export default function HoldList({ entries }: HoldListProps) {
  return (
    <div className="bg-orange-50 rounded-2xl border border-orange-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-orange-100 flex items-center gap-2">
        <PauseCircle size={16} className="text-orange-600" />
        <h2 className="font-bold text-orange-700">Tidak Hadir ({entries.length})</h2>
      </div>
      <div className="p-4 space-y-2">
        {entries.map(entry => (
          <div key={entry.id}
            className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-orange-100 shadow-sm">
            <span className="font-bold text-slate-700">{entry.ticket_number}</span>
            <span className="text-xs text-slate-400">ambil nomor baru utk dilayani</span>
          </div>
        ))}
      </div>
    </div>
  );
}
