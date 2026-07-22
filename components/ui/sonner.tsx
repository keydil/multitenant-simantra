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
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
