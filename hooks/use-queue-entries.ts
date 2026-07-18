'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { QueueEntry, Queue } from '@/lib/types/queue';

interface UseQueueEntriesOptions {
  tenantId: string;
  queueId?: string;
  statuses?: QueueEntry['status'][];
  realtimeEnabled?: boolean;
}

export function useQueueEntries({
  tenantId,
  queueId,
  statuses = ['waiting', 'serving'],
  realtimeEnabled = true,
}: UseQueueEntriesOptions) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchEntries = useCallback(async () => {
    if (!tenantId) return;

    let query = supabase
      .from('queue_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', statuses)
      .order('entered_at', { ascending: true });

    if (queueId) {
      query = query.eq('queue_id', queueId);
    }

    const { data } = await query;
    if (data) setEntries(data as QueueEntry[]);
    setLoading(false);
  }, [tenantId, queueId, statuses, supabase]);

  useEffect(() => {
    fetchEntries();

    if (!realtimeEnabled) return;

    const channel = supabase
      .channel(`queue-entries-${tenantId}-${queueId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => fetchEntries()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchEntries, tenantId, queueId, realtimeEnabled, supabase]);

  return { entries, loading, refetch: fetchEntries };
}
