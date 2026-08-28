'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  ArrowRight,
  Maximize2,
  Eye,
  Flame,
  Sun,
  Moon,
  Crown,
  Grid,
  Building2,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export type ShowcaseLevel = 0 | 1 | 2 | 3;
export type LightingTheme = 'gala' | 'romantic' | 'night';

interface EditorTierConfig {
  name: string;
  badge: string;
  plans: string;
  tagline: string;
  description: string;
  features: string[];
  dimensions: string;
  capacity: string;
  highlighted?: boolean;
}

const EDITOR_TIERS: EditorTierConfig[] = [
  {
    name: 'Essentiel',
    badge: 'Découverte',
    plans: 'Forfait Gratuit',
    tagline: 'L’essentiel pour démarrer rapidement sans contrainte',
    description: 'Tables simples rondes et rectangulaires, positionnement fluide.',
    features: ['2 formes de tables', 'Déplacement fluide', '1 salle simple', 'Vue plan 2D claire'],
    dimensions: '14m × 10m',
    capacity: '24 invités',
  },
  {
    name: 'Business',
    badge: 'Standard',
    plans: 'Business B2B',
    tagline: 'Organisation méthodique avec grille magnétique et rangées',
    description: '4 formes de tables, rangées, duplication rapide et allées.',
    features: ['4 formes de tables', 'Grille magnétique', 'Allées de passage', 'Rendu standard'],
    dimensions: '18m × 12m',
    capacity: '80 invités',
  },
  {
    name: 'Premium',
    badge: 'Avancé',
    plans: 'Premium & Premium Plus',
    tagline: 'Scénographie événementielle et rendu 3D d’ambiance',
    description: 'Scène surélevée, buffets, zone VIP et rendu 3D d’ambiance.',
    features: ['12 thèmes d’éclairage', 'Scènes & podiums', 'Rendu 3D immersif', 'Rotations libres'],
    dimensions: '24m × 16m',
    capacity: '160 invités',
  },
  {
    name: 'Complet',
    badge: 'Excellence',
    plans: 'Particuliers, Enterprise, Salles',
    tagline: 'L’expérience totale sans aucune restriction créative',
    description: 'Multi-étages (Duplex, Balcon), lustres cristal et textures sur-mesure.',
    features: [
      'Multi-étages (Duplex, Balcon)',
      'Tapis & allées sur-mesure',
      'Thèmes personnalisés 2700K',
      'Rendu 3D avec lustres cristal',
    ],
    dimensions: '30m × 20m (Duplex)',
    capacity: '250+ invités',
    highlighted: true,
  },
];

export default function LandingRoomEditorShowcase() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const [selectedTierIndex, setSelectedTierIndex] = useState<ShowcaseLevel>(3);
  const [viewMode3D, setViewMode3D] = useState<boolean>(true);
  const [lightingTheme, setLightingTheme] = useState<LightingTheme>('gala');
  const [activeFloor, setActiveFloor] = useState<'rdc' | 'mezzanine'>('rdc');
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  const currentTier = EDITOR_TIERS[selectedTierIndex];
  const roomEditorUrl = isLoggedIn ? '/dashboard/rooms' : '/register?kind=ORGANIZER&intent=personal';

  return (
    <section className="py-16 sm:py-24 bg-surface border-t border-border">
      <div className="page-container space-y-10">
        {/* En-tête de section avec CTAs directs */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="em-festive-chip">
                <Sparkles className="w-3 h-3" />
                Éditeur Visuel 2D / 3D
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Le cœur du placement
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight leading-tight">
              Modélisez votre salle en 2D et 3D
            </h2>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Placez tables, allées, buffets et lustres, puis visualisez l’ambiance en direct avec cotations réalistes.
            </p>
          </div>

          {/* Boutons d'actions directes vers l'outil */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link href={roomEditorUrl}>
              <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                Ouvrir l’éditeur de salle
              </Button>
            </Link>
            <Link href="/marketplace/salles">
              <Button variant="secondary" rightIcon={<Building2 className="w-4 h-4" />}>
                Explorer les salles 3D
              </Button>
            </Link>
          </div>
        </div>

        {/* Grille principale : Démonstrateur interactif */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Colonne gauche : Niveaux d'éditeur & Liens directs (5 colonnes) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Niveaux d’éditeur disponibles :
                </p>
                <span className="text-[11px] text-primary font-semibold">Bascule instantanée</span>
              </div>

              <div className="space-y-2.5">
                {EDITOR_TIERS.map((tier, index) => {
                  const isSelected = selectedTierIndex === index;
                  return (
                    <button
                      key={tier.name}
                      type="button"
                      onClick={() => setSelectedTierIndex(index as ShowcaseLevel)}
                      className={cn(
                        'w-full text-left p-3.5 sm:p-4 rounded-[var(--radius-card)] border transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md scale-[1.01]'
                          : 'border-border bg-background hover:border-foreground/20 hover:bg-surface-muted/50',
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-foreground flex items-center gap-2">
                          {tier.name}
                          {tier.highlighted && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--festive-accent-soft)] text-[color:var(--festive-accent)] font-bold">
                              Inclus Particuliers
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-semibold text-muted bg-surface-muted px-2 py-0.5 rounded border border-border">
                          {tier.plans}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {tier.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions secondaires */}
            <div className="pt-2 space-y-2">
              <Link href={roomEditorUrl} className="block">
                <Button variant="primary" className="w-full justify-between" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Lancer mon plan de salle maintenant
                </Button>
              </Link>
              <Link href="/register?kind=VENDOR&intent=vendor" className="block text-center text-xs text-muted hover:text-primary transition py-1">
                Vous possédez une salle ? Référencez votre espace gratuitement →
              </Link>
            </div>
          </div>

          {/* Colonne droite : Canevas Visuel Dynamique (7 colonnes) */}
          <div className="lg:col-span-7 em-hud-card p-4 sm:p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* En-tête du canevas avec commandes de vue HUD */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {currentTier.name} ({currentTier.badge})
                    </span>
                    <span className="text-[11px] text-muted font-medium">
                      · Superficie : {currentTier.dimensions}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {currentTier.tagline}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Sélecteur d'ambiance 3D */}
                  {viewMode3D && selectedTierIndex >= 2 && (
                    <div className="flex items-center bg-surface-muted/90 dark:bg-slate-900 rounded-full p-0.5 border border-border text-[10px]">
                      <button
                        type="button"
                        onClick={() => setLightingTheme('gala')}
                        title="Ambiance Gala Doré"
                        className={cn(
                          'px-2 py-1 rounded-full flex items-center gap-1 font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'gala' ? 'bg-amber-500 text-white shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Flame className="w-3 h-3" />
                        <span className="hidden sm:inline">Gala</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightingTheme('romantic')}
                        title="Ambiance Romantique"
                        className={cn(
                          'px-2 py-1 rounded-full flex items-center gap-1 font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'romantic' ? 'bg-rose-500 text-white shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Sun className="w-3 h-3" />
                        <span className="hidden sm:inline">Romantique</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightingTheme('night')}
                        title="Ambiance Nocturne"
                        className={cn(
                          'px-2 py-1 rounded-full flex items-center gap-1 font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'night' ? 'bg-indigo-600 text-white shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Moon className="w-3 h-3" />
                        <span className="hidden sm:inline">Nuit</span>
                      </button>
                    </div>
                  )}

                  {/* Sélecteur d'étage (si niveau complet) */}
                  {selectedTierIndex === 3 && (
                    <div className="flex items-center bg-surface-muted/90 rounded-full p-0.5 border border-border text-[10px]">
                      <button
                        type="button"
                        onClick={() => setActiveFloor('rdc')}
                        className={cn(
                          'px-2.5 py-1 rounded-full font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          activeFloor === 'rdc' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        RDC
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFloor('mezzanine')}
                        className={cn(
                          'px-2.5 py-1 rounded-full font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          activeFloor === 'mezzanine' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        Balcon VIP
                      </button>
                    </div>
                  )}

                  {/* Bouton de bascule 2D / 3D */}
                  <div className="flex items-center bg-surface-muted/90 rounded-full p-0.5 border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode3D(false)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                        !viewMode3D ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground',
                      )}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Plan 2D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode3D(true)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                        viewMode3D ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground',
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Rendu 3D</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CANEVAS VISUEL PRINCIPAL CINÉMATIQUE */}
              <div
                className={cn(
                  'relative h-[300px] rounded-[var(--radius-card)] border border-border overflow-hidden transition-all duration-500 select-none flex flex-col justify-between p-3.5',
                  viewMode3D
                    ? lightingTheme === 'gala'
                      ? 'bg-radial-[at_50%_35%] from-amber-950/90 via-[#0a0806] to-black text-white shadow-inner'
                      : lightingTheme === 'romantic'
                        ? 'bg-radial-[at_50%_35%] from-rose-950/80 via-[#0c0608] to-black text-white shadow-inner'
                        : 'bg-radial-[at_50%_35%] from-indigo-950/90 via-[#060810] to-black text-white shadow-inner'
                    : 'bg-[#faf9f6] dark:bg-[#0e1117] text-foreground',
                )}
              >
                {/* MODE 3D AMBIANCE */}
                {viewMode3D ? (
                  <div className="h-full w-full relative flex flex-col justify-between overflow-hidden">
                    <div
                      className={cn(
                        'absolute top-0 inset-x-1/6 h-36 blur-xl pointer-events-none opacity-45 mix-blend-screen transition-all duration-500',
                        lightingTheme === 'gala'
                          ? 'bg-gradient-to-b from-amber-300/60 via-amber-400/15 to-transparent'
                          : lightingTheme === 'romantic'
                            ? 'bg-gradient-to-b from-rose-300/60 via-rose-400/15 to-transparent'
                            : 'bg-gradient-to-b from-cyan-300/60 via-indigo-400/15 to-transparent',
                      )}
                    />

                    <div className="relative z-10 flex items-center justify-between text-[10px] text-white/90">
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xs">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        {selectedTierIndex === 3
                          ? activeFloor === 'mezzanine'
                            ? 'Balcon VIP Mezzanine · Vue Plongeante & Lustres Cristal'
                            : 'Duplex Grand Siècle · Éclairage Tamisé 2700K & 3 Lustres'
                          : selectedTierIndex === 2
                            ? 'Soirée Gala Prestige · Scène & Projecteurs LED'
                            : selectedTierIndex === 1
                              ? 'Configuration Séminaire Pro & Éclairage Standard'
                              : 'Vue Simplifiée Découverte'}
                      </span>
                      <span className="text-[9px] bg-black/50 px-2.5 py-0.5 rounded-full border border-white/10 text-white/80 font-semibold">
                        {selectedTierIndex === 3 ? 'Capacité : 250+ places' : `${currentTier.capacity}`}
                      </span>
                    </div>

                    <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                      {selectedTierIndex >= 2 && (
                        <div
                          className={cn(
                            'w-4/5 max-w-[340px] py-2 px-4 rounded-xl border flex items-center justify-between text-[11px] font-bold shadow-xl transition-all duration-300 backdrop-blur-xs mb-3.5',
                            lightingTheme === 'gala'
                              ? 'bg-gradient-to-r from-amber-700/50 via-amber-500/50 to-amber-700/50 border-amber-300/70 text-amber-100 shadow-amber-500/30'
                              : lightingTheme === 'romantic'
                                ? 'bg-gradient-to-r from-rose-700/50 via-rose-500/50 to-rose-700/50 border-rose-300/70 text-rose-100 shadow-rose-500/30'
                                : 'bg-gradient-to-r from-slate-800/80 via-indigo-900/80 to-slate-800/80 border-indigo-400/60 text-indigo-100 shadow-indigo-950/50',
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-300" />
                            {selectedTierIndex === 3
                              ? '✦ Scène Royale & Espace Mariés ✦'
                              : 'Estrade Principale & DJ'}
                          </span>
                          <span className="text-[8px] bg-white/25 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                            {activeFloor === 'mezzanine' ? 'Étage 2' : 'Niveau RDC'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-5 sm:gap-9">
                        <div
                          onMouseEnter={() => setHoveredTable('table-1')}
                          onMouseLeave={() => setHoveredTable(null)}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-300/70 bg-gradient-to-b from-amber-100/30 to-amber-950/80 shadow-[0_10px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center text-center backdrop-blur-xs transition-transform duration-200 group-hover:scale-110">
                            <span className="text-[10px] font-bold text-white leading-none">Table 1</span>
                            <span className="text-[8px] text-amber-300 font-semibold mt-0.5">8 / 8</span>
                          </div>
                          <div className="absolute -inset-1.5 border border-dashed border-amber-300/40 rounded-full pointer-events-none" />
                          {hoveredTable === 'table-1' && (
                            <div className="absolute -top-8 px-2.5 py-1 rounded-lg bg-black/95 text-white text-[10px] font-medium whitespace-nowrap shadow-xl z-20 border border-white/20 animate-fade-in">
                              Famille & Proches (8 confirmés)
                            </div>
                          )}
                        </div>

                        <div
                          onMouseEnter={() => setHoveredTable('table-honour')}
                          onMouseLeave={() => setHoveredTable(null)}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white bg-gradient-to-b from-white/50 to-amber-900/90 shadow-[0_12px_24px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center text-center ring-4 ring-amber-400/50 transition-transform duration-200 group-hover:scale-110">
                            <Crown className="w-3.5 h-3.5 text-amber-200 mb-0.5" />
                            <span className="text-[11px] font-black text-amber-100 leading-none">HONNEUR</span>
                            <span className="text-[8px] text-white font-bold mt-0.5">Mariés & VIP</span>
                          </div>
                          <div className="absolute -inset-2 border-2 border-amber-400/50 rounded-full pointer-events-none animate-spin-slow" />
                          {hoveredTable === 'table-honour' && (
                            <div className="absolute -top-8 px-3 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-bold whitespace-nowrap shadow-xl z-20 border border-amber-300 animate-fade-in">
                              ✦ Table d’Honneur (10 confirmés) ✦
                            </div>
                          )}
                        </div>

                        <div
                          onMouseEnter={() => setHoveredTable('table-2')}
                          onMouseLeave={() => setHoveredTable(null)}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-300/70 bg-gradient-to-b from-amber-100/30 to-amber-950/80 shadow-[0_10px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center text-center backdrop-blur-xs transition-transform duration-200 group-hover:scale-110">
                            <span className="text-[10px] font-bold text-white leading-none">Table 2</span>
                            <span className="text-[8px] text-amber-300 font-semibold mt-0.5">8 / 8</span>
                          </div>
                          <div className="absolute -inset-1.5 border border-dashed border-amber-300/40 rounded-full pointer-events-none" />
                          {hoveredTable === 'table-2' && (
                            <div className="absolute -top-8 px-2.5 py-1 rounded-lg bg-black/95 text-white text-[10px] font-medium whitespace-nowrap shadow-xl z-20 border border-white/20 animate-fade-in">
                              Amis d’Enfance (8 confirmés)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between text-[10px] text-white/80 pt-1.5 border-t border-white/15">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Piste de danse centrale & allée d’honneur activées
                      </span>
                      <Link href={roomEditorUrl} className="text-amber-200 hover:underline font-semibold flex items-center gap-1">
                        Ouvrir le vrai canevas d’édition →
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* MODE 2D CAD */
                  <div className="h-full w-full relative p-2 flex flex-col justify-between">
                    <div
                      className="absolute inset-0 pointer-events-none opacity-45 bg-[linear-gradient(to_right,#00000010_1px,transparent_1px),linear-gradient(to_bottom,#00000010_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:16px_16px]"
                    />

                    {selectedTierIndex >= 1 ? (
                      <div className="relative z-10 mx-auto w-3/4 h-8 rounded-lg border-2 border-amber-500/50 bg-amber-500/15 flex items-center justify-between px-3 text-[10px] font-bold text-amber-800 dark:text-amber-300 shadow-xs">
                        <span className="flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          Scène & Pupitre DJ ({selectedTierIndex === 3 ? '10m × 3.5m' : '8m × 3m'})
                        </span>
                        <span className="text-[9px] font-bold text-foreground bg-surface px-2 py-0.5 rounded border border-border">
                          {selectedTierIndex === 3 && activeFloor === 'mezzanine' ? 'Balcon VIP' : 'Niveau RDC'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-muted italic">
                        Plan de salle épuré · 2 tables
                      </div>
                    )}

                    <div className="relative z-10 grid grid-cols-3 gap-4 my-auto px-2 items-center justify-items-center">
                      <div className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-surface dark:bg-surface/60 border border-primary/40 shadow-xs hover:border-primary transition group cursor-pointer">
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />

                        <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/40 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary">Table 1</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5">Orchidée</span>
                      </div>

                      <div className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-[color:var(--festive-accent-soft)] border-2 border-amber-500 shadow-xs hover:scale-105 transition cursor-pointer">
                        <span className="absolute -top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -bottom-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -left-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />

                        <div className="w-12 h-12 rounded-full bg-amber-500/25 border border-amber-500 flex flex-col items-center justify-center text-center">
                          <Crown className="w-3 h-3 text-amber-600 dark:text-amber-300 mb-0.5" />
                          <span className="text-[9px] font-black text-amber-700 dark:text-amber-300">HONNEUR</span>
                        </div>
                        <span className="text-[8px] font-black text-amber-800 dark:text-amber-300 mt-0.5">Mariés (10)</span>
                      </div>

                      <div className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-surface dark:bg-surface/60 border border-primary/40 shadow-xs hover:border-primary transition group cursor-pointer">
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />

                        <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/40 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary">Table 2</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5">Jasmin</span>
                      </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-12 gap-2 text-[9px] pt-1">
                      <div className="col-span-4 h-6 rounded-md bg-surface border border-border flex items-center justify-center font-bold text-muted">
                        Buffet Traiteur
                      </div>
                      <div className="col-span-3 h-6 rounded-md bg-surface border border-border flex items-center justify-center font-semibold text-muted">
                        Bar à Vins
                      </div>
                      <div className="col-span-5 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                        🚪 Entrée Double (Scan QR)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Barre d'outils avec action directe */}
              <div className="flex items-center justify-between border-t border-border/80 pt-3">
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-muted [scrollbar-width:none]">
                  <span className="font-bold text-foreground shrink-0 flex items-center gap-1">
                    <Grid className="w-3.5 h-3.5 text-primary" /> Palette :
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-border shrink-0">
                    + Table Ronde
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-border shrink-0">
                    + Scène Royale
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-border shrink-0">
                    + Tapis / Allée
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-border shrink-0">
                    + Lustre Cristal
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-border shrink-0">
                    + Porte Battante
                  </span>
                </div>

                <Link href={roomEditorUrl} className="shrink-0 text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  Tester en direct <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Liste des fonctionnalités incluses */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Inclus dans le niveau {currentTier.name} :
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {currentTier.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Note d’aide en bas */}
            <div className="p-3.5 rounded-lg bg-surface-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted">
              <span className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-primary shrink-0" />
                Vos invités visualisent leur table sur leur smartphone après confirmation WhatsApp.
              </span>
              <Link href={roomEditorUrl} className="font-semibold text-primary hover:underline shrink-0">
                Créer ma salle maintenant →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
