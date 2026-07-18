import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Activity, CheckCircle, Users } from 'lucide-react';

interface KPICardsProps {
  totalTenants: number;
  totalQueuesToday: number;
  totalServing: number;
  totalCompleted: number;
}

export function KPICards({
  totalTenants,
  totalQueuesToday,
  totalServing,
  totalCompleted,
}: KPICardsProps) {
  const cards = [
    {
      title: 'Instansi Aktif',
      value: totalTenants,
      description: 'Total tenant terdaftar',
      icon: TrendingUp,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Antrian Hari Ini',
      value: totalQueuesToday,
      description: 'Total tiket masuk',
      icon: Activity,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Sedang Dilayani',
      value: totalServing,
      description: 'Di semua loket saat ini',
      icon: Users,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Selesai Hari Ini',
      value: totalCompleted,
      description: 'Antrian terlayani',
      icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border border-slate-200 bg-white hover:shadow-md transition-shadow duration-200 rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </CardTitle>
                <div className={`p-2 ${card.iconBg} rounded-lg`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <p className="text-3xl font-bold text-slate-900">
                  {card.value.toLocaleString('id-ID')}
                </p>
                <CardDescription className="text-xs text-slate-400">
                  {card.description}
                </CardDescription>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
