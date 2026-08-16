'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

interface PWAInstallPromptProps {
  storageKey?: string;
  variant?: 'guest' | 'default';
}

export default function PWAInstallPrompt({
  storageKey = 'pwa_install_dismissed',
  variant = 'default',
}: PWAInstallPromptProps) {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isPwaInstalled()) return;
    if (localStorage.getItem(storageKey) === '1') return;

    const existing = window.deferredPwaPrompt;
    if (existing) {
      setInstallEvent(existing);
      setVisible(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredPwaPrompt = promptEvent;
      setInstallEvent(promptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    const timer = window.setTimeout(() => {
      if (!isPwaInstalled() && localStorage.getItem(storageKey) !== '1') {
        setVisible(true);
      }
    }, 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.clearTimeout(timer);
    };
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  const handleInstall = async () => {
    if (isIosDevice()) {
      setShowIosHelp(true);
      return;
    }

    const prompt = installEvent || window.deferredPwaPrompt;
    if (!prompt) {
      setShowIosHelp(true);
      return;
    }

    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      window.deferredPwaPrompt = null;
    }
  };

  if (!visible || isPwaInstalled()) return null;

  const wrapperClass =
    variant === 'guest'
      ? 'bg-primary text-white border-primary/40'
      : 'bg-primary text-white border-primary/40';

  return (
    <div className={`fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:max-w-sm z-[150] border rounded-[var(--radius-card)] shadow-soft p-4 ${wrapperClass}`}>
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 rounded-[var(--radius-button)] bg-white/15 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <p className="font-bold text-sm leading-tight">Installez EventMaster sur votre appareil</p>
          <p className="text-xs opacity-90 leading-relaxed">
            Accédez plus rapidement à vos invitations, badge et fil d&apos;actualité depuis votre écran d&apos;accueil.
          </p>

          {showIosHelp ? (
            <div className="text-[11px] bg-white/10 rounded-[var(--radius-card)] p-3 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5" />
                Sur iPhone / iPad
              </p>
              <p>Appuyez sur Partager puis « Sur l&apos;écran d&apos;accueil ».</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-button)] bg-white text-primary text-xs font-bold hover:bg-surface-muted transition"
            >
              <Download className="w-3.5 h-3.5" />
              Installer l&apos;application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
