'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import {
  LANDING_PROFILES,
  type LandingProfileId,
} from '@/lib/landingProfiles';
import { Button, Modal } from '@/components/ui';
import LandingHeroPreview from '@/components/landing/LandingHeroPreview';
import { ArrowRight, Check, ShieldCheck, Layers } from 'lucide-react';

export default function LandingProfileGate({
  selectedId,
  onSelect,
}: {
  selectedId: LandingProfileId;
  onSelect: (id: LandingProfileId) => void;
}) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const openDetails = (id: LandingProfileId) => {
    onSelect(id);
    setDetailsOpen(true);
  };

  const activeProfile = LANDING_PROFILES.find((p) => p.id === selectedId) || LANDING_PROFILES[0];
  const activeCtaHref = getProfileHref(activeProfile.id, activeProfile.cta.href);
  const activeCtaLabel = getProfileCtaLabel(activeProfile.id, activeProfile.cta.label);

  return (
    <div className="space-y-4">
      <div className="px-1 space-y-1">
        <h2 className="em-landing-heading text-xl sm:text-2xl text-foreground">
          Quel est votre projet ?
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          Choisissez votre cas : vos outils et actions s’ouvrent dans le détail, une fois le profil sélectionné.
        </p>
      </div>

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
              onClick={() => openDetails(p.id)}
              className={cn(
                'p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-2.5 touch-manipulation relative active:scale-[0.98]',
                selected
                  ? 'border-2 border-primary bg-primary/10 shadow-md shadow-primary/20 ring-1 ring-primary/40'
                  : 'bg-surface/90 dark:bg-surface/80 border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    selected ? 'bg-primary-solid text-primary-foreground shadow-xs' : 'em-glow-icon-box',
                  )}
                >
                  <PIcon className="w-4 h-4" />
                </div>
                {selected ? (
                  <span className="w-5 h-5 rounded-full bg-primary-solid text-primary-foreground flex items-center justify-center text-[10px] shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="text-[10px] text-muted flex items-center gap-0.5">
                    Détail <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-bold leading-tight line-clamp-2',
                  selected ? 'text-primary' : 'text-foreground',
                )}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      <ul
        id="profils"
        className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        role="list"
      >
        {LANDING_PROFILES.map((profile) => {
          const Icon = profile.icon;
          const selected = selectedId === profile.id;

          return (
            <li key={profile.id} className="w-full">
              <div
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Ouvrir les outils de ${profile.label}`}
                onClick={() => openDetails(profile.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetails(profile.id);
                  }
                }}
                className={cn(
                  'w-full h-full text-left rounded-[var(--radius-card)] p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                  selected
                    ? 'border-2 border-primary bg-surface dark:bg-surface shadow-xl shadow-primary/25 ring-2 ring-primary/30 scale-[1.01] z-10'
                    : 'em-hud-card border-border hover:border-primary/50 hover:bg-surface/90',
                )}
              >
                <div
                  className={cn(
                    'absolute -inset-10 bg-radial from-primary/20 to-transparent blur-2xl pointer-events-none transition-opacity duration-300 -z-10',
                    selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                  )}
                  aria-hidden
                />

                <div
                  className={cn(
                    'absolute top-0 left-0 right-0 h-1 transition-all',
                    selected ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/40',
                  )}
                />

                {selected && (
                  <span className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shadow-sm shadow-primary/40">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}

                <div>
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

                  <p className="text-[11px] font-semibold text-primary/90 mb-1.5 leading-snug">
                    {profile.targetAudience}
                  </p>

                  <h3
                    className={cn(
                      'text-base font-bold mb-1.5 leading-snug transition-colors',
                      selected ? 'text-primary' : 'text-foreground group-hover:text-primary',
                    )}
                  >
                    {profile.label}
                  </h3>

                  <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-4">
                    {profile.intro}
                  </p>
                </div>

                <div className="pt-1 mt-auto">
                  <span
                    className={cn(
                      'w-full py-2 px-3 rounded-[var(--radius-button)] text-xs font-semibold inline-flex items-center justify-between border transition-all',
                      selected
                        ? 'bg-primary-solid text-primary-foreground border-primary-solid shadow-md shadow-primary/30'
                        : 'bg-surface-muted text-foreground border-border group-hover:border-primary/40 group-hover:text-primary',
                    )}
                  >
                    Voir outils & actions
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        size="xl"
        title={activeProfile.label}
        description={activeProfile.targetAudience}
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{activeProfile.registerHint}</span>
            </div>
            <Button
              href={activeCtaHref}
              size="md"
              variant="primary"
              className="shadow-sm font-bold text-xs justify-center min-h-[44px] sm:min-w-[14rem] w-full sm:w-auto"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {activeCtaLabel}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground leading-snug">
              {activeProfile.title}
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              {activeProfile.intro}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Vos outils
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {activeProfile.results.map((res) => {
                const ResIcon = res.icon;
                return (
                  <div
                    key={res.label}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted/70 px-3 py-2 text-xs font-medium text-foreground"
                  >
                    <span className="w-7 h-7 rounded-lg em-glow-icon-box flex items-center justify-center shrink-0">
                      <ResIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>{res.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <LandingHeroPreview profileId={activeProfile.id} embedded />
        </div>
      </Modal>
    </div>
  );
}
