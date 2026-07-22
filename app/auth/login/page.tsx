'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Eye, EyeOff, Loader2, AlertCircle, Activity, Clock } from 'lucide-react';

export default function SuperadminLoginPage() {
  const router = useRouter();
  const { signInSuperadmin, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // `?expired=1` dikirim handleSessionExpired() saat user dilempar ke sini
  // karena sesinya mati. Dibaca dari window (bukan useSearchParams) supaya
  // halaman ini tidak butuh Suspense boundary saat prerender.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('expired') === '1') {
      setSessionExpired(true);
    }
  }, []);

  // Redirect kalau udah login sebagai superadmin
  useEffect(() => {
    if (!authLoading && user?.role === 'superadmin') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signInSuperadmin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top accent — navy untuk superadmin */}
      <div className="h-1 w-full bg-[#1e3a5f]" />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-[#1e3a5f] flex items-center justify-center mx-auto mb-4">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-base font-semibold text-slate-900">SIMANTRA</h1>
              <p className="text-sm text-slate-400 mt-0.5">Portal Superadmin</p>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
              <form onSubmit={handleSubmit} className="space-y-4">

                {sessionExpired && !error && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 text-amber-700 px-3.5 py-3 rounded-lg">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">
                      Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan masuk kembali untuk melanjutkan.
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 text-sm px-3.5 py-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@simantra.id"
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 mt-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f]/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Memverifikasi...</span></>
                  ) : 'Masuk'}
                </button>
              </form>
            </div>
          </div>

          <div className="text-center mt-5">
            <p className="text-xs text-slate-400">Akses terbatas — hanya untuk Superadmin</p>
          </div>
        </div>
      </div>
    </div>
  );
}