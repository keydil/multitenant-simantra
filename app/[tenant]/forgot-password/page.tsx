'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { friendlyErrorMessage } from '@/lib/api/errors';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

interface TenantInfo {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  is_active: boolean;
}

export default function TenantForgotPasswordPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const data = await api.get<TenantInfo>(`/public/tenants/${tenantSlug}`, { auth: false });
        setTenant(data);
      } catch (err) {
        setTenantError(
          err instanceof ApiError && err.statusCode === 404
            ? 'Instansi tidak ditemukan'
            : friendlyErrorMessage(err)
        );
      }
      setTenantLoading(false);
    };

    if (tenantSlug) fetchTenant();
  }, [tenantSlug]);

  if (tenantLoading) {
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
          <h2 className="text-sm font-semibold text-slate-800 mb-1">{tenantError}</h2>
          <p className="text-xs text-slate-400">Periksa kembali URL yang Anda gunakan</p>
        </div>
      </div>
    );
  }

  return (
    <ForgotPasswordForm
      brandColor={tenant?.brand_color || '#1e3a5f'}
      portalLabel={tenant?.name}
      backToLoginHref={`/${tenantSlug}/login`}
    />
  );
}
