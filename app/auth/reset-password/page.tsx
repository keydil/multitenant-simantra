import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ResetPasswordForm } from '@/components/reset-password-form';

function Fallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
