'use client';

import type { QueueEntry } from '@/lib/types/queue';
import { Volume2, CheckCircle2, PauseCircle, XCircle, Loader2 } from 'lucide-react';

interface ServingCardProps {
  currentEntry: QueueEntry | null;
  callCount: number;
  brand: string;
  isLoading: boolean;
  onRecall: () => void;
  onComplete: () => void;
  onHold: () => void;
  onCancel: () => void;
}

export default function ServingCard({ currentEntry, callCount, brand, isLoading, onRecall, onComplete, onHold, onCancel }: ServingCardProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-md overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold text-slate-700">Sedang Melayani</h2>
        {isLoading && <Loader2 size={16} className="animate-spin text-slate-400" />}
      </div>

      {currentEntry ? (
        <div className="p-5 space-y-5">
          {/* Ticket number display */}
          <div className="relative bg-blue-50 rounded-xl py-8 text-center">
            {callCount > 0 && (
              <span className="absolute top-2 right-2 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                Dipanggil: {callCount}×
              </span>
            )}
            <p className="text-6xl font-black" style={{ color: brand }}>{currentEntry.ticket_number}</p>
            <button
              onClick={onRecall}
              className="mt-3 inline-flex items-center gap-2 text-sm px-4 py-1.5 rounded-full border text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
            >
              <Volume2 size={14} /> Panggil Ulang
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={onComplete} disabled={isLoading}
              className="py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-60">
              <CheckCircle2 size={16} /> Selesai
            </button>
            <button
              onClick={onHold} disabled={isLoading}
              className="py-3 rounded-xl font-semibold text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 flex items-center justify-center gap-2 disabled:opacity-60">
              <PauseCircle size={16} /> Lewati
            </button>
            <button
              onClick={onCancel} disabled={isLoading}
              className="py-3 rounded-xl font-semibold text-sm bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 flex items-center justify-center gap-2 disabled:opacity-60">
              <XCircle size={16} /> Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 bg-slate-50 m-4 rounded-xl border-2 border-dashed border-slate-200">
          <p className="font-medium">Tidak ada antrian aktif</p>
          <p className="text-sm mt-1 text-slate-300">Klik tombol panggil di bawah</p>
        </div>
      )}
    </div>
  );
}
