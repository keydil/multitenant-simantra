'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { AnnouncementBell } from '@/components/announcement-bell';

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

interface HeaderExtras {
  tenantId: string;
  brandColor: string;
}

/** Dipasok [tenant]/admin/layout.tsx supaya AnnouncementBell bisa dirender DI
 *  DALAM baris PageHeader (sejajar judul & actions), bukan baris terpisah di
 *  layout — layout tidak bisa menyisipkan diri ke actions tiap halaman tanpa
 *  ini, krn actions ditulis per-halaman lewat children. null di luar admin
 *  (mis. superadmin) → bel tidak dirender, aman. */
const HeaderExtrasContext = createContext<HeaderExtras | null>(null);

export function HeaderExtrasProvider({ value, children }: { value: HeaderExtras | null; children: ReactNode }) {
  return <HeaderExtrasContext.Provider value={value}>{children}</HeaderExtrasContext.Provider>;
}

/** Primitive header halaman — dulu ditulis inline berulang di tiap halaman
 *  admin/superadmin dengan markup nyaris identik. Belum diadopsi ke halaman
 *  manapun — lihat rencana audit UI template. */
export function PageHeader({ title, subtitle, size = 'md', actions }: PageHeaderProps) {
  const extras = useContext(HeaderExtrasContext);

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className={TITLE_CLASS[size]}>{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {(actions || extras) && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          {extras && <AnnouncementBell tenantId={extras.tenantId} brandColor={extras.brandColor} />}
        </div>
      )}
    </div>
  );
}
