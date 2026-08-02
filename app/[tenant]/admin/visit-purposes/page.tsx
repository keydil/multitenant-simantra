'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { visitPurposeQueries } from '@/lib/api/queries';
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
      <PageHeader
        title="Kelola Keperluan"
        subtitle="Atur pilihan keperluan kunjungan di form buku tamu"
        actions={
          <Button onClick={() => openDialog()} className="gap-2 text-white text-sm rounded-lg" style={{ background: brand }}>
            <Plus className="w-4 h-4" />
            Tambah Kategori
          </Button>
        }
      />

      {/* List */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Kategori Keperluan</CardTitle>
          <CardDescription className="text-xs text-slate-400">{purposes.length} kategori dikonfigurasi</CardDescription>
        </CardHeader>
        <CardContent>
          {purposes.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              <ListChecks className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Belum ada kategori. Tambahkan satu untuk memulai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500 w-10">Urutan</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Nama Kategori</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purposes.map((p, i) => (
                    <TableRow key={p.id} className={`border-slate-100 hover:bg-slate-50/50 ${p.is_active ? '' : 'opacity-60'}`}>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-800">{p.label}</TableCell>
                      <TableCell>
                        {p.is_active ? (
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
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(p)} title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'} className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                            {p.is_active ? <Eye className="w-3.5 h-3.5 text-slate-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDialog(p)} title="Edit kategori" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(p)} title="Hapus" className="h-8 w-8 p-0 hover:bg-red-50 rounded-lg">
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
              {editing ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Nama keperluan yang tampil sebagai pilihan di form buku tamu
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="label" className="text-sm font-medium text-slate-700">Nama Kategori</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Contoh: Konsultasi Layanan"
                autoFocus
                required
                maxLength={255}
                className="border-slate-200 text-sm"
              />
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
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Menyimpan...</> : editing ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
