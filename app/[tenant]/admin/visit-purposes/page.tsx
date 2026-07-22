'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { visitPurposeQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTenant } from '@/hooks/use-tenant';
import type { VisitPurpose } from '@/lib/api/types';
import {
  Plus, Edit2, Trash2, Loader2, ChevronUp, ChevronDown, ListChecks, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminVisitPurposesPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant, loading: tenantLoading } = useTenant(tenantSlug);
  const confirm = useConfirm();

  const [purposes, setPurposes] = useState<VisitPurpose[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<VisitPurpose | null>(null);
  const [label, setLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const fetchPurposes = useCallback(async () => {
    if (!tenant) return;
    try {
      setPurposes(await visitPurposeQueries.getByTenant(tenant.id));
    } catch {
      // biarkan list terakhir
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchPurposes();
  }, [fetchPurposes]);

  const openDialog = (p?: VisitPurpose) => {
    setEditing(p ?? null);
    setLabel(p?.label ?? '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    const trimmed = label.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      if (editing) {
        await visitPurposeQueries.update(editing.id, { label: trimmed });
        toast.success('Kategori diperbarui');
      } else {
        await visitPurposeQueries.create(tenant.id, trimmed);
        toast.success('Kategori ditambahkan');
      }
      setIsOpen(false);
      await fetchPurposes();
    } catch (err) {
      toast.error('Gagal menyimpan', { description: friendlyErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (p: VisitPurpose) => {
    try {
      await visitPurposeQueries.update(p.id, { is_active: !p.is_active });
      setPurposes((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x))
      );
    } catch (err) {
      toast.error('Gagal mengubah status', { description: friendlyErrorMessage(err) });
    }
  };

  // Reorder tukar sort_order dengan tetangga (dua PATCH). List selalu terurut
  // sort_order asc, jadi "naik" = tukar dengan index-1.
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= purposes.length || reordering) return;
    const a = purposes[index];
    const b = purposes[target];
    setReordering(true);
    try {
      await Promise.all([
        visitPurposeQueries.update(a.id, { sort_order: b.sort_order }),
        visitPurposeQueries.update(b.id, { sort_order: a.sort_order }),
      ]);
      await fetchPurposes();
    } catch (err) {
      toast.error('Gagal mengubah urutan', { description: friendlyErrorMessage(err) });
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async (p: VisitPurpose) => {
    const ok = await confirm({
      title: `Hapus kategori "${p.label}"?`,
      description: 'Kategori berhenti muncul di form buku tamu. Entri lama yang sudah memakainya tetap tersimpan.',
      confirmText: 'Hapus',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await visitPurposeQueries.delete(p.id);
      toast.success('Kategori dihapus');
      await fetchPurposes();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Kelola Keperluan</h1>
          <p className="text-sm text-slate-400 mt-0.5">Atur pilihan keperluan kunjungan di form buku tamu</p>
        </div>
        <button
          onClick={() => openDialog()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: brand }}
        >
          <Plus className="w-4 h-4" />
          Tambah Kategori
        </button>
      </div>

      {/* List */}
      {purposes.length === 0 ? (
        <div className="text-center py-16">
          <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Belum ada kategori. Tambahkan satu untuk memulai.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {purposes.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${p.is_active ? '' : 'opacity-60'}`}>
              {/* Reorder */}
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || reordering}
                  className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                  title="Naikkan"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === purposes.length - 1 || reordering}
                  className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                  title="Turunkan"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800 truncate">{p.label}</span>
                {!p.is_active && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    Nonaktif
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(p)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {p.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => openDialog(p)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
              {editing ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">Nama keperluan yang tampil sebagai pilihan di form buku tamu</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nama Kategori</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Contoh: Konsultasi Layanan"
                  autoFocus
                  required
                  maxLength={255}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
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
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
