'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/hooks/use-tenant';
import { Loader2 } from 'lucide-react';

export default function KioskHome() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const router = useRouter();
  const { tenant, loading, error } = useTenant(tenantSlug);

  const [activeCard, setActiveCard] = useState<'queue' | 'guest' | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const brand = tenant?.brand_color ?? '#1e40af';

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
          <p className="text-2xl mb-2">⚠️</p>
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
          style={{ backgroundColor: `${brand}18`, backdropFilter: 'blur(12px)' }}
        >
          {/* Logo left */}
          <div className="justify-self-start cursor-pointer" onClick={() => setActiveCard(null)}>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-14 w-auto object-contain" />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-xl"
                style={{ backgroundColor: brand }}
              >
                {tenant.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Center title */}
          <div className="justify-self-center text-center">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: brand }}>
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

        {/* Gear watermark */}
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
                style={{ borderColor: brand }}
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
            style={activeCard === 'queue' ? { borderTop: `4px solid ${brand}` } : {}}
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
                  style={{ backgroundColor: `${brand}18` }}
                >
                  <span className="text-4xl">🎫</span>
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
                      style={{ backgroundColor: brand }}
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
            style={activeCard === 'guest' ? { borderTop: '4px solid #10b981' } : {}}
            animate={{
              width: activeCard === 'guest' ? 360 : activeCard === null ? 280 : 230,
              height: activeCard === 'guest' ? 440 : activeCard === null ? 340 : 290,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <div className="p-0 w-full h-full flex flex-col items-center justify-center text-center px-6">
              <motion.div layout className="mb-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-lg bg-emerald-50">
                  <span className="text-4xl">📖</span>
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
                      className="w-full px-8 py-3 rounded-xl font-bold text-base transition-all shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
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

      {/* Illustration */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCard ?? 'home'}
          initial={{ opacity: 0, x: activeCard === 'queue' ? -300 : activeCard === 'guest' ? 300 : 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
          className={`absolute -bottom-1 z-0 pointer-events-none hidden lg:block ${activeCard === 'queue' ? 'left-0' : 'right-0'}`}
        >
          <div
            className={`h-72 w-72 rounded-full opacity-10 ${activeCard === 'queue' ? 'scale-x-[-1]' : ''}`}
            style={{ backgroundColor: brand, filter: 'blur(60px)' }}
          />
        </motion.div>
      </AnimatePresence>

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
