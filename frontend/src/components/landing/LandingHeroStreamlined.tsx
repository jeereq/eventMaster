'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  LayoutDashboard,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  LANDING_PROFILES,
  getLandingProfile,
  type LandingProfileId,
} from '@/lib/landingProfiles';
import LandingHeroPreview from '@/components/landing/LandingHeroPreview';
import LandingMedia from '@/components/landing/LandingMedia';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { enabledPublicCities, formatCityList } from '@/lib/platformCities';

function getProfilePill(id: LandingProfileId): string {
  switch (id) {
    case 'personal':
      return 'Faire-part WhatsApp & Plan 3D';
    case 'pro':
      return 'Mobile Money & Scan QR direct';
    case 'seeker':
      return 'Salles 3D, traiteurs & devis';
    case 'vendor':
      return '0% commission & Vitrine 3D';
    default:
      return 'Outils complets';
  }
}

export default function LandingHeroStreamlined() {
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const cityLabel = formatCityList(enabledPublicCities(site));
  const isLoggedIn = Boolean(user);
  const [selectedId, setSelectedId] = useState<LandingProfileId>('personal');
  const profile = getLandingProfile(selectedId);
  const ProfileIcon = profile.icon;

  const handleTabKeyDown = (e: React.KeyboardEvent, currentId: LandingProfileId) => {
    const profileIds: LandingProfileId[] = ['personal', 'pro', 'seeker', 'vendor'];
    const curIdx = profileIds.indexOf(currentId);
    let nextIdx = curIdx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (curIdx + 1) % profileIds.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (curIdx - 1 + profileIds.length) % profileIds.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = profileIds.length - 1;
    } else {
      return;
    }
    const nextId = profileIds[nextIdx];
    setSelectedId(nextId);
    document.getElementById(`tab-${nextId}`)?.focus();
  };

  const ctaHref = (() => {
    if (!isLoggedIn) return profile.cta.href;
    switch (profile.id) {
      case 'personal':
      case 'pro':
        return '/dashboard/events';
      case 'seeker':
        return '/marketplace';
      case 'vendor':
        return '/dashboard/catalogue';
      default:
        return '/dashboard';
    }
  })();

  const ctaLabel = (() => {
    if (!isLoggedIn) return profile.cta.label;
    switch (profile.id) {
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
  })();

  const compactCtaLabel = (() => {
    if (isLoggedIn) {
      switch (profile.id) {
        case 'personal':
          return 'Mes événements';
        case 'pro':
          return 'Ma billetterie';
        case 'seeker':
          return 'Le catalogue';
        case 'vendor':
          return 'Mon catalogue';
        default:
          return 'Mon espace';
      }
    }
    switch (profile.id) {
      case 'pro':
        return 'Créer la billetterie';
      case 'seeker':
        return 'Explorer le catalogue';
      case 'vendor':
        return 'Publier mes offres';
      default:
        return 'Créer l’événement';
    }
  })();

  return (
    <section className="relative em-landing-hero overflow-hidden pt-4 pb-6 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-20">
      <div className="page-container relative z-10 space-y-5 sm:space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-4">
          <h1 className="em-landing-heading text-2xl min-[400px]:text-3xl sm:text-5xl lg:text-[3.25rem] font-bold text-foreground">
            <span className="block">{site.platformName || 'EventMaster'}</span>
            <span className="block mt-1 sm:mt-2 font-semibold text-[0.92em] sm:text-[0.88em] leading-tight">
              Votre événement, de A à Z —{' '}
              <span className="em-glow-text">parfaitement orchestré.</span>
            </span>
          </h1>

          <p className="text-xs sm:text-base text-muted leading-relaxed max-w-xl mx-auto">
            Salles d’exception, plans 2D/3D, billetterie Mobile Money et invitations WhatsApp en RDC.
          </p>

          {user ? (
            <div className="pt-1 flex justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 max-w-full min-h-11 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs text-primary font-semibold hover:bg-primary/15 transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  Connecté · {user.name || user.email}
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>
          ) : null}

          <div className="flex pt-1 flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{cityLabel}</span>
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Mobile Money & Cartes</span>
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>100% web, sans appli</span>
            </span>
          </div>
        </div>

        <div id="profils" className="space-y-4 sm:space-y-6 scroll-mt-20">
          <div className="text-center sm:text-left max-w-2xl mx-auto sm:mx-0 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Guide d’orientation rapide</span>
            </div>
            <h2 id="profils-heading" className="em-landing-heading text-xl sm:text-3xl text-foreground font-bold">
              Quel est votre projet ?
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Sélectionnez votre situation : la plateforme prépare instantanément vos outils, votre parcours et vos accès.
            </p>
          </div>

          <div
            role="tablist"
            aria-labelledby="profils-heading"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 relative"
          >
            {LANDING_PROFILES.map((item, index) => {
              const Icon = item.icon;
              const selected = selectedId === item.id;

              return (
                <div key={item.id} className="relative">
                  <button
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-selected={selected}
                    aria-controls="landing-profile-panel"
                    tabIndex={selected ? 0 : -1}
                    onKeyDown={(e) => handleTabKeyDown(e, item.id)}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'group relative w-full min-w-0 text-left overflow-hidden rounded-[var(--radius-card)] border aspect-[4/3] sm:aspect-[4/3] lg:aspect-[4/5] min-h-[175px] sm:min-h-[200px] lg:min-h-[240px] flex flex-col justify-between p-3 sm:p-4 text-white transition-all duration-300 motion-reduce:transition-none cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      selected
                        ? 'border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/20 scale-[1.01]'
                        : 'border-border/80 hover:border-primary/50 hover:shadow-lg',
                    )}
                  >
                    <LandingMedia
                      src={item.imageUrl}
                      alt=""
                      priority={index === 0}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                      className={cn(
                        'transition-all duration-500 motion-reduce:transition-none motion-reduce:transform-none',
                        selected
                          ? 'opacity-85 scale-105 motion-reduce:scale-100'
                          : 'opacity-60 group-hover:opacity-75 group-hover:scale-105 motion-reduce:group-hover:scale-100',
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/35 pointer-events-none" />

                    <div className="relative z-10 flex items-start justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-semibold tracking-wide">
                        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate max-w-[5.5rem] sm:max-w-[9rem]">{item.eyebrow}</span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border transition-colors shrink-0',
                          selected
                            ? 'bg-primary-solid border-primary-solid text-primary-foreground shadow-xs'
                            : 'bg-black/45 border-white/25 text-white/80 group-hover:border-primary/50 group-hover:text-white',
                        )}
                      >
                        {selected ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Actif</span>
                          </>
                        ) : (
                          <span className="hidden sm:inline">Choisir</span>
                        )}
                      </span>
                    </div>

                    <div className="relative z-10 min-w-0 space-y-1 sm:space-y-1.5">
                      <span
                        className={cn(
                          'block text-sm sm:text-base lg:text-lg font-bold tracking-tight leading-snug line-clamp-1',
                          selected ? 'text-festive-on-stage' : 'text-white',
                        )}
                      >
                        <span className="sm:hidden">{item.shortLabel}</span>
                        <span className="hidden sm:inline">{item.label}</span>
                      </span>
                      <p className="text-[11px] sm:text-xs text-white/85 line-clamp-2 leading-relaxed">
                        {item.targetAudience}
                      </p>
                      <div className="pt-0.5">
                        <span className="inline-flex items-center text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white backdrop-blur-xs border border-white/20">
                          {getProfilePill(item.id)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Connecteur visuel pointant vers le panneau sélectionné */}
                  {selected && (
                    <div
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-primary z-20 pointer-events-none drop-shadow-sm hidden sm:block"
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          id="landing-profile-panel"
          key={profile.id}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`tab-${profile.id}`}
          className="rounded-[var(--radius-card)] border-2 border-primary/30 bg-surface/95 dark:bg-surface p-4 sm:p-7 shadow-xl shadow-primary/5 space-y-5 sm:space-y-6 animate-in fade-in duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-border/80">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                  <ProfileIcon className="w-3.5 h-3.5" />
                  <span>Espace {profile.label} · {profile.eyebrow}</span>
                </span>
              </div>
              <h3
                id="landing-profile-title"
                className="em-landing-heading text-lg sm:text-2xl text-foreground font-bold tracking-tight"
              >
                {profile.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
                {profile.intro}
              </p>

              {/* Parcours en 3 étapes clair et intuitif */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider hidden sm:inline mr-1">
                  En 3 étapes :
                </span>
                {profile.clicks.map((stepText, idx) => {
                  const cleanStep = stepText.replace(/^\d+\.\s*/, '');
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <ArrowRight className="w-3.5 h-3.5 text-muted/40 shrink-0" aria-hidden />
                      )}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted border border-border text-foreground font-semibold text-xs">
                        <span className="w-4 h-4 rounded-full bg-primary-solid text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span>{cleanStep}</span>
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0 pt-2 lg:pt-0">
              <Button
                href={ctaHref}
                size="md"
                variant="primary"
                fullWidth
                aria-label={ctaLabel}
                className="shadow-sm font-bold text-xs justify-center min-h-11 sm:w-auto sm:min-w-[14rem]"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                <span className="sm:hidden">{compactCtaLabel}</span>
                <span className="hidden sm:inline">{ctaLabel}</span>
              </Button>
              <div className="flex items-center gap-1.5 text-[11px] text-muted justify-center sm:justify-end">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{profile.registerHint}</span>
              </div>
            </div>
          </div>

          <LandingHeroPreview profileId={profile.id} embedded />
        </div>
      </div>
    </section>
  );
}
