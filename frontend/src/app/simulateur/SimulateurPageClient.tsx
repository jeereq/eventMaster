'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Alert, Button } from '@/components/ui';
import { api } from '@/lib/api';
import {
  claimAiTokenCheckoutReturn,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  syncDeviceAiTokensWithBackend,
  aiTokenCostLegend,
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
  FileText,
  LayoutGrid,
  CheckCircle2,
} from 'lucide-react';
import AiSimulationCounter, { isAiSimulationThresholdReached } from '@/components/AiSimulationCounter';
import AiTokenBuyButton from '@/components/AiTokenBuyButton';

const EventPrepAiSimulator = dynamic(() => import('@/components/EventPrepAiSimulator'), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[28rem] rounded-[var(--radius-card)] border border-border bg-surface-muted/40 animate-pulse motion-reduce:animate-none flex items-center justify-center p-8 text-center"
      aria-busy="true"
      aria-label="Chargement du simulateur budget IA"
    >
      <div className="space-y-2 max-w-sm">
        <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse" />
        <p className="text-sm font-semibold text-foreground">Chargement du simulateur budget IA…</p>
        <p className="text-xs text-muted">Préparation du moteur de calcul des formules catalogue.</p>
      </div>
    </div>
  ),
});

const AiTokenPurchaseModal = dynamic(
  () => import('@/components/AiTokenPurchaseModal'),
  { ssr: false },
);

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

  const [checkoutNotice, setCheckoutNotice] = useState<'success' | 'canceled' | null>(null);
  const [allowance, setAllowance] = useState<AiAllowance>(createEmptyAiAllowance);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [liveDefaults, setLiveDefaults] = useState<EventPrepAiDefaults | undefined>(undefined);
  const [preferDefaults, setPreferDefaults] = useState(false);

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

  // Détection du paramètre URL initial ?scenario=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramScenario = params.get('scenario');
    if (paramScenario) {
      const match = visibleScenarios.find((s) => s.id === paramScenario);
      if (match) {
        setSelectedScenarioId(match.id);
        setLiveDefaults(scenarioToDefaults(match, exchangeRate));
        setPreferDefaults(true);
      }
    }
  }, [visibleScenarios, exchangeRate]);

  const handleSelectScenario = (scenario: ScenarioBrief) => {
    setSelectedScenarioId(scenario.id);
    setLiveDefaults(scenarioToDefaults(scenario, exchangeRate));
    setPreferDefaults(true);
  };

  const handleClearScenario = () => {
    setSelectedScenarioId(null);
    setLiveDefaults(undefined);
    setPreferDefaults(false);
  };

  const activeScenario = visibleScenarios.find((s) => s.id === selectedScenarioId);

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <PublicPageHero
        title="Simulateur de Budget & Formules IA"
        description="Estimez votre réception en 1 clic : l’IA compose Éco, Équilibré et Confort avec des salles et prestataires certifiés du catalogue. Quatre simulations gratuites, sans carte bancaire."
        compact
      >
        <div className="pt-2 flex flex-wrap items-center gap-2">
          {/* Badge taux du jour */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-xs font-semibold text-foreground tabular-nums shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Taux du jour : 1 $ = {exchangeRate.toLocaleString('fr-FR')} FC
          </span>

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
              className="text-xs min-h-9 py-1 px-3"
            />
          )}
        </div>
      </PublicPageHero>

      <div className="page-container py-6 sm:py-10 space-y-8">
        {/* Messages d'achat de jetons */}
        {checkoutNotice === 'success' ? (
          <Alert variant="success">Jetons IA crédités. Vous pouvez relancer votre simulation.</Alert>
        ) : null}
        {checkoutNotice === 'canceled' ? (
          <Alert variant="warning">Paiement annulé — aucun jeton n’a été débité.</Alert>
        ) : null}

        {isAiSimulationThresholdReached(allowance) ? (
          <div className="max-w-xl mx-auto">
            <AiSimulationCounter
              allowance={allowance}
              onBuy={() => setPurchaseModalOpen(true)}
            />
          </div>
        ) : null}

        {/* Barre de sélection rapide de scénarios types */}
        <section aria-labelledby="scenarios-heading" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 id="scenarios-heading" className="text-sm font-bold text-foreground flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <span>Projets types prêts à l’emploi</span>
              </h2>
              <p className="text-xs text-muted">
                Sélectionnez un modèle pour charger instantanément les paramètres recommandés.
              </p>
            </div>

            {selectedScenarioId && (
              <button
                type="button"
                onClick={handleClearScenario}
                className="text-xs text-muted hover:text-foreground underline underline-offset-2 self-start sm:self-auto touch-manipulation cursor-pointer min-h-8"
              >
                Réinitialiser vers simulation libre
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
            <div className="p-3 rounded-xl bg-surface-muted/70 border border-border text-xs text-muted flex items-start gap-2 animate-fade-in">
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
          <div className="border-t border-border pt-6">
            <EventPrepAiSimulator
              embedded
              defaultOpen
              defaults={liveDefaults}
              preferDefaults={preferDefaults}
            />
          </div>
        </section>

        {/* Bandeau de découverte des autres ateliers IA */}
        <section className="p-5 sm:p-6 rounded-[var(--radius-card)] bg-surface border border-border shadow-xs space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Explorez les autres outils créatifs EventMaster</span>
            </h3>
            <p className="text-xs text-muted">
              Vos jetons IA sont utilisables sur l’ensemble de nos ateliers créatifs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Link
              href="/modeles"
              className="p-3.5 rounded-xl border border-border hover:border-primary/50 bg-surface-muted/40 hover:bg-surface-muted transition flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Studio Cartes & Invitations WhatsApp
                </p>
                <p className="text-xs text-muted truncate">
                  Générez une carte d’invitation visuelle 9:16 avec RSVP
                </p>
              </div>
            </Link>

            <Link
              href="/plans-3d"
              className="p-3.5 rounded-xl border border-border hover:border-primary/50 bg-surface-muted/40 hover:bg-surface-muted transition flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Studio Plans de Salle 2D & 3D
                </p>
                <p className="text-xs text-muted truncate">
                  Modelez tables, allées et visitez la salle en 3D
                </p>
              </div>
            </Link>
          </div>
        </section>
      </div>

      <PublicCtaBand
        title="Retenez un pack, puis envoyez les devis"
        description="Un compte client gratuit enregistre vos formules, ouvre les fiches et envoie les demandes. Le paiement des acomptes se fait directement avec le professionnel."
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
