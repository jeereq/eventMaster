'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Alert, Button, Modal } from '@/components/ui';
import { api } from '@/lib/api';
import {
  claimAiTokenCheckoutReturn,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
  AI_ALLOWANCE_CHANGED,
} from '@/lib/aiTokens';
import { formatFc } from '@/config/landingPricing';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { resolveUsdExchangeRateCdf, enabledMarketplaceCities } from '@/lib/platformCities';
import type { ListingEventTypeId } from '@/lib/listingDetails';
import type { EventPrepAiDefaults } from '@/components/EventPrepAiSimulator';
import {
  Store,
  Sparkles,
  Wallet,
  Wand2,
  Users,
  MapPin,
  LayoutGrid,
  CheckCircle2,
  Mail,
  Building2,
  Clock,
} from 'lucide-react';
import AiSimulationCounter, { isAiSimulationThresholdReached } from '@/components/AiSimulationCounter';
import AiTokenBuyButton from '@/components/AiTokenBuyButton';
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
  const exchangeRate = resolveUsdExchangeRateCdf(site?.usdExchangeRateCdf);
  const marketplaceCities = enabledMarketplaceCities(site);

  const [activeStudio, setActiveStudio] = useState<SimulatorStudioTab>('budget');
  const [studioModalOpen, setStudioModalOpen] = useState(false);
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
    if (paramScenario) {
      const match = SCENARIOS.find((s) => s.id === paramScenario);
      if (match) {
        setSelectedScenarioId(match.id);
        setLiveDefaults(scenarioToDefaults(match, exchangeRate));
        setPreferDefaults(true);
      }
    }

    if (studioParam || paramScenario) setStudioModalOpen(true);
  }, [exchangeRate]);

  const handleSwitchStudio = (tab: SimulatorStudioTab) => {
    setActiveStudio(tab);
    if (!isStudioBlocked(tab)) setStudioModalOpen(true);
    else setStudioModalOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('studio', tab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const openActiveStudioModal = () => {
    if (!isCurrentStudioBlocked) setStudioModalOpen(true);
  };

  const closeStudioModal = () => setStudioModalOpen(false);

  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: SimulatorStudioTab) => {
    const tabs: SimulatorStudioTab[] = ['budget', 'invite', 'room'];
    const currentIndex = tabs.indexOf(currentTab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextTab = tabs[(currentIndex + 1) % tabs.length];
      handleSwitchStudio(nextTab);
      document.getElementById(`studio-tab-${nextTab}`)?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      handleSwitchStudio(prevTab);
      document.getElementById(`studio-tab-${prevTab}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleSwitchStudio(tabs[0]);
      document.getElementById(`studio-tab-${tabs[0]}`)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      handleSwitchStudio(tabs[tabs.length - 1]);
      document.getElementById(`studio-tab-${tabs[tabs.length - 1]}`)?.focus();
    }
  };

  const handleSelectScenario = (scenario: ScenarioBrief) => {
    setSelectedScenarioId(scenario.id);
    setLiveDefaults(scenarioToDefaults(scenario, exchangeRate));
    setPreferDefaults(true);
    if (!isBudgetBlocked) setStudioModalOpen(true);
  };

  const handleClearScenario = () => {
    setSelectedScenarioId(null);
    setLiveDefaults(undefined);
    setPreferDefaults(false);
  };

  const activeScenario = visibleScenarios.find((s) => s.id === selectedScenarioId);

  const heroInfo = useMemo(() => {
    if (activeStudio === 'invite') {
      return {
        title: 'Studio d’Invitations & Faire-part IA',
        description: isInviteBlocked
          ? 'Fonctionnalité à venir : composition graphique 9:16 WhatsApp avec RSVP instantané.'
          : 'Créez vos faire-part 9:16 WhatsApp personnalisés avec confirmation de présence en direct.',
      };
    }
    if (activeStudio === 'room') {
      return {
        title: 'Studio Plans de Salle 2D & Visite 3D',
        description: isRoomBlocked
          ? 'Fonctionnalité à venir : aménagement spatial de salle et visite 3D interactive.'
          : 'Disposition des tables, cotation au millimètre et visite 3D interactive de votre réception.',
      };
    }
    return {
      title: 'Simulateur de Budget & Formules IA',
      description: isBudgetBlocked
        ? 'Fonctionnalité à venir : 3 formules chiffrées selon votre budget.'
        : '3 formules clés en main (Éco, Équilibré, Confort) en 1 clic.',
    };
  }, [activeStudio, isBudgetBlocked, isInviteBlocked, isRoomBlocked]);

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <PublicPageHero
        title={heroInfo.title}
        description={heroInfo.description}
        compact
      >
        <div className="pt-2 flex flex-wrap items-center gap-2">
          {/* Badge taux du jour */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-xs font-semibold text-foreground tabular-nums shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
            Taux du jour : 1 $ = {exchangeRate.toLocaleString('fr-FR')} FC
          </span>

          {isCurrentStudioBlocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              Fonctionnalité à venir
            </span>
          ) : (
            <>
              {/* Compteur jetons / simulations */}
              {!allowance.unlimited && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tabular-nums">
                  <Sparkles className="w-3.5 h-3.5" />
                  {allowance.totalRemaining} simulation{allowance.totalRemaining > 1 ? 's' : ''} disponible{allowance.totalRemaining > 1 ? 's' : ''}
                </span>
              )}

              {!allowance.unlimited && (
                <AiTokenBuyButton
                  variant="secondary"
                  onClick={() => setPurchaseModalOpen(true)}
                  className="text-xs min-h-11 py-2 px-3.5"
                />
              )}
            </>
          )}
        </div>
      </PublicPageHero>

      <div className="page-container py-6 sm:py-10 space-y-8">
        {/* Messages d'achat de jetons */}
        {checkoutNotice === 'success' ? (
          <Alert variant="success">Jetons IA crédités. Vous pouvez lancer votre simulation.</Alert>
        ) : null}
        {checkoutNotice === 'canceled' ? (
          <Alert variant="warning">Paiement annulé — aucun jeton n’a été débité.</Alert>
        ) : null}

        {!isCurrentStudioBlocked && isAiSimulationThresholdReached(allowance) ? (
          <div className="max-w-xl mx-auto">
            <AiSimulationCounter
              allowance={allowance}
              onBuy={() => setPurchaseModalOpen(true)}
            />
          </div>
        ) : null}

        {/* ─── SÉLECTEUR DES 3 ATELIERS ─── */}
        <section aria-label="Ateliers créatifs de simulation" className="space-y-3">
          <div
            role="tablist"
            aria-label="Choix de l'atelier de simulation"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          >
            {/* Atelier 1: Budget */}
            <button
              type="button"
              role="tab"
              id="studio-tab-budget"
              aria-controls="studio-panel-budget"
              aria-selected={activeStudio === 'budget'}
              onClick={() => handleSwitchStudio('budget')}
              onKeyDown={(e) => handleTabKeyDown(e, 'budget')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                activeStudio === 'budget'
                  ? 'border-2 border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                  : 'border-border bg-surface hover:bg-surface-muted hover:border-primary/40'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Wand2 className="w-4 h-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">Simulateur Budget</p>
                  <p className="text-xs text-muted truncate">
                    {isBudgetBlocked ? 'Bientôt disponible' : '3 formules catalogue'}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
                  isBudgetBlocked
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                )}
              >
                {isBudgetBlocked ? (
                  <>
                    <Clock className="w-3 h-3" aria-hidden />
                    À venir
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" aria-hidden />
                    Actif
                  </>
                )}
              </span>
            </button>

            {/* Atelier 2: Invitations */}
            <button
              type="button"
              role="tab"
              id="studio-tab-invite"
              aria-controls="studio-panel-invite"
              aria-selected={activeStudio === 'invite'}
              onClick={() => handleSwitchStudio('invite')}
              onKeyDown={(e) => handleTabKeyDown(e, 'invite')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-festive-accent',
                activeStudio === 'invite'
                  ? 'border-2 border-festive-accent bg-festive-accent/10 shadow-sm ring-1 ring-festive-accent/30'
                  : 'border-border bg-surface hover:bg-surface-muted hover:border-festive-accent/40'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-festive-accent/10 text-festive-accent dark:text-festive-accent flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">Studio Invitations</p>
                  <p className="text-xs text-muted truncate">
                    {isInviteBlocked ? 'Bientôt disponible' : 'Faire-part 9:16 WhatsApp'}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
                  isInviteBlocked
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                )}
              >
                {isInviteBlocked ? (
                  <>
                    <Clock className="w-3 h-3" aria-hidden />
                    À venir
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" aria-hidden />
                    Actif
                  </>
                )}
              </span>
            </button>

            {/* Atelier 3: Plans 2D / 3D */}
            <button
              type="button"
              role="tab"
              id="studio-tab-room"
              aria-controls="studio-panel-room"
              aria-selected={activeStudio === 'room'}
              onClick={() => handleSwitchStudio('room')}
              onKeyDown={(e) => handleTabKeyDown(e, 'room')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                activeStudio === 'room'
                  ? 'border-2 border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                  : 'border-border bg-surface hover:bg-surface-muted hover:border-primary/40'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:text-primary flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">Studio Plans 3D</p>
                  <p className="text-xs text-muted truncate">
                    {isRoomBlocked ? 'Bientôt disponible' : 'Visite & tables 3D'}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
                  isRoomBlocked
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                )}
              >
                {isRoomBlocked ? (
                  <>
                    <Clock className="w-3 h-3" aria-hidden />
                    À venir
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" aria-hidden />
                    Actif
                  </>
                )}
              </span>
            </button>
          </div>
        </section>

        {/* ─── CONTENU ATELIER 1 : BUDGET ─── */}
        {activeStudio === 'budget' && (
          <div
            id="studio-panel-budget"
            role="tabpanel"
            aria-labelledby="studio-tab-budget"
            tabIndex={0}
            className="space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-2xl"
          >
            {/* Barre de sélection rapide de scénarios types */}
            <section aria-labelledby="scenarios-heading" className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 id="scenarios-heading" className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <span>{isBudgetBlocked ? 'Aperçu des futurs projets types' : 'Projets types prêts à l’emploi'}</span>
                    {isBudgetBlocked && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        À venir
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-muted">
                    {isBudgetBlocked
                      ? 'Exemples chiffrés dès l’activation du simulateur.'
                      : 'Chargez un exemple type en 1 clic.'}
                  </p>
                </div>

                {selectedScenarioId && (
                  <button
                    type="button"
                    onClick={handleClearScenario}
                    className="text-xs text-muted hover:text-foreground underline underline-offset-2 self-start sm:self-auto touch-manipulation cursor-pointer min-h-11 inline-flex items-center px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Simulation libre
                  </button>
                )}
              </div>

              <div
                className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5 sm:grid sm:grid-cols-3 sm:overflow-visible scrollbar-none touch-pan-x"
                role="group"
                aria-label="Sélection de projet type"
              >
                {visibleScenarios.map((scenario) => {
                  const isSelected = scenario.id === selectedScenarioId;
                  const usdEst = Math.round(scenario.budgetTargetFc / exchangeRate);

                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectScenario(scenario)}
                      className={`min-w-[260px] sm:min-w-0 p-3.5 rounded-[var(--radius-card)] border text-left transition-all duration-200 cursor-pointer touch-manipulation flex flex-col justify-between shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected
                          ? 'border-primary-solid bg-primary/10 shadow-sm ring-1 ring-primary/30'
                          : 'border-border bg-surface hover:bg-surface-muted hover:border-primary/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground truncate">{scenario.name}</span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-primary-solid shrink-0" aria-hidden />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3 text-primary" />
                            {scenario.guests} invités
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            {scenario.city}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2.5 mt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground tabular-nums">
                          {formatFc(scenario.budgetTargetFc)}
                        </span>
                        <span className="text-muted tabular-nums">≈ {usdEst} $</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeScenario && (
                <div className="p-3 rounded-xl bg-surface-muted/70 border border-border text-xs text-muted flex items-start gap-2 animate-fade-in motion-reduce:animate-none">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Scénario actif : </span>
                    {activeScenario.prompt}
                  </div>
                </div>
              )}
            </section>

            {/* Zone interactive du simulateur */}
            <section id="simulateur" className="scroll-mt-24 space-y-4">
              {isBudgetBlocked && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-foreground">
                        Simulateur de budget · Fonctionnalité à venir
                      </p>
                      <p className="text-xs text-muted">
                        L&apos;estimation IA est temporairement désactivée. Explorez nos espaces et prestataires certifiés.
                      </p>
                    </div>
                  </div>
                  <Button href="/marketplace" size="sm" variant="primary" className="shrink-0 min-h-11">
                    Explorer le catalogue
                  </Button>
                </div>
              )}

              {!isBudgetBlocked && !studioModalOpen ? (
                <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Simulation libre</p>
                    <p className="text-xs text-muted leading-relaxed">
                      Ou ouvrez l’atelier sans projet type pour saisir votre brief.
                    </p>
                  </div>
                  <Button type="button" size="sm" onClick={openActiveStudioModal} className="shrink-0 min-h-11">
                    Ouvrir le simulateur
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        )}

        {/* ─── CONTENU ATELIER 2 : INVITATIONS ─── */}
        {activeStudio === 'invite' && (
          <section
            id="studio-panel-invite"
            role="tabpanel"
            aria-labelledby="studio-tab-invite"
            tabIndex={0}
            className="space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-festive-accent/40 rounded-2xl"
          >
            {isInviteBlocked ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 sm:p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Studio Invitations IA · Fonctionnalité à venir
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    La génération automatique d&apos;invitations IA est temporairement désactivée par l&apos;administration. Vous pouvez explorer notre catalogue de modèles prêts à l&apos;emploi.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button href="/modeles" variant="primary" size="sm" className="min-h-11">
                    Consulter les modèles existants
                  </Button>
                  <Button href="/marketplace" variant="secondary" size="sm" className="min-h-11">
                    Voir les prestataires
                  </Button>
                </div>
              </div>
            ) : studioModalOpen ? (
              <p className="text-sm text-muted text-center py-8" role="status">
                Le studio invitations est ouvert dans la fenêtre.
              </p>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                    <Mail className="w-4 h-4 text-festive-accent" aria-hidden />
                    Studio Invitations
                  </p>
                  <p className="text-xs text-muted leading-relaxed">
                    Composez une carte 9:16 WhatsApp à partir d’un brief ou d’une photo.
                  </p>
                </div>
                <Button type="button" size="sm" onClick={openActiveStudioModal} className="shrink-0 min-h-11">
                  Réouvrir le studio
                </Button>
              </div>
            )}
          </section>
        )}

        {/* ─── CONTENU ATELIER 3 : PLANS 2D / 3D ─── */}
        {activeStudio === 'room' && (
          <section
            id="studio-panel-room"
            role="tabpanel"
            aria-labelledby="studio-tab-room"
            tabIndex={0}
            className="space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-2xl"
          >
            {isRoomBlocked ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 sm:p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Studio Plans 2D / 3D IA · Fonctionnalité à venir
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    La composition automatique de plans de salle par IA est temporairement désactivée par l&apos;administration. Vous pouvez explorer les plans témoins ou ouvrir l&apos;éditeur manuel.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button href="/plans-3d" variant="primary" size="sm" className="min-h-11">
                    Explorer les plans témoins 3D
                  </Button>
                  <Button href="/dashboard/rooms" variant="secondary" size="sm" className="min-h-11">
                    Ouvrir l&apos;éditeur de salle
                  </Button>
                </div>
              </div>
            ) : studioModalOpen ? (
              <p className="text-sm text-muted text-center py-8" role="status">
                Le studio plans est ouvert dans la fenêtre.
              </p>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary" aria-hidden />
                    Studio Plans 2D / 3D
                  </p>
                  <p className="text-xs text-muted leading-relaxed">
                    Brief ou photo → tables et décor sur le plan interactif.
                  </p>
                </div>
                <Button type="button" size="sm" onClick={openActiveStudioModal} className="shrink-0 min-h-11">
                  Réouvrir le studio
                </Button>
              </div>
            )}
          </section>
        )}

        <Modal
          open={studioModalOpen && !isCurrentStudioBlocked}
          onClose={closeStudioModal}
          title={
            activeStudio === 'invite'
              ? 'Créer une invitation'
              : activeStudio === 'room'
                ? 'Composer un plan de salle'
                : 'Simuler mon budget'
          }
          size="full"
          contentClassName="p-0 sm:p-0"
        >
          {activeStudio === 'budget' ? (
            <div className="p-4 sm:p-6">
              <EventPrepAiSimulator
                embedded
                defaultOpen
                defaults={liveDefaults}
                preferDefaults={preferDefaults}
              />
            </div>
          ) : null}
          {activeStudio === 'invite' ? (
            <LandingInvitationAiGenerator
              lockExpanded
              className="border-0 shadow-none rounded-none"
            />
          ) : null}
          {activeStudio === 'room' ? (
            <LandingRoomPlanAiStudio
              lockExpanded
              className="border-0 shadow-none rounded-none"
            />
          ) : null}
        </Modal>
      </div>

      <PublicCtaBand
        title="Retenez un pack, puis demandez vos devis"
        description="Enregistrez vos formules et contactez directement les professionnels."
        highlights={[
          { icon: Sparkles, label: '3 formules chiffrées en FC & USD' },
          { icon: Store, label: 'Salles, métiers et matériel certifiés' },
          { icon: Wallet, label: 'Jetons rechargeables en Mobile Money' },
        ]}
        primaryHref="/register?kind=CLIENT&intent=seeker&action=ai_simulator"
        primaryLabel="Créer un compte client"
        secondaryHref="/marketplace"
        secondaryLabel="Voir le marketplace"
      />

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
