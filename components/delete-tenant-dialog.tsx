'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { tenantQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';
import type { Tenant, TenantPurgePreview } from '@/lib/api/types';
import { toast } from 'sonner';

// E8 — modal hapus permanen instansi, terpisah dari dialog Edit.
//
// Dipanggil dari menu aksi baris dan HANYA untuk instansi nonaktif (server
// juga menolak yang aktif dengan 400 — interlock dua langkah). Tiga lapis:
//  1. Wajib nonaktif dulu — ditegakkan di pemanggil + server.
//  2. Tunjukkan yang akan hancur dengan angka nyata; mengetik nama hanya
//     membuktikan user membaca *nama*, angka inilah yang bikin *harganya*
//     terasa — sekaligus otomatis membedakan instansi uji coba (semua nol).
//  3. Ketik nama persis sebagai konfirmasi terakhir.

interface DeleteTenantDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (tenant: Tenant) => void;
}

export function DeleteTenantDialog({
  tenant,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTenantDialogProps) {
  const [typed, setTyped] = useState('');
  const [preview, setPreview] = useState<TenantPurgePreview | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset + tarik angka tiap kali dialog dibuka untuk sebuah instansi. Angka
  // sengaja ditarik di sini, bukan saat daftar instansi dimuat — supaya tidak
  // ada satu request per baris tabel.
  useEffect(() => {
    if (!open || !tenant) return;
    setTyped('');
    setPreview(null);
    setPreviewFailed(false);
    setIsDeleting(false);

    let cancelled = false;
    tenantQueries
      .purgePreview(tenant.id)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreviewFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tenant]);

  const nameMatches = !!tenant && typed.trim() === tenant.name;
  const totalRecords = preview
    ? preview.users + preview.queues + preview.entries + preview.guest_book_entries
    : 0;

  const handleDelete = async () => {
    if (!tenant || !nameMatches || isDeleting) return;
    setIsDeleting(true);
    try {
      await tenantQueries.purge(tenant.id);
      toast.success('Instansi dihapus permanen', {
        description: `${tenant.name} beserta seluruh datanya sudah dihapus.`,
      });
      onDeleted(tenant);
      onOpenChange(false);
    } catch (err) {
      toast.error('Gagal menghapus instansi', { description: friendlyErrorMessage(err) });
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isDeleting && onOpenChange(next)}>
      <DialogContent className="max-w-md bg-white rounded-2xl border border-red-200">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Hapus permanen instansi
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Tindakan ini tidak bisa dibatalkan. Tidak ada cadangan, tidak ada tong sampah.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Lapis 2 — harga yang sebenarnya */}
          <div className="rounded-lg bg-red-50/60 border border-red-100 p-3">
            {previewFailed ? (
              <p className="text-xs text-slate-500">
                Gagal memuat rincian data. Lanjutkan hanya kalau Anda yakin instansi ini
                memang tidak terpakai.
              </p>
            ) : !preview ? (
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Menghitung data yang akan terhapus...
              </p>
            ) : totalRecords === 0 ? (
              <p className="text-xs text-slate-600">
                Instansi <span className="font-semibold">{tenant?.name}</span> belum punya
                data apa pun. Aman untuk dihapus.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-600 mb-2">
                  Ikut terhapus permanen dari <span className="font-semibold">{tenant?.name}</span>:
                </p>
                <ul className="text-xs text-slate-700 space-y-1">
                  {preview.users > 0 && (
                    <li>
                      • <span className="font-semibold">{preview.users}</span> akun petugas
                    </li>
                  )}
                  {preview.queues > 0 && (
                    <li>
                      • <span className="font-semibold">{preview.queues}</span> loket
                    </li>
                  )}
                  {preview.entries > 0 && (
                    <li>
                      •{' '}
                      <span className="font-semibold">
                        {preview.entries.toLocaleString('id-ID')}
                      </span>{' '}
                      tiket antrian beserta seluruh riwayatnya
                    </li>
                  )}
                  {preview.guest_book_entries > 0 && (
                    <li>
                      •{' '}
                      <span className="font-semibold">
                        {preview.guest_book_entries.toLocaleString('id-ID')}
                      </span>{' '}
                      entri buku tamu beserta fotonya
                    </li>
                  )}
                  <li>• Seluruh data analitik dan pengaturan tampilan</li>
                </ul>
              </>
            )}
          </div>

          {/* Lapis 3 — konfirmasi terakhir */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600">
              Ketik{' '}
              <span className="font-mono font-semibold text-slate-800">{tenant?.name}</span>{' '}
              untuk mengonfirmasi:
            </label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={tenant?.name}
              autoComplete="off"
              className="border-red-200 text-sm font-mono focus-visible:ring-red-500/20"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              className="text-sm border-slate-200"
            >
              Batal
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!nameMatches || isDeleting}
              className="text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus permanen'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
