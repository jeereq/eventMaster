'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { isIosDevice, isPwaInstalled, type BeforeInstallPromptEvent } from '@/lib/pwa';

export { isIosDevice, isPwaInstalled };

interface PWAInstallPromptProps {
  storageKey?: string;
  variant?: 'guest' | 'default';
}

export default function PWAInstallPrompt({
  storageKey = 'pwa_install_dismissed',
  variant = 'default',
}: PWAInstallPromptProps) {
  const { site } = usePlatformSite();
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
      ? 'bg-surface text-foreground border-border'
      : 'bg-primary text-white border-primary/40';

  return (
    <div className={`fixed inset-x-4 md:inset-x-auto md:right-6 md:max-w-sm z-[150] border rounded-[var(--radius-card)] shadow-soft p-4 ${wrapperClass} ${
      variant === 'guest'
        ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom))]'
        : 'bottom-4'
    }`}>
      <button
        type="button"
        onClick={dismiss}
        className={`absolute top-3 right-3 p-1 rounded-[var(--radius-button)] transition ${
          variant === 'guest' ? 'hover:bg-surface-muted text-muted' : 'rounded-full hover:bg-white/10'
        }`}
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className={`p-2 rounded-[var(--radius-button)] shrink-0 ${variant === 'guest' ? 'bg-primary/10 text-primary' : 'bg-white/15'}`}>
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-sm leading-tight">
            Installez {site.platformName} sur votre appareil
          </p>
          <p className={`text-xs leading-relaxed ${variant === 'guest' ? 'text-muted' : 'opacity-90'}`}>
            Accédez plus rapidement à vos invitations, badge et fil d&apos;actualité depuis votre écran d&apos;accueil.
          </p>

          {showIosHelp ? (
            <div className={`text-[11px] rounded-[var(--radius-card)] p-3 space-y-1.5 ${variant === 'guest' ? 'bg-surface-muted border border-border' : 'bg-white/10'}`}>
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
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold hover:opacity-95 transition ${
                variant === 'guest' ? 'bg-primary text-white' : 'bg-white text-primary font-bold hover:bg-surface-muted'
              }`}
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
