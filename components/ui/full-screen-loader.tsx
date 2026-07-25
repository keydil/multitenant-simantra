import { Loader2 } from 'lucide-react';

interface FullScreenLoaderProps {
  title: string;
  subtitle?: string;
  /** Kelas warna teks Tailwind untuk spinner, mis. "text-blue-500". */
  spinnerColor?: string;
}

/** Primitive layar penuh loading/signing-out — dulu blok markup identik
 *  copy-paste 4x (app/dashboard/layout.tsx x2, app/[tenant]/admin/layout.tsx
 *  x2). Belum diadopsi ke tempat itu — lihat rencana audit UI template. */
export function FullScreenLoader({ title, subtitle, spinnerColor = 'text-slate-400' }: FullScreenLoaderProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
          <Loader2 className={`w-12 h-12 animate-spin ${spinnerColor} absolute inset-0`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
