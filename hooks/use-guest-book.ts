'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GuestBook } from '@/lib/types/queue';

export function useGuestBook(tenantId: string) {
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const submitEntry = useCallback(
    async (data: Omit<GuestBook, 'id' | 'created_at' | 'tenant_id'>) => {
      setSubmitting(true);
      const { data: result, error } = await (supabase as any)
        .from('guest_book')
        .insert({ ...data, tenant_id: tenantId })
        .select()
        .single();
      setSubmitting(false);
      if (error) throw error;
      return result as GuestBook;
    },
    [tenantId, supabase]
  );

  const fetchInstitutions = useCallback(async () => {
    const { data } = await supabase
      .from('guest_book')
      .select('institution')
      .eq('tenant_id', tenantId)
      .not('institution', 'is', null)
      .neq('institution', '-')
      .neq('institution', 'Pribadi (Non-Instansi)');

    const list = (data ?? [])
      .map((d: any) => d.institution)
      .filter(Boolean) as string[];
    return Array.from(new Set(list)).sort();
  }, [tenantId, supabase]);

  return { submitEntry, fetchInstitutions, submitting };
}
