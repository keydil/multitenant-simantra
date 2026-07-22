import { Wrench } from 'lucide-react';

// Ditampilkan menggantikan konten publik (kiosk/display/buku-tamu) saat Mode
// Maintenance global aktif. Sengaja brand-neutral & tanpa data tenant —
// pengunjung anonim tidak perlu (dan tidak seharusnya) melihat detail sistem.

const DEFAULT_MESSAGE =
  'Layanan antrian sedang dalam pemeliharaan. Mohon maaf atas ketidaknyamanannya — silakan coba beberapa saat lagi.';

export function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Sedang Pemeliharaan</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{message || DEFAULT_MESSAGE}</p>
      </div>
    </div>
  );
}
