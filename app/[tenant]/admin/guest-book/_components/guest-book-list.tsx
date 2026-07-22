'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { guestBookQueries, visitPurposeQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { toast } from 'sonner';
import type { GuestBook } from '@/lib/api/types';
import * as XLSX from 'xlsx-js-style';
import { Download, ChevronDown, Search, X, User, ChevronLeft, ChevronRight } from 'lucide-react';

// Fallback KALAU fetch gagal / tenant lama belum di-backfill. Sumber utama:
// kategori per-tenant dari GET /tenants/:id/guest-book/purposes.
const DEFAULT_PURPOSES = [
  'Konsultasi Layanan', 'Bertemu Pejabat/Staf', 'Pengaduan', 'Informasi Umum',
  'Keperluan Administratif', 'Lainnya',
];

interface Guest {
  id: string; name: string; institution: string; purpose: string;
  phone: string; photo_url: string | null; created_at: string;
}

interface Props {
  tenantSlug: string; tenantId: string; brandColor: string; guests: Guest[]; currentPage: number;
  totalPages: number; totalCount: number; searchQuery: string;
  dateFrom: string; dateTo: string; purposeFilter: string;
}

export default function GuestBookList({ tenantSlug, tenantId, brandColor, guests, currentPage, totalPages, totalCount, searchQuery, dateFrom, dateTo, purposeFilter }: Props) {
  const router = useRouter();
  const brand = brandColor;
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);
  const [localPurpose, setLocalPurpose] = useState(purposeFilter);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [purposeOptions, setPurposeOptions] = useState<string[]>(DEFAULT_PURPOSES);

  // Opsi filter = kategori milik tenant ini (semua, termasuk nonaktif — supaya
  // entri lama berkategori yang sudah dinonaktifkan tetap bisa difilter).
  useEffect(() => {
    if (!tenantId) return;
    visitPurposeQueries.getByTenant(tenantId)
      .then((rows) => {
        if (rows.length > 0) setPurposeOptions(rows.map((p) => p.label));
      })
      .catch(() => {});
  }, [tenantId]);

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
    // Endpoint paginated maks 100/halaman — loop sampai semua terkumpul
    const filters = type === 'filtered'
      ? {
          search: searchQuery || undefined,
          purpose: purposeFilter || undefined,
          from: dateFrom
            ? (() => { const d = new Date(dateFrom); d.setHours(0, 0, 0, 0); return d.toISOString(); })()
            : undefined,
          to: dateTo
            ? (() => { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); return d.toISOString(); })()
            : undefined,
        }
      : {};

    const data: GuestBook[] = [];
    try {
      for (let page = 1; ; page++) {
        const res = await guestBookQueries.getByTenant(tenantId, { ...filters, page, limit: 100 });
        data.push(...res.data);
        if (data.length >= res.count || res.data.length === 0) break;
      }
    } catch (err) {
      toast.error('Gagal mengambil data untuk ekspor', {
        description: friendlyErrorMessage(err),
      });
      return;
    }
    if (data.length === 0) {
      toast.info('Tidak ada data untuk diekspor', {
        description: 'Coba longgarkan filter pencarian atau rentang tanggalnya.',
      });
      return;
    }

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
    <div className="space-y-6">
      {/* Header — mengikuti pola halaman admin lain (h1 slate + subtitle),
          bukan lagi header full-screen sticky sendiri */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Buku Tamu</h1>
          <p className="text-sm text-slate-400 mt-0.5">Data kunjungan yang tercatat di instansi ini</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
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

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-slate-600">Cari Nama / Instansi</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input value={localSearch} onChange={e => setLocalSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="Ketik nama atau instansi..." className="w-full pl-9 pr-3 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>
          <div className="space-y-1 w-40">
            <label className="text-xs font-medium text-slate-600">Dari Tanggal</label>
            <input type="date" value={localFrom} onChange={e => setLocalFrom(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="space-y-1 w-40">
            <label className="text-xs font-medium text-slate-600">Sampai Tanggal</label>
            <input type="date" value={localTo} onChange={e => setLocalTo(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex gap-2">
            <button onClick={applyFilters} style={{ background: brand }}
              className="px-5 h-10 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              <Search size={14} /> Cari
            </button>
            {isFiltered && (
              <button onClick={clearFilters} className="px-3 h-10 border border-slate-200 text-slate-500 rounded-lg hover:border-red-300 hover:text-red-500">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {purposeOptions.map(opt => {
            const active = localPurpose === opt;
            return (
              <button key={opt} onClick={() => handlePurpose(opt)}
                style={active ? { background: brand, borderColor: brand } : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data pengunjung */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Data Pengunjung</h2>
          <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full font-medium">{totalCount} orang</span>
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
              <div key={guest.id} className="flex gap-5 p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex-shrink-0">
                  {guest.photo_url ? (
                    <img src={guest.photo_url} alt={guest.name} className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
                      <User size={28} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-semibold text-slate-900">{guest.name}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(guest.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' '}·{' '}
                      {new Date(guest.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                    <div><p className="text-xs text-slate-400">Instansi</p><p className="font-medium text-slate-700">{guest.institution}</p></div>
                    <div><p className="text-xs text-slate-400">No. Telepon</p><p className="font-medium text-slate-700">{guest.phone}</p></div>
                  </div>
                  <span className="inline-block text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">{guest.purpose}</span>
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
              .map((p) => {
                const active = currentPage === p;
                return (
                  <button key={p} onClick={() => router.push(buildUrl({ page: p }))}
                    style={active ? { background: brand, borderColor: brand } : undefined}
                    className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all ${active ? 'text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    {p}
                  </button>
                );
              })}
            <button disabled={currentPage >= totalPages} onClick={() => router.push(buildUrl({ page: currentPage + 1 }))}
              className="p-2 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
