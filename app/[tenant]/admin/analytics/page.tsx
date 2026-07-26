'use client';

import { useParams } from 'next/navigation';
import { useTenant } from '@/hooks/use-tenant';
import { TenantAnalytics } from '@/components/tenant-analytics';
import { PageHeader } from '@/components/ui/page-header';
import { Loader2 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant, loading } = useTenant(tenantSlug);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analitik" subtitle="Statistik dan tren performa antrian instansi Anda" />

      {tenant?.id && <TenantAnalytics tenantId={tenant.id} />}
    </div>
  );
}
