'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { tenantUserQueries } from '@/lib/api/queries';
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
import {
  Plus, Edit2, Trash2, Loader2, Mail, User, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Operator {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export default function AdminOperatorsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant, loading: tenantLoading } = useTenant(tenantSlug);
  const confirm = useConfirm();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Operator | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'operator', password: '' });

  const fetchOperators = useCallback(async () => {
    if (!tenant) return;
    try {
      const data = await tenantUserQueries.getByTenant(tenant.id);
      // E1/E2: dulu di sini ada `.filter(u => u.is_active)` — petugas yang
      // dinonaktifkan langsung raib dari daftar, sehingga admin mengira
      // akunnya terhapus permanen dan tidak punya cara mengembalikannya.
      // Sekarang semua ditarik; penyaringan dilakukan di tampilan.
      setOperators(data as Operator[]);
    } catch {
      // biarkan list terakhir
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const openDialog = (op?: Operator) => {
    if (op) {
      setEditingOp(op);
      setFormData({ email: op.email, full_name: op.full_name || '', role: op.role, password: '' });
    } else {
      setEditingOp(null);
      setFormData({ email: '', full_name: '', role: 'operator', password: '' });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setIsSaving(true);
    try {
      if (editingOp) {
        // Email tidak bisa diubah (tidak ada di UpdateUserDto backend)
        await tenantUserQueries.update(editingOp.id, {
          full_name: formData.full_name,
          role: formData.role as any,
        });
        toast.success('Pengguna berhasil diperbarui');
      } else {
        // POST /users backend — admin otomatis dipaksa ke tenant sendiri,
        // must_change_password=true (fix permanen ghost account 3.3)
        await tenantUserQueries.create({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role as any,
          password: formData.password,
        });
        toast.success('Petugas berhasil ditambahkan. Password sementara wajib diganti saat login pertama.');
      }
      setIsOpen(false);
      await fetchOperators();
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (op: Operator) => {
    const ok = await confirm({
      title: `Nonaktifkan akun "${op.full_name || op.email}"?`,
      description: 'Petugas ini langsung tidak bisa masuk lagi, dan sesinya yang sedang berjalan ikut diputus.',
      confirmText: 'Nonaktifkan',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await tenantUserQueries.update(op.id, { is_active: false });
      toast.success('Petugas berhasil dinonaktifkan', {
        description: 'Akunnya tetap ada di daftar dan bisa diaktifkan kembali kapan saja.',
      });
      await fetchOperators();
    } catch (err) {
      toast.error('Gagal menonaktifkan', { description: friendlyErrorMessage(err) });
    }
  };

  // E1: jalan pulang. Tanpa konfirmasi — aksi yang membangun, bukan merusak.
  const handleReactivate = async (op: Operator) => {
    try {
      await tenantUserQueries.update(op.id, { is_active: true });
      toast.success('Petugas diaktifkan kembali', {
        description: `${op.full_name || op.email} bisa masuk lagi.`,
      });
      await fetchOperators();
    } catch (err) {
      toast.error('Gagal mengaktifkan kembali', { description: friendlyErrorMessage(err) });
    }
  };

  const brand = tenant?.brand_color ?? '#1e40af';
  const activeOperators = operators.filter((o) => o.is_active);

  const roleBadge = (role: string) => {
    if (role === 'admin') return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">Admin</span>;
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Operator</span>;
  };

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
        title="Kelola Operator"
        subtitle="Atur petugas dan admin instansi"
        actions={
          <Button onClick={() => openDialog()} className="gap-2 text-white text-sm rounded-lg" style={{ background: brand }}>
            <Plus className="w-4 h-4" />
            Tambah Petugas
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Petugas Aktif</p>
          {/* Sengaja hanya menghitung yang aktif: daftar sekarang ikut memuat
              petugas nonaktif, dan angka ini dipakai untuk menilai kesiapan
              layanan — bukan berapa baris yang tampil. */}
          <p className="text-2xl font-bold text-slate-900">{activeOperators.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Operator</p>
          <p className="text-2xl font-bold text-slate-900">{activeOperators.filter(o => o.role === 'operator').length}</p>
        </div>
      </div>

      {/* Operator List */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Petugas</CardTitle>
          <CardDescription className="text-xs text-slate-400">{operators.length} akun terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          {operators.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Belum ada petugas. Tambahkan satu untuk memulai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500">Nama</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Email</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Role</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.map((op) => (
                    <TableRow key={op.id} className={`border-slate-100 hover:bg-slate-50/50 ${op.is_active ? '' : 'opacity-60'}`}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                            style={{ background: op.is_active ? brand : '#94a3b8' }}
                          >
                            {(op.full_name || op.email).slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-slate-800">{op.full_name || '(Tanpa nama)'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {op.email}
                        </div>
                      </TableCell>
                      <TableCell>{roleBadge(op.role)}</TableCell>
                      <TableCell>
                        {op.is_active ? (
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
                          <Button variant="ghost" size="sm" onClick={() => openDialog(op)} title="Edit petugas" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                          {op.is_active ? (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(op)} title="Nonaktifkan petugas" className="h-8 w-8 p-0 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleReactivate(op)} title="Aktifkan kembali" className="h-8 w-8 p-0 hover:bg-emerald-50 rounded-lg">
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                            </Button>
                          )}
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
              {editingOp ? 'Edit Petugas' : 'Tambah Petugas Baru'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Atur informasi dan peran petugas
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="petugas@instansi.go.id"
                required
                disabled={!!editingOp}
                className="border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-sm font-medium text-slate-700">Nama Lengkap</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nama lengkap petugas"
                className="border-slate-200 text-sm"
              />
            </div>
            {!editingOp && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password Sementara</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                  className="border-slate-200 text-sm"
                />
                <p className="text-xs text-slate-400">
                  Petugas akan diwajibkan mengganti password ini saat login pertama.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Role</Label>
              <div className="flex gap-2">
                {[
                  { val: 'operator', label: 'Operator', desc: 'Petugas loket' },
                  { val: 'admin', label: 'Admin', desc: 'Pengelola instansi' },
                ].map(({ val, label, desc }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: val })}
                    className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                      formData.role === val
                        ? 'border-transparent ring-2 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                    style={formData.role === val ? { background: brand } : {}}
                  >
                    <p className="text-sm font-medium">{label}</p>
                    <p className={`text-[10px] mt-0.5 ${formData.role === val ? 'text-white/70' : 'text-slate-400'}`}>{desc}</p>
                  </button>
                ))}
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
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Menyimpan...</> : editingOp ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
