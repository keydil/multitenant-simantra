'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { guestBookQueries, visitPurposeQueries } from '@/lib/api/queries';
import { ApiError } from '@/lib/api/client';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { toast } from 'sonner';
import { useTenant } from '@/hooks/use-tenant';
import { ArrowLeft, Camera, CheckCircle2, RefreshCw, AlertCircle, Search, Building2, User, Loader2 } from 'lucide-react';

// Fallback KALAU fetch gagal / tenant lama belum punya baris purpose. Kategori
// "Keperluan Kunjungan" sekarang per-tenant (dari GET /public/.../purposes).
const DEFAULT_PURPOSES = [
  'Konsultasi Layanan', 'Bertemu Pejabat/Staf', 'Pengaduan', 'Informasi Umum',
  'Keperluan Administratif', 'Lainnya',
];

export default function GuestBookForm() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const router = useRouter();
  const { tenant } = useTenant(tenantSlug);
  const [purposeOptions, setPurposeOptions] = useState<string[]>(DEFAULT_PURPOSES);
  const [form, setForm] = useState({ name: '', institution: '', purpose: '', phone: '' });

  // Ambil kategori keperluan milik tenant ini. Kalau gagal / kosong (tenant
  // lama belum di-backfill), pertahankan DEFAULT_PURPOSES.
  useEffect(() => {
    visitPurposeQueries.getPublic(tenantSlug)
      .then((rows) => {
        if (rows.length > 0) setPurposeOptions(rows.map((p) => p.label));
      })
      .catch(() => {});
  }, [tenantSlug]);
  const [isPersonal, setIsPersonal] = useState(false);
  const [selectedChip, setSelectedChip] = useState('');
  const [filtered, setFiltered] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autocomplete institusi: server-side search (hasil endpoint dibatasi 10,
  // jadi filter client-side atas satu fetch besar tidak lagi memadai),
  // debounce 250ms per ketikan.
  const handleInstitutionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(f => ({ ...f, institution: val }));
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.length === 0) { setShowSuggest(false); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const list = await guestBookQueries.getInstitutions(tenantSlug, val);
        setFiltered(list.filter(i => i && i !== '-' && i !== 'Pribadi (Non-Instansi)'));
        setShowSuggest(true);
      } catch {
        setShowSuggest(false);
      }
    }, 250);
  };

  const handleChip = (opt: string) => {
    setSelectedChip(opt);
    if (opt !== 'Lainnya') setForm(f => ({ ...f, purpose: opt }));
    else setForm(f => ({ ...f, purpose: '' }));
  };

  const handlePersonal = (checked: boolean) => {
    setIsPersonal(checked);
    setShowSuggest(false);
    setForm(f => ({ ...f, institution: checked ? '-' : '' }));
  };

  // Camera logic
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [isCameraActive]);

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (e: any) {
      setCameraError('Gagal akses kamera: ' + (e.message ?? 'Unknown error'));
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { videoWidth: w, videoHeight: h } = videoRef.current;
    canvasRef.current.width = w; canvasRef.current.height = h;
    ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, w, h);
    setPhotoUrl(canvasRef.current.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !photoUrl) return;
    setIsSubmitting(true);
    try {
      // Upload foto dulu — photo_url WAJIB berasal dari endpoint upload
      // (URL lain ditolak 400 oleh server). JPEG maks 2 MB.
      const blob = await (await fetch(photoUrl)).blob();
      const file = new File([blob], `guest-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const { photo_url } = await guestBookQueries.uploadPhoto(tenantSlug, file);

      await guestBookQueries.create(tenantSlug, {
        name: form.name, institution: form.institution,
        purpose: form.purpose, phone: form.phone, photo_url,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setForm({ name: '', institution: '', purpose: '', phone: '' });
        setPhotoUrl(null); setIsSuccess(false); setIsPersonal(false);
        setSelectedChip(''); setFiltered([]);
      }, 3000);
    } catch (e) {
      // Rate limit guest book 5/menit/IP
      const rateLimited = e instanceof ApiError && e.statusCode === 429;
      toast.error(rateLimited ? 'Terlalu banyak pengisian' : 'Gagal menyimpan buku tamu', {
        description: rateLimited
          ? 'Mohon tunggu sebentar, lalu coba lagi.'
          : friendlyErrorMessage(e),
        // Perangkat publik sambil berdiri — beri waktu baca lebih lama.
        duration: 8000,
      });
    } finally { setIsSubmitting(false); }
  };

  const brand = tenant?.brand_color ?? '#1e40af';

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-12 text-center max-w-sm">
          <CheckCircle2 className="w-24 h-24 text-emerald-500 mx-auto mb-5 animate-bounce" />
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Terima Kasih!</h2>
          <p className="text-slate-500">Data kunjungan Anda telah berhasil disimpan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push(`/${tenantSlug}`)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={20} />
          </button>
          {tenant?.logo_url && <img src={tenant.logo_url} alt={tenant.name} className="h-9 w-auto object-contain" />}
          <div>
            <h1 className="text-lg font-bold" style={{ color: brand }}>BUKU TAMU DIGITAL</h1>
            <p className="text-xs text-slate-400">{tenant?.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-blue-100 overflow-hidden">
          <div className="px-8 pt-8 pb-4 text-center border-b border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800">Formulir Kunjungan</h2>
            <p className="text-slate-500 text-sm mt-1">Mohon lengkapi data diri dan ambil foto untuk verifikasi.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
            {/* Camera area */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Foto Wajah <span className="text-red-500">*</span></label>
              {cameraError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{cameraError}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-4 flex flex-col items-center">
                {!photoUrl && !isCameraActive && (
                  <div className="text-center py-6 w-full">
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Camera size={24} style={{ color: brand }} />
                    </div>
                    <button type="button" onClick={startCamera}
                      className="px-6 py-2 rounded-full text-white font-semibold text-sm"
                      style={{ backgroundColor: brand }}>
                      Buka Kamera
                    </button>
                  </div>
                )}
                {isCameraActive && (
                  <div className="w-full space-y-3">
                    <div className="relative rounded-xl overflow-hidden border-4 border-slate-800 bg-black aspect-video">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={capturePhoto}
                        className="flex-1 py-2 rounded-lg text-white font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2">
                        <Camera size={15} /> Jepret Foto
                      </button>
                      <button type="button" onClick={stopCamera}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200">Batal</button>
                    </div>
                  </div>
                )}
                {photoUrl && (
                  <div className="w-full space-y-3">
                    <div className="relative rounded-xl overflow-hidden border-4 border-emerald-500 aspect-video group">
                      <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-semibold flex items-center gap-1"><CheckCircle2 size={16} /> Foto Siap</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setPhotoUrl(null); startCamera(); }}
                      className="w-full py-2 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2">
                      <RefreshCw size={14} /> Foto Ulang
                    </button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Masukkan nama lengkap" className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">No. Telepon <span className="text-red-500">*</span></label>
                <input required type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="08xx..." className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm focus:outline-none focus:ring-2" />
              </div>
            </div>

            {/* Institution with autocomplete */}
            <div className="space-y-1 relative">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Instansi <span className="text-red-500">*</span></label>
                <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={isPersonal} onChange={e => handlePersonal(e.target.checked)} className="rounded" />
                  Kunjungan Pribadi
                </label>
              </div>
              <div className="relative">
                <input
                  required value={isPersonal ? 'Pribadi (Non-Instansi)' : form.institution}
                  onChange={handleInstitutionChange} disabled={isPersonal}
                  onFocus={() => !isPersonal && form.institution && setShowSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
                  placeholder={isPersonal ? 'Pribadi (Non-Instansi)' : 'Ketik nama instansi...'}
                  className="w-full border border-slate-200 rounded-xl px-3 pr-10 h-11 text-sm focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400"
                  autoComplete="off"
                />
                {isPersonal ? <User size={16} className="absolute right-3 top-3.5 text-slate-400" /> : <Search size={16} className="absolute right-3 top-3.5 text-slate-400" />}
                {showSuggest && filtered.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {filtered.map((item, i) => (
                      <button key={i} type="button" onMouseDown={() => { setForm(f => ({ ...f, institution: item })); setShowSuggest(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 border-b border-slate-50 last:border-0">
                        <Building2 size={14} className="text-slate-400" /> {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Purpose chips */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Keperluan Kunjungan <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {purposeOptions.map(opt => (
                  <button key={opt} type="button" onClick={() => handleChip(opt)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${selectedChip === opt ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                    style={selectedChip === opt ? { backgroundColor: brand, borderColor: brand } : {}}>
                    {opt}
                  </button>
                ))}
              </div>
              {selectedChip === 'Lainnya' && (
                <textarea required rows={3} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  placeholder="Jelaskan keperluan kunjungan Anda..." autoFocus
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2" />
              )}
            </div>

            <button type="submit" disabled={isSubmitting || !photoUrl || !form.name || !form.phone || !form.institution || !form.purpose}
              className="w-full py-3 rounded-2xl font-bold text-lg text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: brand }}>
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : 'Simpan Buku Tamu'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
