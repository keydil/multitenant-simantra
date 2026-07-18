'use client';

import type { QueueEntry } from '@/lib/types/queue';

export default function WaitingList({ entries, brand }: { entries: QueueEntry[]; brand: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h2 className="font-bold text-slate-700">Antrian Menunggu ({entries.length})</h2>
      </div>
      <div className="p-4">
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div key={entry.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${i === 0 ? 'border-2' : 'bg-slate-50'}`}
                style={i === 0 ? { borderColor: brand, backgroundColor: `${brand}0d` } : {}}>
                <p className="font-bold text-slate-700">{entry.ticket_number}</p>
                {i === 0 && (
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: brand }}>NEXT</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>Aman, tidak ada antrian menunggu</p>
          </div>
        )}
      </div>
    </div>
  );
}
