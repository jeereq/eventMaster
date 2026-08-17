'use client';

import React from 'react';
import Link from 'next/link';
import {
  Smartphone,
  ScanLine,
  Bell,
  Link2,
  Construction,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui';

const PLANNED_FEATURES = [
  {
    icon: ScanLine,
    title: 'Protocole jour J',
    description: 'Scan QR via la caméra native, check-in et validation du siège.',
  },
  {
    icon: Bell,
    title: 'Notifications push',
    description: 'Alertes organisateur et invité, hors du navigateur.',
  },
  {
    icon: Link2,
    title: 'Deep links',
    description: 'Ouverture directe RSVP, événement ou protocole.',
  },
  {
    icon: Smartphone,
    title: 'iOS & Android',
    description: 'Une app native, en complément du tableau de bord web.',
  },
];

export default function LandingMobileSection() {
  return (
    <section id="mobile" className="py-16 sm:py-20 bg-foreground text-background scroll-mt-16">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-background/60">
              <Construction className="w-3.5 h-3.5" />
              Application mobile · en construction
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
              L’app iOS & Android n’est pas encore déployée
            </h2>
            <p className="text-sm text-background/65 leading-relaxed max-w-lg">
              Nous construisons une application native pour le protocole et le RSVP. Elle n’est
              pas disponible sur l’App Store ni Google Play pour le moment. En attendant, tout
              le produit actuel — invitations, plan de salle, catalogue, réservations et scan QR —
              fonctionne dans le navigateur, y compris sur téléphone.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {PLANNED_FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="p-3.5 rounded-[var(--radius-card)] border border-background/15 bg-background/5">
                  <Icon className="w-4 h-4 text-background/80 mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{title}</h3>
                  <p className="text-xs text-background/55 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>

            <Link href="/register">
              <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continuer sur le web
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            <div className="border border-background/15 rounded-[var(--radius-card)] p-5 bg-background/5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-background/50 mb-3">
                Disponible aujourd’hui (web)
              </h3>
              <ul className="space-y-2">
                {[
                  'Portail RSVP et badge QR',
                  'Plan de table 2D',
                  'Protocole scan QR dans le navigateur',
                  'Catalogue salles & prestataires (photos et vidéos)',
                  'Réservation de dates',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-background/80">
                    <CheckCircle2 className="w-4 h-4 text-background/40 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] text-background/40 text-center pt-1">
              L’édition avancée (modèles, plan de table) restera sur le web même après le lancement de l’app.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
