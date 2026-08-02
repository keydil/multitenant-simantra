'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { QueueEntriesRecap } from '@/components/queue-entries-recap';

export default function AdminQueueRecapPage() {
  const { user, loading } = useAuth();
  const tenantId = user?.tenant_id ?? '';
  const tenantName = user?.tenant?.name ?? '';
  const brandColor = user?.tenant?.brand_color ?? '#1e40af';

  if (loading || !tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <QueueEntriesRecap
      tenantId={tenantId}
      tenantName={tenantName}
      brandColor={brandColor}
      adminName={user?.full_name ?? null}
    />
  );
}
