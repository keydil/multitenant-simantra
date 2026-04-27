'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTenants, useAnalytics } from '@/hooks/use-tenant-data';
import { useQueueStatus } from '@/hooks/use-queue-data';
import { Users, Clock } from 'lucide-react';

export default function AnalyticsPage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const { analytics, loading: analyticsLoading } = useAnalytics(selectedTenantId, 30);
  const { statusSummary } = useQueueStatus(selectedTenantId);

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  const chartData = analytics.slice(0, 14).map((a) => ({
    date: new Date(a.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
    completed: a.completed_entries,
    waiting: a.total_entries - a.completed_entries,
    avgTime: Math.round(a.average_service_time_minutes || 0),
  }));

  const queueDistribution = statusSummary.map((s) => ({
    name: s.queue_name || 'Unknown',
    value: s.total_in_queue,
  }));

  const totalCompleted = analytics.reduce((sum, a) => sum + a.completed_entries, 0);
  const totalEntries = analytics.reduce((sum, a) => sum + a.total_entries, 0);
  const avgServiceTime = analytics.length > 0
    ? Math.round(analytics.reduce((sum, a) => sum + (a.average_service_time_minutes || 0), 0) / analytics.length)
    : 0;

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  const tooltipStyle = {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    fontSize: '12px',
    color: '#1e293b',
  };

  if (tenantsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-400">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analitik</h1>
          <p className="text-slate-400 text-sm mt-1">Statistik dan performa antrian</p>
        </div>
        <select
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Masuk (30h)',
            value: totalEntries,
            sub: 'Semua antrian',
            icon: <Users className="w-4 h-4 text-blue-600" />,
            iconBg: 'bg-blue-50',
          },
          {
            label: 'Selesai (30h)',
            value: totalCompleted,
            sub: `${totalEntries > 0 ? Math.round((totalCompleted / totalEntries) * 100) : 0}% completion rate`,
            icon: <Users className="w-4 h-4 text-emerald-600" />,
            iconBg: 'bg-emerald-50',
          },
          {
            label: 'Rata-rata Waktu Layanan',
            value: `${avgServiceTime}`,
            sub: 'menit per orang',
            icon: <Clock className="w-4 h-4 text-violet-600" />,
            iconBg: 'bg-violet-50',
          },
          {
            label: 'Sedang Mengantri',
            value: statusSummary.reduce((sum, s) => sum + s.waiting_count, 0),
            sub: 'Aktif saat ini',
            icon: <Users className="w-4 h-4 text-orange-500" />,
            iconBg: 'bg-orange-50',
          },
        ].map((kpi, i) => (
          <Card key={i} className="border border-slate-200 bg-white rounded-xl">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                <div className={`p-1.5 rounded-lg ${kpi.iconBg}`}>{kpi.icon}</div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{kpi.value.toLocaleString('id-ID')}</p>
              <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border border-slate-200 bg-white rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Tren Antrian (14 Hari Terakhir)</CardTitle>
            <CardDescription className="text-xs text-slate-400">Entri harian dan yang sudah selesai</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="completed" fill="#10B981" name="Selesai" radius={[3, 3, 0, 0]} />
                <Bar dataKey="waiting" fill="#F59E0B" name="Menunggu" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Distribusi Antrian</CardTitle>
            <CardDescription className="text-xs text-slate-400">Beban per antrian saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={queueDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {queueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chart Row 2 */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">Tren Waktu Layanan</CardTitle>
          <CardDescription className="text-xs text-slate-400">Durasi layanan dari waktu ke waktu</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="avgTime"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Rata-rata Waktu Layanan (menit)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
