'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Share, Smartphone, X } from '@/components/icons';
import { isAndroidDevice, isIosDevice } from '@/lib/pwa';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import usePwaInstall from '@/hooks/usePwaInstall';
import { cn } from '@/lib/cn';

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

type Platform = 'ios' | 'android' | 'other';

/** Logos officiels (Simple Icons, domaine public CC0). */
function BrandSvg({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d={path} />
    </svg>
  );
}

/** Triangle Google Play en 4 couleurs. */
function PlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <polygon points="4,1.5 4,22.5 14,12" fill="#00c3ff" />
      <polygon points="4,1.5 14,12 15.5,8.6" fill="#00e676" />
      <polygon points="4,22.5 14,12 15.5,15.4" fill="#ff3a44" />
      <polygon points="15.5,8.6 21,12 15.5,15.4 14,12" fill="#ffd400" />
    </svg>
  );
}

const APPLE_PATH =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';

const noopSubscribe = () => () => {};
const readPlatform = (): Platform => (isIosDevice() ? 'ios' : isAndroidDevice() ? 'android' : 'other');

/** Logo de la plateforme de l’appareil : Apple sur iPhone / iPad, Android sur Android, sinon un téléphone. */
function PlatformLogo({ className }: { className?: string }) {
  const platform = useSyncExternalStore<Platform>(noopSubscribe, readPlatform, () => 'other');
  if (platform === 'ios') return <BrandSvg path={APPLE_PATH} className={className} />;
  if (platform === 'android') return <PlayLogo className={className} />;
  return <Smartphone className={className} aria-hidden />;
}

/** Bouton d’installation au format « badge de store » : fond noir, logo de la plateforme, deux lignes. */
function InstallBadge({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  const platform = useSyncExternalStore<Platform>(noopSubscribe, readPlatform, () => 'other');
  const target = platform === 'ios' ? 'iPhone' : platform === 'android' ? 'Android' : null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex h-12 shrink-0 items-center gap-2.5 rounded-xl bg-black px-3.5 text-left text-white transition hover:bg-neutral-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <PlatformLogo className="h-6 w-6 shrink-0" />
      <span className="flex flex-col justify-center leading-none">
        {target ? <span className="block text-xs opacity-80 mb-0.5">Installer sur</span> : null}
        <span className="block text-sm font-semibold">{target ?? 'Installer l’app'}</span>
      </span>
    </button>
  );
}

const STORES = [
  { key: 'ios', name: 'iPhone', Logo: ({ className }: { className?: string }) => <BrandSvg path={APPLE_PATH} className={className} /> },
  { key: 'android', name: 'Android', Logo: PlayLogo },
] as const;

const ROTATE_MS = 2800;

/**
 * Badge d’en-tête : logo + « Installer sur » au-dessus du nom de la plateforme.
 * Sur ordinateur, défile entre iPhone (Apple) et Android (Google Play) ;
 * sur un téléphone, ne montre que sa plateforme. Sans défilement si l’utilisateur réduit les animations.
 */
function RotatingInstallBadge({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
  const platform = useSyncExternalStore<Platform>(noopSubscribe, readPlatform, () => 'other');
  const items = platform === 'ios' ? [STORES[0]] : platform === 'android' ? [STORES[1]] : STORES;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [items.length, paused]);

  const current = index % items.length;
  // Le pourcentage porte sur la pile entière : une étape = 100 % / nombre d’éléments.
  const slide = { transform: `translateY(-${(current * 100) / items.length}%)` };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title="Installer l’application"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-left text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:pr-4"
    >
      <span className="relative block h-5 w-5 shrink-0 overflow-hidden" aria-hidden>
        <span className="flex flex-col transition-transform duration-500 ease-out motion-reduce:transition-none" style={slide}>
          {items.map(({ key, Logo }) => (
            <Logo key={key} className="block h-5 w-5 shrink-0" />
          ))}
        </span>
      </span>
      <span className="hidden flex-col leading-none sm:flex" aria-hidden>
        <span className="text-[10px] text-muted">Installer sur</span>
        <span className="relative mt-0.5 block h-4 overflow-hidden">
          <span className="flex flex-col transition-transform duration-500 ease-out motion-reduce:transition-none" style={slide}>
            {items.map(({ key, name }) => (
              <span key={key} className="block h-4 text-[13px] font-semibold leading-4">
                {name}
              </span>
            ))}
          </span>
        </span>
      </span>
    </button>
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

  // `visible` peut déjà valoir true quand cette page s'hydrate (effet du provider dans le layout) :
  // on attend le montage pour rendre la même chose que le serveur.
  if (!show || !mounted) return null;

  if (variant === 'bar') {
    if (chipDismissed) return null;
    const chip = (
      <div
        className="md:hidden pointer-events-none fixed z-[45] left-[max(0.75rem,env(safe-area-inset-left))] bottom-[calc(var(--em-site-fab-bottom)+3.75rem)] max-w-[calc(100vw-1.5rem)]"
        role="region"
        aria-label="Installer l’application"
      >
        <div className="pointer-events-auto relative flex items-center gap-1 rounded-2xl border border-border bg-surface text-foreground shadow-lg p-1">
          <InstallBadge busy={busy} onClick={() => void install()} />
          <button
            type="button"
            onClick={dismissChip}
            className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl text-muted hover:text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
    return createPortal(chip, document.body);
  }

  if (variant === 'footer') {
    return (
      <div className="space-y-2">
        <InstallBadge busy={busy} onClick={() => void install()} />
        {helpCopy ? <InstallHelp copy={helpCopy} onClose={closeHelp} /> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <RotatingInstallBadge busy={busy} onClick={() => void install()} label={`Installer ${site.platformName}`} />
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
