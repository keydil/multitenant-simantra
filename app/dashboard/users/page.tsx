'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Mail, Shield, Loader2, RotateCcw } from 'lucide-react';
import { useTenants, useTenantUsers } from '@/hooks/use-tenant-data';
import { tenantUserQueries } from '@/lib/api/queries';
import type { TenantUser } from '@/lib/api/types';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

export default function UserManagementPage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const { users, loading: usersLoading, setUsers } = useTenantUsers(selectedTenantId);
  const confirm = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'operator', password: '' });

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({ email: user.email, full_name: user.full_name || '', role: user.role, password: '' });
    } else {
      setEditingUser(null);
      setFormData({ email: '', full_name: '', role: 'operator', password: '' });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingUser) {
        // Email tidak bisa diubah (tidak ada di UpdateUserDto backend)
        await tenantUserQueries.update(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role as any,
        });
        toast.success('Pengguna berhasil diperbarui');
      } else {
        // POST /users backend: hash password + must_change_password=true,
        // aturan role sama dgn route Next lama (yang sudah dihapus)
        await tenantUserQueries.create({
          tenant_id: formData.role === 'superadmin' ? undefined : selectedTenantId,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role as any,
          password: formData.password,
        });
        toast.success('Pengguna berhasil dibuat. Password sementara wajib diganti saat login pertama.');
      }
      setIsOpen(false);
      // Refetch
      const prev = selectedTenantId;
      setSelectedTenantId('');
      setTimeout(() => setSelectedTenantId(prev), 50);
    } catch (error: any) {
      toast.error('Gagal menyimpan', { description: friendlyErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    const ok = await confirm({
      title: 'Nonaktifkan pengguna ini?',
      description: 'Akunnya langsung tidak bisa dipakai masuk, dan sesi yang sedang aktif ikut diputus.',
      confirmText: 'Nonaktifkan',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await tenantUserQueries.update(userId, { is_active: false });
      // Dulu memakai trik `setSelectedTenantId('')` + setTimeout untuk memaksa
      // hook memuat ulang — seluruh daftar berkedip kosong dulu. Hook ini sudah
      // mengekspos setUsers, jadi cukup ubah baris yang bersangkutan.
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: false } : u))
      );
      toast.success('Pengguna berhasil dinonaktifkan');
    } catch (error) {
      toast.error('Gagal menonaktifkan', { description: friendlyErrorMessage(error) });
    }
  };

  // E1: jalan pulang. Tanpa konfirmasi — mengaktifkan kembali itu aksi yang
  // membangun, dan kalau salah tinggal dinonaktifkan lagi.
  const handleReactivate = async (user: TenantUser) => {
    try {
      await tenantUserQueries.update(user.id, { is_active: true });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: true } : u))
      );
      toast.success('Pengguna diaktifkan kembali', {
        description: `${user.full_name || user.email} bisa masuk lagi.`,
      });
    } catch (error) {
      toast.error('Gagal mengaktifkan kembali', { description: friendlyErrorMessage(error) });
    }
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      superadmin: { label: 'Superadmin', cls: 'bg-red-50 text-red-700 border border-red-200' },
      admin:      { label: 'Admin', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
      operator:   { label: 'Operator', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
      viewer:     { label: 'Viewer', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
    };
    const { label, cls } = map[role] || map.viewer;
    return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
  };

  if (tenantsLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-sm text-slate-400">Memuat...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna</h1>
          <p className="text-slate-400 text-sm mt-1">Kelola pengguna tenant dan atur role akses</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                Tambah Pengguna
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white rounded-2xl border border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-slate-900">
                  {editingUser ? 'Edit Pengguna' : 'Buat Pengguna Baru'}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Tambah atau perbarui info pengguna dan atur role
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
                    placeholder="pengguna@contoh.com"
                    className="border-slate-200 text-sm"
                    required
                    disabled={!!editingUser}
                  />
                  {editingUser && (
                    <p className="text-xs text-slate-400">Email tidak dapat diubah.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-sm font-medium text-slate-700">Nama Lengkap</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Budi Santoso"
                    className="border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-sm font-medium text-slate-700">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {/* E5: opsi "viewer" DIHAPUS dari sini. Role itu tidak
                        pernah diimplementasikan — backend tidak punya satupun
                        @Roles('viewer') (DESIGN.md:103: dipertahankan hanya
                        demi CHECK constraint Supabase lama), dan signInTenant
                        tidak mengarahkannya ke halaman manapun. Akun viewer
                        berhasil login lalu terjebak diam di layar login.
                        Tipe 'viewer' sengaja DIPERTAHANKAN di types.ts &
                        auth-context.tsx supaya baris lama di DB tetap terbaca. */}
                    <option value="operator">Operator (Kelola Antrian)</option>
                    <option value="admin">Admin (Akses Penuh)</option>
                    <option value="superadmin">Superadmin (Admin Sistem)</option>
                  </select>
                  {!editingUser && formData.role === 'superadmin' && (
                    <p className="text-xs text-slate-400">Superadmin tidak terikat instansi manapun — pilihan tenant di atas diabaikan.</p>
                  )}
                </div>
                {!editingUser && (
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password Sementara</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimal 8 karakter"
                      className="border-slate-200 text-sm"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-slate-400">Pengguna akan diwajibkan mengganti password ini saat login pertama.</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="text-sm border-slate-200">
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSaving} className="text-sm bg-slate-900 hover:bg-slate-800 text-white">
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</> : editingUser ? 'Simpan Perubahan' : 'Buat Pengguna'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border border-slate-200 bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Daftar Pengguna</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            {usersLoading ? 'Memuat...' : `${users.length} pengguna di tenant ini`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-10 text-sm text-slate-400">Memuat pengguna...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">Belum ada pengguna di tenant ini</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500">Nama</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email</div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Role</div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Login Terakhir</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="text-sm font-medium text-slate-800">{user.full_name || 'N/A'}</TableCell>
                      <TableCell className="text-sm text-slate-500">{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Aktif</span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Nonaktif</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString('id-ID') : 'Belum pernah'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(user)} className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg" title="Edit pengguna">
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                          {/* E1: pengguna nonaktif dulu buntu — badge "Nonaktif"
                              tampil, tapi tak ada satupun cara mengaktifkannya
                              lagi (dialog edit hanya berisi nama & role). */}
                          {user.is_active ? (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="h-8 w-8 p-0 hover:bg-red-50 rounded-lg" title="Nonaktifkan pengguna">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleReactivate(user)} className="h-8 w-8 p-0 hover:bg-emerald-50 rounded-lg" title="Aktifkan kembali">
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
    </div>
  );
}
