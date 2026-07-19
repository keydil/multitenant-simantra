'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import type { QueueEntry, Queue } from '@/lib/types/queue';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Printer, Home, Ticket, Share2 } from 'lucide-react';

export default function TicketCard() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const entryId = params.id as string;
  const router = useRouter();

  const { tenant } = useTenant(tenantSlug);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [positionAhead, setPositionAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    // RPC "not found" is one row with every column null (Postgres
    // FROM-clause call convention), not a JS null — check .id, not truthiness.
    const { data: entryData } = await supabase.rpc('get_public_queue_entry', { p_entry_id: entryId });
    if (!entryData?.id) { setLoading(false); return; }
    setEntry(entryData as QueueEntry);

    const { data: queueData } = await supabase.rpc('get_public_queue', { p_queue_id: (entryData as QueueEntry).queue_id });
    if (queueData?.id) setQueue(queueData as Queue);

    const { data: positionAhead } = await supabase.rpc('count_public_queue_position_ahead', { p_entry_id: entryId });
    setPositionAhead(positionAhead ?? 0);
    setLoading(false);
  }, [entryId, supabase]);

  useEffect(() => {
    fetchData();
    const now = new Date();
    setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }, [fetchData]);

  // Auto print + countdown redirect
  useEffect(() => {
    if (loading) return;
    const printTimer = setTimeout(() => window.print(), 800);
    const interval = setInterval(() => setCountdown(prev => prev > 0 ? prev - 1 : 0), 1000);
    const redirectTimer = setTimeout(() => router.push(`/${tenantSlug}`), 15000);
    return () => { clearTimeout(printTimer); clearTimeout(redirectTimer); clearInterval(interval); };
  }, [loading, tenantSlug, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={36} />
      </div>
    );
  }

  if (!entry || !queue || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-semibold text-slate-700">Tiket tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const brand = tenant.brand_color ?? '#1e40af';
  const statusUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${tenantSlug}/queue/status/${entry.id}`
    : '';
  const estWait = positionAhead * (queue.estimated_service_time_minutes ?? 5);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white print:min-h-0">

      {/* Web header (hidden on print) */}
      <header className="bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/${tenantSlug}/queue`)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Ticket size={20} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: brand }}>TIKET ANTRIAN</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: brand }}>
              <Printer size={15} /> Cetak Manual
            </button>
            <button onClick={() => router.push(`/${tenantSlug}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">
              <Home size={15} /> Beranda
            </button>
          </div>
        </div>
      </header>

      {/* Ticket Card */}
      <main className="max-w-md mx-auto py-10 px-4 print:block print:w-full print:m-0 print:p-0">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500
          print:shadow-none print:border-none print:rounded-none print:w-[80mm] print:mx-auto">

          {/* Header strip */}
          <div className="px-6 pt-5 pb-4 text-center print:px-4 print:py-3" style={{ backgroundColor: brand }}>
            {/* Logo */}
            {tenant.logo_url && (
              <img src={tenant.logo_url} alt={tenant.name}
                className="h-12 w-auto mx-auto object-contain mb-2 print:h-8" />
            )}
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1 print:text-[9px]">
              {tenant.name}
            </p>
            <p className="text-white/60 text-xs print:text-[8px]">
              {currentDate} · {currentTime}
            </p>
          </div>

          {/* Service name */}
          <div className="text-center pt-4 pb-2 px-6 print:pt-2 print:pb-1">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 print:text-[9px]">Layanan</p>
            <h3 className="text-base font-bold text-slate-800 uppercase print:text-sm">
              {queue.display_name ?? queue.name}
            </h3>
          </div>

          <div className="mx-6 border-t-2 border-dashed border-slate-200 print:mx-4" />

          {/* QR + Ticket number */}
          <div className="flex items-center justify-between px-6 py-4 print:px-4 print:py-2">
            {/* QR Code */}
            <div className="print:w-[70px] print:h-[70px]">
              {statusUrl && (
                <QRCodeSVG value={statusUrl} size={90} fgColor={brand} bgColor="#ffffff" level="M"
                  className="print:w-[70px] print:h-[70px]" />
              )}
            </div>

            {/* Ticket number */}
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 print:text-[9px]">Nomor Antrian</p>
              <p className="text-6xl font-black tracking-tight leading-none print:text-4xl" style={{ color: brand }}>
                {entry.ticket_number}
              </p>
              <div className="flex gap-3 mt-2 justify-end text-xs text-slate-400 print:hidden">
                <span>👥 {positionAhead} depan</span>
                <span>⏱ ~{estWait} mnt</span>
              </div>
            </div>
          </div>

          <div className="mx-6 border-t-2 border-dashed border-slate-200 print:mx-4" />

          {/* Footer text */}
          <div className="text-center px-6 py-4 print:px-4 print:py-2 print:pb-3">
            <p className="text-xs text-slate-500 print:text-[8px] print:text-black">
              Scan QR untuk melihat status antrian secara real-time.
            </p>
            <p className="text-xs font-semibold text-slate-700 mt-1 print:text-[9px] print:text-black">
              Harap menunggu panggilan petugas. Terima kasih.
            </p>
          </div>

          {/* Progress bar (web only) */}
          <div className="h-1 bg-slate-100 print:hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${(countdown / 15) * 100}%`, backgroundColor: brand }}
            />
          </div>
        </div>

        {/* Countdown + status link */}
        <div className="text-center mt-5 space-y-3 print:hidden">
          <p className="text-slate-400 text-sm">
            Kembali ke beranda dalam <span className="font-bold" style={{ color: brand }}>{countdown}</span> detik...
          </p>
          <a href={statusUrl}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Share2 size={13} /> Buka Halaman Status
          </a>
        </div>
      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0 !important; }
          html, body { height: auto !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          header, footer, .print\\:hidden { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
