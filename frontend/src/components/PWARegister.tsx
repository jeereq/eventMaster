'use client';

import { useEffect } from 'react';
import type { BeforeInstallPromptEvent } from '@/lib/pwa';

export default function PWARegister() {
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      window.deferredPwaPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event('em-pwa-prompt-ready'));
    };
    window.addEventListener('beforeinstallprompt', capture);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.update().catch(() => {});
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    return () => window.removeEventListener('beforeinstallprompt', capture);
  }, []);

  return null;
}
