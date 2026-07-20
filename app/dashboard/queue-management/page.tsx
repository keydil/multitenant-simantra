'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Clock, Loader2 } from 'lucide-react';
import { useTenants } from '@/hooks/use-tenant-data';
import { useQueues } from '@/hooks/use-queue-data';
import { queueQueries } from '@/lib/api/queries';
import { toast } from 'sonner';

export default function QueueManagementPage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const { queues, loading: queuesLoading } = useQueues(selectedTenantId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    service_code: '',
    max_capacity: 100,
    estimated_service_time_minutes: 15,
  });

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  const handleOpenDialog = (queue?: any) => {
    if (queue) {
      setEditingQueue(queue);
      setFormData({
        name: queue.name,
        display_name: queue.display_name || '',
        service_code: queue.service_code || '',
        max_capacity: queue.max_capacity,
        estimated_service_time_minutes: queue.estimated_service_time_minutes,
      });
    } else {
      setEditingQueue(null);
      setFormData({ name: '', display_name: '', service_code: '', max_capacity: 100, estimated_service_time_minutes: 15 });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingQueue) {
        await queueQueries.update(editingQueue.id, formData);
        toast.success('Antrian berhasil diperbarui');
      } else {
        await queueQueries.create(selectedTenantId, {
          ...formData,
          color_code: '#3B82F6',
        });
        toast.success('Antrian berhasil dibuat');
      }
      setIsOpen(false);
      // Trigger refetch by re-setting tenant
      const prev = selectedTenantId;
      setSelectedTenantId('');
      setTimeout(() => setSelectedTenantId(prev), 50);
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (queueId: string) => {
    if (!confirm('Yakin mau hapus antrian ini?')) return;
    try {
      await queueQueries.update(queueId, { is_active: false });
      toast.success('Antrian berhasil dihapus');
      const prev = selectedTenantId;
      setSelectedTenantId('');
      setTimeout(() => setSelectedTenantId(prev), 50);
    } catch (error: any) {
      toast.error(`Gagal menghapus: ${error.message}`);
    }
  };

  if (tenantsLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-sm text-slate-400">Memuat...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Antrian</h1>
          <p className="text-slate-400 text-sm mt-1">Konfigurasi antrian layanan per tenant</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Tambah Antrian
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white rounded-2xl border border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-slate-900">
                  {editingQueue ? 'Edit Antrian' : 'Buat Antrian Baru'}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Atur parameter dan konfigurasi antrian layanan
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">Nama Antrian</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Pendaftaran Pasien"
                    className="border-slate-200 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="display_name" className="text-sm font-medium text-slate-700">Nama Tampilan</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Contoh: Registrasi"
                    className="border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="service_code" className="text-sm font-medium text-slate-700">Kode Layanan</Label>
                  <Input
                    id="service_code"
                    value={formData.service_code}
                    onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}
                    placeholder="Contoh: A, B, C"
                    maxLength={2}
                    className="border-slate-200 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="max_capacity" className="text-sm font-medium text-slate-700">Kapasitas Maks</Label>
                    <Input
                      id="max_capacity"
                      type="number"
                      value={formData.max_capacity}
                      onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
                      min={1}
                      className="border-slate-200 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="service_time" className="text-sm font-medium text-slate-700">Estimasi Waktu (menit)</Label>
                    <Input
                      id="service_time"
                      type="number"
                      value={formData.estimated_service_time_minutes}
                      onChange={(e) => setFormData({ ...formData, estimated_service_time_minutes: parseInt(e.target.value) })}
                      min={1}
                      className="border-slate-200 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="text-sm border-slate-200">
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSaving} className="text-sm bg-slate-900 hover:bg-slate-800 text-white">
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</> : editingQueue ? 'Simpan Perubahan' : 'Buat Antrian'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Antrian Aktif</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            {queuesLoading ? 'Memuat...' : `${queues.length} antrian dikonfigurasi`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queuesLoading ? (
            <div className="text-center py-10 text-sm text-slate-400">Memuat antrian...</div>
          ) : queues.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              Belum ada antrian untuk tenant ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500">Nama</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Kode</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Kapasitas</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Estimasi Waktu
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queues.map((queue) => (
                    <TableRow key={queue.id} className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="text-sm font-medium text-slate-800">
                        {queue.display_name || queue.name}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {queue.service_code}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{queue.max_capacity}</TableCell>
                      <TableCell className="text-sm text-slate-600">{queue.estimated_service_time_minutes} menit</TableCell>
                      <TableCell>
                        {queue.is_active ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            Nonaktif
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(queue)} className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(queue.id)} className="h-8 w-8 p-0 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
