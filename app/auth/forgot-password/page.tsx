import { ForgotPasswordForm } from '@/components/forgot-password-form';

export default function SuperadminForgotPasswordPage() {
  return <ForgotPasswordForm portalLabel="Portal Superadmin" backToLoginHref="/auth/login" />;
}
