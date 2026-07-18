'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import {
  Plus, Edit2, Trash2, Loader2, Mail, Shield, User,
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

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Operator | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'operator' });

  const supabase = createClient();

  const fetchOperators = useCallback(async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as any;
    setOperators((data ?? []) as Operator[]);
    setLoading(false);
  }, [tenant, supabase]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const openDialog = (op?: Operator) => {
    if (op) {
      setEditingOp(op);
      setFormData({ email: op.email, full_name: op.full_name || '', role: op.role });
    } else {
      setEditingOp(null);
      setFormData({ email: '', full_name: '', role: 'operator' });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setIsSaving(true);
    try {
      if (editingOp) {
        const { error } = await (supabase as any).from('tenant_users').update({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
        }).eq('id', editingOp.id);
        if (error) throw error;
        toast.success('Pengguna berhasil diperbarui');
      } else {
        const { error } = await (supabase as any).from('tenant_users').insert({
          tenant_id: tenant.id,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: true,
          auth_user_id: crypto.randomUUID(),
        });
        if (error) throw error;
        toast.success('Pengguna berhasil ditambahkan');
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
    if (!confirm(`Nonaktifkan akun "${op.full_name || op.email}"?`)) return;
    try {
      const { error } = await (supabase as any).from('tenant_users').update({ is_active: false }).eq('id', op.id);
      if (error) throw error;
      toast.success('Pengguna berhasil dinonaktifkan');
      await fetchOperators();
    } catch (err: any) {
      toast.error(`Gagal menghapus: ${err.message}`);
    }
  };

  const brand = tenant?.brand_color ?? '#1e40af';

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Kelola Operator</h1>
          <p className="text-sm text-slate-400 mt-0.5">Atur petugas dan admin instansi</p>
        </div>
        <button
          onClick={() => openDialog()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: brand }}
        >
          <Plus className="w-4 h-4" />
          Tambah Petugas
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Total Petugas</p>
          <p className="text-2xl font-bold text-slate-900">{operators.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Operator</p>
          <p className="text-2xl font-bold text-slate-900">{operators.filter(o => o.role === 'operator').length}</p>
        </div>
      </div>

      {/* Operator List */}
      {operators.length === 0 ? (
        <div className="text-center py-16">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Belum ada petugas. Tambahkan satu untuk memulai.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {operators.map((op) => (
            <div key={op.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ background: brand }}
                >
                  {(op.full_name || op.email).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{op.full_name || '(Tanpa nama)'}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="w-3 h-3" />
                    {op.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {roleBadge(op.role)}
                <button onClick={() => openDialog(op)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(op)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
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
              {editingOp ? 'Edit Petugas' : 'Tambah Petugas Baru'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">Atur informasi dan peran petugas</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="petugas@instansi.go.id"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nama Lengkap</label>
                <input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nama lengkap petugas"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Role</label>
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
                      style={formData.role === val ? { background: brand, ringColor: brand } : {}}
                    >
                      <p className="text-sm font-medium">{label}</p>
                      <p className={`text-[10px] mt-0.5 ${formData.role === val ? 'text-white/70' : 'text-slate-400'}`}>{desc}</p>
                    </button>
                  ))}
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
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : editingOp ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
