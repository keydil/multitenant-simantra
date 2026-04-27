'use client';

import { ReactNode, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AuthErrorBoundaryProps {
  children: ReactNode;
}

export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  const [showError, setShowError] = useState(false);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900 font-semibold">Authentication Error</AlertTitle>
          <AlertDescription className="text-red-800 mt-2">
            {error.message || 'An unexpected error occurred during authentication'}
          </AlertDescription>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                window.location.href = '/auth/login';
              }}
              className="border-red-200 text-red-900 hover:bg-red-100"
            >
              Back to Login
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
