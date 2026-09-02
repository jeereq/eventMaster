'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  ArrowRight,
  Eye,
  Crown,
  Grid,
  Building2,
  Smartphone,
  Users,
  ScanLine,
  Compass,
  Layers,
  ShieldCheck,
  DoorOpen,
  Wine,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

interface RealEditorFeature {
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlights: string[];
  ctaLabel: string;
  href: (isLoggedIn: boolean) => string;
  primary?: boolean;
}

const REAL_EDITOR_FEATURES: RealEditorFeature[] = [
  {
    title: 'Agencement 2D au millimètre',
    badge: 'Plan sur mesure',
    description:
      'Dessinez la géométrie exacte de votre salle avec cotations réelles, grille magnétique et alignements intelligents.',
    icon: LayoutGrid,
    highlights: [
      'Tables rondes (banquet), rectangulaires et mange-debout',
      'Portes simples/doubles avec sens d’ouverture',
      'Allées de circulation, estrade d’honneur et piste de danse',
      'Comptoirs buffets, bars et loges',
    ],
    ctaLabel: 'Créer un plan de salle 2D',
    href: (isLoggedIn) => (isLoggedIn ? '/dashboard/rooms' : '/register?kind=ORGANIZER&intent=personal&action=room_editor'),
    primary: true,
  },
  {
    title: 'Immersion & Visite 3D interactive',
    badge: 'Visite 3D',
    description:
      'Passez en vue 3D interactive directement dans le navigateur, sans plugin ni logiciel lourd à installer.',
    icon: Eye,
    highlights: [
      'Visite virtuelle fluide et exploration à 360°',
      'Gestion multi-niveaux (RDC, Mezzanine, Balcon VIP)',
      'Éclairages d’ambiance (2700K chaleureux, gala, spots)',
      'Lustres suspendus et textures de sol réalistes',
    ],
    ctaLabel: 'Lancer l’expérience 3D',
    href: (isLoggedIn) => (isLoggedIn ? '/dashboard/rooms' : '/register?kind=ORGANIZER&intent=personal&action=room_editor'),
  },
  {
    title: 'Placement d’invités & Attribution',
    badge: 'Gestion VIP',
    description:
      'Assignez les places de vos convives d’un simple clic et synchronisez instantanément le plan avec votre liste.',
    icon: Users,
    highlights: [
      'Numérotation automatique et nommage personnalisé des tables',
      'Attribution des sièges nominatifs ou libres par table',
      'Prise en compte des régimes et préférences de menu',
      'Statut d’occupation en direct selon les confirmations RSVP',
    ],
    ctaLabel: 'Organiser le plan de table',
    href: (isLoggedIn) => (isLoggedIn ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=personal&action=seating'),
  },
  {
    title: 'Repérage WhatsApp & Accueil QR',
    badge: 'Jour J',
    description:
      'Vos invités reçoivent leur table sur leur smartphone et l’équipe d’accueil les oriente en 2 secondes au scan.',
    icon: ScanLine,
    highlights: [
      'Numéro de table affiché sur l’invitation WhatsApp',
      'Repérage visuel sur le plan avant même d’arriver sur place',
      'Émargement instantané au scan QR à l’entrée',
      'Alerte immédiate en cas de doublon ou d’erreur de zone',
    ],
    ctaLabel: 'Tester le protocole d’accueil',
    href: (isLoggedIn) => (isLoggedIn ? '/dashboard/protocol' : '/register?kind=ORGANIZER&intent=personal&action=protocol'),
  },
];

const EDITOR_LEVELS_SUMMARY = [
  {
    name: 'Essentiel (Gratuit)',
    plans: 'Forfait Gratuit',
    desc: 'Plan 2D simple, tables rondes et rectangulaires basiques.',
  },
  {
    name: 'Business',
    plans: 'Forfaits B2B',
    desc: 'Grille magnétique, rangées, duplication rapide et allées de passage.',
  },
  {
    name: 'Premium',
    plans: 'Forfaits Pro',
    desc: 'Scènes surélevées, buffets, zone VIP et rendu 3D d’ambiance.',
  },
  {
    name: 'Complet',
    plans: 'Inclus Particuliers & Salles',
    desc: 'Multi-étages (Duplex, Balcon), lustres cristal, textures et liberté totale.',
    highlight: true,
  },
];

export default function LandingRoomEditorShowcase() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const roomEditorUrl = isLoggedIn
    ? '/dashboard/rooms'
    : '/register?kind=ORGANIZER&intent=personal&action=room_editor';

  return (
    <section id="editeur" className="py-16 sm:py-24 bg-surface/80 dark:bg-background/80 border-t border-border scroll-mt-14 em-landing-section-glow">
      <div className="page-container relative z-10 space-y-12">
        {/* En-tête de section avec CTAs directs */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="em-festive-chip">
                <Sparkles className="w-3 h-3" />
                Éditeur Visuel 2D / 3D
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Outil Professionnel Intégré
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight leading-tight">
              Modélisez vos espaces et placez vos invités
            </h2>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Un outil intuitif de conception spatiale dans votre navigateur : agencement précis au millimètre, visite 3D fluide et synchronisation automatique avec les invitations WhatsApp et le scan QR.
            </p>
          </div>

          {/* Boutons d'action immédiats */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href={roomEditorUrl}>
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Ouvrir l’éditeur de salle
              </Button>
            </Link>
            <Link href="/marketplace/salles">
              <Button size="lg" variant="secondary" rightIcon={<Building2 className="w-4 h-4" />}>
                Explorer les salles 3D
              </Button>
            </Link>
          </div>
        </div>

        {/* Grille des 4 piliers réels de l'éditeur */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {REAL_EDITOR_FEATURES.map((feat) => {
            const Icon = feat.icon;
            const targetHref = feat.href(isLoggedIn);

            return (
              <div
                key={feat.title}
                className={cn(
                  'rounded-[var(--radius-card)] p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between group hover:shadow-lg',
                  feat.primary
                    ? 'em-hud-card border-primary/40 bg-surface dark:bg-slate-900/90 ring-1 ring-primary/30'
                    : 'em-hud-card border-border bg-surface/90 dark:bg-slate-900/60',
                )}
              >
                <div className="space-y-4">
                  {/* Badge & Titre */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl em-glow-icon-box shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {feat.title}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          {feat.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {feat.description}
                  </p>

                  {/* Puces de fonctionnalités concrètes */}
                  <div className="space-y-2 py-3 border-y border-border/70">
                    {feat.highlights.map((item) => (
                      <div key={item} className="flex items-start gap-2.5 text-xs text-foreground/90">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA direct vers la fonctionnalité */}
                <div className="pt-4 mt-auto">
                  <Link href={targetHref} className="block w-full">
                    <Button
                      variant={feat.primary ? 'primary' : 'secondary'}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className={cn(
                        'w-full text-xs sm:text-sm font-semibold justify-between transition-all duration-200',
                        feat.primary ? 'shadow-md shadow-primary/25' : 'hover:border-primary/40',
                      )}
                    >
                      {feat.ctaLabel}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Niveaux d'éditeur selon les forfaits */}
        <div className="em-hud-card p-5 sm:p-6 rounded-[var(--radius-card)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/80 pb-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Niveaux d’éditeur selon votre forfait
              </h4>
              <p className="text-xs text-muted">
                Tous les plans Particuliers (B2C) bénéficient de l’éditeur <strong>Complet</strong> avec 3D et multi-étages.
              </p>
            </div>
            <Link href="#tarifs" className="text-xs font-bold text-primary hover:underline shrink-0">
              Voir le comparateur des forfaits →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {EDITOR_LEVELS_SUMMARY.map((lvl) => (
              <div
                key={lvl.name}
                className={cn(
                  'p-3.5 rounded-xl border transition-colors',
                  lvl.highlight
                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/25'
                    : 'bg-surface border-border',
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-foreground">{lvl.name}</span>
                  {lvl.highlight && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[color:var(--festive-accent-soft)] text-[color:var(--festive-accent)]">
                      Particuliers
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">{lvl.desc}</p>
              </div>
            ))}
          </div>

          {/* Bandeau d'action final */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted border-t border-border/80">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              Vos données de salle sont sauvegardées en temps réel et sécurisées dans le cloud.
            </span>
            <Link href={roomEditorUrl}>
              <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Démarrer mon plan de salle gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
