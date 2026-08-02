'use client';

import { useEffect, useState } from 'react';
import { useTenants } from '@/hooks/use-tenant-data';
import { useAuth } from '@/lib/auth/auth-context';
import { QueueEntriesRecap } from '@/components/queue-entries-recap';

export default function DashboardQueueRecapPage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const { user } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  if (tenantsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-400">Memuat data...</p>
      </div>
    );
  }

  return (
    selectedTenant && (
      <QueueEntriesRecap
        key={selectedTenantId}
        tenantId={selectedTenant.id}
        tenantName={selectedTenant.name}
        brandColor={selectedTenant.brand_color}
        adminName={user?.full_name ?? null}
        headerExtra={
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
        }
      />
    )
  );
}
