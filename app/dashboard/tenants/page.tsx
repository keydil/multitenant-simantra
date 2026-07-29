'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TenantsTable, Tenant } from '@/components/tenants-table';
import { AddTenantDialog, TenantFormData } from '@/components/add-tenant-dialog';
import { DeleteTenantDialog } from '@/components/delete-tenant-dialog';
import { Palette, Plus, Upload, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTenants, useTenantTheme } from '@/hooks/use-tenant-data';
import { tenantQueries, themeQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { HEADER_FONT_OPTIONS, HEADER_SUBTITLE_SIZE_OPTIONS } from '@/lib/theme/header-fonts';

export default function TenantsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  // E4: sebelumnya ikon pensil membuka dialog Theme, sehingga superadmin sama
  // sekali tidak punya jalan mengubah nama/deskripsi instansi — padahal dialah
  // satu-satunya role yang backend izinkan (DESIGN.md:171).
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', brand_color: '#3B82F6' });
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  // Ganti logo di dialog Edit — menutup gap: dulu logo cuma bisa diunggah saat
  // Tambah Instansi, tak ada jalan menggantinya. Endpoint POST /tenants/:id/logo
  // (superadmin-only) sudah ada; ini murni UI.
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // E8: hapus permanen — modal terpisah, dipicu dari menu aksi baris.
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  // E1/E3: harus ikut menarik yang nonaktif — kalau tidak, instansi yang
  // dinonaktifkan hilang dari dashboard dan mustahil diaktifkan lagi.
  const { tenants, setTenants } = useTenants({ includeInactive: true });
  const [showInactive, setShowInactive] = useState(true);
  const confirm = useConfirm();
  const { theme } = useTenantTheme(selectedTenant?.id || '');
  const [themeFormData, setThemeFormData] = useState({
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    accent_color: '#10B981',
    text_color: '#1F2937',
    background_color: '#FFFFFF',
    header_mode: 'generated' as 'generated' | 'wordmark',
    header_title_font: 'default',
    header_title_bold: true,
    // string kosong = "tak ada override" (bukan null) supaya <Input> selalu
    // controlled; dikonversi ke null oleh service saat disimpan (trim() || null).
    header_subtitle_text: '',
    header_subtitle_font: 'default',
    header_subtitle_bold: false,
    header_subtitle_size: 'sm',
    header_subtitle_color: '#64748b',
  });
  // Wordmark judul-tengah kiosk — TERPISAH dari themeFormData karena URL-nya
  // di-set lewat endpoint upload sendiri (bukan ikut PATCH theme JSON), sama
  // seperti pola editLogoUrl di atas untuk logo instansi.
  const [headerWordmarkUrl, setHeaderWordmarkUrl] = useState<string | null>(null);
  const [wordmarkBusy, setWordmarkBusy] = useState(false);
  const wordmarkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (theme) {
      setThemeFormData({
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        accent_color: theme.accent_color,
        text_color: theme.text_color,
        background_color: theme.background_color,
        header_mode: theme.header_mode,
        header_title_font: theme.header_title_font,
        header_title_bold: theme.header_title_bold,
        header_subtitle_text: theme.header_subtitle_text ?? '',
        header_subtitle_font: theme.header_subtitle_font,
        header_subtitle_bold: theme.header_subtitle_bold,
        header_subtitle_size: theme.header_subtitle_size,
        header_subtitle_color: theme.header_subtitle_color,
      });
      setHeaderWordmarkUrl(theme.header_wordmark_url);
    }
  }, [theme]);

  const handleAddTenant = async (data: TenantFormData) => {
    try {
      const slug = data.agencyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const newTenant = await tenantQueries.create({
        name: data.agencyName,
        subdomain: slug,
        brand_color: data.brandColor || '#3B82F6',
        subscription_tier: 'free',
      });

      // Fix UI_UX 3.4: logo dari dialog dulu dibuang — sekarang diupload
      // beneran (server simpan file + set logo_url otomatis)
      let logoUrl = newTenant.logo_url;
      if (data.logo) {
        const uploaded = await tenantQueries
          .uploadLogo(newTenant.id, data.logo)
          .catch(() => {
            toast.error('Tenant dibuat, tapi upload logo gagal', {
              description: 'Coba upload ulang logonya dari pengaturan tenant.',
            });
            return null;
          });
        if (uploaded) logoUrl = uploaded.logo_url;
      }

      // Dulu: window.location.reload() tepat setelah toast — toast ikut
      // terhapus sebelum sempat terbaca, dan seluruh halaman (termasuk daftar
      // theme di bawah) dibangun ulang dari nol cuma untuk menampilkan satu
      // baris baru. Sekarang daftarnya ditambah langsung dari respons server,
      // jadi tidak ada reload dan toast-nya bertahan penuh.
      setTenants((prev) => [{ ...newTenant, logo_url: logoUrl }, ...prev]);

      toast.success('Instansi berhasil ditambahkan', {
        description: `${data.agencyName} sudah aktif di sistem.`,
      });
    } catch (err) {
      toast.error('Gagal menambah instansi', {
        description: friendlyErrorMessage(err),
      });
      // Dilempar ulang supaya AddTenantDialog tahu ini gagal dan tetap
      // terbuka dengan isian utuh.
      throw err;
    }
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name,
      description: tenant.description ?? '',
      brand_color: tenant.brand_color || '#3B82F6',
    });
    setEditLogoUrl(tenant.logo_url ?? null);
    setEditDialogOpen(true);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset supaya pilih file sama lagi tetap memicu onChange
    if (!file || !editingTenant) return;

    // Guard ukuran di klien = UX cepat; backend tetap penjaga sebenarnya (2 MB).
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo terlalu besar', { description: 'Maksimal 2 MB.' });
      return;
    }

    setLogoBusy(true);
    try {
      const { logo_url } = await tenantQueries.uploadLogo(editingTenant.id, file);
      setEditLogoUrl(logo_url);
      setTenants((prev) =>
        prev.map((t) => (t.id === editingTenant.id ? { ...t, logo_url } : t))
      );
      toast.success('Logo diperbarui', { description: `Logo ${editingTenant.name} berhasil diganti.` });
    } catch (err) {
      toast.error('Gagal mengunggah logo', { description: friendlyErrorMessage(err) });
    } finally {
      setLogoBusy(false);
    }
  };

  // Wordmark judul-tengah kiosk — mirip persis handleLogoChange di atas, tapi
  // scoped ke selectedTenant (dialog Theme & Branding), BUKAN editingTenant
  // (dialog Edit Instansi terpisah). Upload murni set URL; tidak mengubah
  // header_mode — superadmin memilih mode aktif lewat toggle terpisah di UI.
  const handleWordmarkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedTenant) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Wordmark terlalu besar', { description: 'Maksimal 2 MB.' });
      return;
    }

    setWordmarkBusy(true);
    try {
      const { header_wordmark_url } = await tenantQueries.uploadHeaderWordmark(selectedTenant.id, file);
      setHeaderWordmarkUrl(header_wordmark_url);
      toast.success('Wordmark diperbarui', {
        description: `Wordmark untuk ${selectedTenant.name} berhasil diunggah.`,
      });
    } catch (err) {
      toast.error('Gagal mengunggah wordmark', { description: friendlyErrorMessage(err) });
    } finally {
      setWordmarkBusy(false);
    }
  };

  const handleRemoveWordmark = async () => {
    if (!selectedTenant) return;
    setWordmarkBusy(true);
    try {
      await tenantQueries.removeHeaderWordmark(selectedTenant.id);
      setHeaderWordmarkUrl(null);
      toast.success('Wordmark dihapus');
    } catch (err) {
      toast.error('Gagal menghapus wordmark', { description: friendlyErrorMessage(err) });
    } finally {
      setWordmarkBusy(false);
    }
  };

  const handleSaveTenant = async () => {
    if (!editingTenant) return;
    const name = editForm.name.trim();
    if (!name) {
      toast.error('Nama instansi tidak boleh kosong');
      return;
    }
    setIsSavingTenant(true);
    try {
      const updated = await tenantQueries.update(editingTenant.id, {
        name,
        description: editForm.description.trim() || null,
        brand_color: editForm.brand_color,
      } as any);
      setTenants((prev) =>
        prev.map((t) => (t.id === editingTenant.id ? { ...t, ...updated } : t))
      );
      toast.success('Instansi diperbarui', { description: `${name} berhasil disimpan.` });
      setEditDialogOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan instansi', { description: friendlyErrorMessage(err) });
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    const ok = await confirm({
      title: `Nonaktifkan ${tenant.name}?`,
      description:
        'Seluruh petugas instansi ini langsung tertendang dari sesinya, dan portal publiknya berhenti melayani pengunjung.',
      confirmText: 'Nonaktifkan',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await tenantQueries.delete(tenant.id);
      // Soft delete: baris tetap ada, statusnya saja yang berubah jadi
      // nonaktif — sama seperti yang akan dikirim server saat dimuat ulang.
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, is_active: false } : t))
      );
      toast.success('Instansi dinonaktifkan', {
        description: `${tenant.name} tidak bisa lagi diakses petugasnya.`,
      });
    } catch (err) {
      toast.error('Gagal menonaktifkan', {
        description: friendlyErrorMessage(err),
      });
    }
  };

  // E1: jalan pulang dari "Nonaktifkan". Tidak pakai dialog konfirmasi —
  // mengaktifkan kembali itu aksi yang membangun, bukan merusak, dan kalau
  // salah tinggal dinonaktifkan lagi.
  const handleReactivateTenant = async (tenant: Tenant) => {
    try {
      await tenantQueries.update(tenant.id, { is_active: true } as any);
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, is_active: true } : t))
      );
      toast.success('Instansi diaktifkan kembali', {
        description: `${tenant.name} bisa melayani pengunjung lagi.`,
      });
    } catch (err) {
      toast.error('Gagal mengaktifkan kembali', {
        description: friendlyErrorMessage(err),
      });
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedTenant) return;
    try {
      await themeQueries.update(selectedTenant.id, themeFormData);
      toast.success('Theme diperbarui', {
        description: `Theme untuk ${selectedTenant.name} berhasil disimpan.`,
      });
      setThemeDialogOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan theme', {
        description: friendlyErrorMessage(err),
      });
    }
  };

  const inactiveCount = tenants.filter((t) => !t.is_active).length;
  const visibleTenants = showInactive ? tenants : tenants.filter((t) => t.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Instansi</h1>
          <p className="text-slate-400 text-sm mt-1">Kelola semua instansi dan organisasi dalam sistem</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Tambah Instansi
        </Button>
      </div>

      {/* Tenants Table */}
      <div className="space-y-3">
        {inactiveCount > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Tampilkan {inactiveCount} instansi nonaktif
          </label>
        )}
        <TenantsTable
          tenants={visibleTenants}
          onEdit={handleEditTenant}
          onDelete={handleDeleteTenant}
          onReactivate={handleReactivateTenant}
          onRequestPurge={(tenant) => {
            setDeletingTenant(tenant);
            setDeleteDialogOpen(true);
          }}
        />
      </div>

      {/* Theme Customization */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-500" />
            Theme & White-labeling
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Kustomisasi warna dan branding per instansi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visibleTenants.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada instansi. Tambahkan satu terlebih dahulu.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {visibleTenants.map((tenant) => (
                <div key={tenant.id} className="space-y-2">
                  <div className="rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
                    <div className="h-20 w-full" style={{ backgroundColor: tenant.brand_color }} />
                    <div className="p-3">
                      <p className="font-semibold text-sm text-slate-800 truncate">{tenant.name}</p>
                      <p className="text-xs text-slate-400 truncate">{tenant.subdomain}.local</p>
                    </div>
                  </div>
                  <Dialog
                    open={themeDialogOpen && selectedTenant?.id === tenant.id}
                    onOpenChange={(open) => {
                      if (open) setSelectedTenant(tenant);
                      setThemeDialogOpen(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-slate-200 rounded-lg hover:bg-slate-50"
                        onClick={() => setSelectedTenant(tenant)}
                      >
                        <Palette className="w-3.5 h-3.5 mr-1.5" />
                        Kustomisasi
                      </Button>
                    </DialogTrigger>
                    {selectedTenant?.id === tenant.id && (
                      // Dulu satu <div> panjang tanpa batas tinggi — begitu
                      // fitur Judul Kiosk (mode/wordmark/font/subtitle) numpuk
                      // di bawah 5 input warna, tinggi total dialog gampang
                      // melebihi layar dan tombol Simpan jadi tak terjangkau
                      // sama sekali (tak ada scroll). Sekarang DialogContent
                      // dikunci max-h-[85vh] + flex kolom: header & footer
                      // (tombol) SELALU terlihat, isi dipecah 2 tab yang
                      // masing-masing scroll sendiri kalau kepanjangan.
                      <DialogContent className="max-w-lg bg-white rounded-2xl border border-slate-200 max-h-[85vh] flex flex-col p-0 gap-0">
                        <DialogHeader className="p-6 pb-4 flex-shrink-0">
                          <DialogTitle className="text-slate-900">Theme & Branding</DialogTitle>
                          <DialogDescription className="text-slate-400 text-sm">
                            Kustomisasi warna untuk {tenant.name}
                          </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="warna" className="flex-1 min-h-0 flex flex-col px-6">
                          <TabsList className="w-full grid grid-cols-2 flex-shrink-0">
                            <TabsTrigger value="warna">Warna Dasar</TabsTrigger>
                            <TabsTrigger value="header">Judul Kiosk</TabsTrigger>
                          </TabsList>

                          <TabsContent value="warna" className="overflow-y-auto space-y-4 py-4">
                            {[
                              { key: 'primary_color', label: 'Warna Utama' },
                              { key: 'secondary_color', label: 'Warna Sekunder' },
                              { key: 'accent_color', label: 'Warna Aksen' },
                              { key: 'text_color', label: 'Warna Teks' },
                              { key: 'background_color', label: 'Warna Background' },
                            ].map(({ key, label }) => (
                              <div key={key} className="space-y-1.5">
                                <Label htmlFor={key} className="text-sm font-medium text-slate-700">{label}</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id={key}
                                    type="color"
                                    // Cast literal ke union 5 key warna (bukan
                                    // `keyof typeof themeFormData` generik) —
                                    // sejak themeFormData ikut memuat field
                                    // boolean (header_title_bold dkk), indexed
                                    // access melebar jadi `string | boolean`.
                                    // Array ini cuma pernah berisi 5 key warna,
                                    // jadi cast ini akurat, bukan menipu compiler.
                                    value={themeFormData[key as 'primary_color' | 'secondary_color' | 'accent_color' | 'text_color' | 'background_color']}
                                    onChange={(e) => setThemeFormData({ ...themeFormData, [key]: e.target.value })}
                                    className="w-12 h-9 p-1 border-slate-200 rounded-lg"
                                  />
                                  <Input
                                    type="text"
                                    value={themeFormData[key as 'primary_color' | 'secondary_color' | 'accent_color' | 'text_color' | 'background_color']}
                                    onChange={(e) => setThemeFormData({ ...themeFormData, [key]: e.target.value })}
                                    className="flex-1 border-slate-200 text-sm font-mono"
                                  />
                                </div>
                              </div>
                            ))}
                          </TabsContent>

                          <TabsContent value="header" className="overflow-y-auto space-y-4 py-4">
                            {/* Judul tengah kiosk: teks auto-generate dari nama
                                instansi, ATAU wordmark gambar custom (mis. logotype
                                Figma). Aset TERPISAH dari Logo Instansi (ikon kotak
                                kecil di dialog Edit) — ini menggantikan <h1> judul
                                di header kiosk publik. Wordmark yang sudah diunggah
                                TETAP tersimpan walau mode balik ke Teks Otomatis,
                                supaya toggle bolak-balik tak perlu unggah ulang. */}
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Mode Judul</Label>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={themeFormData.header_mode === 'generated' ? 'default' : 'outline'}
                                  onClick={() => setThemeFormData({ ...themeFormData, header_mode: 'generated' })}
                                  className={`text-xs flex-1 ${themeFormData.header_mode === 'generated' ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'border-slate-200'}`}
                                >
                                  Teks Otomatis
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={themeFormData.header_mode === 'wordmark' ? 'default' : 'outline'}
                                  onClick={() => setThemeFormData({ ...themeFormData, header_mode: 'wordmark' })}
                                  className={`text-xs flex-1 ${themeFormData.header_mode === 'wordmark' ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'border-slate-200'}`}
                                >
                                  Gambar Wordmark
                                </Button>
                              </div>
                              <div className="flex items-center gap-3 pt-1">
                                <div className="w-28 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {headerWordmarkUrl ? (
                                    <img src={headerWordmarkUrl} alt="Wordmark kiosk" className="w-full h-full object-contain" />
                                  ) : (
                                    <ImageIcon className="w-5 h-5 text-slate-300" />
                                  )}
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => wordmarkInputRef.current?.click()}
                                    disabled={wordmarkBusy}
                                    className="text-xs border-slate-200 gap-2 justify-center"
                                  >
                                    {wordmarkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                    {headerWordmarkUrl ? 'Ganti Wordmark' : 'Unggah Wordmark'}
                                  </Button>
                                  {headerWordmarkUrl && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleRemoveWordmark}
                                      disabled={wordmarkBusy}
                                      className="text-xs border-slate-200 text-red-600 hover:text-red-700 justify-center"
                                    >
                                      Hapus
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <input
                                ref={wordmarkInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleWordmarkChange}
                                className="hidden"
                              />
                            </div>

                            {/* Tipografi cuma relevan di mode Teks Otomatis —
                                mode Wordmark menggantikan judul+subtitle
                                sepenuhnya dengan gambar, jadi kontrol font di
                                sini tak berpengaruh apa-apa kalau ditampilkan. */}
                            {themeFormData.header_mode === 'generated' && (
                              <div className="space-y-3 pt-3 border-t border-slate-100">
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Font Judul</Label>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={themeFormData.header_title_font}
                                      onValueChange={(v) => setThemeFormData({ ...themeFormData, header_title_font: v })}
                                    >
                                      <SelectTrigger className="flex-1 border-slate-200 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {HEADER_FONT_OPTIONS.map((f) => (
                                          <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <Switch
                                        checked={themeFormData.header_title_bold}
                                        onCheckedChange={(v) => setThemeFormData({ ...themeFormData, header_title_bold: v })}
                                      />
                                      <span className="text-xs text-slate-500">Bold</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Subtitle Kiosk</Label>
                                  <Input
                                    value={themeFormData.header_subtitle_text}
                                    onChange={(e) => setThemeFormData({ ...themeFormData, header_subtitle_text: e.target.value })}
                                    placeholder="SISTEM ANTRIAN DIGITAL"
                                    maxLength={100}
                                    className="border-slate-200 text-sm"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={themeFormData.header_subtitle_font}
                                      onValueChange={(v) => setThemeFormData({ ...themeFormData, header_subtitle_font: v })}
                                    >
                                      <SelectTrigger className="flex-1 border-slate-200 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {HEADER_FONT_OPTIONS.map((f) => (
                                          <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <Switch
                                        checked={themeFormData.header_subtitle_bold}
                                        onCheckedChange={(v) => setThemeFormData({ ...themeFormData, header_subtitle_bold: v })}
                                      />
                                      <span className="text-xs text-slate-500">Bold</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Select
                                      value={themeFormData.header_subtitle_size}
                                      onValueChange={(v) => setThemeFormData({ ...themeFormData, header_subtitle_size: v })}
                                    >
                                      <SelectTrigger className="flex-1 border-slate-200 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {HEADER_SUBTITLE_SIZE_OPTIONS.map((s) => (
                                          <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="color"
                                      value={themeFormData.header_subtitle_color}
                                      onChange={(e) => setThemeFormData({ ...themeFormData, header_subtitle_color: e.target.value })}
                                      className="w-12 h-9 p-1 border-slate-200 rounded-lg flex-shrink-0"
                                    />
                                  </div>
                                  <p className="text-xs text-slate-400">Kosongkan untuk pakai teks default.</p>
                                </div>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>

                        <div className="flex justify-end gap-2 p-6 pt-4 border-t border-slate-100 flex-shrink-0">
                          <Button variant="outline" onClick={() => setThemeDialogOpen(false)} className="text-sm border-slate-200">
                            Batal
                          </Button>
                          <Button onClick={handleSaveTheme} className="text-sm bg-slate-900 hover:bg-slate-800 text-white">
                            Simpan Theme
                          </Button>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* E4: dialog Edit Instansi yang sebenarnya — terpisah dari Theme */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Edit Instansi</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Ubah identitas {editingTenant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-sm font-medium text-slate-700">
                Nama Instansi
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="border-slate-200 text-sm"
                placeholder="mis. Dinas Kesehatan"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description" className="text-sm font-medium text-slate-700">
                Deskripsi <span className="text-slate-400 font-normal">(opsional)</span>
              </Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="border-slate-200 text-sm"
                placeholder="Keterangan singkat instansi"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-brand" className="text-sm font-medium text-slate-700">
                Warna Brand
              </Label>
              <div className="flex gap-2">
                <Input
                  id="edit-brand"
                  type="color"
                  value={editForm.brand_color}
                  onChange={(e) => setEditForm({ ...editForm, brand_color: e.target.value })}
                  className="w-12 h-9 p-1 border-slate-200 rounded-lg"
                />
                <Input
                  type="text"
                  value={editForm.brand_color}
                  onChange={(e) => setEditForm({ ...editForm, brand_color: e.target.value })}
                  className="flex-1 border-slate-200 text-sm font-mono"
                />
              </div>
            </div>

            {/* Ganti logo — menutup gap: dulu logo hanya bisa diunggah saat
                Tambah Instansi. Endpoint superadmin-only sudah ada, ini UI-nya. */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Logo Instansi</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {editLogoUrl ? (
                    <img src={editLogoUrl} alt="Logo instansi" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoBusy}
                  className="text-sm border-slate-200 gap-2"
                >
                  {logoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {editLogoUrl ? 'Ganti Logo' : 'Unggah Logo'}
                </Button>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
              <p className="text-xs text-slate-400">
                JPG, PNG, atau WebP. Maks 2 MB. Logo tersimpan otomatis saat dipilih —
                terpisah dari tombol &ldquo;Simpan Perubahan&rdquo;.
              </p>
            </div>

            {/* Subdomain sengaja dikunci: mengubahnya seketika mematikan SEMUA
                URL instansi yang sudah beredar di lapangan — QR kiosk yang
                sudah dicetak, bookmark petugas, URL layar display. Backend
                mengizinkan superadmin mengubahnya, tapi itu operasi migrasi,
                bukan sesuatu yang pantas ada di form edit biasa. */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Subdomain</Label>
              <Input
                value={editingTenant?.subdomain ?? ''}
                disabled
                className="border-slate-200 text-sm font-mono bg-slate-50 text-slate-500"
              />
              <p className="text-xs text-slate-400">
                Tidak bisa diubah di sini — mengganti subdomain akan mematikan semua QR kiosk
                dan URL yang sudah beredar.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="text-sm border-slate-200"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveTenant}
                disabled={isSavingTenant}
                className="text-sm bg-slate-900 hover:bg-slate-800 text-white"
              >
                {isSavingTenant ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* E8: hapus permanen adalah modal-nya SENDIRI, dipanggil dari menu aksi
          baris (sebelah "Aktifkan kembali") — bukan dijejalkan ke dialog Edit.
          Edit untuk mengubah, ini untuk menghancurkan; dua niat berbeda. */}
      <DeleteTenantDialog
        tenant={deletingTenant}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={(deleted) =>
          setTenants((prev) => prev.filter((t) => t.id !== deleted.id))
        }
      />

      <AddTenantDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleAddTenant} />
    </div>
  );
}
