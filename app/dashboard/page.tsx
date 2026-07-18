'use client';

import { useEffect, useState, useCallback } from 'react';
import { KPICards } from '@/components/kpi-cards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
    const supabase = createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      // Fetch stats in parallel
      const [tenantsRes, queueTodayRes, servingRes, completedRes] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true }).gte('entered_at', todayStart.toISOString()),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('status', 'serving'),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('entered_at', todayStart.toISOString()),
      ]);

      setStats({
        totalTenants: tenantsRes.count ?? 0,
        totalQueuesToday: queueTodayRes.count ?? 0,
        totalServing: servingRes.count ?? 0,
        totalCompleted: completedRes.count ?? 0,
      });

      // Fetch recent activity (last 10 queue entries across all tenants)
      const { data: recentEntries } = await supabase
        .from('queue_entries')
        .select('ticket_number, status, entered_at, started_at, completed_at, queues(name), tenants(name)')
        .order('entered_at', { ascending: false })
        .limit(8) as any;

      if (recentEntries) {
        const mapped: ActivityItem[] = recentEntries.map((entry: any) => {
          const queueName = entry.queues?.name || 'Antrian';
          const tenantName = entry.tenants?.name || 'Tenant';

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
