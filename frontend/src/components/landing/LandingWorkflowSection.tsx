'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail, MessageSquare, QrCode, ScanLine, MapPin, FileText, LayoutGrid,
  ArrowRight, Heart, Wallet, CalendarCheck, Building2, Briefcase, Users,
  Shield, Share2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

type JourneyId = 'organizer' | 'guest' | 'client' | 'venue' | 'vendor' | 'protocol' | 'commercial';

const JOURNEYS: Array<{
  id: JourneyId;
  label: string;
  eyebrow: string;
  title: string;
  intro: string;
  cta: { href: string; label: string };
  steps: Array<{ title: string; description: string; icon: typeof Mail }>;
}> = [
  {
    id: 'organizer',
    label: 'Organisateur',
    eyebrow: 'Parcours organisation',
    title: 'Créer un événement jusqu’au jour J',
    intro: 'Compte organisation : invitations, RSVP, plan de table, protocole et suivi — dans un même workspace.',
    cta: { href: '/register', label: 'Créer mon organisation' },
    steps: [
      { title: 'Créer l’événement', description: 'Privé (liste d’invités) ou public (fiche marketplace et billets). Liez une salle pour importer le plan 2D.', icon: CalendarCheck },
      { title: 'Inviter', description: 'Diffusez e-mail ou WhatsApp. Chaque invité a un lien RSVP et un badge QR.', icon: Mail },
      { title: 'Placer', description: 'Plan 2D, tables et sièges. Dès le RSVP accepté, PDF, plan et GPS partent selon le forfait.', icon: LayoutGrid },
      { title: 'Accueillir', description: 'Le protocole scanne les badges le jour J. Check-in et validation du siège dans le navigateur.', icon: ScanLine },
    ],
  },
  {
    id: 'guest',
    label: 'Invité',
    eyebrow: 'Parcours invité',
    title: 'De l’invitation à la table',
    intro: 'Les données de placement partent dès la confirmation RSVP (si place assignée et selon forfait).',
    cta: { href: '/guide/invite', label: 'Guide invité' },
    steps: [
      { title: 'Invitation', description: 'E-mail ou WhatsApp avec lien RSVP personnalisé. Pas de PDF ni de GPS à ce stade.', icon: Mail },
      { title: 'Réponse RSVP', description: 'L’invité confirme, renseigne ses préférences et reçoit son badge QR.', icon: MessageSquare },
      { title: 'Livraison', description: 'PDF, plan de table et pin GPS envoyés automatiquement dès confirmation.', icon: QrCode },
      { title: 'Check-in', description: 'Scan QR à l’entrée. Confirmation de présence et validation du siège.', icon: ScanLine },
    ],
  },
  {
    id: 'client',
    label: 'Client',
    eyebrow: 'Parcours client marketplace',
    title: 'Trouver salle et prestataires selon votre budget',
    intro: 'Compte client : pas d’événements à créer. Vous explorez, enregistrez, simulez, partagez, puis réservez.',
    cta: { href: '/register?kind=CLIENT', label: 'Créer un compte client' },
    steps: [
      { title: 'Explorer', description: 'Salles, métiers et locations, filtrés par ville et prix. Grille, liste ou carte. Partagez l’URL de recherche.', icon: LayoutGrid },
      { title: 'Favoris', description: 'Gardez les fiches, ouvrez-les ou partagez-les — sans compte obligatoire pour le destinataire.', icon: Heart },
      { title: 'Packs budget', description: 'Trois propositions (éco / équilibré / confort) à ajuster ou à sauvegarder.', icon: Wallet },
      { title: 'Réserver', description: 'Devis ou demande de date. L’acompte (30 %) se verse au professionnel, hors EventMaster.', icon: CalendarCheck },
    ],
  },
  {
    id: 'venue',
    label: 'Salle',
    eyebrow: 'Parcours gestionnaire de salle',
    title: 'Publier le lieu et recevoir des dates',
    intro: 'Forfait Salle : fiches publiques, plan 2D, calendrier, devis et réservations.',
    cta: { href: '/register', label: 'Publier ma salle' },
    steps: [
      { title: 'Configurer', description: 'Plan 2D, capacité, photos, tarifs et position GPS. Thèmes et profondeur 2,5D pour la vitrine.', icon: Building2 },
      { title: 'Publier', description: 'La fiche apparaît sur le marketplace. Les clients filtrent, partagent et demandent un devis.', icon: Share2 },
      { title: 'Répondre', description: 'Demandes et réservations dans le desk. Calendrier bloqué selon les dates confirmées.', icon: MessageSquare },
      { title: 'Jour J', description: 'Si la salle est liée à un événement, le plan sert au placement et au protocole.', icon: LayoutGrid },
    ],
  },
  {
    id: 'vendor',
    label: 'Prestataire',
    eyebrow: 'Parcours prestataire',
    title: 'De la demande à la date bloquée',
    intro: 'Desk Marketplace : métiers ou locations. Acompte 30 % hors plateforme ; commission vendeur 8 %.',
    cta: { href: '/register', label: 'Créer mon espace presta' },
    steps: [
      { title: 'Publier', description: 'Fiches photos, tarif, ville, rayon : métiers ou locations (habits, véhicules, matériel).', icon: Briefcase },
      { title: 'Devis', description: 'Les demandes arrivent dans Demandes. Contactez le client, puis convertissez si une date est indiquée.', icon: MessageSquare },
      { title: 'Acompte', description: 'Acceptez la réservation. Le client verse 30 % hors EventMaster ; vous marquez l’acompte reçu.', icon: Wallet },
      { title: 'Confirmer', description: 'Bloquez la date. La commission 8 % est due sur les réservations confirmées.', icon: CalendarCheck },
    ],
  },
  {
    id: 'protocol',
    label: 'Protocole',
    eyebrow: 'Parcours accueil jour J',
    title: 'Scanner, confirmer, placer',
    intro: 'Rôle Protocole : accès limité aux invités. Scan QR dans le navigateur — l’app native caméra est en construction.',
    cta: { href: '/login', label: 'Connexion protocole' },
    steps: [
      { title: 'Accès', description: 'Le manager vous ajoute à l’organisation ou à un événement. Vous voyez uniquement l’accueil.', icon: Shield },
      { title: 'Liste', description: 'Invités, statuts RSVP, table et siège. Recherche et notes de protocole.', icon: Users },
      { title: 'Scan', description: 'Badge QR à l’entrée : confirmation de présence en un geste, sur téléphone ou tablette.', icon: ScanLine },
      { title: 'Siège', description: 'Validez le placement. L’invité a déjà reçu PDF, plan et GPS s’ils étaient prévus.', icon: MapPin },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    eyebrow: 'Parcours réseau commercial',
    title: 'Parrainer et suivre les commissions',
    intro: 'Code de parrainage, création d’organisations et commissions (30 % sur la facturation mensuelle).',
    cta: { href: '/contact', label: 'Devenir commercial' },
    steps: [
      { title: 'Code', description: 'Votre lien d’inscription préremplit le parrainage. Le prospect crée son organisation.', icon: Share2 },
      { title: 'Créer', description: 'Vous pouvez aussi ouvrir une organisation pour un client depuis votre espace.', icon: Users },
      { title: 'Suivre', description: 'Licences, renouvellements et commissions visibles dans le tableau de bord commercial.', icon: Wallet },
      { title: 'Renouveler', description: 'Les paiements suivants génèrent aussi une commission selon le barème.', icon: CalendarCheck },
    ],
  },
];

const DELIVERABLES = [
  { icon: FileText, label: 'PDF avec placement' },
  { icon: LayoutGrid, label: 'Plan de table' },
  { icon: MapPin, label: 'Localisation GPS' },
];

export default function LandingWorkflowSection() {
  const [active, setActive] = useState<JourneyId>('organizer');
  const journey = JOURNEYS.find((item) => item.id === active) || JOURNEYS[0];

  return (
    <section id="parcours" className="py-16 sm:py-20 bg-background border-t border-border scroll-mt-16">
      <div className="page-container space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Parcours par rôle</p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Choisissez votre entrée dans EventMaster
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Organisateur, invité, client, salle, prestataire, protocole ou commercial — chaque profil a un chemin clair.
          </p>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {JOURNEYS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              aria-pressed={active === item.id}
              className={cn(
                'shrink-0 px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold transition border',
                active === item.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-muted border-border hover:text-foreground hover:bg-surface-muted',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{journey.eyebrow}</p>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">{journey.title}</h3>
          <p className="text-sm text-muted leading-relaxed max-w-2xl">{journey.intro}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {journey.steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="relative">
                {index < journey.steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-8 left-[calc(100%-0.25rem)] w-3 z-0 text-border">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
                <div className="relative z-10 bg-surface border border-border rounded-[var(--radius-card)] p-4 h-full">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-button)] border border-border bg-surface-muted text-foreground mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Étape {index + 1}
                  </span>
                  <h4 className="font-semibold text-foreground text-sm mt-1 mb-1.5">{item.title}</h4>
                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link href={journey.cta.href}>
            <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              {journey.cta.label}
            </Button>
          </Link>
          {active === 'guest' ? (
            <div className="flex flex-wrap gap-2">
              {DELIVERABLES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-button)] bg-surface border border-border text-xs font-medium text-foreground"
                >
                  <Icon className="w-3.5 h-3.5 text-muted" />
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
