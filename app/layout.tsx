import type { Metadata } from 'next'
import {
  Comic_Neue,
  Geist,
  Geist_Mono,
  Inter,
  Montserrat,
  Patrick_Hand,
  Playfair_Display,
  Poppins,
  PT_Serif,
  Quicksand,
} from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth/auth-context'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

// Font bulat untuk jam besar di kiosk & display. SF Pro Rounded yang diminta
// hanya ada di perangkat Apple, sementara mesin kiosk/TV umumnya Windows atau
// Android — jadi ia dipasang sebagai pilihan PERTAMA di --font-rounded
// (lihat globals.css) dan Quicksand ini yang menanggung sisanya. Dimuat lewat
// next/font supaya di-selfhost, tak menembak Google Fonts saat runtime:
// layar antrian sering jalan di jaringan internal yang terkunci.
//
// CATATAN BOBOT: Quicksand cuma punya 300–700, tidak ada 900. Jangan pakai
// `font-black` pada elemen ber-font-rounded — browser akan memalsukannya jadi
// tebal sintetis yang bentuknya rusak. Pakai `font-bold` (700) sebagai maksimum.
const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-rounded-src' });

// Pilihan font judul/subtitle kiosk — daftar key & label ada di
// lib/theme/header-fonts.ts (WAJIB sinkron manual dengan array di sana dan
// dengan HEADER_FONT_KEYS di backend). Tiap font expose CSS variable
// sendiri, dipakai kiosk-home.tsx lewat headerFontFamily().
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const ptSerif = PT_Serif({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-pt-serif' });
const playfairDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair-display' });
const comicNeue = Comic_Neue({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-comic-neue' });
const patrickHand = Patrick_Hand({ subsets: ['latin'], weight: '400', variable: '--font-patrick-hand' });

export const metadata: Metadata = {
  title: 'SIMANTRA — Sistem Manajemen Antrian',
  description: 'Sistem antrian digital multi-instansi untuk pelayanan publik.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      className={`bg-background ${quicksand.variable} ${montserrat.variable} ${poppins.variable} ${inter.variable} ${ptSerif.variable} ${playfairDisplay.variable} ${comicNeue.variable} ${patrickHand.variable}`}
    >
      <body className="font-sans antialiased">
        <AuthProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </AuthProvider>
        <Toaster position="bottom-right" closeButton />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
