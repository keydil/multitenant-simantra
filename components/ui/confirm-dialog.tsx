'use client';

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Pengganti window.confirm() native (A1). Dibuat berbasis Promise supaya
// call site tetap sependek aslinya:
//
//   if (!confirm('Yakin?')) return;                    // sebelum
//   if (!(await confirm({ title: 'Yakin?' }))) return; // sesudah
//
// Alasan tidak memakai <AlertDialog> langsung di tiap halaman: 8 lokasi
// destruktif × (state open + state "item mana yang mau dihapus" + JSX dialog)
// = banyak sekali boilerplate berulang yang gampang drift satu sama lain.

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Label tombol konfirmasi. Default: 'Lanjutkan' */
  confirmText?: string;
  /** Label tombol batal. Default: 'Batal' */
  cancelText?: string;
  /**
   * 'destructive' = tombol konfirmasi merah. Dipakai untuk hapus/nonaktifkan
   * — aksi yang tidak bisa dibatalkan sendiri oleh user.
   */
  variant?: 'default' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // Promise yang sedang menunggu jawaban user. Disimpan di ref, bukan state,
  // supaya menyimpannya tidak memicu render ulang.
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Satu-satunya jalan keluar dialog: dipanggil tombol konfirmasi, tombol
  // batal, Esc, maupun klik overlay. Resolver dinolkan supaya tidak mungkin
  // terpanggil dua kali (Promise kedua akan menggantung selamanya kalau
  // resolver sudah terpakai).
  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          // Ditutup lewat Esc / klik overlay / tombol Batal = menolak.
          // Tanpa ini, Promise-nya menggantung dan alur pemanggil mati diam.
          if (!next) settle(false);
        }}
      >
        <AlertDialogContent className="bg-white rounded-2xl border border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">
              {options?.title}
            </AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription className="text-slate-500 text-sm">
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => settle(false)}
              className="text-sm border-slate-200"
            >
              {options?.cancelText ?? 'Batal'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={
                options?.variant === 'destructive'
                  ? 'text-sm bg-red-600 hover:bg-red-700 text-white'
                  : 'text-sm bg-slate-900 hover:bg-slate-800 text-white'
              }
            >
              {options?.confirmText ?? 'Lanjutkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm harus dipakai di dalam <ConfirmProvider>');
  }
  return ctx;
}
