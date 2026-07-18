"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

interface TenantInfo {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  is_active: boolean;
}

export default function TenantLoginPage() {
  const params = useParams();
  const router = useRouter();
  const { signInTenant, user, loading: authLoading } = useAuth();
  const tenantSlug = params.tenant as string;

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch info tenant dari URL slug
  useEffect(() => {
    const fetchTenant = async () => {
      const supabase = createClient();
      const { data, error } = (await supabase
        .from("tenants")
        .select("id, name, logo_url, brand_color, is_active")
        .eq("subdomain", tenantSlug)
        .single()) as any;

      if (error || !data) {
        setTenantError("Instansi tidak ditemukan");
      } else if (!data.is_active) {
        setTenantError("Instansi ini sedang tidak aktif");
      } else {
        setTenant(data);
      }
      setTenantLoading(false);
    };

    if (tenantSlug) fetchTenant();
  }, [tenantSlug]);

  // Redirect kalau udah login
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "admin") {
        router.push(`/${tenantSlug}/admin`);
      } else if (user.role === "operator") {
        router.push(`/${tenantSlug}/operator`);
      }
    }
  }, [user, authLoading, tenantSlug, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      // Pakai signInTenant — bukan signInSuperadmin!
      await signInTenant(email, password, tenantSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  if (tenantLoading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            {tenantError}
          </h2>
          <p className="text-xs text-slate-400">
            Periksa kembali URL yang Anda gunakan
          </p>
        </div>
      </div>
    );
  }

  const brandColor = tenant?.brand_color || "#1e3a5f";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top accent pakai brand color instansi */}
      <div className="h-1 w-full" style={{ background: brandColor }} />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-white text-sm font-bold"
                style={{ background: brandColor }}
              >
                {tenant?.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={tenant.name}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  tenant?.name?.slice(0, 2).toUpperCase()
                )}
              </div>
              <h1 className="text-base font-semibold text-slate-900">
                {tenant?.name}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Masuk ke portal petugas
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 px-3.5 py-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Email
                  </label>
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
                      e.target.style.boxShadow = "";
                      e.target.style.borderColor = "";
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                      onFocus={(e) => {
                        e.target.style.boxShadow = `0 0 0 2px ${brandColor}25`;
                        e.target.style.borderColor = brandColor;
                      }}
                      onBlur={(e) => {
                        e.target.style.boxShadow = "";
                        e.target.style.borderColor = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
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
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    "Masuk"
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="text-center mt-5 space-y-1">
            <p className="text-xs text-slate-400">
              Hanya untuk petugas & admin yang berwenang
            </p>
            <p className="text-xs text-slate-300">
              Powered by{" "}
              <span className="font-medium text-slate-400">SIMANTRA</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
