'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import PublicPageShell from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Alert, Button } from '@/components/ui';
import { api } from '@/lib/api';
import {
  AI_INVITATION_COMPOSE_TOKEN_COST,
  AI_ROOM_PLAN_TOKEN_COST,
  AI_SIMULATION_TOKEN_COST,
  claimAiTokenCheckoutReturn,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
  AI_ALLOWANCE_CHANGED,
} from '@/lib/aiTokens';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { useAuth } from '@/context/AuthContext';
import { resolveUsdExchangeRateCdf, enabledMarketplaceCities } from '@/lib/platformCities';
import { LISTING_EVENT_TYPES, type ListingEventTypeId } from '@/lib/listingDetails';
import type { EventPrepAiDefaults } from '@/components/EventPrepAiSimulator';
import {
  Store,
  Sparkles,
  Wallet,
  Users,
  Box,
  Clock,
  LayoutGrid,
  QrCode,
  Share2,
  X,
} from 'lucide-react';
import AiSimulationCounter, { isAiSimulationThresholdReached } from '@/components/AiSimulationCounter';
import { cn } from '@/lib/cn';

const EventPrepAiSimulator = dynamic(() => import('@/components/EventPrepAiSimulator'), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[28rem] rounded-[var(--radius-card)] border border-border bg-surface-muted/40 animate-pulse motion-reduce:animate-none flex items-center justify-center p-8 text-center"
      aria-busy="true"
      aria-label="Chargement du simulateur budget IA"
    >
      <div className="space-y-2 max-w-sm">
        <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse motion-reduce:animate-none" />
        <p className="text-sm font-semibold text-foreground">Chargement du simulateur budget IA…</p>
        <p className="text-xs text-muted">Préparation du moteur de calcul des formules catalogue.</p>
      </div>
    </div>
  ),
});

const LandingInvitationAiGenerator = dynamic(
  () => import('@/components/landing/LandingInvitationAiGenerator'),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[28rem] rounded-[var(--radius-card)] border border-border bg-surface-muted/40 animate-pulse motion-reduce:animate-none flex items-center justify-center p-8 text-center"
        aria-busy="true"
        aria-label="Chargement du studio d’invitations IA"
      >
        <div className="space-y-2 max-w-sm">
          <Sparkles className="w-8 h-8 text-festive-accent mx-auto animate-pulse motion-reduce:animate-none" />
          <p className="text-sm font-semibold text-foreground">Chargement du studio d’invitations IA…</p>
          <p className="text-xs text-muted">Préparation du moteur graphique de composition 9:16 WhatsApp.</p>
        </div>
      </div>
    ),
  },
);

const LandingRoomPlanAiStudio = dynamic(
  () => import('@/components/landing/LandingRoomPlanAiStudio'),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[28rem] rounded-[var(--radius-card)] border border-border bg-surface-muted/40 animate-pulse motion-reduce:animate-none flex items-center justify-center p-8 text-center"
        aria-busy="true"
        aria-label="Chargement du studio de plans 3D IA"
      >
        <div className="space-y-2 max-w-sm">
          <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse motion-reduce:animate-none" />
          <p className="text-sm font-semibold text-foreground">Chargement du studio de plans 3D IA…</p>
          <p className="text-xs text-muted">Initialisation de l’environnement spatial et de la visite 3D.</p>
        </div>
      </div>
    ),
  },
);

const AiTokenPurchaseModal = dynamic(
  () => import('@/components/AiTokenPurchaseModal'),
  { ssr: false },
);

export type SimulatorStudioTab = 'budget' | 'invite' | 'room';

const STUDIOS: Array<{
  id: SimulatorStudioTab;
  title: string;
  cost: string;
}> = [
  { id: 'budget', title: 'Budget', cost: `${AI_SIMULATION_TOKEN_COST} jeton${AI_SIMULATION_TOKEN_COST > 1 ? 's' : ''}` },
  { id: 'invite', title: 'Invitation', cost: `dès ${AI_INVITATION_COMPOSE_TOKEN_COST} jetons` },
  { id: 'room', title: 'Plan de salle', cost: `${AI_ROOM_PLAN_TOKEN_COST} jetons` },
];

/** Titre de l’en-tête : il change avec le studio ouvert. */
const STUDIO_HEADINGS: Record<SimulatorStudioTab, { title: string; text: string }> = {
  budget: {
    title: 'Combien coûte votre fête ?',
    text: 'Quelques questions, puis 3 formules chiffrées. Sans compte pour essayer.',
  },
  invite: {
    title: 'Créez votre invitation',
    text: 'Une carte 9:16 prête pour WhatsApp, avec le lien de réponse de chaque invité.',
  },
  room: {
    title: 'Dessinez votre salle',
    text: 'Décrivez la fête ou déposez une photo de la salle. Le plan s’ouvre en 2D et en 3D.',
  },
};

/** Bandeau de fin de page : la suite logique du studio ouvert, pas un message unique pour les trois. */
const STUDIO_NEXT_STEP: Record<SimulatorStudioTab, (isLoggedIn: boolean) => React.ComponentProps<typeof PublicCtaBand>> = {
  budget: (isLoggedIn) => ({
    title: 'Retenez un pack, puis demandez vos devis',
    description: 'Enregistrez vos formules et contactez directement les professionnels.',
    highlights: [
      { icon: Sparkles, label: '3 formules chiffrées en FC & USD' },
      { icon: Store, label: 'Salles, métiers et matériel certifiés' },
      { icon: Wallet, label: 'Jetons rechargeables en Mobile Money' },
    ],
    primaryHref: isLoggedIn ? '/dashboard/catalogue' : '/register?kind=CLIENT&intent=seeker&action=ai_simulator',
    primaryLabel: isLoggedIn ? 'Voir mes packs' : 'Créer un compte client',
    secondaryHref: '/marketplace',
    secondaryLabel: 'Voir le marketplace',
  }),
  invite: (isLoggedIn) => ({
    title: 'Envoyez votre carte et suivez les réponses',
    description: 'Partagez l’invitation par WhatsApp, SMS ou e-mail et voyez qui vient, en direct.',
    highlights: [
      { icon: Share2, label: 'WhatsApp, SMS et e-mail' },
      { icon: Users, label: 'Réponses des invités en direct' },
      { icon: QrCode, label: 'Pass QR à l’entrée' },
    ],
    primaryHref: isLoggedIn ? '/dashboard' : '/register?kind=ORGANIZER&intent=personal&action=template',
    primaryLabel: isLoggedIn ? 'Aller à mon espace' : 'Créer mon compte',
    secondaryHref: '/modeles',
    secondaryLabel: 'Voir les modèles',
  }),
  room: (isLoggedIn) => ({
    title: 'Placez vos invités sur le plan',
    description: 'Retouchez le plan dans l’éditeur, puis attribuez une table à chaque invité.',
    highlights: [
      { icon: LayoutGrid, label: 'Éditeur 2D et visite 3D' },
      { icon: Users, label: 'Placement des invités par table' },
      { icon: Box, label: 'Plans témoins à adapter' },
    ],
    primaryHref: isLoggedIn ? '/dashboard' : '/register?kind=ORGANIZER&intent=personal&action=room_editor',
    primaryLabel: isLoggedIn ? 'Aller à mon espace' : 'Créer mon compte',
    secondaryHref: '/plans-3d',
    secondaryLabel: 'Voir les plans 3D',
  }),
};

type ScenarioBrief = {
  id: string;
  name: string;
  shortName: string;
  type: string;
  eventType: ListingEventTypeId;
  city: string;
  commune: string;
  guests: number;
  budgetTargetFc: number;
  prompt: string;
};

const SCENARIOS: ScenarioBrief[] = [
  {
    id: 'mariage-kin',
    name: 'Mariage Élégance · Kinshasa',
    shortName: 'Mariage Kinshasa (150 pers.)',
    type: 'Mariage & Réception',
    eventType: 'wedding',
    city: 'Kinshasa',
    commune: 'Gombe',
    guests: 150,
    budgetTargetFc: 8_500_000,
    prompt: 'Mariage élégant pour 150 convives à Gombe, Kinshasa. Ambiance chic, besoin salle, traiteur, photographe, DJ et décoration dans un budget de 8 500 000 FC.',
  },
  {
    id: 'anniversaire-lshi',
    name: 'Anniversaire & Soirée · Lubumbashi',
    shortName: 'Anniversaire Lubumbashi (80 pers.)',
    type: 'Fête & Anniversaire',
    eventType: 'birthday',
    city: 'Lubumbashi',
    commune: '',
    guests: 80,
    budgetTargetFc: 3_800_000,
    prompt: 'Anniversaire / soirée pour 80 personnes à Lubumbashi. Ambiance festive, cocktail, DJ et photo, budget 3 800 000 FC.',
  },
  {
    id: 'gala-pro',
    name: 'Gala d’Entreprise · Kinshasa',
    shortName: 'Gala d’Entreprise (250 pers.)',
    type: 'Conférence & Gala Pro',
    eventType: 'gala',
    city: 'Kinshasa',
    commune: '',
    guests: 250,
    budgetTargetFc: 16_000_000,
    prompt: 'Gala d’entreprise pour 250 invités à Kinshasa. Dîner assis, maître de cérémonie, photo/vidéo et scénographie, budget 16 000 000 FC.',
  },
];

function scenarioToDefaults(scenario: ScenarioBrief, rate = 2800): EventPrepAiDefaults {
  return {
    eventType: scenario.eventType,
    city: scenario.city,
    commune: scenario.commune,
    guestCount: scenario.guests,
    budgetMaxUsd: rate > 0 ? Math.round(scenario.budgetTargetFc / rate) : undefined,
    budgetMaxFc: scenario.budgetTargetFc,
    prompt: scenario.prompt,
  };
}

export default function SimulateurPageClient() {
  const { site } = usePlatformSite();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const exchangeRate = resolveUsdExchangeRateCdf(site?.usdExchangeRateCdf);
  const marketplaceCities = enabledMarketplaceCities(site);

  const [activeStudio, setActiveStudio] = useState<SimulatorStudioTab>('budget');
  const [checkoutNotice, setCheckoutNotice] = useState<'success' | 'canceled' | null>(null);
  const [allowance, setAllowance] = useState<AiAllowance>(createEmptyAiAllowance);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [liveDefaults, setLiveDefaults] = useState<EventPrepAiDefaults | undefined>(undefined);
  const [preferDefaults, setPreferDefaults] = useState(false);

  const isBudgetBlocked = site?.studioVisibility?.budget === false;
  const isInviteBlocked = site?.studioVisibility?.invite === false;
  const isRoomBlocked = site?.studioVisibility?.room === false;

  const isStudioBlocked = (tab: SimulatorStudioTab) =>
    tab === 'budget' ? isBudgetBlocked : tab === 'invite' ? isInviteBlocked : isRoomBlocked;

  const isCurrentStudioBlocked = isStudioBlocked(activeStudio);
  const tokensLow = !allowance.unlimited && isAiSimulationThresholdReached(allowance);

  const visibleScenarios = useMemo(() => {
    const filtered = SCENARIOS.filter((item) =>
      marketplaceCities.includes(item.city as 'Kinshasa' | 'Lubumbashi'),
    );
    return filtered.length > 0 ? filtered : SCENARIOS;
  }, [marketplaceCities]);

  useEffect(() => {
    const claim = claimAiTokenCheckoutReturn();
    if (claim === 'success' || claim === 'canceled') setCheckoutNotice(claim);

    setAllowance(getAiSimulationAllowance());
    void syncDeviceAiTokensWithBackend(api).then((synced) => {
      if (synced) setAllowance(synced);
    });

    const onAllowance = () => setAllowance(getAiSimulationAllowance());
    window.addEventListener(AI_ALLOWANCE_CHANGED, onAllowance);
    return () => window.removeEventListener(AI_ALLOWANCE_CHANGED, onAllowance);
  }, []);

  // Détection du paramètre URL initial (?studio=... ou ?tab=... ou ?scenario=...)
  const didInitFromUrl = useRef(false);
  useEffect(() => {
    if (didInitFromUrl.current) return;
    if (typeof window === 'undefined') return;
    didInitFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);

    let nextStudio: SimulatorStudioTab = 'budget';
    const studioParam = params.get('studio') || params.get('tab') || params.get('atelier');
    if (studioParam === 'invite' || studioParam === 'invitations' || studioParam === 'invitation') {
      nextStudio = 'invite';
    } else if (studioParam === 'room' || studioParam === 'plans-3d' || studioParam === 'plan' || studioParam === 'salle') {
      nextStudio = 'room';
    } else if (studioParam === 'budget') {
      nextStudio = 'budget';
    }
    setActiveStudio(nextStudio);

    const paramScenario = params.get('scenario');
    const scenarioMatch = paramScenario ? SCENARIOS.find((s) => s.id === paramScenario) : undefined;
    if (scenarioMatch) {
      setSelectedScenarioId(scenarioMatch.id);
      setLiveDefaults(scenarioToDefaults(scenarioMatch, exchangeRate));
      setPreferDefaults(true);
    } else {
      // Brief prérempli depuis le formulaire de l'accueil (?type=wedding&guests=150&date=2026-12-14).
      const typeParam = params.get('type');
      const guestsParam = Number(params.get('guests'));
      const dateParam = params.get('date');
      const seed: EventPrepAiDefaults = {};
      if (typeParam && LISTING_EVENT_TYPES.some((t) => t.id === typeParam)) seed.eventType = typeParam as ListingEventTypeId;
      if (Number.isFinite(guestsParam) && guestsParam > 0 && guestsParam <= 100000) seed.guestCount = Math.round(guestsParam);
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) seed.eventDate = dateParam;
      if (Object.keys(seed).length > 0) {
        setLiveDefaults(seed);
        setPreferDefaults(true);
      }
    }
  }, [exchangeRate]);

  const handleSwitchStudio = (tab: SimulatorStudioTab) => {
    setActiveStudio(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('studio', tab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: SimulatorStudioTab) => {
    const tabs = STUDIOS.map((studio) => studio.id);
    const currentIndex = tabs.indexOf(currentTab);
    let nextTab: SimulatorStudioTab | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextTab = tabs[(currentIndex + 1) % tabs.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') nextTab = tabs[0];
    else if (e.key === 'End') nextTab = tabs[tabs.length - 1];
    if (!nextTab) return;
    e.preventDefault();
    handleSwitchStudio(nextTab);
    document.getElementById(`studio-tab-${nextTab}`)?.focus();
  };

  const handleSelectScenario = (scenario: ScenarioBrief) => {
    if (scenario.id === selectedScenarioId) {
      handleClearScenario();
      return;
    }
    setSelectedScenarioId(scenario.id);
    setLiveDefaults(scenarioToDefaults(scenario, exchangeRate));
    setPreferDefaults(true);
  };

  const handleClearScenario = () => {
    setSelectedScenarioId(null);
    setLiveDefaults(undefined);
    setPreferDefaults(false);
  };

  /* Exemples prêts à l’emploi : colonne de droite sur ordinateur, bandeau défilant sur mobile. */
  const examplesNode = (
    <section aria-labelledby="scenarios-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="scenarios-heading" className="text-sm font-semibold text-muted">
          Pas d’idée ? Partez d’un exemple
        </h2>
        {selectedScenarioId ? (
          <button
            type="button"
            onClick={handleClearScenario}
            className="min-h-11 px-2 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
            Effacer
          </button>
        ) : null}
      </div>
      <div
        className="flex gap-2 overflow-x-auto -mx-3 px-3 pb-1 sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible scrollbar-none touch-pan-x"
        role="group"
        aria-label="Exemples de projets"
      >
        {visibleScenarios.map((scenario) => {
          const isSelected = scenario.id === selectedScenarioId;
          return (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleSelectScenario(scenario)}
              className={cn(
                'min-w-[16rem] lg:min-w-0 shrink-0 flex items-center justify-between gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-colors cursor-pointer touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'border-primary-solid bg-[#e3f3ec] dark:bg-primary/15'
                  : 'border-border bg-surface hover:border-primary/40',
              )}
            >
              <span className="min-w-0 flex flex-col">
                <b className="text-sm font-semibold text-foreground truncate">{scenario.type}</b>
                <span className="text-[13px] text-muted tabular-nums">
                  {scenario.guests} invités · {scenario.city}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-primary-solid whitespace-nowrap">
                {isSelected ? 'Choisi ✓' : 'Utiliser →'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      {/* ─── EN-TÊTE DES STUDIOS : titre du studio ouvert, solde, onglets en languettes ─── */}
      <section className="bg-[#064e3b] text-white">
        <div className="page-container pt-4 md:pt-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-2xl md:text-[2.125rem] font-semibold leading-tight tracking-[-0.02em]">
                {STUDIO_HEADINGS[activeStudio].title}
              </h1>
              <p className="text-sm md:text-[15px] text-[#d1fae5]">{STUDIO_HEADINGS[activeStudio].text}</p>
            </div>

            {!allowance.unlimited ? (
              /* Un seul endroit pour le solde et la recharge, commun aux trois studios. */
              <button
                type="button"
                onClick={() => setPurchaseModalOpen(true)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-2.5 min-h-11 pl-3.5 pr-1.5 py-1.5 rounded-full bg-[#0b5e48] text-sm text-white tabular-nums transition touch-manipulation',
                  'hover:bg-[#0f6b52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus-visible:ring-offset-2 focus-visible:ring-offset-[#064e3b]',
                  tokensLow && 'ring-1 ring-[#fbbf24]/70',
                )}
                aria-label={`${allowance.totalRemaining} jeton${allowance.totalRemaining > 1 ? 's' : ''} IA restant${allowance.totalRemaining > 1 ? 's' : ''}. Recharger`}
              >
                <span>
                  <b className="font-semibold">{allowance.totalRemaining}</b> jeton{allowance.totalRemaining > 1 ? 's' : ''}
                </span>
                <span className="rounded-full bg-[#fbbf24] px-3 py-1.5 font-semibold text-[#171614]">Recharger</span>
              </button>
            ) : null}
          </div>

          {/* ─── CHOIX DU STUDIO ─── */}
          <div
            role="tablist"
            aria-label="Choix du studio"
            className="mt-4 md:mt-6 flex gap-1"
          >
            {STUDIOS.map((studio) => {
              const selected = activeStudio === studio.id;
              const blocked = isStudioBlocked(studio.id);
              return (
                <button
                  key={studio.id}
                  type="button"
                  role="tab"
                  id={`studio-tab-${studio.id}`}
                  aria-controls={`studio-panel-${studio.id}`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => handleSwitchStudio(studio.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, studio.id)}
                  className={cn(
                    'flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 min-h-12 px-2 sm:px-5 rounded-t-xl font-semibold text-sm sm:text-[15px] transition-colors cursor-pointer touch-manipulation',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#fbbf24]',
                    selected ? 'bg-background text-foreground' : 'text-[#d1fae5] hover:bg-white/10 hover:text-white',
                  )}
                >
                  {studio.title}
                  <span
                    className={cn(
                      'hidden sm:inline text-xs font-medium tabular-nums',
                      blocked
                        ? (selected ? 'text-amber-700 dark:text-amber-300' : 'text-[#fcd34d]')
                        : (selected ? 'text-primary-solid' : 'text-[#a7f3d0]'),
                    )}
                  >
                    {blocked ? 'Bientôt' : studio.cost}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="page-container pt-5 sm:pt-7 pb-8 sm:pb-12 space-y-5">
        {/* Messages d'achat de jetons */}
        {checkoutNotice === 'success' ? (
          <Alert variant="success">Jetons IA crédités. Vous pouvez lancer votre simulation.</Alert>
        ) : null}
        {checkoutNotice === 'canceled' ? (
          <Alert variant="warning">Paiement annulé — aucun jeton n’a été débité.</Alert>
        ) : null}

        {!isCurrentStudioBlocked && activeStudio !== 'budget' && isAiSimulationThresholdReached(allowance) ? (
          <div className="max-w-xl">
            <AiSimulationCounter
              allowance={allowance}
              onBuy={() => setPurchaseModalOpen(true)}
            />
          </div>
        ) : null}

        {/* ─── STUDIO BUDGET ─── */}
        {activeStudio === 'budget' && (
          <div
            id="studio-panel-budget"
            role="tabpanel"
            aria-labelledby="studio-tab-budget"
            className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none"
          >
            {isBudgetBlocked ? (
              <ComingSoonPanel
                title="Le simulateur de budget arrive bientôt"
                text="En attendant, parcourez les salles et prestataires du catalogue."
                actions={(
                  <Button href="/marketplace" variant="primary" size="sm" className="min-h-11">
                    Explorer le catalogue
                  </Button>
                )}
              />
            ) : (
              <>
                <section
                  id="simulateur"
                  aria-label="Simulateur de budget"
                  className="scroll-mt-24"
                >
                  <EventPrepAiSimulator
                    embedded
                    defaultOpen
                    defaults={liveDefaults}
                    preferDefaults={preferDefaults}
                    examples={examplesNode}
                  />
                </section>
              </>
            )}
          </div>
        )}

        {/* ─── STUDIO INVITATIONS ─── */}
        {activeStudio === 'invite' && (
          <div
            id="studio-panel-invite"
            role="tabpanel"
            aria-labelledby="studio-tab-invite"
            className="animate-in fade-in duration-200 motion-reduce:animate-none"
          >
            {isInviteBlocked ? (
              <ComingSoonPanel
                title="Le studio d’invitations arrive bientôt"
                text="En attendant, choisissez parmi nos modèles prêts à l’emploi."
                actions={(
                  <>
                    <Button href="/modeles" variant="primary" size="sm" className="min-h-11">
                      Voir les modèles
                    </Button>
                    <Button href="/marketplace" variant="secondary" size="sm" className="min-h-11">
                      Voir les prestataires
                    </Button>
                  </>
                )}
              />
            ) : (
              <LandingInvitationAiGenerator lockExpanded inline />
            )}
          </div>
        )}

        {/* ─── STUDIO PLANS 2D / 3D ─── */}
        {activeStudio === 'room' && (
          <div
            id="studio-panel-room"
            role="tabpanel"
            aria-labelledby="studio-tab-room"
            className="animate-in fade-in duration-200 motion-reduce:animate-none"
          >
            {isRoomBlocked ? (
              <ComingSoonPanel
                title="Le studio de plans arrive bientôt"
                text="En attendant, explorez les plans témoins ou ouvrez l’éditeur manuel."
                actions={(
                  <>
                    <Button href="/plans-3d" variant="primary" size="sm" className="min-h-11">
                      Voir les plans 3D
                    </Button>
                    <Button href="/dashboard/rooms" variant="secondary" size="sm" className="min-h-11">
                      Ouvrir l’éditeur
                    </Button>
                  </>
                )}
              />
            ) : (
              <LandingRoomPlanAiStudio lockExpanded inline />
            )}
          </div>
        )}
      </div>

      <PublicCtaBand {...STUDIO_NEXT_STEP[activeStudio](isLoggedIn)} />

      {purchaseModalOpen ? (
        <AiTokenPurchaseModal
          open={purchaseModalOpen}
          onClose={() => setPurchaseModalOpen(false)}
          onSuccess={() => {
            setPurchaseModalOpen(false);
            setAllowance(getAiSimulationAllowance());
          }}
        />
      ) : null}
    </PublicPageShell>
  );
}

/** Studio masqué par l’administration : message court et pistes pour continuer. */
function ComingSoonPanel({
  title,
  text,
  actions,
}: {
  title: string;
  text: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-surface p-6 sm:p-10 text-center space-y-4">
      <span className="w-12 h-12 rounded-2xl bg-[#d1fae5] text-primary-solid dark:bg-primary/15 inline-flex items-center justify-center">
        <Clock className="w-6 h-6" aria-hidden />
      </span>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted">{text}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2.5">{actions}</div>
    </div>
  );
}
