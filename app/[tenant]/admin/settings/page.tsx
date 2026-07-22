'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { themeQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { useTenant } from '@/hooks/use-tenant';
import { Loader2, Save, Palette, Building2, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant, loading: tenantLoading } = useTenant(tenantSlug);

  const [isSaving, setIsSaving] = useState(false);
  // D1: kartu "Profil Instansi" HANYA-BACA untuk admin. Field-field ini
  // (name/description/brand_color/logo_url) disimpan lewat PATCH /tenants/:id
  // yang sengaja @Roles('superadmin') (DESIGN.md:171) — bukan bug backend.
  // Dulu form-nya editable + tombol "Simpan Profil" yang selalu 403. Sekarang
  // ditampilkan sebagai informasi read-only; `form` cuma untuk menampilkan
  // nilai dari server, tidak lagi disubmit. Theme & logo upload (endpoint
  // terpisah yang mengizinkan admin) tidak terpengaruh.
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
      })
      .catch(() => {});
  }, [tenant]);

  const handleSaveTheme = async () => {
    if (!tenant) return;
    setIsSaving(true);
    try {
      await themeQueries.update(tenant.id, themeForm);
      toast.success('Theme berhasil diperbarui');
    } catch (err) {
      toast.error('Gagal menyimpan theme', {
        description: friendlyErrorMessage(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const brand = tenant?.brand_color ?? '#1e40af';

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
                    onChange={(e) => setThemeForm({ ...themeForm, [key]: e.target.value })}
                    className="w-12 h-9 p-1 border border-slate-200 rounded-lg cursor-pointer"
                  />
                  <input
                    value={themeForm[key]}
                    onChange={(e) => setThemeForm({ ...themeForm, [key]: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

          <div className="flex justify-end">
            <button
              onClick={handleSaveTheme}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
              style={{ background: brand }}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Theme
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
