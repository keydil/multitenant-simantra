'use client';

// B1: dulu halaman ini 5 tab yang 100% dekoratif ("Simpan" no-op). Keputusan
// final: 4 tab dihapus (Keamanan/Notifikasi/Pengguna/Database — palsu & tidak
// sepadan dibikin nyata; tab Pengguna pun menduplikasi /dashboard/users), dan
// dibangun SATU fitur nyata: Mode Maintenance global. Karena tinggal satu
// section, struktur tab ikut dihilangkan.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Wrench } from 'lucide-react';
import { systemQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    systemQueries
      .getMaintenanceStatus()
      .then((res) => {
        setActive(res.active);
        setMessage(res.message ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await systemQueries.updateMaintenance(active, message.trim() || undefined);
      setActive(res.active);
      setMessage(res.message ?? '');
      toast.success(res.active ? 'Mode Maintenance diaktifkan' : 'Mode Maintenance dimatikan', {
        description: res.active
          ? 'Halaman pengunjung (kiosk, antrian, display, buku tamu) kini menampilkan layar pemeliharaan.'
          : 'Halaman pengunjung kembali berjalan normal.',
      });
    } catch (err) {
      toast.error('Gagal menyimpan', { description: friendlyErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-slate-400 text-sm mt-1">Konfigurasi sistem global</p>
      </div>

      <Card className="border border-slate-200 bg-white rounded-xl max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-500" />
            Mode Maintenance
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Saat aktif, halaman pengunjung (kiosk, antrian, display, buku tamu) menampilkan layar
            pemeliharaan. Portal petugas & halaman login tetap bisa diakses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">Aktifkan Mode Maintenance</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {active
                      ? 'Sedang aktif — pengunjung melihat layar pemeliharaan.'
                      : 'Tidak aktif — layanan berjalan normal.'}
                  </p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maintenance-message" className="text-sm font-medium text-slate-700">
                  Pesan Pemeliharaan <span className="text-slate-400 font-normal">(opsional)</span>
                </Label>
                <Textarea
                  id="maintenance-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Kosongkan untuk memakai pesan default."
                  className="border-slate-200 text-sm resize-none"
                />
                <p className="text-xs text-slate-400">
                  Ditampilkan di layar pemeliharaan yang dilihat pengunjung.
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
