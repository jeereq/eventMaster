'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { api } from '@/lib/api';
import {
  Wand2,
  ArrowRight,
  ShieldCheck,
  Heart,
  Users,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import { enabledMarketplaceCities, resolveUsdExchangeRateCdf } from '@/lib/platformCities';
import LandingMedia from '@/components/landing/LandingMedia';
import type { ListingEventTypeId } from '@/lib/listingDetails';
import {
  AI_ALLOWANCE_CHANGED,
  AI_TOKEN_PACK_SIZE,
  addPurchasedAiTokens,
  aiTokenCostLegend,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
} from '@/lib/aiTokens';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import AiTokenBuyButton from '@/components/AiTokenBuyButton';
import AiSimulationCounter, { isAiSimulationThresholdReached } from '@/components/AiSimulationCounter';
import EventPrepAiSimulator, { type EventPrepAiDefaults } from '@/components/EventPrepAiSimulator';
import AiStudioTabList, {
  aiStudioPanelId,
  type AiStudioId,
} from '@/components/AiStudioTabList';

const LANDING_STUDIO_PREFIX = 'landing-ai-studio';

const STUDIO_FULL_PAGE: Record<AiStudioId, { href: string; label: string }> = {
  budget: { href: '/simulateur', label: 'Simulateur budget complet' },
  invite: { href: '/modeles#generateur-ia', label: 'Studio invitation complet' },
  room: { href: '/plans-3d#studio-ia', label: 'Studio plan de salle complet' },
};

function StudioPaneFallback({ label }: { label: string }) {
  return (
    <div
      className="min-h-[16rem] rounded-[var(--radius-card)] bg-surface-muted/40 animate-pulse motion-reduce:animate-none"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

const LandingInvitationAiGenerator = dynamic(
  () => import('@/components/landing/LandingInvitationAiGenerator'),
  {
    ssr: false,
    loading: () => <StudioPaneFallback label="Chargement du studio invitation…" />,
  },
);

const LandingRoomPlanAiStudio = dynamic(
  () => import('@/components/landing/LandingRoomPlanAiStudio'),
  {
    ssr: false,
    loading: () => <StudioPaneFallback label="Chargement du studio plan de salle…" />,
  },
);

function readLandingStudio(): AiStudioId {
  if (typeof window === 'undefined') return 'budget';
  const raw = new URLSearchParams(window.location.search).get('studio');
  if (raw === 'invite' || raw === 'room' || raw === 'budget') return raw;
  return 'budget';
}

type ScenarioBrief = {
  id: string;
  name: string;
  type: string;
  eventType: ListingEventTypeId;
  city: string;
  commune: string;
  guests: number;
  budgetTargetFc: number;
  imageUrl: string;
  prompt: string;
};

const SCENARIOS: ScenarioBrief[] = [
  {
    id: 'mariage-kin',
    name: 'Mariage Élégance · Kinshasa',
    type: 'Mariage & Réception',
    eventType: 'wedding',
    city: 'Kinshasa',
    commune: 'Gombe',
    guests: 150,
    budgetTargetFc: 8_500_000,
    imageUrl: 'https://images.unsplash.com/photo-1664645534653-b4b8b6473cb2?auto=format&fit=crop&w=1000&q=80',
    prompt: 'Mariage élégant pour 150 convives à Gombe, Kinshasa. Ambiance chic, besoin salle, traiteur, photographe, DJ et décoration dans un budget de 8 500 000 FC.',
  },
  {
    id: 'anniversaire-lshi',
    name: 'Anniversaire & Soirée · Lubumbashi',
    type: 'Fête & Anniversaire',
    eventType: 'birthday',
    city: 'Lubumbashi',
    commune: '',
    guests: 80,
    budgetTargetFc: 3_800_000,
    imageUrl: 'https://images.unsplash.com/photo-1661332306744-70f9ed1a7f40?auto=format&fit=crop&w=1000&q=80',
    prompt: 'Anniversaire / soirée pour 80 personnes à Lubumbashi. Ambiance festive, cocktail, DJ et photo, budget 3 800 000 FC.',
  },
  {
    id: 'gala-pro',
    name: 'Gala d’Entreprise · Kinshasa',
    type: 'Conférence & Gala Pro',
    eventType: 'gala',
    city: 'Kinshasa',
    commune: '',
    guests: 250,
    budgetTargetFc: 16_000_000,
    imageUrl: 'https://images.unsplash.com/photo-1573164574511-73c773193279?auto=format&fit=crop&w=1000&q=80',
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

export default function LandingAiSimulationShowcase() {
  const revealRef = useLandingReveal<HTMLElement>();

  const { site } = usePlatformSite();
  const exchangeRate = resolveUsdExchangeRateCdf(site?.usdExchangeRateCdf);
  const marketplaceCities = enabledMarketplaceCities(site);

  const [viewMode, setViewMode] = useState<'presets' | 'live'>('presets');
  const [studio, setStudio] = useState<AiStudioId>('budget');
  const [allowance, setAllowance] = useState<AiAllowance>(createEmptyAiAllowance);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState('mariage-kin');
  const [liveDefaults, setLiveDefaults] = useState<EventPrepAiDefaults | undefined>();
  const [preferDefaults, setPreferDefaults] = useState(false);

  const visibleScenarios = useMemo(() => {
    const filtered = SCENARIOS.filter((item) => marketplaceCities.includes(item.city as 'Kinshasa' | 'Lubumbashi'));
    return filtered.length > 0 ? filtered : SCENARIOS;
  }, [marketplaceCities]);

  useEffect(() => {
    if (!visibleScenarios.some((item) => item.id === selectedScenarioId)) {
      setSelectedScenarioId(visibleScenarios[0].id);
    }
  }, [visibleScenarios, selectedScenarioId]);
  const activeScenario = visibleScenarios.find((item) => item.id === selectedScenarioId) || visibleScenarios[0] || SCENARIOS[0];
  const activeScenarioUsd = Math.round(activeScenario.budgetTargetFc / exchangeRate);
  const fullPage = STUDIO_FULL_PAGE[studio];

  useEffect(() => {
    setStudio(readLandingStudio());
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const aiStatus = params.get('ai_tokens_status') || params.get('ai_tokens');
        const orderId = params.get('orderId');
        if (aiStatus === 'success' || aiStatus === 'paid') {
          const added = parseInt(params.get('tokens') || String(AI_TOKEN_PACK_SIZE), 10) || AI_TOKEN_PACK_SIZE;
          addPurchasedAiTokens(added, orderId);
          const url = new URL(window.location.href);
          url.searchParams.delete('ai_tokens_status');
          url.searchParams.delete('ai_tokens');
          url.searchParams.delete('tokens');
          url.searchParams.delete('orderId');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
        }
      }
    } catch {
      // safe fallback
    }
    setAllowance(getAiSimulationAllowance());
    void syncDeviceAiTokensWithBackend(api).then((synced) => {
      if (synced) setAllowance(synced);
    });
    const onAllowance = () => setAllowance(getAiSimulationAllowance());
    window.addEventListener(AI_ALLOWANCE_CHANGED, onAllowance);
    return () => window.removeEventListener(AI_ALLOWANCE_CHANGED, onAllowance);
  }, []);

  const openLiveWithScenario = (scenario: ScenarioBrief) => {
    setStudio('budget');
    setLiveDefaults(scenarioToDefaults(scenario, exchangeRate));
    setPreferDefaults(true);
    setViewMode('live');
  };

  return (
    <section
      ref={revealRef}
      id="simulateur-ia"
      className="em-reveal em-landing-defer py-8 sm:py-20 border-t border-border bg-gradient-to-b from-surface/90 via-surface-muted/40 to-surface/90 relative overflow-hidden em-landing-section-glow"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] sm:w-[480px] sm:h-[480px] bg-primary/10 rounded-full blur-xl sm:blur-2xl pointer-events-none -z-10" />

      <div className="page-container relative z-10 space-y-10 sm:space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          {isAiSimulationThresholdReached(allowance) ? (
            <div className="max-w-xl mx-auto text-left">
              <AiSimulationCounter
                allowance={allowance}
                onBuy={() => setPurchaseModalOpen(true)}
                compact
              />
            </div>
          ) : null}

          <h2 className="em-landing-heading text-xl sm:text-4xl text-foreground">
            <span className="sm:hidden">
              Budget, invitation, <span className="text-primary">salle</span>
            </span>
            <span className="hidden sm:inline">
              Trois ateliers IA :{' '}
              <span className="text-primary">budget, invitation et plan de salle</span>
            </span>
          </h2>

          <p className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-foreground tabular-nums">
            Taux actuel : 1 $ = {exchangeRate.toLocaleString('fr-FR')} FC
          </p>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Un même portefeuille de jetons. Packs catalogue, carte 9:16, ou plan 2D / 3D à partir d’un brief ou d’une photo.{' '}
            {aiTokenCostLegend()}.
          </p>

          {!allowance.unlimited && !isAiSimulationThresholdReached(allowance) ? (
            <div className="flex justify-center pt-1">
              <AiTokenBuyButton
                variant="secondary"
                onClick={() => setPurchaseModalOpen(true)}
              />
            </div>
          ) : null}

          <AiStudioTabList
            value={studio}
            onChange={setStudio}
            idPrefix={LANDING_STUDIO_PREFIX}
            className="text-left max-w-3xl mx-auto mt-2"
          />
          <p className="pt-1">
            <Link
              href={fullPage.href}
              className="text-xs font-semibold text-primary-solid hover:underline rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {fullPage.label}
            </Link>
          </p>

          {studio === 'budget' ? (
          <div className="flex flex-col sm:inline-flex sm:flex-row sm:items-center w-full sm:w-auto p-1 rounded-[var(--radius-card)] bg-surface border border-border shadow-xs mt-2" role="group" aria-label="Mode de vue simulateur budget">
            <button
              type="button"
              aria-pressed={viewMode === 'presets'}
              onClick={() => setViewMode('presets')}
              className={cn(
                'min-h-11 w-full sm:w-auto px-4 py-2 rounded-[var(--radius-button)] text-sm sm:text-xs font-bold transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                viewMode === 'presets'
                  ? 'bg-primary-solid text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <span className="sm:hidden">Exemples</span>
              <span className="hidden sm:inline">Exemples & projets types</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'live'}
              onClick={() => setViewMode('live')}
              className={cn(
                'min-h-11 w-full sm:w-auto px-4 py-2 rounded-[var(--radius-button)] text-sm sm:text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                viewMode === 'live'
                  ? 'bg-primary-solid text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Wand2 className="w-3.5 h-3.5 text-festive-accent" />
              <span className="sm:hidden">En direct</span>
              <span className="hidden sm:inline">Tester mon événement en direct</span>
              {isAiSimulationThresholdReached(allowance) ? (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold tabular-nums">
                  {allowance.totalRemaining} simulation{allowance.totalRemaining > 1 ? 's' : ''} budget IA
                </span>
              ) : null}
            </button>
          </div>
          ) : null}
        </div>

        {studio === 'budget' ? (
        <div
          role="tabpanel"
          id={aiStudioPanelId(LANDING_STUDIO_PREFIX, 'budget')}
          aria-labelledby={`${LANDING_STUDIO_PREFIX}-budget`}
          className="space-y-6"
        >
        {viewMode === 'presets' && (
          <div className="bg-surface/90 dark:bg-surface border border-primary/25 rounded-[var(--radius-card)] p-5 sm:p-8 shadow-xl shadow-primary/5 space-y-6 max-w-5xl mx-auto animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/80">
              <p className="hidden sm:block text-xs font-bold text-foreground">
                Choisissez un projet type, puis générez de vrais packs catalogue.
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap -mx-1 px-1" role="group" aria-label="Projets types">
                {visibleScenarios.map((scenario) => {
                  const isSelected = scenario.id === selectedScenarioId;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedScenarioId(scenario.id)}
                      className={cn(
                        'min-h-11 px-3.5 py-2 rounded-[var(--radius-button)] text-xs font-semibold transition-all touch-manipulation cursor-pointer whitespace-nowrap shrink-0 sm:shrink inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        isSelected
                          ? 'bg-primary-solid text-primary-foreground shadow-xs shadow-primary/30 ring-2 ring-primary/20'
                          : 'bg-surface-muted border border-border text-muted hover:text-foreground hover:bg-surface',
                      )}
                    >
                      {scenario.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative rounded-[var(--radius-card)] overflow-hidden border border-border shadow-sm">
              <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-stage">
                <LandingMedia
                  src={activeScenario.imageUrl}
                  alt={activeScenario.name}
                  sizes="(max-width: 768px) 100vw, 64rem"
                  className="object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-white">
                  <div>
                    <span className="hidden sm:inline-block text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground mb-1">
                      Projet type
                    </span>
                    <h3 className="text-base sm:text-lg font-bold drop-shadow-sm">{activeScenario.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-festive-on-stage bg-stage/70 px-2.5 py-1 rounded-lg border border-festive-accent/30 backdrop-blur-sm self-start sm:self-auto flex items-baseline gap-1.5">
                    <span>Budget : {activeScenarioUsd.toLocaleString('fr-FR')} $</span>
                    <span className="text-xs text-stage-foreground/80 font-normal">({formatFc(activeScenario.budgetTargetFc)})</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3.5 sm:p-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted flex items-center gap-1 font-medium">
                    <Heart className="w-3.5 h-3.5 text-primary" />
                    <span className="sm:hidden">Type</span>
                    <span className="hidden sm:inline">Type d’événement</span>
                  </span>
                  <p className="font-bold text-foreground truncate">{activeScenario.type}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="sm:hidden">Ville</span>
                    <span className="hidden sm:inline">Ville & Commune</span>
                  </span>
                  <p className="font-bold text-foreground truncate">
                    {activeScenario.commune
                      ? `${activeScenario.city} (${activeScenario.commune})`
                      : activeScenario.city}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="sm:hidden">Invités</span>
                    <span className="hidden sm:inline">Nombre d’invités</span>
                  </span>
                  <p className="font-bold text-foreground">{activeScenario.guests}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted flex items-center gap-1 font-medium">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span className="sm:hidden">Budget</span>
                    <span className="hidden sm:inline">Budget alloué ($ / FC)</span>
                  </span>
                  <p className="font-bold text-primary flex items-baseline gap-1">
                    <span>{activeScenarioUsd.toLocaleString('fr-FR')} $</span>
                    <span className="text-xs font-normal text-muted">({formatFc(activeScenario.budgetTargetFc)})</span>
                  </p>
                </div>
              </div>
            </div>

            <p className="hidden sm:block text-xs text-muted leading-relaxed bg-surface-muted/60 border border-border rounded-[var(--radius-card)] p-3.5">
              {activeScenario.prompt}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80">
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Aucun jeton n’est débité tant que vous n’avez pas cliqué sur Générer.</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  className="shadow-sm shadow-primary/30 sm:w-auto"
                  aria-label="Préremplir et simuler ce projet"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => openLiveWithScenario(activeScenario)}
                >
                  <span className="sm:hidden">Simuler</span>
                  <span className="hidden sm:inline">Préremplir et simuler ce projet</span>
                </Button>
                <Button
                  href={STUDIO_FULL_PAGE.budget.href}
                  variant="secondary"
                  size="md"
                  className="flex-1 sm:flex-none"
                  aria-label="Ouvrir le simulateur budget complet"
                >
                  <span className="sm:hidden">Simulateur</span>
                  <span className="hidden sm:inline">Ouvrir le simulateur complet</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            'bg-surface/90 dark:bg-surface border-2 border-primary/40 rounded-[var(--radius-card)] p-5 sm:p-8 shadow-xl shadow-primary/10 space-y-4 max-w-5xl mx-auto',
            viewMode === 'live' ? 'animate-fade-in' : 'hidden',
          )}
          hidden={viewMode !== 'live'}
          aria-hidden={viewMode !== 'live'}
        >
          <EventPrepAiSimulator
            embedded
            defaultOpen
            preferDefaults={preferDefaults}
            defaults={liveDefaults}
            onAllowanceChange={setAllowance}
          />
        </div>
        </div>
        ) : null}

        {studio === 'invite' ? (
          <div
            role="tabpanel"
            id={aiStudioPanelId(LANDING_STUDIO_PREFIX, 'invite')}
            aria-labelledby={`${LANDING_STUDIO_PREFIX}-invite`}
            className="max-w-5xl mx-auto"
          >
            <LandingInvitationAiGenerator id="landing-studio-invite" defaultExpanded />
          </div>
        ) : null}

        {studio === 'room' ? (
          <div
            role="tabpanel"
            id={aiStudioPanelId(LANDING_STUDIO_PREFIX, 'room')}
            aria-labelledby={`${LANDING_STUDIO_PREFIX}-room`}
            className="max-w-5xl mx-auto"
          >
            <LandingRoomPlanAiStudio id="landing-studio-room" defaultExpanded />
          </div>
        ) : null}
      </div>

      <AiTokenPurchaseModal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={() => {
          void syncDeviceAiTokensWithBackend(api).then((synced) => setAllowance(synced));
        }}
      />
    </section>
  );
}
