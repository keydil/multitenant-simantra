'use client';

import { useEffect, useState, useCallback } from 'react';
import { publicQueries } from '@/lib/api/queries';
import { ApiError } from '@/lib/api/client';
import type { Tenant } from '@/lib/types/tenant';

export function useTenant(slug: string) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await publicQueries.getTenant(slug);
      setTenant(data as Tenant);
      setError(null);
    } catch (err) {
      // 404 beneran dari server — tidak ada lagi workaround "1 row semua NULL"
      setError(
        err instanceof ApiError && err.statusCode === 404
          ? 'Tenant tidak ditemukan.'
          : 'Gagal memuat data instansi.'
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tenant, loading, error };
}
