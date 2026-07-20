'use client';

import { useEffect, useState, useCallback } from 'react';
import { KPICards } from '@/components/kpi-cards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { tenantQueries, queueQueries, queueEntryQueries } from '@/lib/api/queries';
import type { QueueEntry } from '@/lib/api/types';

interface DashboardStats {
  totalTenants: number;
  totalQueuesToday: number;
  totalServing: number;
  totalCompleted: number;
}

interface ActivityItem {
  event: string;
  time: string;
  type: 'queue' | 'completed' | 'serving' | 'tenant' | 'no_show';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const since = todayStart.toISOString();

    try {
      // Tidak ada endpoint agregat global — susun dari endpoint per-tenant
      // (superadmin boleh akses semua tenant; jumlah tenant kecil)
      const tenants = await tenantQueries.getAll();

      const perTenant = await Promise.all(
        tenants.map(async (t) => {
          const [todayEntries, activeEntries, queues] = await Promise.all([
            // Semua entry hari ini (utk "masuk hari ini" + "selesai hari ini")
            queueEntryQueries.getByTenant(t.id, {
              status: 'waiting,serving,completed,no_show,cancelled', since, limit: 500,
            }),
            // Serving saat ini (tanpa batas tanggal, sama spt perilaku lama)
            queueEntryQueries.getByTenant(t.id, { status: 'serving', limit: 500 }),
            queueQueries.getByTenant(t.id, { includeInactive: true }).catch(() => []),
          ]);
          return { tenant: t, todayEntries, activeEntries, queues };
        })
      );

      setStats({
        totalTenants: tenants.length,
        totalQueuesToday: perTenant.reduce((n, r) => n + r.todayEntries.length, 0),
        totalServing: perTenant.reduce((n, r) => n + r.activeEntries.length, 0),
        totalCompleted: perTenant.reduce(
          (n, r) => n + r.todayEntries.filter(e => e.status === 'completed').length, 0
        ),
      });

      // Recent activity: gabungan entry terbaru lintas tenant
      const queueNames = new Map<string, string>();
      const tenantNames = new Map<string, string>();
      for (const r of perTenant) {
        tenantNames.set(r.tenant.id, r.tenant.name);
        for (const q of r.queues) queueNames.set(q.id, q.name);
      }

      const recentEntries: QueueEntry[] = perTenant
        .flatMap(r => r.todayEntries)
        .sort((a, b) => b.entered_at.localeCompare(a.entered_at))
        .slice(0, 8);

      {
        const mapped: ActivityItem[] = recentEntries.map((entry) => {
          const queueName = queueNames.get(entry.queue_id) || 'Antrian';
          const tenantName = tenantNames.get(entry.tenant_id) || 'Tenant';

          if (entry.status === 'completed') {
            return {
              event: `${entry.ticket_number} selesai dilayani di ${queueName} — ${tenantName}`,
              time: timeAgo(entry.completed_at || entry.entered_at),
              type: 'completed' as const,
            };
          }
          if (entry.status === 'serving') {
            return {
              event: `${entry.ticket_number} sedang dilayani di ${queueName} — ${tenantName}`,
              time: timeAgo(entry.started_at || entry.entered_at),
              type: 'serving' as const,
            };
          }
          if (entry.status === 'no_show') {
            return {
              event: `${entry.ticket_number} tidak hadir di ${queueName} — ${tenantName}`,
              time: timeAgo(entry.entered_at),
              type: 'no_show' as const,
            };
          }
          return {
            event: `${entry.ticket_number} masuk antrian ${queueName} — ${tenantName}`,
            time: timeAgo(entry.entered_at),
            type: 'queue' as const,
          };
        });
        setActivities(mapped);
      }
    } catch (err) {
      console.error('[dashboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Auto-refresh setiap 30 detik
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Selamat datang kembali! Ini ringkasan sistem kamu.
        </p>
      </div>

      {/* KPI Cards — data real dari DB */}
      <KPICards
        totalTenants={stats?.totalTenants ?? 0}
        totalQueuesToday={stats?.totalQueuesToday ?? 0}
        totalServing={stats?.totalServing ?? 0}
        totalCompleted={stats?.totalCompleted ?? 0}
      />

      {/* Recent Activity — dari data queue_entries terbaru */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">Aktivitas Terbaru</CardTitle>
          <CardDescription className="text-xs text-slate-400">Pergerakan antrian terkini di seluruh instansi</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400">
              Belum ada aktivitas antrian hari ini.
            </p>
          ) : (
            <div className="space-y-1">
              {activities.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.type === 'completed' ? 'bg-emerald-500' :
                      item.type === 'serving' ? 'bg-blue-500' :
                      item.type === 'queue' ? 'bg-violet-500' :
                      item.type === 'no_show' ? 'bg-orange-400' :
                      'bg-slate-400'
                    }`} />
                    <span className="text-sm text-slate-700">{item.event}</span>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{item.time}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
