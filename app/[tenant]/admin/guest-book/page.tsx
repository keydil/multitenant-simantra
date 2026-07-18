import { createServerSupabaseClient as createClient } from '@/lib/supabase/server';
import GuestBookList from './_components/guest-book-list';

const PAGE_SIZE = 10;

export default async function AdminGuestBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ page?: string; search?: string; from?: string; to?: string; purpose?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  const currentPage = Number(sp.page ?? 1);
  const searchQuery = sp.search ?? '';
  const dateFrom = sp.from ?? '';
  const dateTo = sp.to ?? '';
  const purposeFilter = sp.purpose ?? '';
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // Get tenant id from subdomain
  const { data: _tenant } = await supabase.from('tenants').select('id').eq('subdomain', tenantSlug).single();
  const tenantId = (_tenant as any)?.id as string | undefined;

  const sb = supabase as any;
  let query = sb.from('guest_book').select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,institution.ilike.%${searchQuery}%`);
  if (purposeFilter) query = query.ilike('purpose', `%${purposeFilter}%`);
  if (dateFrom) { const d = new Date(dateFrom); d.setHours(0,0,0,0); query = query.gte('created_at', d.toISOString()); }
  if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); query = query.lte('created_at', d.toISOString()); }

  const { data: guests, count } = await query.range(from, to);
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <GuestBookList
      tenantSlug={tenantSlug}
      tenantId={tenantId ?? ''}
      guests={guests ?? []}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={count ?? 0}
      searchQuery={searchQuery}
      dateFrom={dateFrom}
      dateTo={dateTo}
      purposeFilter={purposeFilter}
    />
  );
}
