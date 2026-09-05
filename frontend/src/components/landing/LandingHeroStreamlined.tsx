'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  Check,
  CheckCircle2,
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

export default function LandingHeroStreamlined() {
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const cityLabel = formatCityList(enabledPublicCities(site));
  const isLoggedIn = Boolean(user);
  const [selectedId, setSelectedId] = useState<LandingProfileId>('personal');
  const profile = getLandingProfile(selectedId);

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

  return (
    <section className="relative em-landing-hero overflow-hidden pt-6 pb-10 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-20">
      <div className="page-container relative z-10 space-y-7 sm:space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <h1 className="em-landing-heading text-2xl min-[400px]:text-3xl sm:text-5xl lg:text-[3.25rem] font-bold text-foreground">
            Votre événement d’exception,{' '}
            <br className="hidden sm:inline" />
            <span className="em-glow-text">parfaitement orchestré.</span>
          </h1>

          <p className="text-sm sm:text-base text-muted leading-relaxed max-w-xl mx-auto">
            <span className="hidden sm:inline">
              Salles prestigieuses, prestataires d’exception, plans de table 3D et invitations WhatsApp — choisissez d’abord votre projet.
            </span>
            <span className="inline sm:hidden">
              Choisissez votre projet : salles, prestataires, plans 3D et invitations WhatsApp.
            </span>
          </p>

          {user ? (
            <div className="pt-1 flex justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 max-w-full min-h-11 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs text-primary font-semibold hover:bg-primary/15 transition touch-manipulation"
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  Connecté · {user.name || user.email}
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>
          ) : null}

          <div className="pt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{cityLabel}</span>
            </span>
            <span className="hidden min-[480px]:inline text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Mobile Money & Cartes</span>
            </span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>100% dans le navigateur</span>
            </span>
          </div>
        </div>

        <div id="profils" className="space-y-4 sm:space-y-5">
          <div className="text-center sm:text-left max-w-2xl mx-auto sm:mx-0 space-y-1">
            <h2 className="em-landing-heading text-xl sm:text-2xl text-foreground">
              Quel est votre projet ?
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Sélectionnez votre besoin : les outils et actions s’adaptent immédiatement.
            </p>
          </div>

          <ul
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
            role="list"
          >
            {LANDING_PROFILES.map((item, index) => {
              const Icon = item.icon;
              const selected = selectedId === item.id;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-controls="landing-profile-panel"
                    aria-label={`Choisir : ${item.label}`}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'group relative w-full min-w-0 text-left overflow-hidden rounded-[var(--radius-card)] border aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5] flex flex-col justify-between p-2.5 sm:p-3.5 text-white transition-all duration-300 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      selected
                        ? 'border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/20'
                        : 'border-border/80 hover:border-primary/50 hover:shadow-lg',
                    )}
                  >
                    <LandingMedia
                      src={item.imageUrl}
                      alt=""
                      priority={index === 0}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                      className={cn(
                        'transition-all duration-500',
                        selected
                          ? 'opacity-80 scale-105'
                          : 'opacity-55 group-hover:opacity-75 group-hover:scale-105',
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/20 pointer-events-none" />

                    <div className="relative z-10 flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-black/55 backdrop-blur-md border border-white/20 text-white">
                        <Icon className="w-3 h-3 text-primary" />
                        <span className="truncate max-w-[5.5rem] sm:max-w-[9rem]">{item.eyebrow}</span>
                      </span>
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors',
                          selected
                            ? 'bg-primary-solid border-primary-solid text-primary-foreground'
                            : 'bg-white/15 border-white/25 text-white/70',
                        )}
                      >
                        {selected ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                      </span>
                    </div>

                    <div className="relative z-10 min-w-0 space-y-0.5 sm:space-y-1">
                      <span
                        className={cn(
                          'block text-xs sm:text-base font-bold tracking-tight leading-snug line-clamp-2',
                          selected ? 'text-festive-on-stage' : 'text-white',
                        )}
                      >
                        {item.label}
                      </span>
                      <p className="hidden sm:block text-xs text-white/80 leading-relaxed line-clamp-2">
                        {item.intro}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div
          id="landing-profile-panel"
          key={profile.id}
          role="region"
          aria-live="polite"
          aria-labelledby="landing-profile-title"
          className="rounded-[var(--radius-card)] border border-primary/25 bg-surface/90 dark:bg-surface p-4 sm:p-6 shadow-xl shadow-primary/5 space-y-5 animate-fade-in"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold text-primary">{profile.targetAudience}</p>
              <h3 id="landing-profile-title" className="em-landing-heading text-base sm:text-lg text-foreground">
                {profile.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
                {profile.intro}
              </p>
            </div>
            <Button
              href={ctaHref}
              size="md"
              variant="primary"
              fullWidth
              className="shadow-sm font-bold text-xs justify-center min-h-11 sm:w-auto sm:min-w-[14rem]"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {ctaLabel}
            </Button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{profile.registerHint}</span>
          </div>

          <LandingHeroPreview profileId={profile.id} embedded />
        </div>
      </div>
    </section>
  );
}
