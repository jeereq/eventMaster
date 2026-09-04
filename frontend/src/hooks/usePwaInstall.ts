'use client';

import { useCallback, useEffect, useState } from 'react';
import { isIosDevice, isPwaInstalled } from '@/lib/pwa';

export default function usePwaInstall() {
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState<'ios' | 'manual' | null>(null);

  useEffect(() => {
    const sync = () => setInstalled(isPwaInstalled());
    sync();
    setReady(true);
    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', sync);
    window.addEventListener('appinstalled', sync);
    return () => {
      media.removeEventListener?.('change', sync);
      window.removeEventListener('appinstalled', sync);
    };
  }, []);

  const install = useCallback(async () => {
    if (isPwaInstalled()) {
      setInstalled(true);
      return;
    }
    if (isIosDevice()) {
      setHelp('ios');
      return;
    }
    const prompt = window.deferredPwaPrompt;
    if (!prompt) {
      setHelp('manual');
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      window.deferredPwaPrompt = null;
    }
  }, []);

  return {
    installed,
    ready,
    visible: ready && !installed,
    help,
    setHelp,
    install,
  };
}
