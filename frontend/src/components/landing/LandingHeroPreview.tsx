'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutGrid,
  Mail,
  ScanLine,
  Sparkles,
  Users,
  Building2,
  Store,
  Wallet,
  ArrowRight,
  Heart,
  CalendarCheck,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { LandingProfileId } from '@/lib/landingProfiles';

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
      title: 'Simulateur de Budget & Packs IA',
      badge: '4 simulations',
      description: 'Laissez l’IA calculer 3 formules chiffrées selon votre budget : salle, traiteur, déco, photo & DJ (sans connexion requise).',
      icon: Wand2,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue?tab=plan&planView=ai' : '/#simulateur-ia'),
      ctaLabel: 'Simuler mon événement',
      highlight: true,
    },
    {
      title: 'Éditeur de Salle 2D / 3D',
      badge: 'Inclus Complet',
      description: 'Dessinez votre plan de salle, positionnez tables d’honneur, allées et lustres.',
      icon: LayoutGrid,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/rooms' : '/register?kind=ORGANIZER&intent=personal&action=room_editor'),
      ctaLabel: 'Ouvrir l’éditeur de salle',
    },
    {
      title: 'Créer l’Événement & RSVP',
      badge: 'WhatsApp & Web',
      description: 'Générez des liens d’invitation personnalisés et suivez les réponses en direct.',
      icon: Heart,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=personal&action=event'),
      ctaLabel: 'Créer mon événement',
    },
    {
      title: 'Scanner Protocole Jour J',
      badge: 'Smartphone',
      description: 'Scannez les pass QR de vos invités à l’entrée pour une orientation fluide.',
      icon: ScanLine,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/protocol' : '/register?kind=ORGANIZER&intent=personal&action=protocol'),
      ctaLabel: 'Lancer le scanner d’accès',
    },
  ],
  pro: [
    {
      title: 'Billetterie & Ventes Mobile Money',
      badge: 'Orange, M-Pesa, Airtel, Cartes',
      description: 'Pour organisateurs de concerts & conférences : vendez vos billets par Orange Money, M-Pesa, Airtel Money et Cartes en ligne.',
      icon: Wallet,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=pro&action=ticketing'),
      ctaLabel: 'Créer ma billetterie',
      highlight: true,
    },
    {
      title: 'Simulateur Budgétaire & Packs IA',
      badge: '4 simulations',
      description: 'Estimez vos coûts globaux et générez 3 packs prévisionnels clés en main pour vos clients & comités sans engagement.',
      icon: Wand2,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue?tab=plan&planView=ai' : '/#simulateur-ia'),
      ctaLabel: 'Simuler un budget pro',
    },
    {
      title: 'Contrôle d’Accès & Scan QR Anti-Fraude',
      badge: 'Smartphone Jour J',
      description: 'Pour votre équipe d’accueil : scannez les e-billets à l’entrée avec alerte sonore en cas de faux billet ou doublon.',
      icon: ScanLine,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/protocol' : '/register?kind=ORGANIZER&intent=pro&action=protocol'),
      ctaLabel: 'Ouvrir le scanner d’accès',
    },
    {
      title: 'Suivi des Ventes & Recettes en Direct',
      badge: 'Tableau de bord',
      description: 'Suivez le chiffre d’affaires en temps réel, visualisez les jauges et téléchargez les listes d’émargement.',
      icon: Sparkles,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/tickets' : '/register?kind=ORGANIZER&intent=pro&action=sales'),
      ctaLabel: 'Voir le suivi des ventes',
    },
  ],
  seeker: [
    {
      title: 'Simulateur IA & Formules Budget',
      badge: '4 simulations',
      description: 'Indiquez votre budget en Francs Congolais : l’IA compose 3 packs complets avec salle et prestataires certifiés (10 essais gratuits sans compte).',
      icon: Wand2,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue?tab=plan&planView=ai' : '/#simulateur-ia'),
      ctaLabel: 'Lancer le simulateur IA',
      highlight: true,
    },
    {
      title: 'Explorer les Salles de Fête',
      badge: 'Visite 3D',
      description: 'Comparez les salles géolocalisées avec photos, capacités et tarifs transparents.',
      icon: Building2,
      href: (isLoggedIn) => (isLoggedIn ? '/marketplace/salles' : '/register?kind=CLIENT&intent=seeker&action=venues'),
      ctaLabel: 'Rechercher une salle',
    },
    {
      title: 'Trouver un Prestataire Vérifié',
      badge: 'Devis Directs',
      description: 'Traiteurs, décorateurs, DJ et photographes avec contact direct sans intermédiaire.',
      icon: Store,
      href: (isLoggedIn) => (isLoggedIn ? '/marketplace/prestataires' : '/register?kind=CLIENT&intent=seeker&action=services'),
      ctaLabel: 'Trouver un prestataire',
    },
    {
      title: 'Billetterie & Événements Publics',
      badge: 'Paiement en ligne',
      description: 'Achetez vos places pour les concerts, spectacles et conférences du moment.',
      icon: Sparkles,
      href: () => '/marketplace/evenements',
      ctaLabel: 'Voir les événements',
    },
  ],
  vendor: [
    {
      title: 'Publier ma Salle sur la Vitrine',
      badge: 'Espace Propriétaire',
      description: 'Créez la fiche de votre établissement avec visite 3D et recevez des réservations.',
      icon: Building2,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor&action=venue'),
      ctaLabel: 'Référencer ma salle',
      highlight: true,
    },
    {
      title: 'Publier mes Prestations de Service',
      badge: 'Prestataire Pro',
      description: 'Mettez en avant votre catalogue traiteur, sono ou photo sans commission plateforme.',
      icon: Store,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor&action=services'),
      ctaLabel: 'Ajouter mes services',
    },
    {
      title: 'Recommandation IA & Devis Directs',
      badge: 'Visibilité Automatique',
      description: 'Vos offres sont automatiquement suggérées dans les packs budget générés par les organisateurs.',
      icon: Sparkles,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor&action=ai_recommendation'),
      ctaLabel: 'Recevoir des demandes IA',
      highlight: true,
    },
    {
      title: 'Éditer mes Modélisations 3D',
      badge: 'Plan de Salle',
      description: 'Modélisez les plans de vos espaces pour permettre le placement virtuel aux clients.',
      icon: LayoutGrid,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/rooms' : '/register?kind=VENDOR&intent=vendor&action=room_editor'),
      ctaLabel: 'Configurer mes plans 3D',
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
        {/* En-tête de la console d'actions directes */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h3 className="text-sm font-bold text-foreground">
              Actions directes disponibles
            </h3>
            <span className="text-[10px] font-semibold text-muted px-2 py-0.5 rounded-full bg-surface-muted border border-border">
              Accès immédiat
            </span>
          </div>

          <span className="text-xs text-muted font-medium">
            {isLoggedIn ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Connecté · Accès direct à votre espace
              </span>
            ) : (
              'Cliquez sur une action pour démarrer sans attendre'
            )}
          </span>
        </div>

        {/* Grille des 4 actions directes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {actions.map((act) => {
            const Icon = act.icon;
            const targetHref = act.href(isLoggedIn);
            const isExternal = targetHref.startsWith('http');

            return (
              <Link
                key={act.title}
                href={targetHref}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className={cn(
                  'rounded-[var(--radius-card)] p-3.5 sm:p-4 border transition-all duration-200 flex flex-col justify-between h-full group hover:border-primary/60 hover:shadow-md cursor-pointer block',
                  act.highlight
                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/30'
                    : 'bg-surface/80 dark:bg-slate-900/60 border-border',
                )}
              >
                <div className="space-y-1.5 sm:space-y-2 mb-2.5 sm:mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg em-glow-icon-box shrink-0 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {act.title}
                      </h4>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-muted px-1.5 sm:px-2 py-0.5 rounded bg-surface border border-border shrink-0">
                      {act.badge}
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-muted leading-relaxed line-clamp-3">
                    {act.description}
                  </p>
                </div>

                <div className="mt-auto pt-1 sm:pt-2">
                  <div
                    className={cn(
                      'w-full py-1.5 sm:py-2 px-3 rounded-[var(--radius-button)] text-xs font-semibold flex items-center justify-between transition-all duration-200',
                      act.highlight
                        ? 'bg-primary text-white shadow-sm shadow-primary/30 group-hover:bg-primary-hover'
                        : 'bg-surface-muted text-foreground border border-border group-hover:border-primary/40 group-hover:text-primary',
                    )}
                  >
                    <span>{act.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Note de réassurance sous la grille */}
        <div className="pt-2 border-t border-border/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Zéro installation requise · Fonctionne à 100% dans votre navigateur</span>
          </div>
          <span className="font-semibold text-primary">
            Gratuit pour démarrer
          </span>
        </div>
      </div>
    </div>
  );
}
