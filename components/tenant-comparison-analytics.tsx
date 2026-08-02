'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { analyticsQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import type { TenantAnalyticsSummary } from '@/lib/api/types';

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  fontSize: '12px',
  color: '#1e293b',
};

const WINDOW_DAYS = 30;
const pad = (n: number) => String(n).padStart(2, '0');
const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function TenantComparisonAnalytics() {
  const [data, setData] = useState<TenantAnalyticsSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (WINDOW_DAYS - 1));
    analyticsQueries.getTenantsSummary(toInputDate(from), toInputDate(to))
      .then((rows) => { if (!cancelled) setData(rows); })
      .catch((err) => {
        if (!cancelled) toast.error('Gagal memuat perbandingan instansi', { description: friendlyErrorMessage(err) });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totalData = data.map((t) => ({ name: t.tenant_name, total: t.total_entries }));
  const serviceTimeData = data
    .filter((t) => t.average_service_minutes != null)
    .map((t) => ({ name: t.tenant_name, minutes: t.average_service_minutes as number }))
    .sort((a, b) => a.minutes - b.minutes);
  const attendanceData = data
    .filter((t) => t.attendance_rate != null)
    .map((t) => ({ name: t.tenant_name, rate: t.attendance_rate as number }))
    .sort((a, b) => b.rate - a.rate);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-400">Memuat perbandingan instansi...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardContent className="py-10 text-center text-sm text-slate-400">
          Belum ada data analitik untuk dibandingkan pada 30 hari terakhir.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Perbandingan Antar-Instansi</h2>
        <p className="text-sm text-slate-400">30 hari terakhir, lintas seluruh instansi aktif</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border border-slate-200 bg-white rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Jumlah Pengunjung per Instansi</CardTitle>
            <CardDescription className="text-xs text-slate-400">Instansi paling ramai, urut menurun</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(220, totalData.length * 36)}>
              <BarChart data={totalData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" fill="#3B82F6" name="Pengunjung" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Tingkat Kehadiran per Instansi</CardTitle>
            <CardDescription className="text-xs text-slate-400">% selesai dari tiket yang dipanggil</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(220, attendanceData.length * 36)}>
              <BarChart data={attendanceData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number) => [`${v}%`, 'Kehadiran']} />
                <Bar dataKey="rate" fill="#10B981" name="Kehadiran" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">Rata-rata Waktu Layanan per Instansi</CardTitle>
          <CardDescription className="text-xs text-slate-400">Menit rata-rata tertimbang, lintas semua layanan tiap instansi</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(220, serviceTimeData.length * 36)}>
            <BarChart data={serviceTimeData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number) => [`${v} menit`, 'Waktu Layanan']} />
              <Bar dataKey="minutes" fill="#F59E0B" name="Menit" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 mt-3">
            Perbandingan bersifat indikatif — kompleksitas layanan tiap instansi bisa berbeda, jadi waktu layanan yang lebih lama tidak selalu berarti kinerja lebih lambat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
