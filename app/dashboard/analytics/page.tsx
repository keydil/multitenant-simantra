'use client';

import { useState, useEffect } from 'react';
import { useTenants } from '@/hooks/use-tenant-data';
import { TenantAnalytics } from '@/components/tenant-analytics';

export default function AnalyticsPage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

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

      {selectedTenantId && <TenantAnalytics tenantId={selectedTenantId} />}
    </div>
  );
}
