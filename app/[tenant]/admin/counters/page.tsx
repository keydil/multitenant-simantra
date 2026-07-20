'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { queueQueries } from '@/lib/api/queries';
import { useTenant } from '@/hooks/use-tenant';
import type { Queue } from '@/lib/types/queue';
import {
  Plus, Edit2, Trash2, Clock, Hash, Loader2, CheckCircle, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCountersPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant, loading: tenantLoading } = useTenant(tenantSlug);

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
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (queue: Queue) => {
    if (!confirm(`Hapus loket "${queue.display_name || queue.name}"?`)) return;
    try {
      await queueQueries.update(queue.id, { is_active: false });
      toast.success('Loket berhasil dihapus');
      await fetchQueues();
    } catch (err: any) {
      toast.error(`Gagal menghapus: ${err.message}`);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Kelola Loket</h1>
          <p className="text-sm text-slate-400 mt-0.5">Atur jenis layanan dan loket antrian</p>
        </div>
        <button
          onClick={() => openDialog()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: brand }}
        >
          <Plus className="w-4 h-4" />
          Tambah Loket
        </button>
      </div>

      {/* Queue List */}
      {queues.length === 0 ? (
        <div className="text-center py-16">
          <Hash className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Belum ada loket. Tambahkan satu untuk memulai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {queues.map((queue) => (
            <div key={queue.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: brand }}
                  >
                    {queue.service_code || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{queue.display_name || queue.name}</p>
                    <p className="text-xs text-slate-400">{queue.name}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openDialog(queue)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(queue)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {queue.estimated_service_time_minutes} menit/orang
                </span>
                <span>Kapasitas: {queue.max_capacity}</span>
                <span className="flex items-center gap-1">
                  {queue.is_active ? (
                    <><CheckCircle className="w-3 h-3 text-emerald-500" /> Aktif</>
                  ) : (
                    <><XCircle className="w-3 h-3 text-slate-400" /> Nonaktif</>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              {editingQueue ? 'Edit Loket' : 'Tambah Loket Baru'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">Konfigurasi layanan dan estimasi waktu</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nama Loket</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Pendaftaran Pasien"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nama Tampilan</label>
                <input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Contoh: Registrasi"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Kode</label>
                  <input
                    value={formData.service_code}
                    onChange={(e) => setFormData({ ...formData, service_code: e.target.value.toUpperCase() })}
                    placeholder="A"
                    maxLength={2}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-center font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Kapasitas</label>
                  <input
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 100 })}
                    min={1}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Menit/Orang</label>
                  <input
                    type="number"
                    value={formData.estimated_service_time_minutes}
                    onChange={(e) => setFormData({ ...formData, estimated_service_time_minutes: parseInt(e.target.value) || 15 })}
                    min={1}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
                  style={{ background: brand }}
                >
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : editingQueue ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
