'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Box, DoorOpen, LayoutGrid, Maximize2 } from '@/components/icons';
import { cn } from '@/lib/cn';
import LandingLoopVideo from '@/components/landing/LandingLoopVideo';

/* « Visite guidée » : enregistrement de la visite « Faire le tour » de /plans-3d (caméra à hauteur d'invité). */
const VIEWS = [
  {
    id: 'visite',
    label: 'Visite guidée',
    hint: 'À hauteur d’invité',
    icon: DoorOpen,
    thumb: '/videos/landing/visite-salle.jpg',
    video: '/videos/landing/visite-salle.mp4',
    alt: 'Visite 3D à hauteur d’invité : on passe la porte, on traverse la salle de banquet jusqu’à la table d’honneur',
  },
  {
    id: 'ensemble',
    label: 'Vue d’ensemble',
    hint: 'La salle qui pivote',
    icon: Box,
    thumb: '/videos/landing/salle-3d.jpg',
    video: '/videos/landing/salle-3d.mp4',
    alt: 'Plan 3D d’une salle de banquet qui pivote : tables rondes, table d’honneur et scène',
  },
  {
    id: 'plan',
    label: 'Plan de table',
    hint: 'Tables et places',
    icon: LayoutGrid,
    thumb: '/images/landing/salle-3d-mariage.webp',
    video: null,
    alt: 'Plan de table d’une salle de mariage : tables rondes numérotées autour de l’allée',
  },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

/**
 * Le plan 3D présenté dans une fenêtre de visionneuse : barre de titre, liste des vues à gauche.
 * Les vues sont de vrais onglets (clavier : flèches, Début, Fin).
 */
export default function Landing3DViewer() {
  const [view, setView] = useState<ViewId>('visite');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = VIEWS.length - 1;
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = last;
    if (next < 0) return;
    e.preventDefault();
    setView(VIEWS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="em-light-island w-full max-w-[960px] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0b1512] text-white shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <p className="min-w-0 truncate text-sm font-semibold">Plan 3D · Salle de banquet</p>
        <Link
          href="/plans-3d"
          className="inline-flex shrink-0 items-center gap-1.5 min-h-9 rounded-full bg-white/10 px-3 text-xs font-semibold hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Maximize2 className="w-3.5 h-3.5" aria-hidden />
          Ouvrir le plan
        </Link>
      </div>

      <div className="grid md:grid-cols-[12.5rem_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="Vues du plan"
          aria-orientation="vertical"
          className="flex md:flex-col gap-2 p-2.5 md:border-r border-b md:border-b-0 border-white/10"
        >
          {VIEWS.map((item, index) => {
            const selected = item.id === view;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`viewer-tab-${item.id}`}
                aria-selected={selected}
                aria-controls="viewer-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setView(item.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={cn(
                  'flex-1 md:flex-none flex items-center md:items-stretch md:flex-col gap-2.5 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  selected ? 'bg-white/12 ring-1 ring-white/30' : 'hover:bg-white/6',
                )}
              >
                <span className="relative hidden md:block aspect-[16/10] overflow-hidden rounded-lg bg-black/40">
                  <Image src={item.thumb} alt="" fill sizes="190px" className="object-cover" />
                </span>
                <span className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 text-[#b0eed5]" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{item.label}</span>
                    <span className="hidden md:block text-xs text-white/65 leading-tight">{item.hint}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          id="viewer-panel"
          role="tabpanel"
          aria-labelledby={`viewer-tab-${view}`}
          className="relative aspect-[16/10] bg-black/40"
        >
          {current.video ? (
            <LandingLoopVideo
              key={current.id}
              src={current.video}
              poster={current.thumb}
              alt={current.alt}
              sizes="(min-width: 1024px) 760px, 92vw"
            />
          ) : (
            <Image src={current.thumb} alt={current.alt} fill sizes="(min-width: 1024px) 760px, 92vw" className="object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}
