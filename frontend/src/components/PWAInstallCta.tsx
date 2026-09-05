'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import usePwaInstall from '@/hooks/usePwaInstall';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

const HIDDEN_PREFIXES = ['/rsvp/', '/invite/', '/print'];
const CHIP_DISMISS_KEY = 'em_pwa_install_chip_dismissed';

function helpText(kind: 'ios' | 'manual' | null) {
  if (kind === 'ios') return 'iPhone / iPad : Partager, puis « Sur l’écran d’accueil ».';
  if (kind === 'manual') return 'Menu du navigateur → Installer l’application ou Ajouter à l’écran d’accueil.';
  return null;
}

function readChipDismissed() {
  try {
    return localStorage.getItem(CHIP_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function persistChipDismissed() {
  try {
    localStorage.setItem(CHIP_DISMISS_KEY, '1');
  } catch {
    /* quota / private mode */
  }
}

function InstallHelp({
  copy,
  onClose,
  className,
}: {
  copy: string;
  onClose: () => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointer = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  return (
    <div
      ref={boxRef}
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2 p-2.5 rounded-[var(--radius-card)] border border-border bg-surface text-foreground shadow-lg',
        className,
      )}
    >
      <Share className="w-4 h-4 shrink-0 mt-0.5 text-primary" aria-hidden />
      <p className="min-w-0 flex-1 text-xs leading-snug">{copy}</p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Fermer l’aide d’installation"
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
}

export default function PWAInstallCta({
  variant = 'header',
}: {
  variant?: 'header' | 'footer' | 'bar' | 'inline';
}) {
  const pathname = usePathname() || '/';
  const { site } = usePlatformSite();
  const { visible, help, setHelp, install, busy } = usePwaInstall();
  const helpCopy = helpText(help);
  const hiddenRoute = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const show = visible && !hiddenRoute;
  const closeHelp = () => setHelp(null);
  const [mounted, setMounted] = useState(false);
  const [chipDismissed, setChipDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    setChipDismissed(readChipDismissed());
  }, []);

  const dismissChip = () => {
    persistChipDismissed();
    setChipDismissed(true);
    closeHelp();
  };

  if (!show) return null;

  if (variant === 'bar') {
    if (chipDismissed) return null;
    const chip = (
      <div
        className="md:hidden pointer-events-none fixed z-[45] left-[max(0.75rem,env(safe-area-inset-left))] bottom-[var(--em-site-fab-bottom)] max-w-[min(15.25rem,calc(100vw-5.75rem))]"
        role="region"
        aria-label="Installer l’application"
      >
        <div className="pointer-events-auto relative flex items-center gap-1 rounded-2xl border border-border bg-surface text-foreground shadow-lg pl-2.5 pr-1 py-1">
          <Smartphone className="w-4 h-4 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 text-xs font-semibold leading-tight">
            Installer l’app
          </p>
          <Button
            type="button"
            size="sm"
            loading={busy}
            onClick={() => void install()}
            className="shrink-0"
          >
            OK
          </Button>
          <button
            type="button"
            onClick={dismissChip}
            className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-muted hover:text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Masquer l’invitation d’installation"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        {helpCopy ? (
          <InstallHelp
            copy={helpCopy}
            onClose={closeHelp}
            className="pointer-events-auto absolute bottom-full left-0 mb-2 w-[min(18rem,calc(100vw-1.5rem))]"
          />
        ) : null}
      </div>
    );
    if (!mounted) return chip;
    return createPortal(chip, document.body);
  }

  if (variant === 'footer') {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="sm"
          loading={busy}
          onClick={() => void install()}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Installer l’application
        </Button>
        {helpCopy ? <InstallHelp copy={helpCopy} onClose={closeHelp} /> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        loading={busy}
        onClick={() => void install()}
        leftIcon={<Smartphone className="w-4 h-4" />}
        aria-label={`Installer ${site.platformName}`}
        title="Installer l’application"
        className="text-primary hover:bg-primary/10"
      >
        <span className="hidden sm:inline">Installer</span>
      </Button>
      {helpCopy ? (
        <InstallHelp
          copy={helpCopy}
          onClose={closeHelp}
          className="absolute right-0 top-full mt-1 z-50 w-[min(18rem,calc(100vw-1.5rem))]"
        />
      ) : null}
    </div>
  );
}
