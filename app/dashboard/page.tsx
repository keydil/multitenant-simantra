'use client';

import { KPICards } from '@/components/kpi-cards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, Users, Zap } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Selamat datang kembali! Ini ringkasan sistem kamu.
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards totalTenants={12} totalQueues={457} serverStatus="online" />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Active Users Card */}
        <Card className="border border-slate-200 bg-white hover:shadow-md transition-shadow duration-200 rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pengguna Aktif Hari Ini
              </CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-bold text-slate-900">2.847</p>
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <ArrowUpRight className="h-3 w-3" />
                <span>+12% dari kemarin</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Performance Card */}
        <Card className="border border-slate-200 bg-white hover:shadow-md transition-shadow duration-200 rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Performa Sistem
              </CardTitle>
              <div className="p-2 bg-violet-50 rounded-lg">
                <Zap className="h-4 w-4 text-violet-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">Uptime</span>
                  <span className="text-xs font-bold text-slate-800">99.8%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.8%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">Response Time</span>
                  <span className="text-xs font-bold text-slate-800">45ms</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">Aktivitas Terbaru</CardTitle>
          <CardDescription className="text-xs text-slate-400">Event dan perubahan sistem terkini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {[
              { event: 'Dinas Kesehatan berhasil di-onboard', time: '2 jam lalu', type: 'onboard' },
              { event: 'Maintenance sistem selesai', time: '5 jam lalu', type: 'maintenance' },
              { event: 'Antrian baru dibuat untuk Puskesmas Sentosa', time: '1 hari lalu', type: 'queue' },
              { event: 'Kantor Imigrasi di-suspend karena tidak aktif', time: '2 hari lalu', type: 'suspend' },
              { event: 'Backup berhasil diselesaikan', time: '3 hari lalu', type: 'backup' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.type === 'onboard' ? 'bg-emerald-500' :
                    item.type === 'maintenance' ? 'bg-blue-500' :
                    item.type === 'queue' ? 'bg-violet-500' :
                    item.type === 'suspend' ? 'bg-orange-400' :
                    'bg-slate-400'
                  }`} />
                  <span className="text-sm text-slate-700">{item.event}</span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{item.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
