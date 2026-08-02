'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { authQueries } from '@/lib/api/queries';

interface ForgotPasswordFormProps {
  brandColor?: string;
  /** Label kecil di bawah judul, mis. "Portal Superadmin" atau nama tenant. */
  portalLabel?: string;
  backToLoginHref: string;
}

// Sengaja TIDAK membedakan pesan sukses berdasarkan respons backend — email
// terdaftar/tidak, aktif/tidak, semuanya tampil sama (anti user-enumeration,
// mengikuti AuthService.forgotPassword yang selalu balas generik).
export function ForgotPasswordForm({
  brandColor = '#1e3a5f',
  portalLabel,
  backToLoginHref,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authQueries.forgotPassword(email);
    } catch {
      // diam-diam — pesan sukses tetap sama apa pun hasilnya
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="h-1 w-full" style={{ background: brandColor }} />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: brandColor }}
              >
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-base font-semibold text-slate-900">Lupa Password?</h1>
              {portalLabel && <p className="text-sm text-slate-400 mt-0.5">{portalLabel}</p>}
            </div>

            <div className="px-8 py-6">
              {submitted ? (
                <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-3 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-xs leading-relaxed">
                    Jika email terdaftar, kami sudah mengirim link reset password. Cek inbox/spam Anda.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Masukkan email akun Anda. Kami akan mengirimkan link untuk mengatur password baru.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@instansi.go.id"
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                      onFocus={(e) => {
                        e.target.style.boxShadow = `0 0 0 2px ${brandColor}25`;
                        e.target.style.borderColor = brandColor;
                      }}
                      onBlur={(e) => {
                        e.target.style.boxShadow = '';
                        e.target.style.borderColor = '';
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 mt-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: brandColor }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      'Kirim Link Reset'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="text-center mt-5">
            <Link href={backToLoginHref} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              ← Kembali ke halaman masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
