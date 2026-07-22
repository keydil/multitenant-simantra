'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTenants } from '@/hooks/use-tenant-data';
import { TenantAnalytics } from '@/components/tenant-analytics';
import { analyticsQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isAggregating, setIsAggregating] = useState(false);
  // Diubah setelah backfill untuk memaksa <TenantAnalytics> mount ulang →
  // hook analitiknya menarik data yang baru terisi.
  const [refreshKey, setRefreshKey] = useState(0);

  // C1: analytics_daily terisi lewat cron 00:15 (agregasi kemarin) — jadi data
  // historis & environment yang cron-nya belum pernah nyala tetap kosong.
  // Tombol ini backfill 30 hari terakhir sekaligus (idempoten).
  const handleAggregate = async () => {
    setIsAggregating(true);
    try {
      const { upserted } = await analyticsQueries.aggregate(30);
      if (upserted === 0) {
        toast.info('Tidak ada data untuk diperbarui', {
          description: 'Belum ada antrian tercatat dalam 30 hari terakhir.',
        });
      } else {
        toast.success('Data analitik diperbarui', {
          description: `${upserted} baris statistik dihitung ulang dari data antrian.`,
        });
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      toast.error('Gagal memperbarui data', { description: friendlyErrorMessage(err) });
    } finally {
      setIsAggregating(false);
    }
  };

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  if (tenantsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-400">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analitik</h1>
          <p className="text-slate-400 text-sm mt-1">Statistik dan performa antrian</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAggregate}
            disabled={isAggregating}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            title="Hitung ulang statistik dari data antrian 30 hari terakhir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAggregating ? 'animate-spin' : ''}`} />
            {isAggregating ? 'Memperbarui...' : 'Perbarui data'}
          </button>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedTenantId && (
        <TenantAnalytics key={`${selectedTenantId}-${refreshKey}`} tenantId={selectedTenantId} />
      )}
    </div>
  );
}
