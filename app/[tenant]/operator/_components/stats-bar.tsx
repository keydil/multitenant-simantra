'use client';

interface Stats { waiting: number; completed: number; no_show: number; cancelled: number; }

export default function StatsBar({ stats, brand }: { stats: Stats; brand: string }) {
  const items = [
    { label: 'Menunggu', value: stats.waiting, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { label: 'Selesai', value: stats.completed, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { label: 'Hold/Lewat', value: stats.no_show, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    { label: 'Batal', value: stats.cancelled, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(item => (
        <div key={item.label} className={`rounded-2xl border p-4 text-center ${item.bg} ${item.border}`}>
          <p className={`text-3xl font-black ${item.text}`}>{item.value}</p>
          <p className={`text-xs font-semibold uppercase tracking-wide mt-1 ${item.text} opacity-80`}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}
