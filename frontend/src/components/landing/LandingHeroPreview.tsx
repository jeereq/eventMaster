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
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { LandingProfileId } from '@/lib/landingProfiles';

interface ActionCard {
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: (isLoggedIn: boolean) => string;
  ctaLabel: string;
  highlight?: boolean;
}

const PROFILE_ACTIONS: Record<LandingProfileId, ActionCard[]> = {
  personal: [
    {
      title: 'Éditeur de Salle 2D / 3D',
      badge: 'Inclus Complet',
      description: 'Dessinez votre plan de salle, positionnez tables d’honneur, allées et lustres.',
      icon: LayoutGrid,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/rooms' : '/register?kind=ORGANIZER&intent=personal'),
      ctaLabel: 'Ouvrir l’éditeur de salle',
      highlight: true,
    },
    {
      title: 'Créer l’Événement & RSVP',
      badge: 'WhatsApp & Web',
      description: 'Générez des liens d’invitation personnalisés et suivez les réponses en direct.',
      icon: Heart,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=personal'),
      ctaLabel: 'Créer mon événement',
    },
    {
      title: 'Modèles de Faire-part Digitaux',
      badge: 'Papeterie',
      description: 'Sélectionnez un faire-part élégant et personnalisez date, lieu et dress code.',
      icon: Sparkles,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/templates' : '#modeles'),
      ctaLabel: 'Choisir un modèle',
    },
    {
      title: 'Scanner Protocole Jour J',
      badge: 'Smartphone',
      description: 'Scannez les pass QR de vos invités à l’entrée pour une orientation fluide.',
      icon: ScanLine,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/protocol' : '/register?kind=ORGANIZER&intent=personal'),
      ctaLabel: 'Lancer le scanner d’accès',
    },
  ],
  pro: [
    {
      title: 'Billetterie & Ventes FlexPay',
      badge: 'Mobile Money & Cartes',
      description: 'Configurez vos tarifs par zone (VIP, Standard) et encaissez directement en CDF.',
      icon: Wallet,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=pro'),
      ctaLabel: 'Créer une billetterie',
      highlight: true,
    },
    {
      title: 'Contrôle d’Accès & Scanner Protocole',
      badge: 'Temps Réel',
      description: 'Émargement instantané avec validation sonore anti-fraude à l’entrée.',
      icon: ScanLine,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/protocol' : '/register?kind=ORGANIZER&intent=pro'),
      ctaLabel: 'Accéder au scanner QR',
    },
    {
      title: 'Suivi des Ventes & Recettes',
      badge: 'Analytique',
      description: 'Consultez le tableau de bord des encaissements et téléchargez les listes d’entrées.',
      icon: Sparkles,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/tickets' : '/register?kind=ORGANIZER&intent=pro'),
      ctaLabel: 'Gérer la billetterie',
    },
    {
      title: 'Coordination d’Équipe & Rôles',
      badge: 'Multi-accès',
      description: 'Attribuez des droits sécurisés à vos managers et agents d’accueil.',
      icon: Users,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/team' : '/register?kind=ORGANIZER&intent=pro'),
      ctaLabel: 'Configurer mon équipe',
    },
  ],
  seeker: [
    {
      title: 'Explorer les Salles de Fête',
      badge: 'Visite 3D',
      description: 'Comparez les salles géolocalisées avec photos, capacités et tarifs transparents.',
      icon: Building2,
      href: () => '/marketplace/salles',
      ctaLabel: 'Rechercher une salle',
      highlight: true,
    },
    {
      title: 'Trouver un Prestataire Vérifié',
      badge: 'Devis Directs',
      description: 'Traiteurs, décorateurs, DJ et photographes avec contact direct sans intermédiaire.',
      icon: Store,
      href: () => '/marketplace/prestataires',
      ctaLabel: 'Trouver un prestataire',
    },
    {
      title: 'Location de Matériel & Véhicules',
      badge: 'Logistique',
      description: 'Chaises, sonorisation, podiums et éclairage pour votre événement.',
      icon: Layers,
      href: () => '/marketplace/locations',
      ctaLabel: 'Louer du matériel',
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
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor'),
      ctaLabel: 'Référencer ma salle',
      highlight: true,
    },
    {
      title: 'Publier mes Prestations de Service',
      badge: 'Prestataire Pro',
      description: 'Mettez en avant votre catalogue traiteur, sono ou photo sans commission plateforme.',
      icon: Store,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/catalogue' : '/register?kind=VENDOR&intent=vendor'),
      ctaLabel: 'Ajouter mes services',
    },
    {
      title: 'Éditer mes Modélisations 3D',
      badge: 'Plan de Salle',
      description: 'Modélisez les plans de vos espaces pour permettre le placement virtuel aux clients.',
      icon: LayoutGrid,
      href: (isLoggedIn) => (isLoggedIn ? '/dashboard/rooms' : '/register?kind=VENDOR&intent=vendor'),
      ctaLabel: 'Configurer mes plans 3D',
    },
    {
      title: 'Forfaits & Formules Partenaires',
      badge: 'Zéro Commission',
      description: 'Découvrez nos formules adaptées à votre volume d’activité sans frais cachés.',
      icon: Sparkles,
      href: () => '#tarifs',
      ctaLabel: 'Voir les forfaits pro',
    },
  ],
};

export default function LandingHeroPreview({
  profileId = 'personal',
}: {
  profileId?: LandingProfileId;
} = {}) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const actions = PROFILE_ACTIONS[profileId] || PROFILE_ACTIONS.personal;

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Halo festif d'arrière-plan */}
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/20 via-[color:var(--festive-accent-soft)] to-primary/10 blur-2xl -z-10 opacity-75 pointer-events-none"
        aria-hidden
      />

      <div className="em-hud-card overflow-hidden p-4 sm:p-6 space-y-4">
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
              <div
                key={act.title}
                className={cn(
                  'rounded-[var(--radius-card)] p-4 border transition-all duration-200 flex flex-col justify-between group hover:border-primary/60 hover:shadow-md',
                  act.highlight
                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/30'
                    : 'bg-surface/80 dark:bg-slate-900/60 border-border',
                )}
              >
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {act.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-muted px-2 py-0.5 rounded bg-surface border border-border shrink-0">
                      {act.badge}
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    {act.description}
                  </p>
                </div>

                <Link
                  href={targetHref}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className="block mt-auto pt-2"
                >
                  <Button
                    size="sm"
                    variant={act.highlight ? 'primary' : 'secondary'}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className={cn(
                      'w-full text-xs font-semibold justify-between transition-all duration-200',
                      act.highlight ? 'shadow-sm shadow-primary/30' : 'hover:border-primary/40',
                    )}
                  >
                    <span>{act.ctaLabel}</span>
                  </Button>
                </Link>
              </div>
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
