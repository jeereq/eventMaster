'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from '@/components/icons';
import SiteBrandMark from '@/components/SiteBrandMark';
import { cn } from '@/lib/cn';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';

/** Vert citron des rubans et du mot mis en avant. */
const LIME = '#a6f04d';

interface AuthPhotoLayoutProps {
  /** Titre sur la photo ; son dernier mot passe en vert citron. */
  title: string;
  description: string;
  /** Titre et ligne d’action du bandeau vert en tête de carte. */
  cardTitle: string;
  cardSubtitle?: React.ReactNode;
  cardWidthClassName?: string;
  photo?: string;
  backHref?: string;
  backLabel?: string;
  /** Pastille d’action posée sur la photo (grand écran). */
  photoAction?: React.ReactNode;
  children: React.ReactNode;
}

/** Rubans citron qui balaient la photo, tracés au chargement. */
function Ribbons() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="em-ribbons pointer-events-none absolute inset-0 h-full w-full hidden lg:block"
      fill="none"
    >
      <path
        d="M -120 560 C 120 760, 420 930, 700 820 C 960 720, 1080 470, 960 360 C 860 270, 700 360, 760 500 C 800 590, 920 600, 1010 540"
        stroke={LIME}
        strokeWidth="88"
        strokeLinecap="round"
        opacity="0.9"
        pathLength={1}
      />
      <path
        d="M 1180 -80 C 1420 120, 1480 420, 1300 620 C 1220 710, 1120 720, 1060 680"
        stroke={LIME}
        strokeWidth="56"
        strokeLinecap="round"
        opacity="0.55"
        pathLength={1}
      />
    </svg>
  );
}

/** Version mobile : un seul ruban qui traverse le bandeau photo. */
function RibbonsMobile() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 400"
      preserveAspectRatio="xMaxYMid slice"
      className="em-ribbons pointer-events-none absolute inset-0 h-full w-full lg:hidden"
      fill="none"
    >
      <path
        d="M 470 40 C 330 60, 250 150, 300 230 C 340 290, 420 270, 410 210"
        stroke={LIME}
        strokeWidth="34"
        strokeLinecap="round"
        opacity="0.85"
        pathLength={1}
      />
    </svg>
  );
}

/** Grain sableux : bruit SVG (feTurbulence) en motif répété. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.45'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>\")";

/** Petite boucle citron, même tracé que les rubans de la photo (bouts arrondis, boucle en « e »). */
function CardRibbon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 100"
      className="pointer-events-none absolute bottom-0 right-5 h-14 w-auto sm:right-8 sm:h-16"
      fill="none"
    >
      <path
        d="M 8 112 C 18 70, 52 34, 86 42 C 112 48, 112 82, 88 84 C 70 85, 66 66, 80 60"
        stroke={LIME}
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

/** Sépare le dernier mot (avec une ponctuation détachée « ? », « ! ») du reste du titre. */
function splitTitle(title: string) {
  const m = title.trim().match(/^(.*?)\s*(\S+(?:\s[?!:;])?)$/);
  return m ? { lead: m[1], last: m[2] } : { lead: '', last: title };
}

export function AuthPhotoLayout({
  title,
  description,
  cardTitle,
  cardSubtitle,
  cardWidthClassName = 'lg:max-w-[460px]',
  photo = '/images/landing/hero-reception-soiree.webp',
  backHref = '/',
  backLabel = 'Retour au site',
  photoAction,
  children,
}: AuthPhotoLayoutProps) {
  const { site } = usePlatformSite();
  const messaging = useMessagingChannels();
  const { lead, last } = splitTitle(messaging.adapt(title));

  const roundBtn =
    'inline-flex items-center justify-center gap-2 min-h-11 min-w-11 px-3 rounded-2xl bg-white text-[#10291c] text-sm font-semibold shadow-lg hover:bg-[#f1fbe6] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a6f04d]';

  return (
    <div className="relative min-h-screen bg-background text-foreground lg:bg-[#0d1a12]">
      {/* Photo : bandeau en haut sur mobile, plein écran sur grand écran */}
      <div className="relative h-[46vh] min-h-[320px] overflow-hidden lg:fixed lg:inset-0 lg:h-auto">
        <Image src={photo} alt="" fill priority sizes="100vw" className="object-cover" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 lg:hidden" />
        <Ribbons />
        <RibbonsMobile />

        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center gap-2 z-10 lg:right-auto">
          {backHref ? (
            <Link href={backHref} aria-label={backLabel} className={roundBtn}>
              <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden />
            </Link>
          ) : null}
          <SiteBrandMark href="/" tone="onDark" className="ml-1" />
        </div>

        <div className="absolute inset-x-5 bottom-8 sm:inset-x-8 lg:left-14 lg:right-auto lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2 lg:max-w-xl xl:left-20 z-10">
          <h1
            className={cn(
              'font-display font-bold text-white tracking-tight [hyphens:none] text-balance',
              title.length > 30 ? 'text-[clamp(2.2rem,4.4vw,4.3rem)]' : 'text-[clamp(2.6rem,6.2vw,6rem)]',
              'leading-[1.04]',
            )}
          >
            {lead ? `${lead} ` : null}<span style={{ color: LIME }}>{last}</span>
          </h1>
          <p className="mt-5 max-w-md text-white/90 text-[clamp(1.05rem,1.5vw,1.4rem)] leading-snug">
            {messaging.adapt(description)}
          </p>
        </div>

        {photoAction ? (
          <div className="hidden lg:flex absolute bottom-8 left-14 xl:left-20 z-10">{photoAction}</div>
        ) : null}
      </div>

      {/* Formulaire */}
      <div className="relative z-10 -mt-6 lg:mt-0 lg:min-h-screen lg:flex lg:items-center lg:justify-end lg:px-14 xl:px-20 lg:py-10">
        <main
          id="main-content"
          className={cn(
            'em-auth-card w-full rounded-t-[28px] lg:rounded-[28px] bg-surface lg:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]',
            cardWidthClassName,
          )}
        >
          <div className="relative overflow-hidden rounded-t-[28px] bg-[#1f4a33] px-5 pt-6 pb-6 sm:px-9 sm:pt-7">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
              style={{ backgroundImage: GRAIN, backgroundSize: '90px 90px' }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: GRAIN, backgroundSize: '90px 90px' }}
            />
            <CardRibbon />
            <div className="relative pr-16">
              <div className="min-w-0">
                <h2 className="font-display text-3xl sm:text-[2.1rem] font-bold leading-tight tracking-tight text-white">
                  {messaging.adapt(cardTitle)}
                </h2>
                {cardSubtitle ? <div className="mt-1.5 text-sm text-[#d7f6e9]">{cardSubtitle}</div> : null}
              </div>
            </div>
          </div>
          <div className="px-5 pt-6 pb-10 sm:px-9 sm:pb-8">
            {children}
            <p className="mt-8 text-center text-xs text-muted">© {new Date().getFullYear()} {site.platformName}</p>
          </div>
        </main>
      </div>

      <style>{`
        .em-ribbons path { stroke-dasharray: 1; stroke-dashoffset: 0; animation: em-ribbon-draw 1.6s cubic-bezier(.65,0,.35,1) both; }
        .em-ribbons path + path { animation-delay: .35s; }
        @keyframes em-ribbon-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .em-ribbons path { animation: none; } }
        .em-auth-card button[type="submit"] { background: ${LIME}; color: #10291c; font-weight: 700; border-radius: 1rem; box-shadow: 0 10px 24px -12px rgba(110,170,40,.9); }
        .em-auth-card button[type="submit"]:hover:not(:disabled) { background: #95e23a; }
        .em-auth-card button[type="submit"]:focus-visible { outline: 2px solid #1f4a33; outline-offset: 2px; }
        .em-auth-card [role="radio"][aria-checked="true"] { background: ${LIME}; color: #10291c; }
        .em-auth-card .text-primary { color: #4d7c0f; }
        html.dark .em-auth-card .text-primary { color: ${LIME}; }
        .em-auth-card input[type="checkbox"] { accent-color: #6fbf1f; }
        .em-auth-card input:not([type="checkbox"]):not([type="radio"]), .em-auth-card select, .em-auth-card [aria-haspopup="listbox"] { background: var(--surface-muted); border-color: transparent; border-radius: 0.9rem; }
        .em-auth-card input:not([type="checkbox"]):not([type="radio"]):focus-visible, .em-auth-card select:focus-visible, .em-auth-card [aria-haspopup="listbox"]:focus-visible { background: var(--surface); border-color: #31714c; box-shadow: 0 0 0 3px rgba(166,240,77,.45); }
      `}</style>
    </div>
  );
}

export const AUTH_LIME = LIME;
