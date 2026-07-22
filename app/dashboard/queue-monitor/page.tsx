'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LiveQueueMonitor } from '@/components/queue-monitor/live-queue-monitor';
import { Button } from '@/components/ui/button';
import { useTenants } from '@/hooks/use-tenant-data';
import { Loader2, Eye, Monitor, Grid3x3 } from 'lucide-react';

export default function QueueMonitorPage() {
  const [tenantId, setTenantId] = useState<string>('');
  const [layout, setLayout] = useState<'split' | 'kiosk' | 'tv'>('split');
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const { tenants, loading } = useTenants();
  const router = useRouter();

  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id);
    }
  }, [tenants, tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-slate-500">Belum ada instansi tersedia</p>
        <Button onClick={() => router.push('/dashboard/tenants')} className="bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg">
          Kelola Instansi
        </Button>
      </div>
    );
  }

  const layouts = [
    { key: 'split', label: 'Split', icon: <Grid3x3 className="w-3.5 h-3.5" /> },
    { key: 'kiosk', label: 'Kiosk', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'tv', label: 'TV', icon: <Monitor className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    // Menyatu di shell dashboard (dashboard/layout.tsx sudah menyediakan
    // sidebar + bg-slate-50 + container p-6/max-w-7xl). Dulu di sini ada
    // min-h-screen + bg-slate-50 + header full-bleed sendiri → double shell.
    <div className="space-y-6">
      {/* Header — pola halaman dashboard lain */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitor Antrian Live</h1>
        <p className="text-slate-400 text-sm mt-1">Tampilan antrian real-time dan simulasi kiosk</p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        {/* Tenant */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Instansi</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Layout */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Layout</label>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {layouts.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setLayout(key)}
                className={`px-3 py-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1.5 ${
                  layout === key
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Refresh */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Refresh</label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value={1000}>1 detik</option>
            <option value={2000}>2 detik</option>
            <option value={5000}>5 detik</option>
            <option value={10000}>10 detik</option>
          </select>
        </div>
      </div>

      {/* Monitor — tinggi eksplisit supaya `h-full` di dalam LiveQueueMonitor
          tetap resolve (dulu dapat tinggi dari flex-1 shell yang sudah dibuang) */}
      <div className="h-[70vh] min-h-[500px]">
        <LiveQueueMonitor
          tenantId={tenantId}
          layout={layout}
          refreshInterval={refreshInterval}
        />
      </div>
    </div>
  );
}
