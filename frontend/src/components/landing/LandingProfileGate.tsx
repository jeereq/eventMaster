'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import {
  LANDING_PROFILES,
  type LandingProfileId,
} from '@/lib/landingProfiles';
import { Button } from '@/components/ui';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

export default function LandingProfileGate({
  selectedId,
  onSelect,
}: {
  selectedId: LandingProfileId;
  onSelect: (id: LandingProfileId) => void;
}) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const getProfileHref = (profileId: LandingProfileId, defaultHref: string) => {
    if (!isLoggedIn) return defaultHref;
    switch (profileId) {
      case 'personal':
        return '/dashboard/events';
      case 'pro':
        return '/dashboard/events';
      case 'seeker':
        return '/marketplace';
      case 'vendor':
        return '/dashboard/catalogue';
      default:
        return '/dashboard';
    }
  };

  const getProfileCtaLabel = (profileId: LandingProfileId, defaultLabel: string) => {
    if (!isLoggedIn) return defaultLabel;
    switch (profileId) {
      case 'personal':
        return 'Accéder à mes événements';
      case 'pro':
        return 'Gérer ma billetterie';
      case 'seeker':
        return 'Explorer le catalogue';
      case 'vendor':
        return 'Ouvrir mon catalogue';
      default:
        return 'Ouvrir mon espace';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="em-festive-chip">
              <Sparkles className="w-3 h-3" />
              Solutions & Produits
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Orientation Immédiate
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Quel est votre projet ?
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Choisissez votre solution pour accéder immédiatement aux actions et outils dédiés.
          </p>
        </div>
      </div>

      {/* Sélecteur compact en grille 2x2 sur mobile (100% visible sans scroll coupé) */}
      <div className="sm:hidden grid grid-cols-2 gap-2" role="tablist" aria-label="Choisir votre profil">
        {LANDING_PROFILES.map((p) => {
          const selected = selectedId === p.id;
          const PIcon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(p.id)}
              className={cn(
                'p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-2 touch-manipulation relative',
                selected
                  ? 'border-2 border-primary bg-primary/10 shadow-md shadow-primary/20 ring-1 ring-primary/40'
                  : 'bg-surface/90 dark:bg-slate-900/80 border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    selected ? 'bg-primary text-white shadow-xs' : 'em-glow-icon-box',
                  )}
                >
                  <PIcon className="w-3.5 h-3.5" />
                </div>
                {selected && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px]">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted block truncate">
                  {p.eyebrow}
                </span>
                <span
                  className={cn(
                    'text-xs font-bold leading-tight line-clamp-2',
                    selected ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {p.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Carte explicative complète de la solution active sur mobile */}
      {(() => {
        const activeProfile = LANDING_PROFILES.find((p) => p.id === selectedId) || LANDING_PROFILES[0];
        const ActiveIcon = activeProfile.icon;
        const ctaHref = getProfileHref(activeProfile.id, activeProfile.cta.href);
        const ctaLabel = getProfileCtaLabel(activeProfile.id, activeProfile.cta.label);

        return (
          <div className="sm:hidden rounded-[var(--radius-card)] p-4 bg-surface dark:bg-slate-900 border-2 border-primary/40 shadow-lg shadow-primary/10 space-y-3.5 animate-fade-in">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-semibold text-primary">
                <ActiveIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{activeProfile.targetAudience}</span>
              </div>

              <h3 className="text-base font-bold text-foreground leading-snug pt-1">
                {activeProfile.title}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {activeProfile.intro}
              </p>
            </div>

            {/* 3 points clés avec icônes */}
            <div className="grid grid-cols-1 gap-1.5 py-2.5 border-y border-border/80">
              {activeProfile.results.map((res) => {
                const ResIcon = res.icon;
                return (
                  <div key={res.label} className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ResIcon className="w-2.5 h-2.5" />
                    </div>
                    <span>{res.label}</span>
                  </div>
                );
              })}
            </div>

            {/* CTA principal de la solution */}
            <div className="space-y-1.5 pt-0.5">
              <Link href={ctaHref} className="block w-full">
                <Button
                  size="md"
                  variant="primary"
                  className="w-full shadow-md shadow-primary/30 font-bold text-xs min-h-11 justify-center"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {ctaLabel}
                </Button>
              </Link>
              <p className="text-[10px] text-muted text-center">
                {activeProfile.registerHint}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Grille des 4 solutions (Desktop / Tablette) */}
      <ul
        id="profils"
        className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        role="list"
      >
        {LANDING_PROFILES.map((profile) => {
          const Icon = profile.icon;
          const selected = selectedId === profile.id;
          const ctaHref = getProfileHref(profile.id, profile.cta.href);
          const ctaLabel = getProfileCtaLabel(profile.id, profile.cta.label);

          return (
            <li key={profile.id} className="w-full">
              <div
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Sélectionner la solution ${profile.label}`}
                onClick={() => onSelect(profile.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(profile.id);
                  }
                }}
                className={cn(
                  'w-full h-full text-left rounded-[var(--radius-card)] p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                  selected
                    ? 'border-2 border-primary bg-surface dark:bg-slate-900/90 shadow-xl shadow-primary/25 ring-2 ring-primary/30 scale-[1.01] z-10'
                    : 'em-hud-card border-border hover:border-primary/50 hover:bg-surface/90',
                )}
              >
                {/* Spotlight lumineux d'arrière-plan */}
                <div
                  className={cn(
                    'absolute -inset-10 bg-radial from-primary/20 to-transparent blur-2xl pointer-events-none transition-opacity duration-300 -z-10',
                    selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                  )}
                  aria-hidden
                />

                {/* Barre accentuée supérieure */}
                <div
                  className={cn(
                    'absolute top-0 left-0 right-0 h-1 transition-all',
                    selected ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/40',
                  )}
                />

                {/* Indicateur de sélection actif */}
                {selected && (
                  <span className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shadow-sm shadow-primary/40">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}

                <div>
                  {/* Badge & Icône */}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0',
                        selected
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105'
                          : 'em-glow-icon-box',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-0.5 rounded-full bg-surface-muted border border-border/80">
                      {profile.eyebrow}
                    </span>
                  </div>

                  {/* Pour qui ? */}
                  <p className="text-[11px] font-semibold text-primary/90 mb-1.5 leading-snug">
                    {profile.targetAudience}
                  </p>

                  {/* Titre Produit */}
                  <h3
                    className={cn(
                      'text-base font-bold mb-1.5 leading-snug transition-colors',
                      selected ? 'text-primary' : 'text-foreground group-hover:text-primary',
                    )}
                  >
                    {profile.label}
                  </h3>

                  {/* Description courte */}
                  <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-3.5">
                    {profile.intro}
                  </p>

                  {/* 3 micro-puces de fonctionnalités */}
                  <div className="space-y-1.5 py-3 border-y border-border/60">
                    {profile.results.map((res) => {
                      const ResIcon = res.icon;
                      return (
                        <div
                          key={res.label}
                          className="flex items-center gap-2 text-[11px] font-medium text-foreground/90"
                        >
                          <span
                            className={cn(
                              'w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px]',
                              selected
                                ? 'bg-primary/15 text-primary'
                                : 'bg-surface-muted text-muted group-hover:text-primary',
                            )}
                          >
                            <ResIcon className="w-2.5 h-2.5" />
                          </span>
                          <span className="truncate">{res.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bouton d'action direct */}
                <div className="pt-4 mt-auto">
                  <Link
                    href={ctaHref}
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full"
                  >
                    <Button
                      size="sm"
                      variant={selected ? 'primary' : 'secondary'}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className={cn(
                        'w-full text-xs font-semibold justify-between transition-all duration-200',
                        selected ? 'shadow-md shadow-primary/30' : 'hover:border-primary/40',
                      )}
                    >
                      {ctaLabel}
                    </Button>
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
