'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Users, Clock, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAnalytics } from '@/hooks/use-tenant-data';
import { queueEntryQueries, queueQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import type { Queue, QueueRecapSummary } from '@/lib/api/types';

interface TenantAnalyticsProps {
  tenantId: string;
}

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  fontSize: '12px',
  color: '#1e293b',
};

const STATUS_COLORS = { completed: '#10B981', no_show: '#F59E0B', cancelled: '#EF4444' };

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => d.toISOString();
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

type KpiPeriod = 'today' | 'week';

function kpiRange(period: KpiPeriod): { from: string; to: string } {
  const now = new Date();
  if (period === 'today') return { from: toIso(startOfDay(now)), to: toIso(endOfDay(now)) };
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  return { from: toIso(startOfDay(from)), to: toIso(endOfDay(now)) };
}

export function TenantAnalytics({ tenantId }: TenantAnalyticsProps) {
  const [period, setPeriod] = useState<KpiPeriod>('today');
  const [kpi, setKpi] = useState<QueueRecapSummary | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [queues, setQueues] = useState<Queue[]>([]);

  // KPI live dari entries/recap — SENGAJA tidak pakai analytics_daily (cron
  // cuma isi "kemarin", jadi periode "Hari Ini" akan sering kosong kalau
  // bersandar ke tabel rollup). limit=1 krn cuma summary yg dipakai, bukan
  // baris entrinya — summary tetap dihitung backend atas SELURUH filter.
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    setKpiLoading(true);
    const { from, to } = kpiRange(period);
    queueEntryQueries.getRecap(tenantId, { from, to, limit: 1 })
      .then((res) => { if (!cancelled) setKpi(res.summary); })
      .catch((err) => {
        if (!cancelled) toast.error('Gagal memuat ringkasan', { description: friendlyErrorMessage(err) });
      })
      .finally(() => { if (!cancelled) setKpiLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId, period]);

  useEffect(() => {
    if (!tenantId) return;
    queueQueries.getByTenant(tenantId).then(setQueues).catch(() => {});
  }, [tenantId]);

  // 4 chart di bawah KPI pakai jendela tetap 30 hari dari analytics_daily
  // (sudah teragregasi, tidak ikut toggle periode di atas).
  const { analytics, loading: analyticsLoading } = useAnalytics(tenantId, 30);

  const queueNameById = useMemo(
    () => new Map(queues.map((q) => [q.id, q.display_name ?? q.name])),
    [queues],
  );

  const trendData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const a of analytics) {
      byDate.set(a.date, (byDate.get(a.date) ?? 0) + a.total_entries);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        total,
      }));
  }, [analytics]);

  const peakHourData = useMemo(() => {
    const byHour = new Map<number, number>();
    for (const a of analytics) {
      if (a.peak_hour == null || a.peak_count == null) continue;
      byHour.set(a.peak_hour, (byHour.get(a.peak_hour) ?? 0) + a.peak_count);
    }
    return Array.from(byHour.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, count]) => ({ hour: `${pad(hour)}:00`, count }));
  }, [analytics]);

  const statusData = useMemo(() => {
    let completed = 0, noShow = 0, cancelled = 0;
    for (const a of analytics) {
      completed += a.completed_entries;
      noShow += a.no_show_entries;
      cancelled += a.cancelled_entries;
    }
    return [
      { name: 'Selesai', value: completed, color: STATUS_COLORS.completed },
      { name: 'Tidak Hadir', value: noShow, color: STATUS_COLORS.no_show },
      { name: 'Dibatalkan', value: cancelled, color: STATUS_COLORS.cancelled },
    ].filter((s) => s.value > 0);
  }, [analytics]);

  const perServiceData = useMemo(() => {
    const acc = new Map<string, { sum: number; weight: number }>();
    for (const a of analytics) {
      if (!a.queue_id || a.average_service_time_minutes == null || a.completed_entries <= 0) continue;
      const prev = acc.get(a.queue_id) ?? { sum: 0, weight: 0 };
      prev.sum += a.average_service_time_minutes * a.completed_entries;
      prev.weight += a.completed_entries;
      acc.set(a.queue_id, prev);
    }
    return Array.from(acc.entries())
      .map(([queueId, v]) => ({
        name: queueNameById.get(queueId) ?? 'Layanan',
        minutes: Math.round((v.sum / v.weight) * 10) / 10,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [analytics, queueNameById]);

  const attendanceRate = useMemo(() => {
    if (!kpi) return null;
    const completed = kpi.by_status.completed;
    const noShow = kpi.by_status.no_show;
    if (completed + noShow === 0) return null;
    return Math.round((completed / (completed + noShow)) * 1000) / 10;
  }, [kpi]);

  const periods: { key: KpiPeriod; label: string }[] = [
    { key: 'today', label: 'Hari Ini' },
    { key: 'week', label: 'Minggu Ini' },
  ];

  return (
    <div className="space-y-6">
      {/* Toggle periode + KPI cards */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${period === p.key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Total Pengunjung',
              value: kpiLoading ? '...' : (kpi?.total_entries ?? 0).toLocaleString('id-ID'),
              sub: period === 'today' ? 'Hari ini' : '7 hari terakhir',
              icon: <Users className="w-4 h-4 text-blue-600" />,
              iconBg: 'bg-blue-50',
            },
            {
              label: 'Rata-rata Waktu Tunggu',
              value: kpiLoading ? '...' : kpi?.average_wait_minutes != null ? `${kpi.average_wait_minutes}` : '-',
              sub: 'menit dari dapat nomor sampai dipanggil',
              icon: <Clock className="w-4 h-4 text-violet-600" />,
              iconBg: 'bg-violet-50',
            },
            {
              label: 'Tingkat Kehadiran',
              value: kpiLoading ? '...' : attendanceRate != null ? `${attendanceRate}%` : '-',
              sub: 'dari tiket yang dipanggil',
              icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
              iconBg: 'bg-emerald-50',
            },
          ].map((c, i) => (
            <Card key={i} className="border border-slate-200 bg-white rounded-xl">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium text-slate-500">{c.label}</p>
                  <div className={`p-1.5 rounded-lg ${c.iconBg}`}>{c.icon}</div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-slate-400">Memuat data...</p>
        </div>
      ) : (
        <>
          {/* Tren + status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 border border-slate-200 bg-white rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Tren Pengunjung (30 Hari Terakhir)</CardTitle>
                <CardDescription className="text-xs text-slate-400">Jumlah tiket masuk per hari</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} dot={false} name="Pengunjung" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Perbandingan Status</CardTitle>
                <CardDescription className="text-xs text-slate-400">Selesai vs tidak hadir vs batal (30 hari)</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">Belum ada data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Jam sibuk + per-layanan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border border-slate-200 bg-white rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Jam Sibuk</CardTitle>
                <CardDescription className="text-xs text-slate-400">Jam dengan tiket terbanyak (30 hari)</CardDescription>
              </CardHeader>
              <CardContent>
                {peakHourData.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Belum ada data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={peakHourData} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="count" fill="#8B5CF6" name="Tiket" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Waktu Layanan per Layanan</CardTitle>
                <CardDescription className="text-xs text-slate-400">Rata-rata menit dilayani (30 hari)</CardDescription>
              </CardHeader>
              <CardContent>
                {perServiceData.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Belum ada data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={perServiceData} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="minutes" fill="#3B82F6" name="Menit" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
