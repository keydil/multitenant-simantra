'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tenant } from '@/lib/types/tenant';

export function useTenant(slug: string) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.rpc('get_public_tenant', { p_slug: slug });

    // RPC "not found" comes back as one row with every column null (Postgres
    // FROM-clause call convention for a non-SETOF composite-returning
    // function), not a JS null — check the primary key, not truthiness.
    if (err || !data?.id) {
      setError('Tenant tidak ditemukan.');
    } else {
      setTenant(data as Tenant);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tenant, loading, error };
}
