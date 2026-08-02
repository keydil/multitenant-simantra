'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { authQueries } from '@/lib/api/queries';
import { friendlyErrorMessage } from '@/lib/api/errors';

const BRAND_COLOR = '#1e3a5f';

// Halaman ini generik untuk SEMUA role (superadmin/admin/operator) — token
// dari URL yang menentukan identitas, bukan slug tenant. Setelah sukses,
// backend sendiri yang memberi tahu ke mana harus redirect (redirect_to).
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    if (!token) {
      setError('Link reset tidak valid atau sudah kedaluwarsa.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await authQueries.resetPassword(token, password);
      toast.success('Password berhasil direset, silakan masuk kembali.');
      router.push(result.redirect_to);
    } catch (err) {
      setError(friendlyErrorMessage(err));
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="h-1 w-full" style={{ background: BRAND_COLOR }} />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: BRAND_COLOR }}
              >
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-base font-semibold text-slate-900">Reset Password</h1>
              <p className="text-sm text-slate-400 mt-0.5">SIMANTRA</p>
            </div>

            <div className="px-8 py-6">
              {!token ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 px-3.5 py-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">
                      Link reset tidak valid atau sudah kedaluwarsa.
                    </span>
                  </div>
                  <Link
                    href="/auth/forgot-password"
                    className="block text-center text-xs font-medium"
                    style={{ color: BRAND_COLOR }}
                  >
                    Minta link baru
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 px-3.5 py-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-xs leading-relaxed">{error}</span>
                      </div>
                      <Link
                        href="/auth/forgot-password"
                        className="block text-center text-xs font-medium"
                        style={{ color: BRAND_COLOR }}
                      >
                        Minta link baru
                      </Link>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Password Baru</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 8 karakter"
                        required
                        minLength={8}
                        className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Konfirmasi Password Baru</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required
                      minLength={8}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 mt-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: BRAND_COLOR }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
