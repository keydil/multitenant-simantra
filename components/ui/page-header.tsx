import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** lg = panel superadmin (text-2xl font-bold), md = panel admin tenant
   *  (text-xl font-semibold). Beda ukuran ini SENGAJA (identitas platform vs
   *  tenant) — bukan inkonsistensi yang perlu diseragamkan, lihat audit UI. */
  size?: 'lg' | 'md';
  /** Slot kanan — tombol aksi, pil status, dsb. */
  actions?: ReactNode;
}

const TITLE_CLASS: Record<NonNullable<PageHeaderProps['size']>, string> = {
  lg: 'text-2xl font-bold text-slate-900',
  md: 'text-xl font-semibold text-slate-900',
};

/** Primitive header halaman — dulu ditulis inline berulang di tiap halaman
 *  admin/superadmin dengan markup nyaris identik. Belum diadopsi ke halaman
 *  manapun — lihat rencana audit UI template. */
export function PageHeader({ title, subtitle, size = 'md', actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className={TITLE_CLASS[size]}>{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
