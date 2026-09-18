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
  Clock,
  Sparkles,
  Mail,
  LayoutGrid,
} from 'lucide-react';
import { Button, Alert } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import { enabledMarketplaceCities, resolveUsdExchangeRateCdf } from '@/lib/platformCities';
import LandingMedia from '@/components/landing/LandingMedia';
import type { ListingEventTypeId } from '@/lib/listingDetails';
import {
  AI_ALLOWANCE_CHANGED,
  aiTokenCostLegend,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  syncDeviceAiTokensWithBackend,
  claimAiTokenCheckoutReturn,
  type AiAllowance,
} from '@/lib/aiTokens';
import { revealAndScrollToSection } from '@/lib/aiFabPlacement';
import AiTokenBuyButton from '@/components/AiTokenBuyButton';
import AiSimulationCounter, { isAiSimulationThresholdReached } from '@/components/AiSimulationCounter';
import AiStudioTabList, {
  AI_STUDIO_TABS,
  aiStudioPanelId,
  type AiStudioId,
} from '@/components/AiStudioTabList';

const LANDING_STUDIO_PREFIX = 'landing-ai-studio';

const STUDIO_FULL_PAGE: Record<AiStudioId, { href: string; label: string; action: string }> = {
  budget: {
    href: '/simulateur?studio=budget',
    label: 'Simulateur de budget',
    action: 'Simuler mon budget',
  },
  invite: {
    href: '/modeles#generateur-ia',
    label: 'Studio invitations',
    action: 'Créer une invitation',
  },
  room: {
    href: '/plans-3d#studio-ia',
    label: 'Studio plans 3D',
    action: 'Composer un plan',
  },
};

const AiTokenPurchaseModal = dynamic(
  () => import('@/components/AiTokenPurchaseModal'),
  { ssr: false },
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

export default function LandingAiSimulationShowcase() {
  const revealRef = useLandingReveal<HTMLElement>();

  const { site } = usePlatformSite();
  const exchangeRate = resolveUsdExchangeRateCdf(site?.usdExchangeRateCdf);
  const marketplaceCities = enabledMarketplaceCities(site);

  const [studio, setStudio] = useState<AiStudioId>('budget');
  const [allowance, setAllowance] = useState<AiAllowance>(createEmptyAiAllowance);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState('mariage-kin');
  const [checkoutNotice, setCheckoutNotice] = useState<'success' | 'canceled' | null>(null);

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

  const visibility = site?.studioVisibility ?? { budget: true, invite: true, room: true };
  const visibleStudioTabs = useMemo(() => {
    return AI_STUDIO_TABS.filter((t) => {
      if (t.id === 'budget' && !visibility.budget) return false;
      if (t.id === 'invite' && !visibility.invite) return false;
      if (t.id === 'room' && !visibility.room) return false;
      return true;
    });
  }, [visibility]);

  useEffect(() => {
    if (visibleStudioTabs.length > 0 && !visibleStudioTabs.some((t) => t.id === studio)) {
      setStudio(visibleStudioTabs[0].id);
    }
  }, [visibleStudioTabs, studio]);

  const fullPage = STUDIO_FULL_PAGE[studio] || STUDIO_FULL_PAGE[visibleStudioTabs[0]?.id || 'budget'] || STUDIO_FULL_PAGE.budget;

  const dynamicHeading = useMemo(() => {
    const hasB = visibility.budget;
    const hasI = visibility.invite;
    const hasR = visibility.room;
    if (hasB && hasI && hasR) {
      return {
        mobile: <>Budget, invitation, <span className="text-primary">salle</span></>,
        desktop: <>Trois ateliers IA : <span className="text-primary">budget, invitation et plan de salle</span></>,
      };
    }
    if (hasB && hasI) {
      return {
        mobile: <>Budget &amp; <span className="text-primary">invitation</span></>,
        desktop: <>Deux ateliers IA : <span className="text-primary">budget et invitations</span></>,
      };
    }
    if (hasB && hasR) {
      return {
        mobile: <>Budget &amp; <span className="text-primary">plan 3D</span></>,
        desktop: <>Deux ateliers IA : <span className="text-primary">budget et plans 3D</span></>,
      };
    }
    if (hasI && hasR) {
      return {
        mobile: <>Invitation &amp; <span className="text-primary">plan 3D</span></>,
        desktop: <>Deux ateliers IA : <span className="text-primary">invitations et plans 3D</span></>,
      };
    }
    if (hasB) {
      return {
        mobile: <>Simulateur de <span className="text-primary">budget</span></>,
        desktop: <>Atelier IA : <span className="text-primary">Simulateur de budget &amp; devis</span></>,
      };
    }
    if (hasI) {
      return {
        mobile: <>Cartes &amp; <span className="text-primary">invitations</span></>,
        desktop: <>Atelier IA : <span className="text-primary">Studio d’invitations WhatsApp</span></>,
      };
    }
    return {
      mobile: <>Plans &amp; <span className="text-primary">visite 3D</span></>,
      desktop: <>Atelier IA : <span className="text-primary">Studio de plans de salle 3D</span></>,
    };
  }, [visibility]);

  useEffect(() => {
    setStudio(readLandingStudio());
    if (typeof window !== 'undefined' && window.location.hash === '#simulateur-ia') {
      revealAndScrollToSection('simulateur-ia');
    }
  }, []);

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

  const budgetHref = `/simulateur?studio=budget&scenario=${encodeURIComponent(activeScenario.id)}`;

  if (visibleStudioTabs.length === 0) {
    return (
      <section
        ref={revealRef}
        id="simulateur-ia"
        className="em-reveal em-landing-defer scroll-mt-24 py-8 sm:py-20 border-t border-border bg-gradient-to-b from-surface/90 via-surface-muted/40 to-surface/90 relative overflow-hidden em-landing-section-glow"
      >
        <div className="page-container relative z-10 space-y-6 max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Fonctionnalités à venir
            </span>
            <h2 className="em-landing-heading text-xl sm:text-3xl text-foreground">
              Ateliers IA &amp; Simulateurs
            </h2>
            <p className="text-sm text-muted leading-relaxed max-w-xl mx-auto">
              Les ateliers d’intelligence artificielle sont temporairement masqués. Explorez le catalogue de prestataires en attendant.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button href="/marketplace" variant="primary">
              Explorer le catalogue
            </Button>
            <Button href="/tarifs" variant="secondary">
              Consulter nos forfaits
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={revealRef}
      id="simulateur-ia"
      className="em-reveal em-landing-defer scroll-mt-24 py-8 sm:py-20 border-t border-border bg-gradient-to-b from-surface/90 via-surface-muted/40 to-surface/90 relative overflow-hidden em-landing-section-glow"
    >
      <div className="page-container relative z-10 space-y-8 sm:space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          {checkoutNotice === 'success' ? (
            <div className="text-left">
              <Alert variant="success">Jetons IA crédités. Vous pouvez relancer une simulation.</Alert>
            </div>
          ) : null}
          {checkoutNotice === 'canceled' ? (
            <div className="text-left">
              <Alert variant="warning">Paiement annulé — aucun jeton n’a été débité.</Alert>
            </div>
          ) : null}

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
            <span className="sm:hidden">{dynamicHeading.mobile}</span>
            <span className="hidden sm:inline">{dynamicHeading.desktop}</span>
          </h2>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Choisissez un atelier, puis ouvrez l’outil complet. {aiTokenCostLegend()}
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
            tabs={visibleStudioTabs}
            idPrefix={LANDING_STUDIO_PREFIX}
            className="text-left max-w-3xl mx-auto mt-2"
          />
        </div>

        {visibility.budget ? (
          <div
            role="tabpanel"
            id={aiStudioPanelId(LANDING_STUDIO_PREFIX, 'budget')}
            aria-labelledby={`${LANDING_STUDIO_PREFIX}-budget`}
            hidden={studio !== 'budget'}
            className="space-y-4"
          >
            {studio === 'budget' ? (
              <div className="bg-surface border border-border rounded-[var(--radius-card)] max-w-5xl mx-auto overflow-hidden animate-fade-in">
                <div className="p-3 sm:p-4 border-b border-border space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    Choisissez un exemple, puis lancez la simulation.
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap" role="group" aria-label="Projets types">
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
                              ? 'bg-primary-solid text-primary-foreground shadow-xs'
                              : 'bg-surface-muted border border-border text-muted hover:text-foreground hover:bg-surface',
                          )}
                        >
                          {scenario.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-stage">
                  <LandingMedia
                    src={activeScenario.imageUrl}
                    alt={activeScenario.name}
                    sizes="(max-width: 768px) 100vw, 64rem"
                    className="object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stage via-stage/40 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-stage-foreground">
                    <h3 className="text-base sm:text-lg font-bold">{activeScenario.name}</h3>
                    <span className="text-xs font-bold text-festive-on-stage bg-stage/70 px-2.5 py-1 rounded-[var(--radius-button)] border border-festive-accent/30 self-start sm:self-auto flex items-baseline gap-1.5">
                      <span>Budget : {activeScenarioUsd.toLocaleString('fr-FR')} $</span>
                      <span className="text-xs text-stage-foreground/80 font-normal">({formatFc(activeScenario.budgetTargetFc)})</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 sm:p-4 text-xs border-t border-border">
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted flex items-center gap-1 font-medium">
                      <Heart className="w-3.5 h-3.5 text-primary" aria-hidden />
                      Type
                    </span>
                    <p className="font-bold text-foreground truncate">{activeScenario.type}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden />
                      Ville
                    </span>
                    <p className="font-bold text-foreground truncate">
                      {activeScenario.commune
                        ? `${activeScenario.city} (${activeScenario.commune})`
                        : activeScenario.city}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-primary" aria-hidden />
                      Invités
                    </span>
                    <p className="font-bold text-foreground">{activeScenario.guests}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted flex items-center gap-1 font-medium">
                      <DollarSign className="w-3.5 h-3.5 text-primary" aria-hidden />
                      Budget
                    </span>
                    <p className="font-bold text-primary-solid flex items-baseline gap-1">
                      <span>{activeScenarioUsd.toLocaleString('fr-FR')} $</span>
                      <span className="text-xs font-normal text-muted">({formatFc(activeScenario.budgetTargetFc)})</span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted leading-relaxed px-3.5 sm:px-4 pb-1">
                  {activeScenario.prompt}
                </p>
                <p className="text-xs text-muted px-3.5 sm:px-4 pb-3 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary-solid shrink-0 mt-0.5" aria-hidden />
                  <span>Aucun jeton n’est débité tant que vous n’avez pas cliqué sur Générer dans le simulateur.</span>
                </p>

                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-border">
                  <Button
                    href={budgetHref}
                    variant="primary"
                    size="md"
                    fullWidth
                    className="sm:w-auto"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Simuler ce projet
                  </Button>
                  <Button
                    href="/simulateur?studio=budget"
                    variant="secondary"
                    size="md"
                    className="flex-1 sm:flex-none"
                  >
                    Simulation libre
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {visibility.invite ? (
          <div
            role="tabpanel"
            id={aiStudioPanelId(LANDING_STUDIO_PREFIX, 'invite')}
            aria-labelledby={`${LANDING_STUDIO_PREFIX}-invite`}
            hidden={studio !== 'invite'}
          >
            {studio === 'invite' ? (
              <div className="max-w-2xl mx-auto rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8 text-center space-y-4 animate-fade-in shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 mx-auto flex items-center justify-center">
                  <Mail className="w-6 h-6" aria-hidden />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Studio Invitations</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Créez une carte 9:16 WhatsApp à partir d’un brief ou d’une photo à cloner, puis suivez les réponses.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-1">
                  <Button href={STUDIO_FULL_PAGE.invite.href} variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {STUDIO_FULL_PAGE.invite.action}
                  </Button>
                  <Button href="/simulateur?studio=invite" variant="secondary">
                    Dans le simulateur
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {visibility.room ? (
          <div
            role="tabpanel"
            id={aiStudioPanelId(LANDING_STUDIO_PREFIX, 'room')}
            aria-labelledby={`${LANDING_STUDIO_PREFIX}-room`}
            hidden={studio !== 'room'}
          >
            {studio === 'room' ? (
              <div className="max-w-2xl mx-auto rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8 text-center space-y-4 animate-fade-in shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
                  <LayoutGrid className="w-6 h-6" aria-hidden />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Studio Plans 2D / 3D</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Décrivez la salle ou déposez une photo : l’IA pose tables, allées et décor sur un plan coté.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-1">
                  <Button href={STUDIO_FULL_PAGE.room.href} variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {STUDIO_FULL_PAGE.room.action}
                  </Button>
                  <Button href="/simulateur?studio=room" variant="secondary">
                    Dans le simulateur
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="text-center">
          <Link
            href={fullPage.href}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary-solid hover:underline rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Wand2 className="w-3.5 h-3.5" aria-hidden />
            Ouvrir {fullPage.label}
          </Link>
        </p>
      </div>

      {purchaseModalOpen ? (
        <AiTokenPurchaseModal
          open
          onClose={() => setPurchaseModalOpen(false)}
          onSuccess={() => {
            void syncDeviceAiTokensWithBackend(api).then((synced) => setAllowance(synced));
          }}
        />
      ) : null}
    </section>
  );
}
