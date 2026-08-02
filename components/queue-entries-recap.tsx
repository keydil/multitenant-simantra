'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import * as XLSX from 'xlsx-js-style';
import { Download, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/pagination-controls';
import { queueEntryQueries, queueQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import type { Queue, QueueEntryRecap, QueueEntryStatus, QueueRecapSummary } from '@/lib/api/types';

interface Props {
  tenantId: string;
  tenantName: string;
  brandColor: string;
  adminName: string | null;
  /** Slot tambahan di actions PageHeader, sebelum tombol Export — dipakai
   *  halaman superadmin utk selector instansi (pola sama dgn dashboard/analytics). */
  headerExtra?: ReactNode;
}

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<QueueEntryStatus, string> = {
  waiting: 'Menunggu',
  serving: 'Sedang Dilayani',
  completed: 'Selesai',
  no_show: 'Tidak Hadir',
  cancelled: 'Dibatalkan',
};

const STATUS_BADGE: Record<QueueEntryStatus, string> = {
  waiting: 'bg-blue-50 text-blue-700 border-blue-200',
  serving: 'bg-violet-50 text-violet-700 border-violet-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  no_show: 'bg-orange-50 text-orange-700 border-orange-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const pad = (n: number) => String(n).padStart(2, '0');
/** Hindari geser tanggal akibat konversi UTC (mis. jam 00:xx WIB → tanggal
 *  sebelumnya di UTC) — sama seperti fix di analytics.service.ts backend. */
const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (dateStr: string) => { const d = new Date(dateStr); d.setHours(0, 0, 0, 0); return d; };
const endOfDay = (dateStr: string) => { const d = new Date(dateStr); d.setHours(23, 59, 59, 999); return d; };
const formatID = (iso: string) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

type Preset = 'today' | 'week' | 'month' | 'custom';

function presetRange(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  if (preset === 'today') return { from: toInputDate(now), to: toInputDate(now) };
  if (preset === 'week') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: toInputDate(from), to: toInputDate(now) };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toInputDate(from), to: toInputDate(now) };
}

export function QueueEntriesRecap({ tenantId, tenantName, brandColor, adminName, headerExtra }: Props) {
  const [preset, setPreset] = useState<Preset>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueFilter, setQueueFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  const [entries, setEntries] = useState<QueueEntryRecap[]>([]);
  const [summary, setSummary] = useState<QueueRecapSummary | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { from, to } = presetRange('month');
    setDateFrom(from);
    setDateTo(to);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    queueQueries.getByTenant(tenantId).then(setQueues).catch(() => {});
  }, [tenantId]);

  const applyPreset = (p: Exclude<Preset, 'custom'>) => {
    setPreset(p);
    const { from, to } = presetRange(p);
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  };

  const fetchPage = useCallback(async () => {
    if (!tenantId || !dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const res = await queueEntryQueries.getRecap(tenantId, {
        from: startOfDay(dateFrom).toISOString(),
        to: endOfDay(dateTo).toISOString(),
        queue_id: queueFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setEntries(res.data);
      setSummary(res.summary);
      setCount(res.count);
    } catch (err) {
      toast.error('Gagal memuat data rekap', { description: friendlyErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateFrom, dateTo, queueFilter, page]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const handleExport = async () => {
    if (!dateFrom || !dateTo) return;
    setExporting(true);
    const fromIso = startOfDay(dateFrom).toISOString();
    const toIso = endOfDay(dateTo).toISOString();
    const rows: QueueEntryRecap[] = [];
    let exportSummary: QueueRecapSummary | undefined;
    try {
      for (let p = 1; ; p++) {
        const res = await queueEntryQueries.getRecap(tenantId, {
          from: fromIso,
          to: toIso,
          queue_id: queueFilter || undefined,
          page: p,
          limit: 100,
          // Preview (fetchPage di bawah) sengaja terbaru-dulu (default backend
          // 'desc'), tapi file export tetap kronologis — konvensi laporan/ledger,
          // dan kolom "No" di sheet jadi runtut dari entri paling awal.
          order: 'asc',
        });
        if (p === 1) exportSummary = res.summary;
        rows.push(...res.data);
        if (rows.length >= res.count || res.data.length === 0) break;
      }
    } catch (err) {
      toast.error('Gagal mengambil data untuk ekspor', { description: friendlyErrorMessage(err) });
      setExporting(false);
      return;
    }
    if (rows.length === 0 || !exportSummary) {
      toast.info('Tidak ada data untuk diekspor', {
        description: 'Coba longgarkan filter periode atau layanan.',
      });
      setExporting(false);
      return;
    }

    const queueLabel = queueFilter
      ? queues.find((q) => q.id === queueFilter)?.display_name
        ?? queues.find((q) => q.id === queueFilter)?.name
        ?? 'Layanan terpilih'
      : 'Semua Layanan';

    const COLS = 8; // A..H, dipakai kop/section divider yg full-width merge
    type RowRole = 'kop-name' | 'kop-title' | 'kop-meta' | 'blank' | 'table-header' | 'data' | 'section-title' | 'summary-row';
    // Label di-merge A:D, nilai jatuh di kolom E (index 4) — perlu padding 3
    // sel kosong supaya index array cocok dgn posisi kolom hasil merge.
    const summaryRow = (label: string, value: string | number): { cells: (string | number)[]; role: RowRole } => ({
      cells: [label, '', '', '', value],
      role: 'summary-row',
    });
    const plan: { cells: (string | number)[]; role: RowRole }[] = [
      { cells: [tenantName], role: 'kop-name' },
      { cells: ['LAPORAN REKAPITULASI ANTREAN'], role: 'kop-title' },
      { cells: [`Periode: ${new Date(dateFrom).toLocaleDateString('id-ID', { dateStyle: 'long' })} s.d. ${new Date(dateTo).toLocaleDateString('id-ID', { dateStyle: 'long' })}`], role: 'kop-meta' },
      { cells: [`Layanan: ${queueLabel}`], role: 'kop-meta' },
      { cells: [`Dicetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`], role: 'kop-meta' },
      { cells: [`Dicetak oleh: ${adminName ?? '-'}`], role: 'kop-meta' },
      { cells: [], role: 'blank' },
      { cells: ['No', 'Nomor Tiket', 'Nama Layanan', 'Waktu Masuk', 'Waktu Mulai Dilayani', 'Waktu Selesai', 'Status', 'Loket'], role: 'table-header' },
      ...rows.map((e, i): { cells: (string | number)[]; role: RowRole } => ({
        role: 'data',
        cells: [
          i + 1,
          e.ticket_number,
          e.queue_name,
          formatID(e.entered_at),
          e.started_at ? formatID(e.started_at) : '-',
          e.completed_at ? formatID(e.completed_at) : '-',
          STATUS_LABEL[e.status],
          e.service_window != null ? String(e.service_window) : '-',
        ],
      })),
      { cells: [], role: 'blank' },
      { cells: ['RINGKASAN'], role: 'section-title' },
      summaryRow('Total Entri', exportSummary.total_entries),
      summaryRow('Selesai', exportSummary.by_status.completed),
      summaryRow('Tidak Hadir', exportSummary.by_status.no_show),
      summaryRow('Dibatalkan', exportSummary.by_status.cancelled),
      summaryRow('Menunggu', exportSummary.by_status.waiting),
      summaryRow('Sedang Dilayani', exportSummary.by_status.serving),
      { cells: [], role: 'blank' },
      { cells: ['TOTAL PER LAYANAN'], role: 'section-title' },
      ...exportSummary.by_service.map((s) => summaryRow(s.queue_name, s.count)),
      { cells: [], role: 'blank' },
      summaryRow('Rata-rata Waktu Layanan (menit)', exportSummary.average_service_minutes ?? '-'),
    ];

    const ws = XLSX.utils.aoa_to_sheet(plan.map((r) => r.cells));
    ws['!cols'] = [
      { wch: 6 }, { wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 10 },
    ];

    const brandRgb = /^#?[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor.replace('#', '').toUpperCase() : '1E40AF';
    const thin = { style: 'thin', color: { rgb: 'CBD5E1' } };
    const border = { top: thin, bottom: thin, left: thin, right: thin };
    const set = (r: number, c: number, style: Record<string, unknown>) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = style;
    };
    // Border pada rentang gabungan (merge) HARUS diisi ke tiap sel di dalamnya,
    // bukan cuma sel jangkar (anchor) — kalau tidak, tepi kanan/bawah merge
    // tidak ikut tergambar di sebagian besar penampil Excel.
    const setRange = (r: number, c1: number, c2: number, style: Record<string, unknown>) => {
      for (let c = c1; c <= c2; c++) set(r, c, style);
    };

    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    plan.forEach((row, r) => {
      switch (row.role) {
        case 'kop-name':
          merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
          set(r, 0, { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } });
          break;
        case 'kop-title':
          merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
          set(r, 0, { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } });
          break;
        case 'kop-meta':
          merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
          set(r, 0, { font: { sz: 10, color: { rgb: '475569' } } });
          break;
        case 'table-header':
          setRange(r, 0, COLS - 1, {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: brandRgb } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border,
          });
          break;
        case 'data':
          setRange(r, 0, COLS - 1, { font: { sz: 10 }, border });
          break;
        case 'section-title':
          merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
          setRange(r, 0, COLS - 1, {
            font: { bold: true, sz: 12 },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            alignment: { vertical: 'center' },
            border,
          });
          break;
        case 'summary-row':
          merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
          setRange(r, 0, 3, { font: { bold: true, sz: 10 }, border });
          set(r, 4, { font: { sz: 10 }, alignment: { horizontal: 'right' }, border });
          break;
        default:
          break;
      }
    });
    ws['!merges'] = merges;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Antrean');
    const fileSafeTenant = tenantName.replace(/[^a-zA-Z0-9]+/g, '_');
    XLSX.writeFile(wb, `Rekap_Antrean_${fileSafeTenant}_${dateFrom}_${dateTo}.xlsx`);
    setExporting(false);
  };

  const totalPages = Math.ceil(count / PAGE_SIZE);
  const presets: { key: Exclude<Preset, 'custom'>; label: string }[] = [
    { key: 'today', label: 'Hari Ini' },
    { key: 'week', label: '7 Hari Terakhir' },
    { key: 'month', label: 'Bulan Ini' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekap Antrean"
        subtitle="Laporan rekapitulasi antrean per periode untuk dokumentasi/pelaporan"
        actions={
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ background: brandColor }}
              className="flex items-center gap-2 px-4 h-10 rounded-lg text-white text-sm font-medium disabled:opacity-60"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exporting ? 'Menyiapkan...' : 'Export Excel'}
            </button>
          </div>
        }
      />

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              style={preset === p.key ? { background: brandColor, borderColor: brandColor } : undefined}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${preset === p.key ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="space-y-1 w-40">
            <label className="text-xs font-medium text-slate-600">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPreset('custom'); setPage(1); }}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-1 w-40">
            <label className="text-xs font-medium text-slate-600">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPreset('custom'); setPage(1); }}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <label className="text-xs font-medium text-slate-600">Layanan</label>
            <select
              value={queueFilter}
              onChange={(e) => { setQueueFilter(e.target.value); setPage(1); }}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Semua Layanan</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>{q.display_name ?? q.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ringkasan */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {(['completed', 'no_show', 'cancelled', 'waiting', 'serving'] as QueueEntryStatus[]).map((s) => (
            <div key={s} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">{STATUS_LABEL[s]}</p>
              <p className="text-xl font-bold text-slate-900">{summary.by_status[s] ?? 0}</p>
            </div>
          ))}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Rata-rata Layanan</p>
            <p className="text-xl font-bold text-slate-900">
              {summary.average_service_minutes != null ? `${summary.average_service_minutes}m` : '-'}
            </p>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Data Antrean</h2>
          <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full font-medium">{count} entri</span>
        </div>
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Tidak ada data pada periode ini</p>
            <p className="text-sm mt-1 text-slate-300">Coba ubah periode atau filter layanan</p>
          </div>
        ) : (
          // loading tetap true saat pindah halaman DILAKUKAN SENGAJA tanpa
          // mengganti tabel ke spinner — kalau diganti, tinggi kontainer
          // kolaps mendadak (baris lama hilang, spinner jauh lebih pendek)
          // dan browser "mengklem" posisi scroll krn sudah melebihi tinggi
          // dokumen yang baru, terasa seperti lompat ke atas. Baris lama
          // dipertahankan (redup) sampai data baru datang.
          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Tiket</th>
                  <th className="px-5 py-3 font-medium">Layanan</th>
                  <th className="px-5 py-3 font-medium">Masuk</th>
                  <th className="px-5 py-3 font-medium">Selesai</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Loket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-800">{e.ticket_number}</td>
                    <td className="px-5 py-3 text-slate-600">{e.queue_name}</td>
                    <td className="px-5 py-3 text-slate-500">{formatID(e.entered_at)}</td>
                    <td className="px-5 py-3 text-slate-500">{e.completed_at ? formatID(e.completed_at) : '-'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[e.status]}`}>
                        {STATUS_LABEL[e.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{e.service_window ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Halaman {page} dari {totalPages}</p>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} brandColor={brandColor} />
        </div>
      )}
    </div>
  );
}
