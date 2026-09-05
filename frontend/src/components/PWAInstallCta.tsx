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

function helpText(kind: 'ios' | 'manual' | null) {
  if (kind === 'ios') return 'iPhone / iPad : Partager, puis « Sur l’écran d’accueil ».';
  if (kind === 'manual') return 'Menu du navigateur → Installer l’application ou Ajouter à l’écran d’accueil.';
  return null;
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
        <X className="w-4 h-4" />
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (variant !== 'bar' || !show) return;
    document.documentElement.dataset.pwaInstall = 'ask';
    return () => {
      delete document.documentElement.dataset.pwaInstall;
    };
  }, [variant, show]);

  if (!show) return null;

  if (variant === 'bar') {
    if (!mounted) return null;
    return createPortal(
      <div
        className="md:hidden fixed inset-x-0 z-[45] bottom-[var(--em-site-bottom-nav)] border-t border-primary/25 bg-primary-solid text-primary-foreground"
        role="region"
        aria-label="Installer l’application"
      >
        <div className="page-container min-h-12 flex items-center justify-between gap-2 py-1">
          <p className="min-w-0 text-xs font-semibold leading-tight truncate">
            Installez {site.platformName}
          </p>
          <Button
            type="button"
            size="sm"
            loading={busy}
            onClick={() => void install()}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="shrink-0 !bg-primary-foreground !text-primary-solid hover:!bg-primary-foreground/90"
          >
            Installer
          </Button>
        </div>
        {helpCopy ? (
          <InstallHelp
            copy={helpCopy}
            onClose={closeHelp}
            className="absolute bottom-full inset-x-3 mb-2"
          />
        ) : null}
      </div>,
      document.body,
    );
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
    <div className={cn('relative', variant === 'header' && 'hidden md:block')}>
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
        <span className={cn(variant === 'inline' && 'hidden sm:inline')}>Installer</span>
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
