import React, { useState, useEffect } from 'react';
import { Volume2, Monitor, Info, Clock, Building2 } from 'lucide-react';

const App = () => {
  // State untuk toggle mode skala Instansi
  const [mode, setMode] = useState('standard'); // 'standard' atau 'mpp'
  
  // Waktu Realtime
  const [time, setTime] = useState(new Date());

  // Data Dummy untuk nomor antrean yang sedang dipanggil
  const [currentCall, setCurrentCall] = useState({
    number: 'A-042',
    counter: 'LOKET 1',
    service: 'PEMBUATAN AK-1',
    isBlinking: false
  });

  // Setup mode berdasarkan klik
  const isMpp = mode === 'mpp';

  // Konfigurasi Tenant (SaaS White-label dummy)
  const tenantConfig = {
    name: isMpp ? 'Mal Pelayanan Publik (MPP) - Zona A' : 'Dinas Tenaga Kerja',
    bgColor: isMpp ? 'bg-slate-900' : 'bg-blue-900',
    accentColor: isMpp ? 'text-amber-400' : 'text-cyan-300',
    cardBg: isMpp ? 'bg-slate-800' : 'bg-blue-800',
  };

  // Generate daftar loket berdasarkan mode
  const counters = isMpp 
    ? Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `LOKET ${i + 1}`,
        number: `${['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)]}-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`
      }))
    : Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `LOKET ${i + 1}`,
        number: `${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`
      }));

  // Jam berjalan
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulasi Panggilan Antrean Baru tiap 5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      const randomPrefix = isMpp ? ['A','B','C','D','E'] : ['A','B','C'];
      const newNum = `${randomPrefix[Math.floor(Math.random() * randomPrefix.length)]}-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`;
      const newCounter = `LOKET ${Math.floor(Math.random() * (isMpp ? 12 : 5)) + 1}`;
      
      setCurrentCall({
        number: newNum,
        counter: newCounter,
        service: isMpp ? 'LAYANAN TERPADU' : 'LAYANAN UMUM',
        isBlinking: true
      });

      // Stop blink setelah 3 detik
      setTimeout(() => {
        setCurrentCall(prev => ({ ...prev, isBlinking: false }));
      }, 3000);

    }, 5000);

    return () => clearInterval(interval);
  }, [isMpp]);

  return (
    <div className={`min-h-screen text-white font-sans flex flex-col transition-colors duration-500 ${tenantConfig.bgColor}`}>
      
      {/* --- PANEL KONTROL SIMULASI (Khusus buat lu liat bedanya) --- */}
      <div className="bg-white/10 p-2 flex justify-center gap-4 text-sm border-b border-white/20">
        <span className="font-bold flex items-center gap-2">
          <Monitor size={16} /> Simulator Skala Instansi:
        </span>
        <button 
          onClick={() => setMode('standard')}
          className={`px-4 py-1 rounded-full font-semibold transition-all ${!isMpp ? 'bg-green-500 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          Mode Standar (5 Loket, ~20 Layanan)
        </button>
        <button 
          onClick={() => setMode('mpp')}
          className={`px-4 py-1 rounded-full font-semibold transition-all ${isMpp ? 'bg-amber-500 text-slate-900' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          Mode MPP/Enterprise (12 Loket, 150+ Layanan)
        </button>
      </div>

      {/* --- HEADER TV --- */}
      <header className="flex justify-between items-center p-6 border-b border-white/10 shadow-lg bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className={`text-3xl font-black tracking-wider ${tenantConfig.accentColor} uppercase`}>
              {tenantConfig.name}
            </h1>
            <p className="text-gray-300 text-lg tracking-widest uppercase">Sistem Antrean Multitenant</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-4xl font-mono font-bold">{time.toLocaleTimeString('id-ID')}</span>
            <span className="text-gray-400 font-medium">{time.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <Clock className="text-gray-400 opacity-50" size={48} />
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-6 flex gap-6 h-full overflow-hidden">
        
        {/* KIRI: PANGGILAN UTAMA (Main Focus) */}
        <div className="w-1/2 flex flex-col justify-center items-center">
          <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border-4 ${currentCall.isBlinking ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'border-white/10'} transition-all duration-300 bg-black/40 backdrop-blur-md flex flex-col`}>
            
            {/* Header Panggilan */}
            <div className={`py-4 text-center ${currentCall.isBlinking ? 'bg-red-600 text-white' : tenantConfig.cardBg + ' text-gray-200'} transition-colors duration-300`}>
              <h2 className="text-2xl font-bold tracking-widest uppercase flex justify-center items-center gap-3">
                {currentCall.isBlinking && <Volume2 className="animate-pulse" />}
                NOMOR ANTREAN DIPANGGIL
                {currentCall.isBlinking && <Volume2 className="animate-pulse" />}
              </h2>
            </div>
            
            {/* Nomor Besar */}
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <span className={`text-[10rem] font-black leading-none font-mono tracking-tighter ${tenantConfig.accentColor} ${currentCall.isBlinking ? 'animate-pulse' : ''}`}>
                {currentCall.number}
              </span>
              <span className="text-2xl mt-4 text-gray-400 font-medium tracking-widest">{currentCall.service}</span>
            </div>
            
            {/* Tujuan Loket */}
            <div className={`py-8 text-center border-t border-white/10 ${tenantConfig.cardBg}`}>
              <p className="text-xl text-gray-300 mb-2">SILAKAN MENUJU</p>
              <h3 className="text-6xl font-black text-white">{currentCall.counter}</h3>
            </div>

          </div>
        </div>

        {/* KANAN: GRID LOKET (Sisa Layanan) */}
        <div className="w-1/2 flex flex-col bg-black/20 rounded-3xl p-6 border border-white/5 shadow-inner">
          <h3 className="text-xl font-bold text-gray-400 tracking-widest mb-6 flex items-center gap-2 uppercase">
            <Info size={20} /> Status Loket Aktif
          </h3>
          
          {/* Layout Grid Berubah berdasarkan Mode */}
          <div className={`grid gap-4 flex-1 ${isMpp ? 'grid-cols-3 auto-rows-fr' : 'grid-cols-2 auto-rows-fr'}`}>
            {counters.map((counter) => (
              <div 
                key={counter.id} 
                className={`${tenantConfig.cardBg} rounded-2xl p-4 flex flex-col justify-between border border-white/10 shadow-lg`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-gray-300">{counter.name}</span>
                  <span className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                </div>
                <div className="text-right mt-auto">
                  <span className="text-sm text-gray-400 block mb-[-5px]">Melayani</span>
                  {/* Kalau loket ini lagi manggil, warnanya nyala */}
                  <span className={`text-4xl font-black font-mono ${(currentCall.counter === counter.name && currentCall.isBlinking) ? 'text-red-400' : 'text-white'}`}>
                    {(currentCall.counter === counter.name && currentCall.isBlinking) ? currentCall.number : counter.number}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* --- RUNNING TEXT FOOTER --- */}
      <footer className="bg-black text-white text-2xl py-3 overflow-hidden whitespace-nowrap border-t border-white/20">
        <div className="inline-block animate-[marquee_20s_linear_infinite]">
          <span className="mr-16">⚠️ Siapkan dokumen asli dan fotokopi sebelum menuju loket.</span>
          <span className="mr-16">🚫 Hati-hati terhadap penipuan/percaloan. Pelayanan ini 100% GRATIS!</span>
          <span className="mr-16">⭐ Berikan penilaian pelayanan kami melalui mesin IKM di pintu keluar.</span>
        </div>
      </footer>

      {/* Tailwind Custom Keyframes for Marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}} />
    </div>
  );
};

export default App;