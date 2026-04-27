import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Activity, Server } from 'lucide-react';

interface KPICardsProps {
  totalTenants?: number;
  totalQueues?: number;
  serverStatus?: 'online' | 'offline';
}

export function KPICards({
  totalTenants = 12,
  totalQueues = 457,
  serverStatus = 'online',
}: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Active Tenants Card */}
      <Card className="border-border bg-card hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Total Active Tenants</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold text-foreground">{totalTenants}</p>
            <CardDescription className="text-xs">
              <span className="text-green-600 dark:text-green-400 font-semibold">+2</span>
              <span className="text-muted-foreground"> from last month</span>
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      {/* Total Queues Today Card */}
      <Card className="border-border bg-card hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Total Queues Today</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold text-foreground">{totalQueues}</p>
            <CardDescription className="text-xs">
              <span className="text-green-600 dark:text-green-400 font-semibold">+42</span>
              <span className="text-muted-foreground"> from yesterday</span>
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      {/* Server Status Card */}
      <Card className="border-border bg-card hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Server Status</CardTitle>
            <div className={`p-2 rounded-lg ${
              serverStatus === 'online'
                ? 'bg-green-100 dark:bg-green-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <Server className={`h-4 w-4 ${
                serverStatus === 'online'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                serverStatus === 'online' ? 'bg-green-600 dark:bg-green-400' : 'bg-red-600 dark:bg-red-400'
              }`} />
              <p className={`text-sm font-semibold ${
                serverStatus === 'online'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {serverStatus === 'online' ? 'On-Premise' : 'Offline'}
              </p>
            </div>
            <CardDescription className="text-xs">
              {serverStatus === 'online' ? 'All systems operational' : 'Service unavailable'}
            </CardDescription>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
