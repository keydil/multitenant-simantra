'use client';

import { useEffect, useState, useCallback } from 'react';
import { queueQueries, queueEntryQueries } from '@/lib/api/queries';
import type { Queue, QueueEntry, QueueStatusSummary } from '@/lib/api/types';

export const useQueues = (tenantId: string) => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchQueues = async () => {
      try {
        setQueues(await queueQueries.getByTenant(tenantId));
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

// Endpoint staff entries sekarang tenant-scoped, jadi hook ini butuh
// tenantId juga (dulu cukup queueId). Realtime postgres_changes lama
// diganti polling; WS socket.io menyusul di komponen yang membutuhkan (§4).
export const useQueueEntries = (tenantId: string, queueId: string, pollingInterval = 2000) => {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!tenantId || !queueId) return;
    try {
      setEntries(await queueEntryQueries.getByQueue(tenantId, queueId));
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, queueId]);

  useEffect(() => {
    if (!tenantId || !queueId) return;

    fetchEntries();
    const interval = setInterval(fetchEntries, pollingInterval);
    return () => clearInterval(interval);
  }, [tenantId, queueId, pollingInterval, fetchEntries]);

  return { entries, loading, error, refetch: fetchEntries };
};

export const useQueueStatus = (tenantId: string, pollingInterval = 3000) => {
  const [statusSummary, setStatusSummary] = useState<QueueStatusSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setStatusSummary(await queueEntryQueries.getStatusSummary(tenantId));
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
