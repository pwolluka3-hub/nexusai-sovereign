'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { AgentProvider } from '@/lib/context/AgentContext';
import { BrandKitProvider } from '@/lib/context/BrandKitContext';
import { AppShell } from '@/components/layout/AppShell';
import { FullPageLoading } from '@/components/nexus/LoadingPulse';
import { CommandPaletteWrapper } from '@/components/CommandPalette';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated, isGuest, onboardingComplete, brandKit } = useAuth();
  
  // Consider onboarding complete if either flag is true OR brandKit exists
  const isReady = onboardingComplete || !!brandKit;
  const loginRedirect = `/?reauth=1&next=${encodeURIComponent(pathname || '/dashboard')}`;
  const canAccessApp = isAuthenticated || isGuest;

  useEffect(() => {
    if (isLoading) return;
    
    if (!canAccessApp) {
      router.replace(loginRedirect);
    } else if (!isReady) {
      router.replace('/onboarding');
    }
  }, [canAccessApp, isLoading, isReady, loginRedirect, router]);

  // Show loading while auth is being checked
  if (isLoading) {
    return <FullPageLoading text="Loading..." />;
  }

  // If not authenticated, show redirecting
  if (!canAccessApp) {
    return <FullPageLoading text="Redirecting to login..." />;
  }
  
  // If onboarding not complete, show redirecting
  if (!isReady) {
    return <FullPageLoading text="Redirecting to onboarding..." />;
  }

  return <>{children}</>;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <BrandKitProvider>
        <AgentProvider>
          <AppShell>{children}</AppShell>
          <CommandPaletteWrapper />
          <NotificationBootstrap />
        </AgentProvider>
      </BrandKitProvider>
    </AuthGuard>
  );
}
