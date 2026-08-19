'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Mail, MessageSquare, QrCode, ScanLine, MapPin, FileText, LayoutGrid,
  ArrowRight, ArrowLeft, Heart, Wallet, CalendarCheck, Building2, Briefcase, Users,
  Shield, Share2, CheckCircle2, ChevronRight, Shirt, Rss,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { interpolateRates } from '@/lib/platformRates';

type JourneyId = 'organizer' | 'guest' | 'client' | 'venue' | 'vendor' | 'protocol' | 'commercial';

interface JourneyStep {
  title: string;
  description: string;
  detail: string;
  outcome: string;
  icon: typeof Mail;
}

interface Journey {
  id: JourneyId;
  label: string;
  eyebrow: string;
  title: string;
  intro: string;
  cta: { href: string; label: string };
  results: Array<{ icon: typeof Mail; label: string }>;
  steps: JourneyStep[];
}

const JOURNEYS: Journey[] = [
  {
    id: 'organizer',
    label: 'Organisateur',
    eyebrow: 'Parcours organisation',
    title: 'Créer un événement jusqu’au jour J',
    intro: 'Infos invités, invitations, réponses, plan de table, fil d’actualité et accueil — dans le même espace.',
    cta: { href: '/register', label: 'Lancer mon premier événement' },
    results: [
      { icon: Shirt, label: 'Dress code' },
      { icon: Mail, label: 'Lien RSVP' },
      { icon: Rss, label: 'Fil invités' },
    ],
    steps: [
      {
        title: 'Créer l’événement',
        description: 'Privé (liste) ou public (fiche et billets). Liez une salle pour importer le plan.',
        detail: 'Renseignez titre, date, lieu et GPS. Choisissez Privé pour un mariage ou une soirée fermée, Public pour une fiche marketplace avec inscription ou billets payants. Associer une salle importe automatiquement le plan 2D.',
        outcome: 'Événement créé, prêt à recevoir des invités ou des acheteurs de billets.',
        icon: CalendarCheck,
      },
      {
        title: 'Infos invités',
        description: 'Dress code, parking, cadeaux — visibles quand l’invité ouvre son lien.',
        detail: 'Dans Infos invités : activez le code vestimentaire, ajoutez parking, horaires, cadeaux ou extras (welcome drink, open bar). Ces infos s’affichent sur le portail de l’invité et peuvent être insérées dans l’invitation.',
        outcome: 'Les invités savent comment s’habiller et ce qui les attend.',
        icon: Shirt,
      },
      {
        title: 'Inviter',
        description: 'E-mail ou WhatsApp. Le premier message contient seulement le lien pour répondre.',
        detail: 'Chaque invité a un lien personnel. Pas de PDF, ni de plan, ni de GPS à ce stade. Les acheteurs de billets publics deviennent des invités avec le même portail.',
        outcome: 'Invitations parties — les réponses arrivent dans le tableau RSVP.',
        icon: Mail,
      },
      {
        title: 'Placer',
        description: 'Glissez les invités sur les sièges. PDF et GPS partent après le « oui » + une place (Premium 1+).',
        detail: 'Glissez les invités sur les sièges. Dès qu’un invité a accepté et qu’une place est assignée, le PDF, le plan interactif et le pin GPS partent automatiquement (forfait Premium 1+).',
        outcome: 'Chaque confirmé connaît sa table avant le jour J.',
        icon: LayoutGrid,
      },
      {
        title: 'Fil d’actualité',
        description: 'Publiez photos et annonces. Les invités like, commentent et déposent un livre d’or.',
        detail: 'Onglet Feed : publiez texte et médias, répondez aux commentaires, aimez les posts. Sur un événement public, une publication peut aussi paraître sur la fiche marketplace. Les invités voient le fil dans Actualités et partagent photos / messages dans le livre d’or.',
        outcome: 'Annonces en direct et souvenirs collectés.',
        icon: Rss,
      },
      {
        title: 'Accueillir',
        description: 'Scannez les badges à l’entrée, depuis le téléphone. Présence et siège validés.',
        detail: 'Mode Protocole : caméra du téléphone ou de la tablette dans le navigateur — l’app native n’est pas encore déployée. Présence enregistrée, siège validé, no-shows visibles.',
        outcome: 'Entrée contrôlée, présence en temps réel.',
        icon: ScanLine,
      },
    ],
  },
  {
    id: 'guest',
    label: 'Invité',
    eyebrow: 'Parcours invité',
    title: 'De l’invitation à la table',
    intro: 'Pas de compte à créer. Infos, place et PDF seulement après votre « oui ».',
    cta: { href: '/guide/invite', label: 'Voir l’aide invité' },
    results: [
      { icon: Shirt, label: 'Dress code' },
      { icon: FileText, label: 'PDF avec placement' },
      { icon: Rss, label: 'Fil & livre d’or' },
    ],
    steps: [
      {
        title: 'Invitation',
        description: 'E-mail ou WhatsApp avec lien RSVP personnalisé. Pas de PDF ni de GPS à ce stade.',
        detail: 'Le message d’invitation ne contient que votre lien personnel. Conservez-le : il ouvre votre portail, unique à votre nom.',
        outcome: 'Vous ouvrez le portail RSVP sans créer de compte.',
        icon: Mail,
      },
      {
        title: 'Réponse RSVP',
        description: 'Vous confirmez, renseignez vos préférences et recevez votre badge QR.',
        detail: 'Acceptez ou déclinez, indiquez menu, accompagnant ou champs demandés par l’organisateur. Le badge QR apparaît dès l’acceptation. Dress code, avantages et notes pratiques s’affichent sur le portail.',
        outcome: 'Présence confirmée, badge QR et infos pratiques.',
        icon: MessageSquare,
      },
      {
        title: 'Livraison',
        description: 'PDF, plan de table et pin GPS envoyés automatiquement dès confirmation et place assignée.',
        detail: 'Si l’organisateur est en Premium 1+ et qu’une place est déjà attribuée, PDF, plan et GPS partent tout de suite. Sinon, ils arrivent dès que le siège est assigné.',
        outcome: 'Vous savez où vous asseoir avant d’arriver.',
        icon: QrCode,
      },
      {
        title: 'Fil & souvenirs',
        description: 'Onglet Actualités : like et commentaires. Livre d’or : vos messages et photos.',
        detail: 'Consultez les annonces de l’organisateur, aimez et commentez. Dans le livre d’or, déposez un mot et des photos — l’organisateur les voit dans son fil.',
        outcome: 'Vous restez informé et participez aux souvenirs.',
        icon: Heart,
      },
      {
        title: 'Check-in',
        description: 'Présentez le QR à l’entrée. Confirmation de présence et validation du siège.',
        detail: 'Le protocole scanne votre badge dans le navigateur. Gardez le lien RSVP ou le message de confirmation sous la main.',
        outcome: 'Entrée validée, place confirmée.',
        icon: ScanLine,
      },
    ],
  },
  {
    id: 'client',
    label: 'Client',
    eyebrow: 'Parcours client marketplace',
    title: 'Trouver salle et prestataires selon votre budget',
    intro: 'Pas d’abonnement. Vous cherchez, comparez, puis réservez.',
    cta: { href: '/register?kind=CLIENT', label: 'Trouver salle et prestas' },
    results: [
      { icon: Heart, label: 'Favoris' },
      { icon: Wallet, label: '3 packs budget' },
      { icon: Share2, label: 'Lien public' },
    ],
    steps: [
      {
        title: 'Explorer',
        description: 'Salles, métiers et locations, filtrés par ville et prix. Grille, liste ou carte.',
        detail: 'Filtrez par mot-clé, ville, commune, type, métier ou location (habits, véhicules, matériel), prix et places. Partagez l’URL : le destinataire retrouve les mêmes filtres.',
        outcome: 'Catalogue filtré, partageable sans compte.',
        icon: LayoutGrid,
      },
      {
        title: 'Favoris',
        description: 'Gardez les fiches, ouvrez-les ou partagez-les.',
        detail: 'Le cœur enregistre salles, prestataires et locations. Le destinataire d’un lien public n’a pas besoin de compte pour consulter la fiche.',
        outcome: 'Votre shortlist est prête.',
        icon: Heart,
      },
      {
        title: 'Packs budget',
        description: 'Trois propositions (éco / équilibré / confort) à ajuster ou à sauvegarder.',
        detail: 'Indiquez enveloppe, ville, invités et métiers. EventMaster compose 3 packs dans le budget. Rien n’est réservé : vous comparez, figez une ligne, puis relancez.',
        outcome: 'Un pack sauvegardé, prêt à demander un devis.',
        icon: Wallet,
      },
      {
        title: 'Réserver',
        description: 'Devis ou demande de date. Acompte {depositPercent} % versé au professionnel, hors EventMaster.',
        detail: 'Après acceptation, versez l’acompte directement au pro. EventMaster n’encaisse pas. Le vendeur paie {commissionPercent} % de commission sur les réservations confirmées — pas vous.',
        outcome: 'Date bloquée une fois l’acompte marqué et confirmé.',
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: 'venue',
    label: 'Salle',
    eyebrow: 'Parcours gestionnaire de salle',
    title: 'Publier le lieu et recevoir des dates',
    intro: 'Publiez le lieu, recevez des dates, gérez le calendrier.',
    cta: { href: '/register?kind=VENDOR', label: 'Mettre ma salle en ligne' },
    results: [
      { icon: Building2, label: 'Fiche publique' },
      { icon: LayoutGrid, label: 'Plan 2D' },
      { icon: CalendarCheck, label: 'Calendrier' },
    ],
    steps: [
      {
        title: 'Configurer',
        description: 'Plan 2D, capacité, photos, tarifs et GPS.',
        detail: 'Éditeur 2D : banquet, tente, custom. Photos, vidéos, tarifs, position GPS. Le plan sert ensuite au placement si un organisateur lie votre salle.',
        outcome: 'Salle prête à publier.',
        icon: Building2,
      },
      {
        title: 'Publier',
        description: 'La fiche apparaît sur le marketplace. Les clients filtrent, partagent et demandent un devis.',
        detail: 'Partagez le lien marketplace de la fiche — pas l’URL interne du desk. Les filtres ville, capacité et prix font remonter votre lieu.',
        outcome: 'Visible dans le catalogue public.',
        icon: Share2,
      },
      {
        title: 'Répondre',
        description: 'Demandes et réservations dans le desk. Calendrier bloqué selon les dates confirmées.',
        detail: 'Marquez un devis comme contacté, convertissez-le, acceptez, puis confirmez après acompte hors plateforme.',
        outcome: 'Dates bloquées, pas de double réservation.',
        icon: MessageSquare,
      },
      {
        title: 'Jour J',
        description: 'Si la salle est liée à un événement, le plan sert au placement et au protocole.',
        detail: 'L’organisateur importe votre plan 2D. Le protocole scanne les QR dans le navigateur sur place.',
        outcome: 'Le lieu et l’accueil sont alignés.',
        icon: LayoutGrid,
      },
    ],
  },
  {
    id: 'vendor',
    label: 'Prestataire',
    eyebrow: 'Parcours prestataire',
    title: 'De la demande à la date bloquée',
    intro: 'Métiers ou locations. Acompte {depositPercent} % hors plateforme ; commission vendeur {commissionPercent} %.',
    cta: { href: '/register?kind=VENDOR', label: 'Publier mes offres' },
    results: [
      { icon: Briefcase, label: 'Fiches illimitées' },
      { icon: Wallet, label: 'Acompte hors plateforme' },
      { icon: CalendarCheck, label: 'Date bloquée' },
    ],
    steps: [
      {
        title: 'Publier',
        description: 'Fiches photos, tarif, ville, rayon : métiers ou locations (habits, véhicules, matériel).',
        detail: 'Dès l’abonnement Prestataire payé, les fiches sont illimitées. Distinguez métier (traiteur, photo, DJ) et location (habits, voitures, motos, matériel).',
        outcome: 'Vos offres sont visibles et filtrables.',
        icon: Briefcase,
      },
      {
        title: 'Devis',
        description: 'Les demandes arrivent dans Demandes. Contactez, puis convertissez si une date est indiquée.',
        detail: 'Une demande sans date reste un devis. Avec date, convertissez en réservation pour enchaîner l’acompte.',
        outcome: 'Pipeline devis → réservation clair.',
        icon: MessageSquare,
      },
      {
        title: 'Acompte',
        description: 'Acceptez. Le client verse {depositPercent} % hors EventMaster ; vous marquez l’acompte reçu.',
        detail: 'EventMaster n’encaisse pas. Vous confirmez seulement après réception réelle de l’acompte.',
        outcome: 'Acompte tracé, sans intermédiaire de paiement.',
        icon: Wallet,
      },
      {
        title: 'Confirmer',
        description: 'Bloquez la date. La commission {commissionPercent} % est due sur les réservations confirmées.',
        detail: 'La commission vendeur est distincte de l’abonnement SaaS. Elle s’applique aux réservations confirmées.',
        outcome: 'Date bloquée, commission due.',
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: 'protocol',
    label: 'Protocole',
    eyebrow: 'Parcours accueil jour J',
    title: 'Scanner, confirmer, placer',
    intro: 'Scan du badge à l’entrée, depuis le navigateur. Pas d’app à installer.',
    cta: { href: '/login', label: 'Ouvrir le scan jour J' },
    results: [
      { icon: ScanLine, label: 'Scan navigateur' },
      { icon: Users, label: 'Liste RSVP' },
      { icon: MapPin, label: 'Siège validé' },
    ],
    steps: [
      {
        title: 'Accès',
        description: 'Le manager vous ajoute à l’organisation ou à un événement. Vous voyez uniquement l’accueil.',
        detail: 'Protocole org. : tous les événements. Protocole événement : uniquement les événements assignés. Pas de facturation, pas de création d’événements.',
        outcome: 'Périmètre d’accueil clair.',
        icon: Shield,
      },
      {
        title: 'Liste',
        description: 'Invités, statuts RSVP, table et siège. Recherche et notes.',
        detail: 'Filtrez accepté / en attente / décliné. Les invités sans QR se recherchent par nom.',
        outcome: 'Vous savez qui est attendu.',
        icon: Users,
      },
      {
        title: 'Scan',
        description: 'Badge QR à l’entrée : confirmation de présence en un geste, sur téléphone ou tablette.',
        detail: 'Ouvrez le mode Protocole dans le navigateur et autorisez la caméra. Testez avant le jour J. Connexion stable recommandée.',
        outcome: 'Présence enregistrée en direct.',
        icon: ScanLine,
      },
      {
        title: 'Siège',
        description: 'Validez le placement. L’invité a déjà reçu PDF, plan et GPS s’ils étaient prévus.',
        detail: 'La validation du siège clôt l’accueil. Signalez les no-shows au manager.',
        outcome: 'Table confirmée à l’entrée.',
        icon: MapPin,
      },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    eyebrow: 'Parcours réseau commercial',
    title: 'Parrainer et suivre les commissions',
    intro: 'Parrainez, suivez les organisations et vos commissions ({commercialPercent} %).',
    cta: { href: '/contact', label: 'Activer mon parrainage' },
    results: [
      { icon: Share2, label: 'Code / lien' },
      { icon: Users, label: 'Organisations' },
      { icon: Wallet, label: 'Commissions' },
    ],
    steps: [
      {
        title: 'Code',
        description: 'Votre lien d’inscription préremplit le parrainage.',
        detail: 'Le code doit être saisi à l’inscription pour lier le parrainage. Transmettez-le avant que le prospect crée son organisation.',
        outcome: 'Le prospect est rattaché à vous.',
        icon: Share2,
      },
      {
        title: 'Créer',
        description: 'Vous pouvez aussi ouvrir une organisation pour un client depuis votre espace.',
        detail: 'Selon vos droits plateforme, créez le tenant et suivez la demande d’abonnement jusqu’à validation.',
        outcome: 'Organisation créée et suivie.',
        icon: Users,
      },
      {
        title: 'Suivre',
        description: 'Licences, renouvellements et commissions dans le tableau de bord.',
        detail: 'Les commissions se calculent sur les factures validées, selon le taux contractuel (souvent {commercialPercent} % sur la période facturée).',
        outcome: 'Pipeline et montants visibles.',
        icon: Wallet,
      },
      {
        title: 'Renouveler',
        description: 'Les paiements suivants génèrent aussi une commission selon le barème.',
        detail: 'Un renouvellement annuel (−10 % pour le client, y compris Particulier) reste une facture commissionnable.',
        outcome: 'Revenu récurrent suivi.',
        icon: CalendarCheck,
      },
    ],
  },
];

export default function LandingWorkflowSection() {
  const { site } = usePlatformSite();
  const [activeId, setActiveId] = useState<JourneyId>('organizer');
  const [stepIndex, setStepIndex] = useState(0);
  const tabsId = useId();

  const journeys = useMemo(
    () =>
      JOURNEYS.map((item) => ({
        ...item,
        intro: interpolateRates(item.intro, site),
        steps: item.steps.map((step) => ({
          ...step,
          description: interpolateRates(step.description, site),
          detail: interpolateRates(step.detail, site),
        })),
      })),
    [site],
  );

  const journey = journeys.find((item) => item.id === activeId) || journeys[0];
  const step = journey.steps[stepIndex] ?? journey.steps[0];
  const StepIcon = step.icon;
  const progress = ((stepIndex + 1) / journey.steps.length) * 100;

  useEffect(() => {
    setStepIndex(0);
  }, [activeId]);

  const goStep = useCallback(
    (next: number) => {
      setStepIndex(Math.max(0, Math.min(journey.steps.length - 1, next)));
    },
    [journey.steps.length],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      goStep(stepIndex + 1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      goStep(stepIndex - 1);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      goStep(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      goStep(journey.steps.length - 1);
    }
  };

  return (
    <section id="parcours" className="py-16 sm:py-20 bg-background border-t border-border scroll-mt-16">
      <div className="page-container space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Parcours par rôle</p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Choisissez votre rôle, suivez les étapes
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Organisateur, invité, client, salle, prestataire, accueil ou commercial.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Choisir un rôle"
          className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {JOURNEYS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${tabsId}-${item.id}`}
              aria-selected={activeId === item.id}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setActiveId(item.id)}
              className={cn(
                'shrink-0 px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold transition border',
                activeId === item.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-muted border-border hover:text-foreground hover:bg-surface-muted',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          id={`${tabsId}-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-${activeId}`}
          className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden"
          onKeyDown={onKeyDown}
        >
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
            <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-border space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{journey.eyebrow}</p>
                <h3 className="text-lg font-semibold text-foreground tracking-tight">{journey.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{journey.intro}</p>
              </div>

              <div className="space-y-1" role="list" aria-label="Étapes du parcours">
                {journey.steps.map((item, index) => {
                  const Icon = item.icon;
                  const selected = index === stepIndex;
                  const done = index < stepIndex;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      role="listitem"
                      aria-current={selected ? 'step' : undefined}
                      onClick={() => setStepIndex(index)}
                      className={cn(
                        'w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-[var(--radius-button)] border transition',
                        selected
                          ? 'bg-primary/5 border-primary/25'
                          : 'bg-transparent border-transparent hover:bg-surface-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-button)] border text-[11px] font-bold',
                          selected
                            ? 'bg-primary text-white border-primary'
                            : done
                              ? 'bg-surface-muted text-foreground border-border'
                              : 'bg-surface text-muted border-border',
                        )}
                      >
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span className={cn('text-sm font-semibold', selected ? 'text-foreground' : 'text-foreground/80')}>
                            {item.title}
                          </span>
                        </span>
                        <span className="block text-xs text-muted leading-relaxed mt-0.5 line-clamp-2">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight className={cn('w-4 h-4 shrink-0 mt-1', selected ? 'text-primary' : 'text-border')} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 sm:p-7 flex flex-col bg-background/40">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Étape {stepIndex + 1} / {journey.steps.length}
                </p>
                <div className="flex-1 max-w-[140px] h-1 rounded-full bg-surface-muted overflow-hidden" aria-hidden>
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="inline-flex items-center justify-center w-11 h-11 rounded-[var(--radius-button)] border border-border bg-surface text-foreground mb-4">
                <StepIcon className="w-5 h-5" />
              </div>
              <h4 className="text-xl font-semibold text-foreground tracking-tight">{step.title}</h4>
              <p className="text-sm text-muted leading-relaxed mt-2">{step.detail}</p>

              <div className="mt-5 rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">À cette étape</p>
                <p className="text-sm font-medium text-foreground leading-relaxed">{step.outcome}</p>
              </div>

              <div className="mt-auto pt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goStep(stepIndex - 1)}
                    disabled={stepIndex === 0}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-button)] border border-border bg-surface text-foreground disabled:opacity-40 hover:bg-surface-muted transition"
                    aria-label="Étape précédente"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goStep(stepIndex + 1)}
                    disabled={stepIndex === journey.steps.length - 1}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-button)] border border-border bg-surface text-foreground disabled:opacity-40 hover:bg-surface-muted transition"
                    aria-label="Étape suivante"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted hidden sm:block">Flèches du clavier pour parcourir</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 border-t border-border bg-surface">
            <Link href={journey.cta.href}>
              <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {journey.cta.label}
              </Button>
            </Link>
            <div className="flex flex-wrap gap-2">
              {journey.results.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-button)] bg-background border border-border text-xs font-medium text-foreground"
                >
                  <Icon className="w-3.5 h-3.5 text-muted" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
