'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import {
  LANDING_PROFILES,
  type LandingProfileId,
} from '@/lib/landingProfiles';
import { Button, Modal } from '@/components/ui';
import { PROFILE_ACTIONS } from '@/components/landing/LandingHeroPreview';
import { ArrowRight, Check, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export default function LandingProfileGate({
  selectedId,
  onSelect,
}: {
  selectedId: LandingProfileId;
  onSelect: (id: LandingProfileId) => void;
}) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

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

  const handleMobileCardSelect = (id: LandingProfileId) => {
    onSelect(id);
    setMobileModalOpen(true);
  };

  const activeProfile = LANDING_PROFILES.find((p) => p.id === selectedId) || LANDING_PROFILES[0];
  const activeActions = PROFILE_ACTIONS[activeProfile.id] || PROFILE_ACTIONS.personal;
  const activeCtaHref = getProfileHref(activeProfile.id, activeProfile.cta.href);
  const activeCtaLabel = getProfileCtaLabel(activeProfile.id, activeProfile.cta.label);

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
            Sélectionnez votre cas pour ouvrir immédiatement vos outils et actions directes.
          </p>
        </div>
      </div>

      {/* Sélecteur en grille 2x2 sur mobile : toucher une carte ouvre instantanément la modale d'actions */}
      <div className="sm:hidden grid grid-cols-2 gap-2.5" role="tablist" aria-label="Choisir votre profil">
        {LANDING_PROFILES.map((p) => {
          const selected = selectedId === p.id;
          const PIcon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => handleMobileCardSelect(p.id)}
              className={cn(
                'p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-2.5 touch-manipulation relative active:scale-[0.98]',
                selected
                  ? 'border-2 border-primary bg-primary/10 shadow-md shadow-primary/20 ring-1 ring-primary/40'
                  : 'bg-surface/90 dark:bg-slate-900/80 border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    selected ? 'bg-primary text-white shadow-xs' : 'em-glow-icon-box',
                  )}
                >
                  <PIcon className="w-4 h-4" />
                </div>
                {selected ? (
                  <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="text-[10px] text-muted flex items-center gap-0.5">
                    Ouvrir <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
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

      {/* Carte résumé sur mobile avec bouton pour rouvrir la modale */}
      <div className="sm:hidden rounded-[var(--radius-card)] p-4 bg-surface dark:bg-slate-900 border-2 border-primary/40 shadow-lg shadow-primary/10 space-y-3 animate-fade-in">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-semibold text-primary">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>{activeProfile.targetAudience}</span>
          </div>

          <h3 className="text-base font-bold text-foreground leading-snug pt-1">
            {activeProfile.title}
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            {activeProfile.intro}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setMobileModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-lg bg-surface-muted hover:bg-surface border border-border text-xs font-bold text-foreground flex items-center justify-center gap-1.5 touch-manipulation transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Voir les 4 actions</span>
          </button>
          <Link href={activeCtaHref} className="block w-full">
            <Button
              size="sm"
              variant="primary"
              className="w-full shadow-sm font-bold text-xs py-2.5 min-h-[42px] justify-center"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {activeCtaLabel}
            </Button>
          </Link>
        </div>
      </div>

      {/* Modale d'actions directes pour mobile */}
      <Modal
        open={mobileModalOpen}
        onClose={() => setMobileModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <activeProfile.icon className="w-5 h-5 text-primary shrink-0" />
            <span className="font-bold text-base sm:text-lg">{activeProfile.label}</span>
          </div>
        }
        description={
          <span className="text-xs font-medium text-primary block mt-0.5">
            {activeProfile.targetAudience}
          </span>
        }
        size="lg"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            {activeProfile.intro}
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Actions directes disponibles
              </span>
              <span className="text-[10px] font-semibold text-muted">
                1 clic pour démarrer
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {activeActions.map((act) => {
                const Icon = act.icon;
                const targetHref = act.href(isLoggedIn);
                const isExternal = targetHref.startsWith('http');

                return (
                  <Link
                    key={act.title}
                    href={targetHref}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    onClick={() => setMobileModalOpen(false)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group active:scale-[0.99] touch-manipulation block',
                      act.highlight
                        ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30 shadow-xs'
                        : 'bg-surface hover:bg-surface-muted dark:bg-slate-900 border-border',
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg em-glow-icon-box shrink-0 flex items-center justify-center mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {act.title}
                          </span>
                          <span className="text-[9px] font-semibold text-muted px-1.5 py-0.2 rounded bg-surface border border-border shrink-0">
                            {act.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted leading-snug line-clamp-2">
                          {act.description}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <Link
              href={activeCtaHref}
              onClick={() => setMobileModalOpen(false)}
              className="block w-full"
            >
              <Button
                size="lg"
                variant="primary"
                className="w-full shadow-lg shadow-primary/30 font-bold text-xs min-h-11 justify-center"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {activeCtaLabel}
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{activeProfile.registerHint}</span>
            </div>
          </div>
        </div>
      </Modal>

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
