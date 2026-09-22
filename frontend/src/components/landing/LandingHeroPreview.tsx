'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutGrid,
  ScanLine,
  Sparkles,
  Building2,
  Store,
  Wallet,
  Wine,
  ArrowRight,
  Heart,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { LandingProfileId } from '@/lib/landingProfiles';
import { usePlatformSite } from '@/context/PlatformSiteContext';

export interface ActionCard {
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: (isLoggedIn: boolean) => string;
  ctaLabel: string;
  highlight?: boolean;
}

export const PROFILE_ACTIONS: Record<LandingProfileId, ActionCard[]> = {
  personal: [
    {
      title: 'Simulateur Budget IA',
      badge: '3 formules',
      description: 'Chiffrage immédiat : salle, traiteur, déco, photo et DJ.',
      icon: Wand2,
      href: () => '/simulateur',
      ctaLabel: 'Simuler mon budget',
      highlight: true,
    },
    {
      title: 'Plans de Salle 2D / 3D',
      badge: 'Inclus',
      description: 'Tables, allées et lustres en 2D coté et visite 3D.',
      icon: LayoutGrid,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/rooms' : '/register?kind=ORGANIZER&intent=personal&action=room_editor'),
      ctaLabel: 'Ouvrir l’éditeur',
    },
    {
      title: 'Invitations et réponses à l’invitation',
      badge: 'WhatsApp',
      description: 'Liens personnalisés et suivi des présences en temps réel.',
      icon: Heart,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=personal&action=event'),
      ctaLabel: 'Créer l’événement',
    },
    {
      title: 'Contrôle d’Accès Jour J',
      badge: 'Scan QR',
      description: 'Scannez les pass smartphone à l’entrée sans application.',
      icon: ScanLine,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/protocol' : '/register?kind=ORGANIZER&intent=personal&action=protocol'),
      ctaLabel: 'Lancer le scanner',
    },
  ],
  pro: [
    {
      title: 'Billetterie Mobile Money',
      badge: 'CDF & Cartes',
      description: 'Vendez vos billets par Orange, M-Pesa, Airtel et Cartes.',
      icon: Wallet,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=pro&action=ticketing'),
      ctaLabel: 'Créer ma billetterie',
      highlight: true,
    },
    {
      title: 'Simulateur Budget Pro',
      badge: 'Formules clés en main',
      description: '3 packs prévisionnels pour vos comités et clients.',
      icon: Wand2,
      href: () => '/simulateur',
      ctaLabel: 'Simuler un budget',
    },
    {
      title: 'Scan QR Anti-Fraude',
      badge: 'Temps réel',
      description: 'Contrôle à l’entrée avec alerte immédiate sur doublon.',
      icon: ScanLine,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/protocol' : '/register?kind=ORGANIZER&intent=pro&action=protocol'),
      ctaLabel: 'Ouvrir le scanner',
    },
    {
      title: 'Suivi des Recettes',
      badge: 'En direct',
      description: 'Chiffre d’affaires, jauges et listes d’émargement.',
      icon: Sparkles,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/tickets' : '/register?kind=ORGANIZER&intent=pro&action=sales'),
      ctaLabel: 'Voir les ventes',
    },
  ],
  seeker: [
    {
      title: 'Simulateur Budget IA',
      badge: 'Immédiat',
      description: '3 packs chiffrés avec prestataires certifiés.',
      icon: Wand2,
      href: () => '/simulateur',
      ctaLabel: 'Lancer le simulateur',
      highlight: true,
    },
    {
      title: 'Salles de Fête',
      badge: 'Visite 3D',
      description: 'Photos, capacités et visites virtuelles.',
      icon: Building2,
      href: (isLoggedIn) => (isLoggedIn ? '/marketplace/salles' : '/register?kind=CLIENT&intent=seeker&action=venues'),
      ctaLabel: 'Trouver une salle',
    },
    {
      title: 'Prestataires Vérifiés',
      badge: 'Devis directs',
      description: 'Traiteurs, décorateurs, DJ et photographes.',
      icon: Store,
      href: (isLoggedIn) => (isLoggedIn ? '/marketplace/prestataires' : '/register?kind=CLIENT&intent=seeker&action=services'),
      ctaLabel: 'Trouver un prestataire',
    },
    {
      title: 'Boissons',
      badge: 'Catalogue',
      description: 'Bières, vins, champagnes. Le prix le plus bas d’un prestataire.',
      icon: Wine,
      href: () => '/marketplace/boissons',
      ctaLabel: 'Voir les boissons',
    },
    {
      title: 'Événements Publics',
      badge: 'Pass direct',
      description: 'Achetez vos places pour concerts et conférences.',
      icon: Sparkles,
      href: () => '/marketplace/evenements',
      ctaLabel: 'Voir les événements',
    },
  ],
  vendor: [
    {
      title: 'Référencer ma Salle',
      badge: 'Visite 3D',
      description: 'Fiche avec modélisation 3D et réservations directes.',
      icon: Building2,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor&action=venue'),
      ctaLabel: 'Publier ma salle',
      highlight: true,
    },
    {
      title: 'Publier mes Prestations',
      badge: '0% commission',
      description: 'Traiteur, photo, DJ ou Matériel & Équipements (habits, véhicules…).',
      icon: Store,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor&action=services'),
      ctaLabel: 'Ajouter mes services',
    },
    {
      title: 'Matériel & Équipements',
      badge: 'Locations',
      description: 'Chaises, habits, voitures, sono. Livraison comprise ou en supplément.',
      icon: LayoutGrid,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor&action=rentals'),
      ctaLabel: 'Proposer du matériel',
    },
    {
      title: 'Demandes & Devis IA',
      badge: 'Visibilité',
      description: 'Recommandation automatique dans les packs budget.',
      icon: Sparkles,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor&action=ai_recommendation'),
      ctaLabel: 'Recevoir des demandes',
      highlight: true,
    },
  ],
};

export default function LandingHeroPreview({
  profileId = 'personal',
  embedded = false,
}: {
  profileId?: LandingProfileId;
  embedded?: boolean;
} = {}) {
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const isBudgetBlocked = site?.studioVisibility?.budget === false;
  const isInviteBlocked = site?.studioVisibility?.invite === false;
  const isRoomBlocked = site?.studioVisibility?.room === false;
  const isLoggedIn = Boolean(user);
  const actions = PROFILE_ACTIONS[profileId] || PROFILE_ACTIONS.personal;

  return (
    <div className={cn('relative w-full', !embedded && 'max-w-4xl mx-auto')}>
      {!embedded ? (
        <div
          className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/20 via-[color:var(--festive-accent-soft)] to-primary/10 blur-2xl -z-10 opacity-75 pointer-events-none"
          aria-hidden
        />
      ) : null}

      <div className={cn('overflow-hidden space-y-4', embedded ? 'p-0' : 'em-hud-card p-4 sm:p-6')}>
        {/* En-tête de la console d'outils directes */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-solid animate-pulse motion-reduce:animate-none shrink-0" aria-hidden />
            <h4 className="text-sm font-bold text-foreground">
              <span className="sm:hidden">Outils inclus</span>
              <span className="hidden sm:inline">Outils disponibles immédiatement pour ce projet</span>
            </h4>
            <span className="hidden sm:inline text-xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              Accès en 1 clic
            </span>
          </div>

          <span className="hidden sm:inline text-xs text-muted font-medium">
            {isLoggedIn ? (
              <span className="text-primary font-semibold">
                Connecté · Accès direct à votre espace
              </span>
            ) : (
              'Cliquez sur un outil pour tester ou démarrer sans attendre'
            )}
          </span>
        </div>

        {/* Grille des 4 actions directes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {actions.map((act) => {
            const Icon = act.icon;
            const targetHref = act.href(isLoggedIn);
            const isExternal = targetHref.startsWith('http');
            const isSimulatorAction = targetHref === '/simulateur' || targetHref.startsWith('/simulateur');
            const isRoomAction = targetHref.includes('/rooms') || targetHref.includes('action=room_editor') || targetHref === '/plans-3d';
            const isInviteAction = targetHref === '/modeles' || targetHref.includes('action=template');
            const isUpcoming =
              (isSimulatorAction && isBudgetBlocked) ||
              (isRoomAction && isRoomBlocked) ||
              (isInviteAction && isInviteBlocked);

            const displayBadge = isUpcoming ? 'À venir' : act.badge;
            const displayCta = isUpcoming ? 'Bientôt disponible' : act.ctaLabel;
            const displayDesc = isUpcoming
              ? isSimulatorAction
                ? 'Prochainement : l’IA composera 3 formules réelles chiffrées selon votre budget (fonctionnalité à venir).'
                : isRoomAction
                  ? 'Prochainement : l’IA modélisera votre plan spatial 2D / 3D sur mesure (fonctionnalité à venir).'
                  : 'Prochainement : création d’invitations graphiques sur mesure par IA (fonctionnalité à venir).'
              : act.description;
            const isHighlight = isUpcoming ? false : act.highlight;

            return (
              <Link
                key={act.title}
                href={targetHref}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                aria-label={displayCta}
                className={cn(
                  'rounded-[var(--radius-card)] p-3.5 sm:p-4 border transition-all duration-200 motion-reduce:transition-none flex flex-col justify-between h-full group hover:border-primary/60 hover:shadow-md cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isUpcoming
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : isHighlight
                      ? 'bg-festive-accent-soft border-festive-accent/40 ring-1 ring-festive-accent/25'
                      : 'bg-surface/80 dark:bg-surface/70 border-border',
                )}
              >
                <div className="space-y-1.5 sm:space-y-2 mb-2.5 sm:mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg em-glow-icon-box shrink-0 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {act.title}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded border shrink-0',
                        isUpcoming
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          : 'bg-surface text-muted border-border',
                      )}
                    >
                      {displayBadge}
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {displayDesc}
                  </p>
                </div>

                <div className="mt-auto pt-1 sm:pt-2">
                  <div
                    className={cn(
                      'w-full min-h-11 py-1.5 sm:py-2 px-3 rounded-[var(--radius-button)] text-xs font-semibold flex items-center justify-between transition-all duration-200 touch-manipulation active:scale-[0.98]',
                      isHighlight
                        ? 'bg-primary-solid text-primary-foreground shadow-sm shadow-primary/30 group-hover:bg-primary-solid-hover'
                        : 'bg-surface-muted text-foreground border border-border group-hover:border-primary/40 group-hover:text-primary',
                    )}
                  >
                    <span className="truncate">{displayCta}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Note de réassurance sous la grille */}
        <div className="flex pt-2 border-t border-border/80 flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Zéro installation requise · 100% dans le navigateur</span>
          </div>
          <span className="font-semibold text-primary">
            Gratuit pour démarrer
          </span>
        </div>
      </div>
    </div>
  );
}
