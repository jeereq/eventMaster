'use client';

import React from 'react';
import Link from 'next/link';
import {
  Smartphone,
  ScanLine,
  Bell,
  Link2,
  Moon,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui';

const MOBILE_FEATURES = [
  {
    icon: ScanLine,
    title: 'Protocole jour J',
    description: 'Scan QR via la caméra, check-in et vérification de siège.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Alertes en temps réel pour les organisateurs.',
  },
  {
    icon: Link2,
    title: 'Deep links',
    description: 'Ouverture directe RSVP, événement ou protocole.',
  },
  {
    icon: Moon,
    title: 'Thème système',
    description: 'Clair / sombre selon le réglage iOS et Android.',
  },
];

const GUEST_FEATURES = [
  'Portail RSVP sans compte',
  'Badge QR de confirmation',
  'Plan de table (dès acceptation RSVP)',
  'PDF invitation',
];

const ORG_FEATURES = [
  'Événements & invités',
  'Statistiques RSVP',
  'Accès protocole',
  'Builds iOS & Android',
];

export default function LandingMobileSection() {
  return (
    <section id="mobile" className="py-16 sm:py-20 bg-foreground text-background scroll-mt-16">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 text-xs font-medium text-background/60 uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5" />
              Application mobile
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
              Protocole dans la poche, RSVP pour vos invités
            </h2>
            <p className="text-sm text-background/65 leading-relaxed max-w-lg">
              Complète le tableau de bord web : scan caméra, notifications et parcours invité — même logique métier.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {MOBILE_FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="p-3.5 rounded-[var(--radius-card)] border border-background/15 bg-background/5">
                  <Icon className="w-4 h-4 text-background/80 mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{title}</h3>
                  <p className="text-xs text-background/55 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>

            <Link href="/register">
              <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Créer mon entreprise
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            <div className="border border-background/15 rounded-[var(--radius-card)] p-5 bg-background/5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-background/50 mb-3">
                Invité
              </h3>
              <ul className="space-y-2">
                {GUEST_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-background/80">
                    <CheckCircle2 className="w-4 h-4 text-background/40 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-background/15 rounded-[var(--radius-card)] p-5 bg-background/5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-background/50 mb-3">
                Organisation
              </h3>
              <ul className="space-y-2">
                {ORG_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-background/80">
                    <CheckCircle2 className="w-4 h-4 text-background/40 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] text-background/40 text-center pt-1">
              Édition avancée (modèles, plan de table) sur le web.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
