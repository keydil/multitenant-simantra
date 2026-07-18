'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx-js-style';
import { ArrowLeft, Download, ChevronDown, Search, X, User, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const PURPOSE_OPTIONS = [
  'Konsultasi Layanan', 'Bertemu Pejabat/Staf', 'Pengaduan', 'Informasi Umum',
  'Keperluan Administratif', 'Lainnya',
];

interface Guest {
  id: string; name: string; institution: string; purpose: string;
  phone: string; photo_url: string | null; created_at: string;
}

interface Props {
  tenantSlug: string; tenantId: string; guests: Guest[]; currentPage: number;
  totalPages: number; totalCount: number; searchQuery: string;
  dateFrom: string; dateTo: string; purposeFilter: string;
}

export default function GuestBookList({ tenantSlug, tenantId, guests, currentPage, totalPages, totalCount, searchQuery, dateFrom, dateTo, purposeFilter }: Props) {
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);
  const [localPurpose, setLocalPurpose] = useState(purposeFilter);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const buildUrl = (overrides: Record<string, string | number> = {}) => {
    const p = new URLSearchParams();
    const s = overrides.search !== undefined ? String(overrides.search) : localSearch;
    const f = overrides.from !== undefined ? String(overrides.from) : localFrom;
    const t = overrides.to !== undefined ? String(overrides.to) : localTo;
    const pu = overrides.purpose !== undefined ? String(overrides.purpose) : localPurpose;
    const pg = overrides.page !== undefined ? String(overrides.page) : '1';
    if (s) p.set('search', s); if (f) p.set('from', f); if (t) p.set('to', t);
    if (pu) p.set('purpose', pu); p.set('page', pg);
    return `/${tenantSlug}/admin/guest-book?${p.toString()}`;
  };

  const applyFilters = () => router.push(buildUrl());
  const clearFilters = () => {
    setLocalSearch(''); setLocalFrom(''); setLocalTo(''); setLocalPurpose('');
    router.push(`/${tenantSlug}/admin/guest-book?page=1`);
  };
  const handlePurpose = (opt: string) => {
    const next = localPurpose === opt ? '' : opt;
    setLocalPurpose(next);
    router.push(buildUrl({ purpose: next }));
  };

  const isFiltered = searchQuery || dateFrom || dateTo || purposeFilter;

  const handleExport = async (type: 'filtered' | 'all') => {
    const supabase = createClient();
    let q = supabase.from('guest_book').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (type === 'filtered') {
      if (searchQuery) q = q.or(`name.ilike.%${searchQuery}%,institution.ilike.%${searchQuery}%`);
      if (purposeFilter) q = q.ilike('purpose', `%${purposeFilter}%`);
      if (dateFrom) { const d = new Date(dateFrom); d.setHours(0,0,0,0); q = q.gte('created_at', d.toISOString()); }
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); q = q.lte('created_at', d.toISOString()); }
    }
    const { data } = await q;
    if (!data || data.length === 0) { alert('Tidak ada data untuk diekspor!'); return; }

    const rows = data.map((g: Guest) => ({
      'Nama Lengkap': g.name, 'Instansi': g.institution, 'No. Telepon': g.phone,
      'Keperluan': g.purpose, 'Waktu Berkunjung': new Date(g.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
      'Foto': g.photo_url ? 'Lihat Foto' : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    data.forEach((g: Guest, i: number) => {
      if (g.photo_url) {
        const ref = `F${i + 2}`;
        if (ws[ref]) {
          ws[ref].l = { Target: g.photo_url, Tooltip: 'Klik untuk lihat foto' };
          ws[ref].s = { font: { color: { rgb: '0563C1' }, underline: true } };
        }
      }
    });
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Tamu');
    XLSX.writeFile(wb, `Data_Tamu_${type === 'filtered' ? 'FILTER' : 'SEMUA'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/${tenantSlug}/admin`} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-blue-600">DATA BUKU TAMU</h1>
              <p className="text-xs text-slate-400">Manajemen Data Kunjungan</p>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
              <Download size={15} /> Export Excel <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 w-52">
                <button onClick={() => handleExport('filtered')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-100">Export Hasil Filter</button>
                <button onClick={() => handleExport('all')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50">Export Semua Data</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Filter bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Cari Nama / Instansi</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                <input value={localSearch} onChange={e => setLocalSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  placeholder="Ketik nama atau instansi..." className="w-full pl-9 pr-3 h-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" />
              </div>
            </div>
            <div className="space-y-1 w-40">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Dari Tanggal</label>
              <input type="date" value={localFrom} onChange={e => setLocalFrom(e.target.value)} className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm" />
            </div>
            <div className="space-y-1 w-40">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Sampai Tanggal</label>
              <input type="date" value={localTo} onChange={e => setLocalTo(e.target.value)} className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={applyFilters} className="px-5 h-10 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
                <Search size={14} /> Cari
              </button>
              {isFiltered && (
                <button onClick={clearFilters} className="px-3 h-10 border border-slate-200 text-slate-500 rounded-xl hover:border-red-300 hover:text-red-500">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PURPOSE_OPTIONS.map(opt => (
              <button key={opt} onClick={() => handlePurpose(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${localPurpose === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Guest list */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-700">Data Pengunjung</h2>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-semibold">{totalCount} orang</span>
          </div>
          <div className="divide-y divide-slate-100">
            {guests.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Tidak ada data yang cocok</p>
                <p className="text-sm mt-1 text-slate-300">Coba ubah kata kunci atau filter</p>
              </div>
            ) : (
              guests.map(guest => (
                <div key={guest.id} className="flex gap-5 p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0">
                    {guest.photo_url ? (
                      <img src={guest.photo_url} alt={guest.name} className="w-20 h-20 rounded-xl object-cover border-2 border-slate-100" />
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center">
                        <User size={32} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-bold text-lg text-slate-800">{guest.name}</p>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {new Date(guest.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' '}·{' '}
                        {new Date(guest.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                      <div><p className="text-slate-400">Instansi</p><p className="font-medium text-slate-700">{guest.institution}</p></div>
                      <div><p className="text-slate-400">No. Telepon</p><p className="font-medium text-slate-700">{guest.phone}</p></div>
                    </div>
                    <span className="inline-block text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">{guest.purpose}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Halaman {currentPage} dari {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={currentPage <= 1} onClick={() => router.push(buildUrl({ page: currentPage - 1 }))}
                className="p-2 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <button key={p} onClick={() => router.push(buildUrl({ page: p }))}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${currentPage === p ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    {p}
                  </button>
                ))}
              <button disabled={currentPage >= totalPages} onClick={() => router.push(buildUrl({ page: currentPage + 1 }))}
                className="p-2 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
