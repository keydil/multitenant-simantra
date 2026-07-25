import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_COLORS, type StatusKey, type AccentColor } from '@/lib/status-colors';

const FALLBACK_COLOR: AccentColor = {
  text: 'text-slate-600',
  bg: 'bg-slate-50',
  border: 'border-slate-100',
};

interface StatCardProps {
  label: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  /** Warna semantik status antrian (waiting/serving/completed/operator). */
  status?: StatusKey;
  /** Override manual untuk metrik non-status (mis. "Instansi Aktif"). Diabaikan kalau `status` diisi. */
  color?: AccentColor;
  loading?: boolean;
}

/** Primitive KPI tile — satu sumber kebenaran pengganti components/kpi-cards.tsx
 *  (superadmin) & array `kpiCards` inline di app/[tenant]/admin/page.tsx yang
 *  dulu dua rupa (ukuran angka, posisi ikon, format angka beda). Belum
 *  diadopsi ke kedua tempat itu — lihat rencana audit UI template §3. */
export function StatCard({ label, value, description, icon: Icon, status, color, loading }: StatCardProps) {
  const accent = status ? STATUS_COLORS[status] : (color ?? FALLBACK_COLOR);
  const display = loading ? '—' : typeof value === 'number' ? value.toLocaleString('id-ID') : value;

  return (
    <Card className={`border ${accent.border} bg-white hover:shadow-md transition-shadow duration-200 rounded-xl`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </CardTitle>
          <div className={`p-2 ${accent.bg} rounded-lg`}>
            <Icon className={`h-4 w-4 ${accent.text}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-bold text-slate-900">{display}</p>
          {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
