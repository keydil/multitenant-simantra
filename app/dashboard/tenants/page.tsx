'use client';

import { useState, useEffect } from 'react';
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
import { TenantsTable, Tenant } from '@/components/tenants-table';
import { AddTenantDialog, TenantFormData } from '@/components/add-tenant-dialog';
import { DeleteTenantDialog } from '@/components/delete-tenant-dialog';
import { Palette, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTenants, useTenantTheme } from '@/hooks/use-tenant-data';
import { tenantQueries, themeQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/ui/confirm-dialog';

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
  });

  useEffect(() => {
    if (theme) {
      setThemeFormData({
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        accent_color: theme.accent_color,
        text_color: theme.text_color,
        background_color: theme.background_color,
      });
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
    setEditDialogOpen(true);
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
                      <DialogContent className="max-w-md bg-white rounded-2xl border border-slate-200">
                        <DialogHeader>
                          <DialogTitle className="text-slate-900">Theme & Branding</DialogTitle>
                          <DialogDescription className="text-slate-400 text-sm">
                            Kustomisasi warna untuk {tenant.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
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
                                  value={themeFormData[key as keyof typeof themeFormData]}
                                  onChange={(e) => setThemeFormData({ ...themeFormData, [key]: e.target.value })}
                                  className="w-12 h-9 p-1 border-slate-200 rounded-lg"
                                />
                                <Input
                                  type="text"
                                  value={themeFormData[key as keyof typeof themeFormData]}
                                  onChange={(e) => setThemeFormData({ ...themeFormData, [key]: e.target.value })}
                                  className="flex-1 border-slate-200 text-sm font-mono"
                                />
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setThemeDialogOpen(false)} className="text-sm border-slate-200">
                              Batal
                            </Button>
                            <Button onClick={handleSaveTheme} className="text-sm bg-slate-900 hover:bg-slate-800 text-white">
                              Simpan Theme
                            </Button>
                          </div>
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
