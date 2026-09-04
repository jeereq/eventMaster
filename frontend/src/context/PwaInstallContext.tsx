'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isIosDevice, isPwaInstalled } from '@/lib/pwa';

export type PwaHelpKind = 'ios' | 'manual' | null;

export type PwaInstallApi = {
  installed: boolean;
  ready: boolean;
  visible: boolean;
  help: PwaHelpKind;
  setHelp: (next: PwaHelpKind) => void;
  install: () => Promise<void>;
  busy: boolean;
  promptReady: boolean;
};

const PwaInstallContext = createContext<PwaInstallApi | null>(null);

function readPromptReady() {
  return Boolean(typeof window !== 'undefined' && window.deferredPwaPrompt);
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState<PwaHelpKind>(null);
  const [busy, setBusy] = useState(false);
  const [promptReady, setPromptReady] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    const syncInstalled = () => {
      const next = isPwaInstalled();
      setInstalled(next);
      if (next) {
        setHelp(null);
        setPromptReady(false);
      }
    };
    const syncPrompt = () => setPromptReady(readPromptReady());

    syncInstalled();
    syncPrompt();
    setReady(true);

    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', syncInstalled);
    window.addEventListener('appinstalled', syncInstalled);
    window.addEventListener('beforeinstallprompt', syncPrompt);
    window.addEventListener('em-pwa-prompt-ready', syncPrompt);
    return () => {
      media.removeEventListener?.('change', syncInstalled);
      window.removeEventListener('appinstalled', syncInstalled);
      window.removeEventListener('beforeinstallprompt', syncPrompt);
      window.removeEventListener('em-pwa-prompt-ready', syncPrompt);
    };
  }, []);

  const install = useCallback(async () => {
    if (busyRef.current) return;
    if (isPwaInstalled()) {
      setInstalled(true);
      setHelp(null);
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

    busyRef.current = true;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setHelp(null);
        window.deferredPwaPrompt = null;
        setPromptReady(false);
      } else {
        window.deferredPwaPrompt = null;
        setPromptReady(false);
        setHelp('manual');
      }
    } catch {
      setHelp(isIosDevice() ? 'ios' : 'manual');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const value = useMemo<PwaInstallApi>(
    () => ({
      installed,
      ready,
      visible: ready && !installed,
      help,
      setHelp,
      install,
      busy,
      promptReady,
    }),
    [installed, ready, help, install, busy, promptReady],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallApi {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error('usePwaInstall must be used within PwaInstallProvider');
  }
  return ctx;
}
