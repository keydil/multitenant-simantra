'use client';

import type { Queue } from '@/lib/types/queue';

interface ServiceCardProps {
  queue: Queue;
  brand: string;
  isGenerating: boolean;
  onSelect: () => void;
}

export default function ServiceCard({ queue, brand, isGenerating, onSelect }: ServiceCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={isGenerating}
      className="w-full text-left bg-white rounded-2xl border-2 border-slate-100 hover:border-blue-300 hover:shadow-xl transition-all duration-200 p-6 group disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className="flex items-start gap-4">
        {/* Service code badge */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform text-white font-black text-xl"
          style={{ backgroundColor: queue.color_code ?? brand }}
        >
          {queue.service_code ?? queue.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">
            {queue.display_name ?? queue.name}
          </h3>
          {queue.description && (
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{queue.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-slate-400">
              ⏱ Est. {queue.estimated_service_time_minutes} menit/orang
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
