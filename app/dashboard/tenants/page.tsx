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
import { Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenants, useTenantTheme } from '@/hooks/use-tenant-data';
import { tenantQueries, themeQueries } from '@/lib/supabase/queries';

export default function TenantsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const { toast } = useToast();
  const { tenants } = useTenants();
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
      const { data: newTenant, error } = await tenantQueries.create({
        name: data.agencyName,
        subdomain: slug,
        address: data.address || null,
        brand_color: data.brandColor || '#3B82F6',
        subscription_tier: data.subscriptionTier || 'free',
        is_active: true,
      });
      if (error) throw error;
      toast({
        title: 'Tenant berhasil ditambahkan',
        description: `${data.agencyName} telah ditambahkan ke sistem.`,
      });
      // Reload page to refresh data
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Gagal menambah tenant',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setThemeDialogOpen(true);
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Yakin mau menonaktifkan ${tenant.name}?`)) return;
    try {
      const { error } = await tenantQueries.delete(tenant.id);
      if (error) throw error;
      toast({
        title: 'Tenant dinonaktifkan',
        description: `${tenant.name} telah dinonaktifkan.`,
      });
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Gagal menghapus',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedTenant) return;
    try {
      const { error } = await themeQueries.update(selectedTenant.id, themeFormData);
      if (error) throw error;
      toast({
        title: 'Theme diperbarui',
        description: `Theme untuk ${selectedTenant.name} berhasil disimpan.`,
      });
      setThemeDialogOpen(false);
    } catch (err: any) {
      toast({
        title: 'Gagal menyimpan theme',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

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
      <TenantsTable onEdit={handleEditTenant} onDelete={handleDeleteTenant} />

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
          {tenants.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada instansi. Tambahkan satu terlebih dahulu.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {tenants.map((tenant) => (
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

      <AddTenantDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleAddTenant} />
    </div>
  );
}
