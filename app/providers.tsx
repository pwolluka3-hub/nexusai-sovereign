'use client';

import { AuthProvider } from '@/lib/context/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import RuntimeReadinessGate from '@/components/RuntimeReadinessGate';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <RuntimeReadinessGate>
        <AuthProvider>
          {children}
        </AuthProvider>
      </RuntimeReadinessGate>
    </ErrorBoundary>
  );
}
