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
    const { data, error: err } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', slug)
      .eq('is_active', true)
      .single();

    if (err || !data) {
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
