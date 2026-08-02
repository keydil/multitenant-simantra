'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

// CATATAN: sebelumnya wrapper ini memanggil useTheme() dari next-themes.
// Tapi <ThemeProvider> (components/theme-provider.tsx) TIDAK PERNAH di-mount
// di app/layout.tsx, jadi useTheme() selalu balik undefined → jatuh ke
// default 'system' → sonner ikut tema OS. Di mesin ber-OS dark, toast
// tampil gelap di atas UI yang 100% light — itu sebabnya toast terlihat
// "nempel" asing, bukan bagian dari desain.
//
// App ini light-only, jadi tema toast dikunci ke 'light'. Warnanya diambil
// dari token desain yang sama dengan Card/Popover (--popover, --border),
// supaya toast terbaca sebagai kartu yang sama dengan sisa dashboard.
// Kalau nanti dark mode beneran dipasang, mount ThemeProvider lalu kirim
// prop `theme` dari pemanggil.
const Toaster = ({ theme = 'light', ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // rounded-xl + border slate + shadow = bentuk yang sama dengan
          // <Card> di dashboard (lihat app/dashboard/tenants/page.tsx).
          toast: 'rounded-xl border border-slate-200 shadow-lg',
          title: 'text-sm font-semibold text-slate-900',
          description: 'text-xs text-slate-500',
          // Warna semantik per tipe (bukan warna brand tenant) — konsisten
          // dgn prinsip yang sudah dipakai StatCard/STATUS_BADGE di seluruh
          // app: brand cuma untuk elemen navigasi/dekoratif, status semantik
          // (selesai/gagal/dst) selalu warna tetap supaya sama di semua
          // instansi (lihat audit UI §4). Palet sama persis dgn kotak notice
          // di halaman login (bg-*-50/border-*-100/text-*-700).
          success: 'border-emerald-200 bg-emerald-50 [&_[data-title]]:text-emerald-800 [&_[data-description]]:text-emerald-700 [&_[data-icon]]:text-emerald-600',
          error: 'border-red-200 bg-red-50 [&_[data-title]]:text-red-800 [&_[data-description]]:text-red-700 [&_[data-icon]]:text-red-600',
          warning: 'border-amber-200 bg-amber-50 [&_[data-title]]:text-amber-800 [&_[data-description]]:text-amber-700 [&_[data-icon]]:text-amber-600',
          info: 'border-blue-200 bg-blue-50 [&_[data-title]]:text-blue-800 [&_[data-description]]:text-blue-700 [&_[data-icon]]:text-blue-600',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
