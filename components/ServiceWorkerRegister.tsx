'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const cleanup = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));

          if ('caches' in window) {
            const cacheKeys = await window.caches.keys();
            await Promise.all(
              cacheKeys.map((key) => window.caches.delete(key))
            );
          }
        } catch (error) {
          console.warn('[v0] Service Worker cleanup failed:', error);
        }
      };

      void cleanup();
    }
  }, []);

  return null;
}
