'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/hooks/use-tenant';
import { AlertTriangle, Loader2, NotebookPen, Ticket } from 'lucide-react';
import { GuestBookIllustration, TicketKioskIllustration } from './kiosk-illustrations';

// Fallback dipakai HANYA kalau tenant belum punya baris theme sama sekali.
// Begitu theme ada, ketiganya diambil apa adanya dari database — tidak ada
// warna turunan, jadi yang tampil persis yang admin set.
const FALLBACK_PRIMARY = '#1e40af';
const FALLBACK_SECONDARY = '#64748b';
const FALLBACK_ACCENT = '#10b981';

export default function KioskHome() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const router = useRouter();
  const { tenant, loading, error } = useTenant(tenantSlug);

  const [activeCard, setActiveCard] = useState<'queue' | 'guest' | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Respons /public/tenants/:slug sudah include theme (lihat publicQueries.getTenant),
  // jadi kelima kolom warna tersedia di sini tanpa request tambahan. Sebelumnya
  // halaman ini cuma memakai brand_color dan mengabaikan theme sepenuhnya.
  //
  // primary tetap jatuh ke brand_color dulu sebelum ke fallback: tenant lama yang
  // sudah terlanjur menyetel brand_color tidak boleh berubah tampilannya hanya
  // karena baris theme-nya belum diisi.
  const theme = tenant?.theme;
  const primary = theme?.primary_color || tenant?.brand_color || FALLBACK_PRIMARY;
  const secondary = theme?.secondary_color || FALLBACK_SECONDARY;
  const accent = theme?.accent_color || FALLBACK_ACCENT;
  const palette = useMemo(
    () => ({ primary, secondary, accent }),
    [primary, secondary, accent],
  );

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow">
          <AlertTriangle className="mx-auto mb-2 text-amber-500" size={28} />
          <p className="font-semibold">{error ?? 'Tenant tidak ditemukan.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col overflow-hidden relative">

      {/* ── HEADER ── */}
      <div className="max-w-6xl mx-auto px-6 mt-6 w-full z-20 relative">
        <header
          className="rounded-3xl px-8 py-5 grid grid-cols-3 items-center shadow-lg border border-white/50"
          style={{ backgroundColor: `${primary}18`, backdropFilter: 'blur(12px)' }}
        >
          {/* Logo left */}
          <div className="justify-self-start cursor-pointer" onClick={() => setActiveCard(null)}>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-14 w-auto object-contain" />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-xl"
                style={{ backgroundColor: primary }}
              >
                {tenant.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Center title */}
          <div className="justify-self-center text-center">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: primary }}>
              {tenant.name.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-500 font-semibold tracking-widest mt-0.5">
              SISTEM ANTRIAN DIGITAL
            </p>
          </div>

          {/* Clock right */}
          <div className="justify-self-end text-right">
            <p className="text-4xl font-mono font-bold text-slate-700 tabular-nums">{currentTime}</p>
            <p className="text-xs text-slate-400 mt-0.5">{currentDate}</p>
          </div>
        </header>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10">

        {/* Cincin dekoratif di belakang kartu. Dulu dikomentari "gear watermark"
            padahal tak pernah ada gambar gear-nya — cuma lingkaran ber-border. */}
        <AnimatePresence>
          {activeCard === null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.06 }}
              exit={{ opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            >
              <div
                className="w-80 h-80 rounded-full border-[40px]"
                style={{ borderColor: primary }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome text */}
        <AnimatePresence>
          {activeCard === null && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="text-center mb-8 z-20"
            >
              <h2 className="text-2xl font-bold text-slate-800">Selamat Datang</h2>
              <p className="text-slate-500 mt-1">Silakan pilih layanan yang Anda butuhkan</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card wrapper */}
        <motion.div
          className="flex flex-row items-center justify-center z-20 relative"
          animate={{
            x: activeCard === 'queue' ? 160 : activeCard === 'guest' ? -160 : 0,
            gap: activeCard === null ? '120px' : '80px',
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          {/* CARD 1: LAYANAN ANTRIAN */}
          <motion.div
            layout
            onClick={() => setActiveCard('queue')}
            className={`relative cursor-pointer rounded-[1.5rem] bg-white flex flex-col items-center justify-center transition-all
              ${activeCard === 'queue' ? 'shadow-2xl z-20' : activeCard === null ? 'shadow-md z-10 hover:shadow-xl' : 'shadow-none opacity-40 z-0'}
            `}
            style={activeCard === 'queue' ? { borderTop: `4px solid ${primary}` } : {}}
            animate={{
              width: activeCard === 'queue' ? 360 : activeCard === null ? 280 : 230,
              height: activeCard === 'queue' ? 440 : activeCard === null ? 340 : 290,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <div className="p-0 w-full h-full flex flex-col items-center justify-center text-center px-6">
              <motion.div layout className="mb-4">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                  style={{ backgroundColor: `${primary}18` }}
                >
                  <Ticket size={38} strokeWidth={1.6} style={{ color: primary }} />
                </div>
              </motion.div>
              <motion.h3 layout className="text-xl font-black text-slate-800 mb-2">LAYANAN</motion.h3>

              <AnimatePresence>
                {activeCard === null && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-slate-400 text-sm px-2">
                    Ambil nomor antrian untuk layanan tersedia
                  </motion.p>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {activeCard === 'queue' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center w-full mt-4">
                    <p className="text-slate-500 mb-6 text-sm leading-relaxed px-2">
                      Pilih layanan dan ambil nomor antrian digital Anda.
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/${tenantSlug}/queue`); }}
                      className="w-full px-8 py-3 rounded-xl font-bold text-base transition-all shadow-sm text-white"
                      style={{ backgroundColor: primary }}
                    >
                      Pilih Layanan
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* CARD 2: BUKU TAMU */}
          <motion.div
            layout
            onClick={() => setActiveCard('guest')}
            className={`relative cursor-pointer rounded-[1.5rem] bg-white flex flex-col items-center justify-center transition-all
              ${activeCard === 'guest' ? 'shadow-2xl z-20' : activeCard === null ? 'shadow-md z-10 hover:shadow-xl' : 'shadow-none opacity-40 z-0'}
            `}
            style={activeCard === 'guest' ? { borderTop: `4px solid ${accent}` } : {}}
            animate={{
              width: activeCard === 'guest' ? 360 : activeCard === null ? 280 : 230,
              height: activeCard === 'guest' ? 440 : activeCard === null ? 340 : 290,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <div className="p-0 w-full h-full flex flex-col items-center justify-center text-center px-6">
              <motion.div layout className="mb-4">
                {/* Kelas emerald tetap diganti accent tenant supaya kartu ini
                    ikut theme, persis seperti kartu Layanan yang pakai primary. */}
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                  style={{ backgroundColor: `${accent}18` }}
                >
                  <NotebookPen size={38} strokeWidth={1.6} style={{ color: accent }} />
                </div>
              </motion.div>
              <motion.h3 layout className="text-xl font-black text-slate-800 mb-2">BUKU TAMU</motion.h3>

              <AnimatePresence>
                {activeCard === null && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-slate-400 text-sm px-2">
                    Daftarkan kunjungan Anda di sini
                  </motion.p>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {activeCard === 'guest' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center w-full mt-4">
                    <p className="text-slate-500 mb-6 text-sm leading-relaxed px-2">
                      Untuk tamu dinas, kunjungan kerja, atau keperluan administratif lainnya.
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/${tenantSlug}/guest-book`); }}
                      className="w-full px-8 py-3 rounded-xl font-bold text-base transition-all shadow-sm text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Isi Buku Tamu
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Ilustrasi sudut bawah — masing-masing kartu punya pasangannya sendiri.
          Saat belum ada pilihan keduanya tampil redup sebagai pengisi ruang
          kosong; begitu satu kartu dipilih, ilustrasi pasangannya menguat dan
          yang lain menghilang. Sengaja pakai `animate` biasa (bukan
          AnimatePresence seperti versi lama) supaya SVG-nya tidak di-mount
          ulang tiap kali fokus kartu bertukar. origin-bottom menjaga kaki
          ilustrasi tetap menempel di dasar layar saat di-scale. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 hidden lg:block">
        <motion.div
          className="absolute bottom-0 left-0 origin-bottom"
          animate={{
            opacity: activeCard === 'queue' ? 1 : activeCard === null ? 0.5 : 0,
            x: activeCard === 'queue' ? 0 : -28,
            scale: activeCard === 'queue' ? 1 : 0.85,
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <TicketKioskIllustration palette={palette} className="h-72 w-72" />
        </motion.div>
        <motion.div
          className="absolute bottom-0 right-0 origin-bottom"
          animate={{
            opacity: activeCard === 'guest' ? 1 : activeCard === null ? 0.5 : 0,
            x: activeCard === 'guest' ? 0 : 28,
            scale: activeCard === 'guest' ? 1 : 0.85,
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <GuestBookIllustration palette={palette} className="h-72 w-72" />
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="w-full pb-4 pt-2 text-center z-50 relative">
        <p className="text-xs text-slate-400">SIMANTRA — Sistem Manajemen Antrian &copy; {new Date().getFullYear()}</p>
        <a href={`/${tenantSlug}/admin`} className="text-[10px] text-slate-300 hover:text-slate-400 mt-0.5 block">
          Admin Access
        </a>
      </footer>
    </div>
  );
}
