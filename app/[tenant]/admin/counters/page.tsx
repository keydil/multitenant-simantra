'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { queueQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Queue } from '@/lib/types/queue';
import {
  Plus, Edit2, Trash2, Clock, Hash, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCountersPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant, loading: tenantLoading } = useTenant(tenantSlug);
  const confirm = useConfirm();

  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    service_code: '',
    max_capacity: 100,
    estimated_service_time_minutes: 15,
  });

  const fetchQueues = useCallback(async () => {
    if (!tenant) return;
    try {
      const data = await queueQueries.getByTenant(tenant.id);
      data.sort((a, b) => (a.service_code ?? '').localeCompare(b.service_code ?? ''));
      setQueues(data as Queue[]);
    } catch {
      // biarkan list terakhir
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const openDialog = (queue?: Queue) => {
    if (queue) {
      setEditingQueue(queue);
      setFormData({
        name: queue.name,
        display_name: queue.display_name ?? '',
        service_code: queue.service_code ?? '',
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
    if (!tenant) return;
    setIsSaving(true);
    try {
      if (editingQueue) {
        // Satu set endpoint yang sama dgn halaman superadmin (UI_UX 1.3)
        await queueQueries.update(editingQueue.id, formData);
        toast.success('Loket berhasil diperbarui');
      } else {
        await queueQueries.create(tenant.id, { ...formData, color_code: '#3B82F6' });
        toast.success('Loket berhasil ditambahkan');
      }
      setIsOpen(false);
      await fetchQueues();
    } catch (err) {
      toast.error('Gagal menyimpan', { description: friendlyErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (queue: Queue) => {
    const ok = await confirm({
      title: `Hapus loket "${queue.display_name || queue.name}"?`,
      description: 'Loket berhenti muncul di kiosk dan tidak bisa lagi mengambil tiket baru. Riwayat tiketnya tetap tersimpan.',
      confirmText: 'Hapus',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await queueQueries.update(queue.id, { is_active: false });
      toast.success('Loket berhasil dihapus');
      await fetchQueues();
    } catch (err) {
      toast.error('Gagal menghapus', { description: friendlyErrorMessage(err) });
    }
  };

  const brand = tenant?.brand_color ?? '#1e40af';

  if (tenantLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Loket"
        subtitle="Atur jenis layanan dan loket antrian"
        actions={
          <Button onClick={() => openDialog()} className="gap-2 text-white text-sm rounded-lg" style={{ background: brand }}>
            <Plus className="w-4 h-4" />
            Tambah Loket
          </Button>
        }
      />

      {/* Queue List */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Loket Aktif</CardTitle>
          <CardDescription className="text-xs text-slate-400">{queues.length} loket dikonfigurasi</CardDescription>
        </CardHeader>
        <CardContent>
          {queues.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              <Hash className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Belum ada loket. Tambahkan satu untuk memulai.
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
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: brand }}
                          >
                            {queue.service_code || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{queue.display_name || queue.name}</p>
                            {queue.display_name && <p className="text-xs text-slate-400">{queue.name}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {queue.service_code || '-'}
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
                          <Button variant="ghost" size="sm" onClick={() => openDialog(queue)} className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(queue)} className="h-8 w-8 p-0 hover:bg-red-50 rounded-lg">
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

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white rounded-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              {editingQueue ? 'Edit Loket' : 'Tambah Loket Baru'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Konfigurasi layanan dan estimasi waktu
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">Nama Loket</Label>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="service_code" className="text-sm font-medium text-slate-700">Kode</Label>
                <Input
                  id="service_code"
                  value={formData.service_code}
                  onChange={(e) => setFormData({ ...formData, service_code: e.target.value.toUpperCase() })}
                  placeholder="A"
                  maxLength={2}
                  className="border-slate-200 text-sm text-center font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_capacity" className="text-sm font-medium text-slate-700">Kapasitas</Label>
                <Input
                  id="max_capacity"
                  type="number"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 100 })}
                  min={1}
                  className="border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service_time" className="text-sm font-medium text-slate-700">Menit/Orang</Label>
                <Input
                  id="service_time"
                  type="number"
                  value={formData.estimated_service_time_minutes}
                  onChange={(e) => setFormData({ ...formData, estimated_service_time_minutes: parseInt(e.target.value) || 15 })}
                  min={1}
                  className="border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="text-sm border-slate-200">
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="text-sm text-white"
                style={{ background: brand }}
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Menyimpan...</> : editingQueue ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
