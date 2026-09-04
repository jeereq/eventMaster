'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Share, Smartphone } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import usePwaInstall from '@/hooks/usePwaInstall';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

const HIDDEN_PREFIXES = ['/rsvp/', '/invite/', '/print'];

export default function PWAInstallCta({
  variant = 'header',
}: {
  variant?: 'header' | 'footer' | 'bar' | 'inline';
}) {
  const pathname = usePathname() || '/';
  const { site } = usePlatformSite();
  const { visible, help, setHelp, install } = usePwaInstall();
  const helpCopy =
    help === 'ios'
      ? 'iPhone / iPad : Partager, puis « Sur l’écran d’accueil ».'
      : help === 'manual'
        ? 'Menu du navigateur → Installer l’application ou Ajouter à l’écran d’accueil.'
        : null;
  const hiddenRoute = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const show = visible && !hiddenRoute;

  useEffect(() => {
    if (variant !== 'bar' || !show) return;
    document.documentElement.dataset.pwaInstall = 'ask';
    return () => {
      delete document.documentElement.dataset.pwaInstall;
    };
  }, [variant, show]);

  if (!show) return null;

  if (variant === 'bar') {
    return (
      <div
        className="md:hidden fixed inset-x-0 z-[45] bottom-[var(--em-site-bottom-nav)] border-t border-primary/25 bg-primary-solid text-primary-foreground"
        role="region"
        aria-label="Installer l’application"
      >
        <div className="page-container h-11 flex items-center justify-between gap-2">
          <p className="min-w-0 text-[11px] font-semibold leading-tight">
            Installez {site.platformName} pour un accès immédiat
          </p>
          <button
            type="button"
            onClick={() => void install()}
            className="shrink-0 inline-flex items-center gap-1.5 min-h-8 px-2.5 rounded-lg bg-white text-primary-solid text-[11px] font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            Installer
          </button>
        </div>
        {helpCopy ? (
          <p className="absolute bottom-full inset-x-0 mb-1 mx-3 p-2 rounded-[var(--radius-card)] bg-surface text-foreground border border-border shadow-lg text-[11px] flex items-center gap-1.5">
            <Share className="w-3.5 h-3.5 shrink-0 text-primary" />
            {helpCopy}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void install()}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Installer l’application
        </Button>
        {helpCopy ? (
          <p className="text-[11px] text-muted inline-flex items-center gap-1.5">
            <Share className="w-3.5 h-3.5 shrink-0" />
            {helpCopy}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('relative', variant === 'header' && 'hidden md:block')}>
      <button
        type="button"
        onClick={() => void install()}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 min-h-9 px-2.5 rounded-lg',
          'text-primary hover:bg-primary/10 transition touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
        aria-label={`Installer ${site.platformName}`}
        title="Installer l’application"
      >
        <Smartphone className="w-4 h-4" />
        <span className={cn('text-xs font-bold', variant === 'inline' && 'hidden sm:inline')}>
          Installer
        </span>
      </button>
      {helpCopy ? (
        <button
          type="button"
          onClick={() => setHelp(null)}
          className="absolute right-0 top-full mt-1 z-50 w-56 p-2.5 rounded-[var(--radius-card)] border border-border bg-surface shadow-lg text-left text-[11px] text-muted"
        >
          <span className="font-semibold text-foreground inline-flex items-center gap-1.5">
            <Share className="w-3.5 h-3.5" />
            Comment installer
          </span>
          <span className="block mt-1">{helpCopy}</span>
        </button>
      ) : null}
    </div>
  );
}
