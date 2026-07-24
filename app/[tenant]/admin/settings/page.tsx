'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { themeQueries, tenantQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { useTenant } from '@/hooks/use-tenant';
import { Loader2, Palette, Building2, Globe, Lock, MonitorPlay, Upload, Trash2, Type, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant, loading: tenantLoading } = useTenant(tenantSlug);

  // E7: video signage instansi = self-manage admin (beda dari theme/logo yang
  // dikunci superadmin). Upload lewat POST /tenants/:id/video (diskStorage,
  // maks 50 MB, MP4/WebM). videoUrl null → display pakai layout nomor antrian.
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Teks berjalan display, self-manage admin. Kosong → display pakai default.
  const [runningText, setRunningText] = useState('');
  const [runningTextBusy, setRunningTextBusy] = useState(false);

  // D1 + reversal B1: kartu "Profil Instansi" DAN "Theme & White-labeling"
  // sama-sama HANYA-BACA untuk admin. Profil (name/description/brand_color/
  // logo_url) lewat PATCH /tenants/:id, dan kini theme (warna) lewat PATCH
  // /tenants/:id/theme juga @Roles('superadmin') — brand = identitas instansi,
  // dipegang superadmin. Kedua `form`/`themeForm` cuma untuk menampilkan nilai
  // dari server, tidak lagi disubmit.
  const [form, setForm] = useState({
    name: '',
    description: '',
    brand_color: '#1e40af',
    logo_url: '',
  });
  const [themeForm, setThemeForm] = useState({
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    accent_color: '#10B981',
    text_color: '#1F2937',
    background_color: '#FFFFFF',
  });

  useEffect(() => {
    if (!tenant) return;
    setForm({
      name: tenant.name || '',
      description: tenant.description || '',
      brand_color: tenant.brand_color || '#1e40af',
      logo_url: tenant.logo_url || '',
    });

    themeQueries.getByTenant(tenant.id)
      .then((data) => {
        setThemeForm({
          primary_color: data.primary_color || '#3B82F6',
          secondary_color: data.secondary_color || '#1E40AF',
          accent_color: data.accent_color || '#10B981',
          text_color: data.text_color || '#1F2937',
          background_color: data.background_color || '#FFFFFF',
        });
        setVideoUrl(data.video_url ?? null);
        setRunningText(data.running_text ?? '');
      })
      .catch(() => {});
  }, [tenant]);

  const handleSaveRunningText = async () => {
    if (!tenant) return;
    setRunningTextBusy(true);
    try {
      await themeQueries.updateRunningText(tenant.id, runningText);
      toast.success('Teks berjalan disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan teks berjalan', { description: friendlyErrorMessage(err) });
    } finally {
      setRunningTextBusy(false);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset supaya pilih file sama lagi tetap memicu onChange
    if (!file || !tenant) return;

    // Guard ukuran di klien = UX cepat; backend tetap penjaga sebenarnya (50 MB).
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video terlalu besar', { description: 'Maksimal 50 MB.' });
      return;
    }

    setVideoBusy(true);
    try {
      const { video_url } = await tenantQueries.uploadVideo(tenant.id, file);
      setVideoUrl(video_url);
      toast.success('Video display berhasil diunggah');
    } catch (err) {
      toast.error('Gagal mengunggah video', { description: friendlyErrorMessage(err) });
    } finally {
      setVideoBusy(false);
    }
  };

  const handleRemoveVideo = async () => {
    if (!tenant) return;
    setVideoBusy(true);
    try {
      await tenantQueries.removeVideo(tenant.id);
      setVideoUrl(null);
      toast.success('Video display dihapus');
    } catch (err) {
      toast.error('Gagal menghapus video', { description: friendlyErrorMessage(err) });
    } finally {
      setVideoBusy(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const colorFields = [
    { key: 'primary_color', label: 'Warna Utama' },
    { key: 'secondary_color', label: 'Warna Sekunder' },
    { key: 'accent_color', label: 'Warna Aksen' },
    { key: 'text_color', label: 'Warna Teks' },
    { key: 'background_color', label: 'Warna Background' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pengaturan</h1>
        <p className="text-sm text-slate-400 mt-0.5">Kelola profil dan tampilan instansi</p>
      </div>

      {/* Profil Instansi */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Profil Instansi</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nama Instansi</label>
            <input
              value={form.name}
              readOnly
              disabled
              className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Deskripsi</label>
            <textarea
              value={form.description}
              readOnly
              disabled
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 resize-none cursor-not-allowed"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Warna Brand</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.brand_color}
                  disabled
                  className="w-12 h-9 p-1 border border-slate-200 rounded-lg cursor-not-allowed opacity-60"
                />
                <input
                  value={form.brand_color}
                  readOnly
                  disabled
                  className="flex-1 px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">URL Logo</label>
              <input
                value={form.logo_url}
                readOnly
                disabled
                placeholder="—"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 placeholder-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: form.brand_color }}
            >
              {form.name.slice(0, 2).toUpperCase() || 'IN'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{form.name || 'Nama Instansi'}</p>
              <p className="text-xs text-slate-400">{tenantSlug}.simantra.id</p>
            </div>
          </div>

          {/* D1: nota read-only — menggantikan tombol "Simpan Profil" yang
              dulu selalu 403 untuk admin. */}
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-3">
            <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Profil instansi hanya dapat diubah oleh superadmin. Hubungi superadmin untuk
              perubahan nama, deskripsi, atau subdomain instansi.
            </p>
          </div>
        </div>
      </div>

      {/* Theme / White-labeling */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Palette className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Theme & White-labeling</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colorFields.map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={themeForm[key]}
                    disabled
                    className="w-12 h-9 p-1 border border-slate-200 rounded-lg cursor-not-allowed opacity-60"
                  />
                  <input
                    value={themeForm[key]}
                    readOnly
                    disabled
                    className="flex-1 px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Color Preview Strip */}
          <div className="flex rounded-xl overflow-hidden h-10">
            {Object.values(themeForm).map((color, i) => (
              <div key={i} className="flex-1" style={{ background: color }} />
            ))}
          </div>

          {/* Reversal B1: nota read-only — menggantikan tombol "Simpan Theme".
              Theme & logo brand dikunci superadmin, sejajar Profil Instansi. */}
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-3">
            <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Theme dan logo instansi hanya dapat diubah oleh superadmin. Hubungi superadmin
              untuk perubahan warna atau logo instansi.
            </p>
          </div>
        </div>
      </div>

      {/* Video Display (E7) — self-manage admin */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <MonitorPlay className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Video Layar Tunggu</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Video yang diputar di layar TV ruang tunggu (<span className="font-mono">/{tenantSlug}/display</span>).
            Diputar berulang tanpa suara. Jika kosong, layar menampilkan nomor antrian seperti biasa.
            Format MP4 atau WebM, maksimal 50 MB.
          </p>

          {videoUrl ? (
            <div className="space-y-3">
              <video
                src={videoUrl}
                controls
                muted
                className="w-full max-h-72 rounded-lg bg-slate-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={videoBusy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                >
                  {videoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Ganti Video
                </button>
                <button
                  onClick={handleRemoveVideo}
                  disabled={videoBusy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={videoBusy}
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-60"
            >
              {videoBusy ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-600 font-semibold">Klik untuk mengunggah video</span>
                  <span className="text-xs text-slate-400">MP4 / WebM, maks 50 MB</span>
                </>
              )}
            </button>
          )}

          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleVideoChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Teks Berjalan (running text) — self-manage admin */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Type className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Teks Berjalan</h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Teks yang berjalan di bagian bawah layar TV ruang tunggu. Pisahkan poin dengan
            tanda titik tengah (•). Jika dikosongkan, layar memakai teks default.
          </p>
          <textarea
            value={runningText}
            onChange={(e) => setRunningText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="MELAYANI DENGAN SEPENUH HATI • BUDAYAKAN ANTRE"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{runningText.length}/500</span>
            <button
              onClick={handleSaveRunningText}
              disabled={runningTextBusy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
              style={{ background: tenant?.brand_color ?? '#1e40af' }}
            >
              {runningTextBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Teks
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Informasi Sistem</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Subdomain</p>
              <p className="font-medium text-slate-700">{tenantSlug}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Platform</p>
              <p className="font-medium text-slate-700">SIMANTRA v1.0</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">URL Kiosk</p>
              <p className="font-mono text-xs text-blue-600">/{tenantSlug}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">URL TV Display</p>
              <p className="font-mono text-xs text-blue-600">/{tenantSlug}/display</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
