'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Users, ListOrdered, CheckCircle, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';

interface Stats {
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  totalOperators: number;
}

export default function AdminDashboardPage() {
  const params = useParams();
  const { user } = useAuth();
  const tenantSlug = params.tenant as string;
  const [stats, setStats] = useState<Stats>({ totalWaiting: 0, totalServing: 0, totalCompleted: 0, totalOperators: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      // Ambil tenant_id dulu
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', tenantSlug)
        .single();

      if (!tenant) return;
      const tenantId = (tenant as any).id as string;

      // Fetch stats paralel
      const [waitingRes, servingRes, completedRes, operatorsRes] = await Promise.all([
        supabase.from('queue_entries').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('status', 'waiting'),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('status', 'serving'),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('status', 'completed')
          .gte('entered_at', new Date().toISOString().split('T')[0]),
        supabase.from('tenant_users').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('role', 'operator').eq('is_active', true),
      ]);

      setStats({
        totalWaiting: waitingRes.count || 0,
        totalServing: servingRes.count || 0,
        totalCompleted: completedRes.count || 0,
        totalOperators: operatorsRes.count || 0,
      });
      setLoading(false);
    };

    fetchStats();

    // Realtime update setiap 10 detik
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const kpiCards = [
    {
      label: 'Menunggu',
      value: stats.totalWaiting,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      desc: 'Antrian saat ini',
    },
    {
      label: 'Sedang Dilayani',
      value: stats.totalServing,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      desc: 'Di semua loket',
    },
    {
      label: 'Selesai Hari Ini',
      value: stats.totalCompleted,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      desc: 'Total terlayani',
    },
    {
      label: 'Operator Aktif',
      value: stats.totalOperators,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      desc: 'Petugas loket',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {greeting()}, {user?.full_name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Sistem aktif
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label}
              className={`bg-white border ${card.border} rounded-xl p-4 hover:shadow-sm transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '—' : card.value}
              </p>
              <p className="text-xs font-medium text-slate-600 mt-0.5">{card.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{card.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">Aksi Cepat</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href={`/${tenantSlug}/admin/guest-book`}
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <ListOrdered className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Lihat Buku Tamu</p>
                <p className="text-xs text-slate-400">Data pengunjung hari ini</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </a>

          <a href={`/${tenantSlug}/admin/operators`}
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Kelola Operator</p>
                <p className="text-xs text-slate-400">{stats.totalOperators} operator aktif</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
}