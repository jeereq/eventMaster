'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { isPwaInstalled } from '@/lib/pwa';
import { Button } from '@/components/ui';

export { isIosDevice, isPwaInstalled } from '@/lib/pwa';

interface PWAInstallPromptProps {
  storageKey?: string;
  variant?: 'guest' | 'default';
}

export default function PWAInstallPrompt({
  storageKey = 'pwa_install_dismissed',
  variant = 'default',
}: PWAInstallPromptProps) {
  const { site } = usePlatformSite();
  const { installed, help, setHelp, install, busy } = usePwaInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (installed || isPwaInstalled()) return;
    try {
      if (localStorage.getItem(storageKey) === '1') return;
    } catch {
      /* ignore quota / private mode */
    }

    const timer = window.setTimeout(() => {
      try {
        if (localStorage.getItem(storageKey) === '1') return;
      } catch {
        /* ignore */
      }
      if (!isPwaInstalled()) setOpen(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [installed, storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
    setHelp(null);
  };

  if (!open || installed) return null;

  const isGuest = variant === 'guest';

  return (
    <div
      className={`fixed inset-x-4 md:inset-x-auto md:right-6 md:max-w-sm z-[150] border rounded-[var(--radius-card)] shadow-soft p-4 ${
        isGuest
          ? 'bg-surface text-foreground border-border bottom-[calc(5.25rem+env(safe-area-inset-bottom))]'
          : 'bg-primary-solid text-primary-foreground border-primary/40 bottom-4'
      }`}
      role="dialog"
      aria-label={`Installer ${site.platformName}`}
    >
      <button
        type="button"
        onClick={dismiss}
        className={`absolute top-2 right-2 inline-flex items-center justify-center min-h-11 min-w-11 rounded-[var(--radius-button)] transition ${
          isGuest ? 'hover:bg-surface-muted text-muted' : 'hover:bg-white/10'
        }`}
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className={`p-2 rounded-[var(--radius-button)] shrink-0 ${isGuest ? 'bg-primary/10 text-primary' : 'bg-white/15'}`}>
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="space-y-2 min-w-0">
          <p className="font-semibold text-sm leading-tight">
            Installez {site.platformName} sur votre appareil
          </p>
          <p className={`text-xs leading-relaxed ${isGuest ? 'text-muted' : 'text-primary-foreground/90'}`}>
            Accédez plus rapidement à vos invitations, badge et fil d&apos;actualité depuis votre écran d&apos;accueil.
          </p>

          {help ? (
            <div
              role="status"
              aria-live="polite"
              className={`text-xs rounded-[var(--radius-card)] p-3 space-y-1.5 ${isGuest ? 'bg-surface-muted border border-border' : 'bg-white/10'}`}
            >
              <p className="font-semibold flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5" />
                Comment installer
              </p>
              <p>
                {help === 'ios'
                  ? 'Appuyez sur Partager, puis « Sur l’écran d’accueil ».'
                  : 'Menu du navigateur → Installer l’application ou Ajouter à l’écran d’accueil.'}
              </p>
              <button
                type="button"
                onClick={() => setHelp(null)}
                className="min-h-11 px-2 font-semibold underline underline-offset-2"
              >
                Fermer l’aide
              </button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              loading={busy}
              onClick={() => void install()}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className={isGuest ? undefined : '!bg-primary-foreground !text-primary-solid hover:!bg-primary-foreground/90'}
            >
              Installer l’application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
