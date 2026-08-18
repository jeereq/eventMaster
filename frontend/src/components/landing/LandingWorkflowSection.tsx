'use client';

import React from 'react';
import {
  Mail,
  MessageSquare,
  QrCode,
  ScanLine,
  MapPin,
  FileText,
  LayoutGrid,
  ArrowRight,
  Heart,
  Wallet,
  CalendarCheck,
} from 'lucide-react';

const STEPS = [
  {
    step: 1,
    title: 'Invitation',
    description:
      'E-mail ou WhatsApp avec lien RSVP personnalisé. Pas de PDF ni de GPS à ce stade.',
    icon: Mail,
  },
  {
    step: 2,
    title: 'Réponse RSVP',
    description:
      'L’invité confirme, renseigne ses préférences et reçoit son badge QR.',
    icon: MessageSquare,
  },
  {
    step: 3,
    title: 'Livraison',
    description:
      'PDF, plan de table et pin GPS envoyés automatiquement dès confirmation RSVP.',
    icon: QrCode,
  },
  {
    step: 4,
    title: 'Check-in',
    description:
      'Scan QR à l’entrée. Confirmation de présence et validation du siège.',
    icon: ScanLine,
  },
] as const;

const DELIVERABLES = [
  { icon: FileText, label: 'PDF avec placement' },
  { icon: LayoutGrid, label: 'Plan de table' },
  { icon: MapPin, label: 'Localisation GPS' },
];

export default function LandingWorkflowSection() {
  return (
    <section id="parcours" className="py-16 sm:py-20 bg-background border-t border-border scroll-mt-16">
      <div className="page-container">
        <div className="max-w-2xl mb-10 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Parcours invité</p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            De l&apos;invitation à la table
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Les données de placement partent dès la confirmation RSVP (si place assignée et selon forfait).
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative">
                {index < STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute top-8 left-[calc(100%-0.25rem)] w-3 z-0 text-border">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
                <div className="relative z-10 bg-surface border border-border rounded-[var(--radius-card)] p-4 h-full">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-button)] border border-border bg-surface-muted text-foreground mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Étape {item.step}
                  </span>
                  <h3 className="font-semibold text-foreground text-sm mt-1 mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-surface-muted border border-border rounded-[var(--radius-card)] p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">Dès l’acceptation RSVP</h3>
              <p className="text-xs text-muted max-w-xl leading-relaxed">
                PDF, plan de table et localisation GPS partent automatiquement — sans action manuelle.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DELIVERABLES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface border border-border text-xs font-medium text-foreground"
                >
                  <Icon className="w-3.5 h-3.5 text-muted" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 max-w-2xl mb-10 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Parcours client marketplace</p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Trouver salle et prestataires selon votre budget
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Compte client : pas d’événements à créer. Vous explorez (salles, prestations et locations), enregistrez, simulez, partagez, puis réservez.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { step: 1, title: 'Explorer', description: 'Salles, métiers et locations (habits, voitures, motos, matériel), filtrés par ville, prix et type. Grille, liste ou carte. Partagez l’URL de votre recherche.', icon: LayoutGrid },
            { step: 2, title: 'Favoris', description: 'Gardez les fiches qui vous plaisent, en grille ou en liste, puis ouvrez-les ou partagez-les.', icon: Heart },
            { step: 3, title: 'Packs budget', description: 'Indiquez le montant et le type (mariage, gala…). Trois propositions distinctes, à ajuster ou à sauvegarder.', icon: Wallet },
            { step: 4, title: 'Réserver', description: 'Devis ou demande de date. L’acompte (30 %) se verse au professionnel, hors EventMaster.', icon: CalendarCheck },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative">
                {index < 3 && (
                  <div className="hidden lg:flex absolute top-8 left-[calc(100%-0.25rem)] w-3 z-0 text-border">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
                <div className="relative z-10 bg-surface border border-border rounded-[var(--radius-card)] p-4 h-full">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-button)] border border-border bg-surface-muted text-foreground mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Étape {item.step}
                  </span>
                  <h3 className="font-semibold text-foreground text-sm mt-1 mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-14 max-w-2xl mb-10 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Parcours prestataire</p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            De la demande à la date bloquée
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Desk Marketplace : prestations, devis, puis réservations. L’acompte (30 %) se verse hors plateforme ; la commission vendeur est de 8 %.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { step: 1, title: 'Publier', description: 'Créez vos fiches (photos, tarif, ville, rayon) : métiers ou locations (habits, véhicules, matériel). Grille ou liste, puis publiez.', icon: LayoutGrid },
            { step: 2, title: 'Devis', description: 'Les demandes arrivent dans Demandes. Contactez le client, puis convertissez si une date est indiquée.', icon: MessageSquare },
            { step: 3, title: 'Acompte', description: 'Acceptez la réservation. Le client verse 30 % hors EventMaster ; vous marquez l’acompte reçu.', icon: Wallet },
            { step: 4, title: 'Confirmer', description: 'Bloquez la date au calendrier. La commission 8 % est due sur les réservations confirmées.', icon: CalendarCheck },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative">
                {index < 3 && (
                  <div className="hidden lg:flex absolute top-8 left-[calc(100%-0.25rem)] w-3 z-0 text-border">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
                <div className="relative z-10 bg-surface border border-border rounded-[var(--radius-card)] p-4 h-full">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-button)] border border-border bg-surface-muted text-foreground mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Étape {item.step}
                  </span>
                  <h3 className="font-semibold text-foreground text-sm mt-1 mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
