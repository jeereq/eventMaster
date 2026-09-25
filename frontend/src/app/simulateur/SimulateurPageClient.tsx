'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import PublicPageShell from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Alert, Button } from '@/components/ui';
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
  Users,
  MapPin,
  Mail,
  Box,
  Clock,
  X,
  type LucideIcon,
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

const STUDIOS: Array<{
  id: SimulatorStudioTab;
  icon: LucideIcon;
  title: string;
  shortTitle: string;
  text: string;
}> = [
  { id: 'budget', icon: Wallet, title: 'Budget', shortTitle: 'Budget', text: '3 formules chiffrées en 1 clic' },
  { id: 'invite', icon: Mail, title: 'Invitation', shortTitle: 'Invitation', text: 'Carte 9:16 prête pour WhatsApp' },
  { id: 'room', icon: Box, title: 'Plan de salle', shortTitle: 'Plan 3D', text: 'Tables et décor en 2D / 3D' },
];

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

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <section className="relative em-landing-hero">
        <div className="page-container relative z-10 pt-5 pb-4 md:pt-10 md:pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-bold tracking-[0.08em] uppercase text-primary-solid">Studios IA</p>
              <h1 className="em-landing-heading text-2xl md:text-3xl lg:text-[2.5rem] text-foreground">
                Préparez votre fête, étape par étape
              </h1>
              <p className="text-sm md:text-base text-muted">
                Estimez le budget, créez l’invitation, dessinez la salle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-xs font-semibold text-foreground tabular-nums">
                <span className="w-2 h-2 rounded-full bg-brand-accent" aria-hidden />
                1 $ = {exchangeRate.toLocaleString('fr-FR')} FC
              </span>
              {!allowance.unlimited ? (
                <>
                  {/* Le studio budget affiche déjà son propre bouton d’achat. */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary-solid tabular-nums">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden />
                    {allowance.totalRemaining} jeton{allowance.totalRemaining > 1 ? 's' : ''} IA
                  </span>
                  {activeStudio !== 'budget' || isBudgetBlocked ? (
                    <AiTokenBuyButton
                      compact
                      variant="secondary"
                      onClick={() => setPurchaseModalOpen(true)}
                      className="text-xs min-h-11 py-2 px-3.5"
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          {/* ─── CHOIX DU STUDIO ─── */}
          <div
            role="tablist"
            aria-label="Choix du studio"
            className="mt-5 md:mt-7 grid grid-cols-3 gap-2 sm:gap-3"
          >
            {STUDIOS.map((studio) => {
              const Icon = studio.icon;
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
                    'group relative overflow-hidden text-left rounded-[var(--radius-card)] border transition-colors cursor-pointer touch-manipulation',
                    'p-3 sm:p-4 min-h-11 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    selected
                      ? 'bg-[#064e3b] border-[#064e3b] text-white shadow-[0_12px_32px_-18px_rgba(2,44,34,0.8)]'
                      : 'bg-surface border-border text-foreground hover:border-primary/40 hover:bg-card-hover',
                  )}
                >
                  {selected ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-[2rem] border-[1.25rem] border-[#065f46]"
                    />
                  ) : null}
                  <span
                    className={cn(
                      'relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl inline-flex items-center justify-center shrink-0',
                      selected ? 'bg-white/10 text-[#6ee7b7]' : 'bg-[#d1fae5] text-primary-solid dark:bg-primary/15',
                    )}
                  >
                    <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" aria-hidden />
                  </span>
                  <span className="relative min-w-0">
                    <span className="font-display block text-sm sm:text-lg font-semibold leading-tight">
                      <span className="sm:hidden">{studio.shortTitle}</span>
                      <span className="hidden sm:inline">{studio.title}</span>
                    </span>
                    <span
                      className={cn(
                        'hidden sm:block text-xs mt-0.5 truncate',
                        selected ? 'text-[#d1fae5]' : 'text-muted',
                      )}
                    >
                      {blocked ? 'Bientôt disponible' : studio.text}
                    </span>
                    {blocked ? (
                      <span
                        className={cn(
                          'sm:hidden mt-1 inline-flex items-center gap-1 text-[11px] font-semibold',
                          selected ? 'text-[#fcd34d]' : 'text-amber-700 dark:text-amber-300',
                        )}
                      >
                        <Clock className="w-3 h-3" aria-hidden />
                        À venir
                      </span>
                    ) : null}
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
                <section aria-labelledby="scenarios-heading" className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="scenarios-heading" className="font-display text-sm sm:text-base font-semibold text-foreground">
                      Partir d’un exemple
                      <span className="ml-2 text-xs font-normal text-muted">ou remplissez le brief librement</span>
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
                    className="flex gap-2.5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible scrollbar-none touch-pan-x"
                    role="group"
                    aria-label="Exemples de projets"
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
                          className={cn(
                            'min-w-[15rem] sm:min-w-0 shrink-0 p-3.5 rounded-[var(--radius-card)] border text-left transition-colors cursor-pointer touch-manipulation',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            isSelected
                              ? 'border-primary-solid bg-primary/10 ring-1 ring-primary/30'
                              : 'border-border bg-surface hover:border-primary/40 hover:bg-card-hover',
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground truncate">{scenario.type}</span>
                            <span
                              aria-hidden
                              className={cn(
                                'w-4 h-4 rounded-full border-2 shrink-0',
                                isSelected ? 'border-primary-solid bg-primary-solid shadow-[inset_0_0_0_2px_var(--surface)]' : 'border-border',
                              )}
                            />
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" aria-hidden />
                              {scenario.guests} invités
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" aria-hidden />
                              {scenario.city}
                            </span>
                          </span>
                          <span className="mt-2 flex items-baseline justify-between gap-2 text-xs">
                            <span className="font-display text-sm font-semibold text-foreground tabular-nums">
                              {formatFc(scenario.budgetTargetFc)}
                            </span>
                            <span className="text-muted tabular-nums">≈ {usdEst.toLocaleString('fr-FR')} $</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section
                  id="simulateur"
                  aria-label="Simulateur de budget"
                  className="scroll-mt-24 sm:rounded-[1.25rem] sm:border sm:border-border sm:bg-surface sm:p-6"
                >
                  <EventPrepAiSimulator
                    embedded
                    defaultOpen
                    defaults={liveDefaults}
                    preferDefaults={preferDefaults}
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
