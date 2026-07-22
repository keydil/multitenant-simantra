'use client';

// Dulu server component yang query Supabase langsung. Access token API
// sekarang hidup di memory browser (bukan cookie), jadi fetch pindah ke
// client — pola URL-driven (filter/page di query string) dipertahankan.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { guestBookQueries } from '@/lib/api/queries';
import type { GuestBook } from '@/lib/api/types';
import GuestBookList from './_components/guest-book-list';

const PAGE_SIZE = 10;

export default function AdminGuestBookPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const sp = useSearchParams();
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? '';
  const brandColor = user?.tenant?.brand_color ?? '#1e40af';

  const currentPage = Number(sp.get('page') ?? 1);
  const searchQuery = sp.get('search') ?? '';
  const dateFrom = sp.get('from') ?? '';
  const dateTo = sp.get('to') ?? '';
  const purposeFilter = sp.get('purpose') ?? '';

  const [guests, setGuests] = useState<GuestBook[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const fromIso = dateFrom
      ? (() => { const d = new Date(dateFrom); d.setHours(0, 0, 0, 0); return d.toISOString(); })()
      : undefined;
    const toIso = dateTo
      ? (() => { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); return d.toISOString(); })()
      : undefined;

    guestBookQueries.getByTenant(tenantId, {
      search: searchQuery || undefined,
      purpose: purposeFilter || undefined,
      from: fromIso,
      to: toIso,
      page: currentPage,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setGuests(res.data);
        setTotalCount(res.count);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tenantId, currentPage, searchQuery, dateFrom, dateTo, purposeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <GuestBookList
      tenantSlug={tenantSlug}
      tenantId={tenantId}
      brandColor={brandColor}
      guests={guests}
      currentPage={currentPage}
      totalPages={Math.ceil(totalCount / PAGE_SIZE)}
      totalCount={totalCount}
      searchQuery={searchQuery}
      dateFrom={dateFrom}
      dateTo={dateTo}
      purposeFilter={purposeFilter}
    />
  );
}
