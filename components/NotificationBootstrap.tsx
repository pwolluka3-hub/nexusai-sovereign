'use client';

import { useEffect } from 'react';
import { loadSettings } from '@/lib/services/memoryService';
import { notificationService } from '@/lib/services/notificationService';
import { toast } from '@/hooks/use-toast';
import {
  PROVIDER_EVENT_NAME,
  PROVIDER_STATE_EVENT_NAME,
  type ProviderEventDetail,
  type ProviderStateDetail,
} from '@/lib/services/providerControl';

export function NotificationBootstrap() {
  useEffect(() => {
    let mounted = true;
    let lastPuterCreditToastAt = 0;

    const enableNotifications = async () => {
      const settings = await loadSettings();
      if (!mounted || !settings.notificationsEnabled) return;
      await notificationService.requestPermission();
    };

    void enableNotifications();

    const handleOffline = () => {
      void notificationService.notifySystemStatus(
        'offline',
        'Offline mode is active. Cached workspace, saved drafts, and local controls remain available, but live generation and publishing are paused.'
      );
    };

    const handleOnline = () => {
      void notificationService.notifySystemStatus(
        'online',
        'Connection restored. Live trends, provider calls, and publishing are available again.'
      );
    };

    const handleProviderEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ProviderEventDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.type === 'provider_switched') {
        toast({
          title: `Switched to ${detail.to}`,
          description: detail.message,
        });
        return;
      }

      if (detail.type === 'puter_credit_exhausted') {
        const now = Date.now();
        if (now - lastPuterCreditToastAt < 10 * 60 * 1000) {
          return;
        }
        lastPuterCreditToastAt = now;
        toast({
          title: 'Puter credits exhausted',
          description: detail.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Puter fallback disabled',
        description: detail.message,
      });
    };

    const handleProviderState = (event: Event) => {
      const customEvent = event as CustomEvent<ProviderStateDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      toast({
        title: detail.disablePuterFallback ? 'Puter fallback disabled' : 'Puter fallback enabled',
        description: detail.disablePuterFallback
          ? 'Chat will stay on your selected provider instead of routing back into Puter automatically.'
          : 'Chat can use Puter again as an automatic fallback when other providers fail.',
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener(PROVIDER_EVENT_NAME, handleProviderEvent as EventListener);
    window.addEventListener(PROVIDER_STATE_EVENT_NAME, handleProviderState as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(PROVIDER_EVENT_NAME, handleProviderEvent as EventListener);
      window.removeEventListener(PROVIDER_STATE_EVENT_NAME, handleProviderState as EventListener);
    };
  }, []);

  return null;
}
