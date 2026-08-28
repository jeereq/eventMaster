'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  ArrowRight,
  Layers,
  Palette,
  Maximize2,
  Eye,
  Flame,
  Sun,
  Building,
  RotateCw,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export type ShowcaseLevel = 0 | 1 | 2 | 3;

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
    description: 'Tables simples rondes et rectangulaires, déplacement fluide et positionnement basique.',
    features: ['2 formes de tables', 'Déplacement & suppression', '1 salle de réception simple', 'Vue plan 2D claire'],
    dimensions: '14m × 10m',
    capacity: '24 invités',
  },
  {
    name: 'Business',
    badge: 'Standard',
    plans: 'Business B2B',
    tagline: 'Organisation méthodique avec grille magnétique et rangées',
    description: 'Création en rangées, duplication rapide, verrouillage d’objets, 4 formes de tables et allées de passage.',
    features: ['4 formes de tables (ronde, banquet, carrée, ovale)', 'Grille magnétique & alignement', 'Gestion des entrées et couloirs', 'Rendu standard'],
    dimensions: '18m × 12m',
    capacity: '80 invités',
  },
  {
    name: 'Premium',
    badge: 'Avancé',
    plans: 'Premium & Premium Plus',
    tagline: 'Scénographie événementielle et rendu 3D d’ambiance',
    description: 'Scène d’honneur surélevée, buffets traiteur, zone VIP, piste de danse centrale et rendu 3D showcase.',
    features: ['12 thèmes d’ambiance & éclairage', 'Scènes, podiums & décors floraux', 'Rendu 3D showcase immersif', 'Rotations libres & zones VIP'],
    dimensions: '24m × 16m',
    capacity: '160 invités',
  },
  {
    name: 'Complet',
    badge: 'Excellence',
    plans: 'Particuliers, Enterprise, Salles',
    tagline: 'L’expérience totale sans aucune restriction créative',
    description: 'Bâtiments multi-étages (Duplex, Mezzanine, Balcon), tapis d’honneur, chaises dorées Chiavari et textures de sol sur-mesure.',
    features: ['Multi-étages (Duplex, Villa, Balcon)', 'Tapis & périmètres sur-mesure', 'Thèmes & visuels personnalisés', 'Rendu 3D complet avec lustres'],
    dimensions: '30m × 20m (Duplex)',
    capacity: '250+ invités',
    highlighted: true,
  },
];

export default function LandingRoomEditorShowcase() {
  const [selectedTierIndex, setSelectedTierIndex] = useState<ShowcaseLevel>(3); // Complet par défaut
  const [viewMode3D, setViewMode3D] = useState<boolean>(true);
  const [activeFloor, setActiveFloor] = useState<'rdc' | 'mezzanine'>('rdc');
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  const currentTier = EDITOR_TIERS[selectedTierIndex];

  return (
    <section className="py-16 sm:py-24 bg-surface border-t border-border">
      <div className="page-container space-y-12">
        {/* En-tête de section */}
        <div className="max-w-3xl space-y-3">
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
            Visualisez chaque place, du plan de masse à la vue d’ambiance 3D
          </h2>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Finis les plans sur papier ou les tableurs encombrants. Dessinez la salle, agencez les tables avec leurs chaises,
            ajoutez l’estrade et les buffets, puis basculez en vue 3D d’ambiance pour immerger vos clients ou invités.
          </p>
        </div>

        {/* Grille principale : Démonstrateur interactif */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Colonne gauche : Sélecteur de niveaux (5 colonnes) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Niveaux d’éditeur disponibles :
                </p>
                <span className="text-[11px] text-primary font-medium">Cliquez pour tester</span>
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
                        'w-full text-left p-3.5 sm:p-4 rounded-[var(--radius-card)] border transition-all duration-200',
                        isSelected
                          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/40 shadow-sm'
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

            <div className="pt-2">
              <Link href="/register">
                <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Créer ma salle gratuitement
                </Button>
              </Link>
            </div>
          </div>

          {/* Colonne droite : Canevas Visuel Dynamique (7 colonnes) */}
          <div className="lg:col-span-7 rounded-[var(--radius-card)] border border-border bg-background p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* En-tête du canevas avec commandes de vue */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {currentTier.name} ({currentTier.badge})
                    </span>
                    <span className="text-[11px] text-muted">
                      · Superficie : {currentTier.dimensions}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {currentTier.tagline}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sélecteur d'étage (si niveau complet) */}
                  {selectedTierIndex === 3 && (
                    <div className="flex items-center bg-surface-muted rounded-[var(--radius-button)] p-0.5 border border-border text-[10px]">
                      <button
                        type="button"
                        onClick={() => setActiveFloor('rdc')}
                        className={cn(
                          'px-2 py-1 rounded font-semibold transition',
                          activeFloor === 'rdc' ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        RDC
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFloor('mezzanine')}
                        className={cn(
                          'px-2 py-1 rounded font-semibold transition',
                          activeFloor === 'mezzanine' ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        Balcon VIP
                      </button>
                    </div>
                  )}

                  {/* Bouton de bascule 2D / 3D */}
                  <div className="flex items-center bg-surface-muted rounded-[var(--radius-button)] p-0.5 border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode3D(false)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition',
                        !viewMode3D ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground',
                      )}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Plan 2D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode3D(true)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition',
                        viewMode3D ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-foreground',
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Rendu 3D</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CANEVAS VISUEL PRINCIPAL */}
              <div
                className={cn(
                  'relative h-[290px] rounded-[var(--radius-card)] border border-border overflow-hidden transition-all duration-500 select-none flex flex-col justify-between p-3.5',
                  viewMode3D
                    ? 'bg-radial-[at_50%_40%] from-amber-950/80 via-slate-950 to-black text-white shadow-inner'
                    : 'bg-[#faf9f6] dark:bg-[#15171a] text-foreground',
                )}
              >
                {/* ──────────────────────────────────────────────────────── */}
                {/* MODE 3D AMBIANCE SHOWCASE                                */}
                {/* ──────────────────────────────────────────────────────── */}
                {viewMode3D ? (
                  <div className="h-full w-full relative flex flex-col justify-between overflow-hidden">
                    {/* Éclairage volumétrique & Lustre */}
                    <div className="absolute top-0 inset-x-1/4 h-24 bg-gradient-to-b from-amber-300/25 via-amber-400/5 to-transparent blur-md pointer-events-none" />

                    {/* Badge d'ambiance haut */}
                    <div className="relative z-10 flex items-center justify-between text-[10px] text-white/80">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        {selectedTierIndex === 3
                          ? 'Duplex Grand Siècle · Éclairage Tamisé 2700K & Lustres'
                          : selectedTierIndex === 2
                            ? 'Soirée Gala Prestige · Scène & Projecteurs LED'
                            : selectedTierIndex === 1
                              ? 'Configuration Séminaire Pro & Éclairage Standard'
                              : 'Vue Simplifiée Découverte'}
                      </span>
                      <span className="text-[9px] bg-black/40 px-2 py-0.5 rounded text-white/70">
                        {selectedTierIndex === 3 ? 'Capacité : 250+ places' : `${currentTier.capacity}`}
                      </span>
                    </div>

                    {/* Scène centrale 3D */}
                    <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                      {/* Scène haute (si Premium ou Complet) */}
                      {selectedTierIndex >= 2 && (
                        <div className="w-4/5 max-w-[320px] py-2 px-4 rounded-lg bg-gradient-to-r from-amber-600/40 via-amber-400/40 to-amber-600/40 border border-amber-300/60 shadow-[0_4px_20px_rgba(217,119,6,0.3)] flex items-center justify-between text-[11px] font-bold text-amber-100 mb-4 backdrop-blur-xs">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            {selectedTierIndex === 3 ? '✦ Scène Royale & Espace Mariés ✦' : 'Estrade Principale & DJ'}
                          </span>
                          <span className="text-[8px] bg-white/20 px-2 py-0.5 rounded uppercase font-semibold">
                            Étage 1
                          </span>
                        </div>
                      )}

                      {/* Disposition des Tables 3D */}
                      <div className="flex items-center justify-center gap-6 sm:gap-10">
                        {/* Table Gauche */}
                        <div
                          onMouseEnter={() => setHoveredTable('table-1')}
                          onMouseLeave={() => setHoveredTable(null)}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-300/70 bg-gradient-to-b from-amber-100/40 to-amber-950/70 shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-center backdrop-blur-xs transition-transform duration-200 group-hover:scale-110">
                            <span className="text-[10px] font-bold text-white leading-none">Table 1</span>
                            <span className="text-[8px] text-amber-300 font-semibold mt-0.5">8 / 8</span>
                          </div>
                          {hoveredTable === 'table-1' && (
                            <div className="absolute -top-7 px-2 py-0.5 rounded bg-black/90 text-white text-[9px] font-medium whitespace-nowrap shadow-md z-20 border border-white/20">
                              Famille & Proches (8 confirmés)
                            </div>
                          )}
                        </div>

                        {/* Table Centrale */}
                        <div
                          onMouseEnter={() => setHoveredTable('table-honour')}
                          onMouseLeave={() => setHoveredTable(null)}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white bg-gradient-to-b from-white/60 to-amber-900/90 shadow-[0_12px_24px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center text-center ring-4 ring-amber-400/40 transition-transform duration-200 group-hover:scale-110">
                            <span className="text-[11px] font-black text-amber-200 leading-none">HONNEUR</span>
                            <span className="text-[8px] text-white font-bold mt-0.5">Mariés & VIP</span>
                          </div>
                          {hoveredTable === 'table-honour' && (
                            <div className="absolute -top-7 px-2 py-0.5 rounded bg-amber-500 text-black text-[9px] font-bold whitespace-nowrap shadow-md z-20">
                              Table d’Honneur (10 confirmés)
                            </div>
                          )}
                        </div>

                        {/* Table Droite */}
                        <div
                          onMouseEnter={() => setHoveredTable('table-2')}
                          onMouseLeave={() => setHoveredTable(null)}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-300/70 bg-gradient-to-b from-amber-100/40 to-amber-950/70 shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-center backdrop-blur-xs transition-transform duration-200 group-hover:scale-110">
                            <span className="text-[10px] font-bold text-white leading-none">Table 2</span>
                            <span className="text-[8px] text-amber-300 font-semibold mt-0.5">8 / 8</span>
                          </div>
                          {hoveredTable === 'table-2' && (
                            <div className="absolute -top-7 px-2 py-0.5 rounded bg-black/90 text-white text-[9px] font-medium whitespace-nowrap shadow-md z-20 border border-white/20">
                              Amis d’Enfance (8 confirmés)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bas de canevas 3D */}
                    <div className="relative z-10 flex items-center justify-between text-[10px] text-white/70 pt-1 border-t border-white/10">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Piste de danse centrale & tapis d’honneur activés
                      </span>
                      <span className="text-amber-200 font-semibold">Survolez une table pour voir les détails</span>
                    </div>
                  </div>
                ) : (
                  /* ──────────────────────────────────────────────────────── */
                  /* MODE 2D PLAN ARCHITECTURAL                               */
                  /* ──────────────────────────────────────────────────────── */
                  <div className="h-full w-full relative p-2 flex flex-col justify-between">
                    {/* Grille millimétrée */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-45 bg-[linear-gradient(to_right,#0000000d_1px,transparent_1px),linear-gradient(to_bottom,#0000000d_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:16px_16px]"
                    />

                    {/* Scène haute (si Business, Premium, Complet) */}
                    {selectedTierIndex >= 1 ? (
                      <div className="relative z-10 mx-auto w-3/4 h-8 rounded-lg border border-amber-500/40 bg-amber-500/10 flex items-center justify-between px-3 text-[10px] font-bold text-amber-800 dark:text-amber-300 shadow-xs">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Scène & Pupitre DJ ({selectedTierIndex === 3 ? '10m × 3.5m' : '8m × 3m'})
                        </span>
                        <span className="text-[9px] font-semibold text-muted bg-surface/80 dark:bg-background/80 px-1.5 py-0.5 rounded border border-border">
                          {selectedTierIndex === 3 && activeFloor === 'mezzanine' ? 'Balcon VIP' : 'Niveau RDC'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-muted italic">
                        Plan de salle épuré · 2 tables
                      </div>
                    )}

                    {/* Agencement 2D des tables */}
                    <div className="relative z-10 grid grid-cols-3 gap-4 my-auto px-2 items-center justify-items-center">
                      {/* Table 1 */}
                      <div className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-surface dark:bg-surface/60 border border-primary/30 shadow-xs hover:border-primary transition group cursor-pointer">
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />

                        <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary">Table 1</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5">Orchidée</span>
                      </div>

                      {/* Table 2 (Honneur ou Banquet) */}
                      <div className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-[color:var(--festive-accent-soft)] border border-[color:var(--festive-accent)] shadow-xs hover:scale-105 transition cursor-pointer">
                        <span className="absolute -top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -bottom-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -left-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />

                        <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500 flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">HONNEUR</span>
                          <span className="text-[7px] font-bold text-amber-800 dark:text-amber-200">10 / 10</span>
                        </div>
                        <span className="text-[8px] font-black text-amber-800 dark:text-amber-300 mt-0.5">Mariés</span>
                      </div>

                      {/* Table 3 */}
                      <div className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-surface dark:bg-surface/60 border border-primary/30 shadow-xs hover:border-primary transition group cursor-pointer">
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />

                        <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary">Table 2</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5">Jasmin</span>
                      </div>
                    </div>

                    {/* Zone basse : Buffet, Bar et Entrée Protocole QR */}
                    <div className="relative z-10 grid grid-cols-12 gap-2 text-[9px] pt-1">
                      <div className="col-span-4 h-6 rounded bg-surface border border-border flex items-center justify-center font-medium text-muted">
                        Buffet Traiteur
                      </div>
                      <div className="col-span-3 h-6 rounded bg-surface border border-border flex items-center justify-center font-medium text-muted">
                        Bar à Vins
                      </div>
                      <div className="col-span-5 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                        🚪 Entrée & Scan QR
                      </div>
                    </div>
                  </div>
                )}
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
                Les invités reçoivent automatiquement leur numéro de table et le pin GPS après validation RSVP.
              </span>
              <Link href="/#tarifs" className="font-semibold text-primary hover:underline shrink-0">
                Comparer tous les forfaits →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
