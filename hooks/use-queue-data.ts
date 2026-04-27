'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { queueQueries, queueEntryQueries } from '@/lib/supabase/queries';
import type { Queue, QueueEntry, QueueStatusSummary } from '@/lib/supabase/types';

export const useQueues = (tenantId: string) => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchQueues = async () => {
      try {
        const { data, error } = await queueQueries.getByTenant(tenantId);
        if (error) throw error;
        setQueues(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchQueues();
    }
  }, [tenantId]);

  return { queues, loading, error, setQueues };
};

export const useQueueEntries = (queueId: string, pollingInterval = 2000) => {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchEntries = useCallback(async () => {
    try {
      const { data, error } = await queueEntryQueries.getByQueue(queueId);
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    if (!queueId) return;

    fetchEntries();

    // Setup polling for real-time updates
    const interval = setInterval(fetchEntries, pollingInterval);

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`queue:${queueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `queue_id=eq.${queueId}`,
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, [queueId, pollingInterval, fetchEntries, supabase]);

  return { entries, loading, error, refetch: fetchEntries };
};

export const useQueueStatus = (tenantId: string, pollingInterval = 3000) => {
  const [statusSummary, setStatusSummary] = useState<QueueStatusSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data, error } = await queueEntryQueries.getStatusSummary(tenantId);
        if (error) throw error;
        setStatusSummary(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchStatus();
      const interval = setInterval(fetchStatus, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [tenantId, pollingInterval]);

  return { statusSummary, loading, error };
};

export const useLiveQueueMonitor = (queueIds: string[]) => {
  const [allEntries, setAllEntries] = useState<Record<string, QueueEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (queueIds.length === 0) return;

    const fetchAllQueues = async () => {
      try {
        const promises = queueIds.map((id) =>
          queueEntryQueries.getByQueue(id)
        );
        const results = await Promise.all(promises);

        const merged: Record<string, QueueEntry[]> = {};
        queueIds.forEach((id, idx) => {
          merged[id] = results[idx].data || [];
        });
        setAllEntries(merged);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllQueues();

    // Setup subscriptions for all queues
    const subscriptions = queueIds.map((queueId) =>
      supabase
        .channel(`queue:${queueId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'queue_entries',
            filter: `queue_id=eq.${queueId}`,
          },
          () => {
            fetchAllQueues();
          }
        )
        .subscribe()
    );

    return () => {
      subscriptions.forEach((sub) => supabase.removeChannel(sub));
    };
  }, [queueIds, supabase]);

  return { allEntries, loading, error };
};
