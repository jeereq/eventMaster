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
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui';

const EDITOR_LEVELS = [
  {
    level: 'Essentiel',
    badge: 'Découverte',
    plans: 'Forfait Gratuit',
    description: 'Tables simples (rondes et rectangulaires), déplacement fluide et suppression.',
    features: ['2 formes de tables', 'Déplacement & rotation de base', '1 salle simple'],
  },
  {
    level: 'Business',
    badge: 'Standard',
    plans: 'Business B2B',
    description: 'Création en rangées, duplication rapide, verrouillage d’objets et grille magnétique.',
    features: ['4 formes de tables', 'Alignement & duplication', 'Grille et allées de passage'],
  },
  {
    level: 'Premium',
    badge: 'Avancé',
    plans: 'Premium & Premium Plus',
    description: 'Scénographie (scène, buffets, zone VIP), liaisons multi-étages et rendu 3D animé.',
    features: ['12 thèmes d’ambiance', 'Scènes & éléments décoratifs', 'Rendu 3D showcase'],
  },
  {
    level: 'Complet',
    badge: 'Excellence',
    plans: 'Particuliers, Enterprise, Salles',
    description: 'Toutes les options débloquées : périmètres, tapis, multi-étages duplex et thèmes sur-mesure.',
    features: ['Multi-étages (Duplex, Villa)', 'Tapis & périmètres sur-mesure', 'Thèmes & visuels personnalisés'],
    highlighted: true,
  },
];

export default function LandingRoomEditorShowcase() {
  const [selectedLevel, setSelectedLevel] = useState<number>(3); // Complet par défaut

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
            Donnez vie à votre salle, du plan de masse à la vue d’ambiance 3D
          </h2>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Finis les plans sur papier ou les tableurs incompréhensibles. Dessinez l’espace, disposez les tables,
            ajoutez la scène et les buffets, puis attribuez les sièges en quelques clics.
          </p>
        </div>

        {/* Grille principale : Démonstrateur interactif */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Colonne gauche : Sélecteur de niveaux (5 colonnes) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Choisissez un niveau d’éditeur :
              </p>
              <div className="space-y-2">
                {EDITOR_LEVELS.map((item, index) => {
                  const isSelected = selectedLevel === index;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setSelectedLevel(index)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-[var(--radius-card)] border transition-all duration-200 ${
                        isSelected
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/40 shadow-xs'
                          : 'border-border bg-background hover:border-foreground/20 hover:bg-surface-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-foreground flex items-center gap-2">
                          {item.level}
                          {item.highlighted && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--festive-accent-soft)] text-[color:var(--festive-accent)] font-semibold">
                              Inclus Particuliers
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-medium text-muted bg-surface-muted px-2 py-0.5 rounded border border-border">
                          {item.plans}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <Link href="/register">
                <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Tester l’éditeur gratuitement
                </Button>
              </Link>
            </div>
          </div>

          {/* Colonne droite : Vitrine visuelle active (7 colonnes) */}
          <div className="lg:col-span-7 rounded-2xl border border-border bg-background p-5 sm:p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Niveau actuel : {EDITOR_LEVELS[selectedLevel].level}
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    {EDITOR_LEVELS[selectedLevel].badge} — {EDITOR_LEVELS[selectedLevel].plans}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-surface border border-border text-muted">
                    <Palette className="w-3.5 h-3.5 text-[color:var(--festive-accent)]" /> 12 Thèmes
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-surface border border-border text-muted">
                    <Layers className="w-3.5 h-3.5 text-primary" /> Multi-niveaux
                  </span>
                </div>
              </div>

              {/* Visuel interactif stylisé */}
              <div className="relative rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-semibold text-foreground">
                    Planification de salle · Vue Scénographie
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    ● Enregistrement automatique
                  </span>
                </div>

                {/* Plan interactif visuel */}
                <div className="rounded-lg border border-dashed border-border bg-surface-muted/30 p-4 space-y-3">
                  <div className="h-9 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-300">
                    ✦ Estre & Scène d’Honneur (DJ / Orchestre) ✦
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-xl border border-primary/30 bg-primary/10 flex flex-col items-center justify-center text-center p-1">
                      <span className="text-xs font-bold text-primary">Table Rose</span>
                      <span className="text-[10px] text-muted">8 / 8 confirmés</span>
                    </div>
                    <div className="h-16 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col items-center justify-center text-center p-1">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Table VIP</span>
                      <span className="text-[10px] text-muted">6 / 6 confirmés</span>
                    </div>
                    <div className="h-16 rounded-xl border border-primary/30 bg-primary/10 flex flex-col items-center justify-center text-center p-1">
                      <span className="text-xs font-bold text-primary">Table Lys</span>
                      <span className="text-[10px] text-muted">8 / 8 confirmés</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted px-2 pt-1">
                    <span>Buffet Traiteur à gauche</span>
                    <span>Accès Protocole à droite</span>
                  </div>
                </div>

                {/* Liste des capacités débloquées */}
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Inclus dans ce niveau :
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {EDITOR_LEVELS[selectedLevel].features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Note d’aide en bas */}
            <div className="p-3.5 rounded-lg bg-surface-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted">
              <span className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-primary shrink-0" />
                Les invités reçoivent leur table et localisation GPS dès confirmation RSVP.
              </span>
              <Link href="/#tarifs" className="font-semibold text-primary hover:underline shrink-0">
                Comparer les forfaits →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
