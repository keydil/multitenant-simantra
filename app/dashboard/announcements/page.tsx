'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, AlertTriangle, AlertCircle, Zap, Info, Loader2 } from 'lucide-react';
import { useTenants, useAnnouncements } from '@/hooks/use-tenant-data';
import { announcementQueries } from '@/lib/api/queries';
import { useAuth } from '@/lib/auth/auth-context';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

export default function AnnouncementsPage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const { announcements, loading: announcementsLoading, setAnnouncements } = useAnnouncements();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'update',
    target: 'all',
    priority: 0,
    expires_days: 30,
  });

  useEffect(() => {
    if (tenants.length > 0 && selectedTenantIds.length === 0) {
      setSelectedTenantIds(tenants.map((t) => t.id));
    }
  }, [tenants, selectedTenantIds]);

  const handleOpenDialog = (announcement?: any) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        description: announcement.description,
        type: announcement.announcement_type,
        target: announcement.target_tenants,
        priority: announcement.priority,
        expires_days: 30,
      });
      if (announcement.specific_tenant_ids?.length) {
        setSelectedTenantIds(announcement.specific_tenant_ids);
      }
    } else {
      setEditingAnnouncement(null);
      setFormData({ title: '', description: '', type: 'update', target: 'all', priority: 0, expires_days: 30 });
      setSelectedTenantIds(tenants.map((t) => t.id));
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const isAllTenants = selectedTenantIds.length === tenants.length;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formData.expires_days);

      // specific_tenant_ids: undefined saat target 'all' (DTO backend menolak
      // array kosong); created_by diisi server dari token
      const payload = {
        title: formData.title,
        description: formData.description,
        announcement_type: formData.type as any,
        target_tenants: (isAllTenants ? 'all' : 'specific') as 'all' | 'specific',
        specific_tenant_ids: isAllTenants ? undefined : selectedTenantIds,
        priority: formData.priority,
        expires_at: expiresAt.toISOString(),
      };

      if (editingAnnouncement) {
        const data = await announcementQueries.update(editingAnnouncement.id, payload);
        setAnnouncements((prev: any[]) =>
          prev.map((a) => (a.id === editingAnnouncement.id ? { ...a, ...data } : a))
        );
        toast.success('Pengumuman berhasil diperbarui');
      } else {
        const data = await announcementQueries.create({ ...payload, is_active: true });
        if (data) setAnnouncements((prev: any[]) => [data, ...prev]);
        toast.success('Pengumuman berhasil disebar ke semua tenant');
      }
      setIsOpen(false);
    } catch (error: any) {
      console.error('[announcements] Save error:', error);
      toast.error('Gagal menyimpan', { description: friendlyErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Hapus pengumuman ini?',
      description: 'Pengumuman akan langsung berhenti tampil di semua instansi yang menjadi targetnya.',
      confirmText: 'Hapus',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await announcementQueries.update(id, { is_active: false });
      setAnnouncements((prev: any[]) => prev.filter((a) => a.id !== id));
      toast.success('Pengumuman dihapus');
    } catch (error) {
      toast.error('Gagal menghapus', { description: friendlyErrorMessage(error) });
    }
  };

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenantIds((prev) =>
      prev.includes(tenantId) ? prev.filter((id) => id !== tenantId) : [...prev, tenantId]
    );
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'maintenance': return <Zap className="w-4 h-4 text-red-500" />;
      case 'update': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      warning:     { label: 'Peringatan', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
      maintenance: { label: 'Maintenance', cls: 'bg-red-50 text-red-700 border border-red-200' },
      update:      { label: 'Update', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
      info:        { label: 'Info', cls: 'bg-slate-50 text-slate-600 border border-slate-200' },
    };
    const { label, cls } = map[type] || map.info;
    return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
  };

  if (tenantsLoading || announcementsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengumuman</h1>
          <p className="text-slate-400 text-sm mt-1">Broadcast notifikasi ke semua tenant</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Buat Pengumuman
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white rounded-2xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                {editingAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Kirim notifikasi ke semua tenant yang terpilih
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium text-slate-700">Judul</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Pemberitahuan Maintenance Sistem"
                  className="border-slate-200 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">Deskripsi</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Isi pengumuman lengkap..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-sm font-medium text-slate-700">Tipe</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="info">Info</option>
                    <option value="update">Update</option>
                    <option value="warning">Peringatan</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="priority" className="text-sm font-medium text-slate-700">Prioritas</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={0}>Rendah</option>
                    <option value={1}>Sedang</option>
                    <option value={2}>Tinggi</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expires" className="text-sm font-medium text-slate-700">Kedaluwarsa</Label>
                  <select
                    id="expires"
                    value={formData.expires_days}
                    onChange={(e) => setFormData({ ...formData, expires_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={7}>7 hari</option>
                    <option value={14}>14 hari</option>
                    <option value={30}>30 hari</option>
                    <option value={90}>90 hari</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Target Tenant</Label>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="all"
                      checked={selectedTenantIds.length === tenants.length}
                      onChange={(e) => setSelectedTenantIds(e.target.checked ? tenants.map((t) => t.id) : [])}
                      className="rounded border-slate-300"
                    />
                    <label htmlFor="all" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Semua Tenant
                    </label>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {tenants.map((tenant) => (
                      <div key={tenant.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={tenant.id}
                          checked={selectedTenantIds.includes(tenant.id)}
                          onChange={() => toggleTenantSelection(tenant.id)}
                          className="rounded border-slate-300"
                        />
                        <label htmlFor={tenant.id} className="text-sm text-slate-600 cursor-pointer">
                          {tenant.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="text-sm border-slate-200">
                  Batal
                </Button>
                <Button type="submit" disabled={isSaving} className="text-sm bg-slate-900 hover:bg-slate-800 text-white">
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</>
                  ) : editingAnnouncement ? 'Simpan Perubahan' : 'Sebar Pengumuman'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Pengumuman Aktif</CardTitle>
          <CardDescription className="text-xs text-slate-400">{announcements.length} pengumuman</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-center py-10 text-sm text-slate-400">
                Belum ada pengumuman. Buat satu untuk mulai notifikasi ke tenant.
              </p>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 hover:bg-slate-50/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 flex-shrink-0">
                        {getAnnouncementIcon(announcement.announcement_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm text-slate-900">{announcement.title}</h3>
                          {getTypeBadge(announcement.announcement_type)}
                          {announcement.priority > 0 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                              Prioritas {announcement.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mb-2 leading-relaxed">{announcement.description}</p>
                        <p className="text-xs text-slate-400">
                          Dibuat: {new Date(announcement.created_at).toLocaleDateString('id-ID')} &bull; Kedaluwarsa: {announcement.expires_at ? new Date(announcement.expires_at).toLocaleDateString('id-ID') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(announcement)} className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(announcement.id)} className="h-8 w-8 p-0 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
