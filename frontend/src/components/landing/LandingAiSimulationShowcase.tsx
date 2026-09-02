'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Wand2,
  Building2,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Heart,
  Users,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import type { ListingEventTypeId } from '@/lib/listingDetails';
import {
  AI_TOKEN_PACK_SIZE,
  addPurchasedAiTokens,
  getAiSimulationAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
} from '@/lib/aiTokens';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import AiSimulationCounter from '@/components/AiSimulationCounter';
import EventPrepAiSimulator, { type EventPrepAiDefaults } from '@/components/EventPrepAiSimulator';

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
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80',
    prompt: 'Gala d’entreprise pour 250 invités à Kinshasa. Dîner assis, maître de cérémonie, photo/vidéo et scénographie, budget 16 000 000 FC.',
  },
];

function scenarioToDefaults(scenario: ScenarioBrief): EventPrepAiDefaults {
  return {
    eventType: scenario.eventType,
    city: scenario.city,
    commune: scenario.commune,
    guestCount: scenario.guests,
    budgetMaxFc: scenario.budgetTargetFc,
    prompt: scenario.prompt,
  };
}

export default function LandingAiSimulationShowcase() {
  const revealRef = useLandingReveal<HTMLElement>();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const [viewMode, setViewMode] = useState<'presets' | 'live'>('presets');
  const [allowance, setAllowance] = useState<AiAllowance>(getAiSimulationAllowance);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState('mariage-kin');
  const [liveDefaults, setLiveDefaults] = useState<EventPrepAiDefaults | undefined>();
  const [preferDefaults, setPreferDefaults] = useState(false);

  const activeScenario = SCENARIOS.find((item) => item.id === selectedScenarioId) || SCENARIOS[0];
  const simulatorUrl = isLoggedIn
    ? '/dashboard/catalogue?tab=plan&planView=ai'
    : '/register?kind=CLIENT&intent=seeker&action=ai_simulator';

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
  }, []);

  const openLiveWithScenario = (scenario: ScenarioBrief) => {
    setLiveDefaults(scenarioToDefaults(scenario));
    setPreferDefaults(true);
    setViewMode('live');
  };

  return (
    <section
      ref={revealRef}
      id="simulateur-ia"
      className="em-reveal py-14 sm:py-20 border-t border-border bg-gradient-to-b from-surface/90 via-surface-muted/40 to-surface/90 relative overflow-hidden em-landing-section-glow"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[600px] sm:h-[600px] bg-primary/10 rounded-full blur-2xl sm:blur-3xl pointer-events-none -z-10" />

      <div className="page-container relative z-10 space-y-10 sm:space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <span className="em-festive-chip">
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              Intelligence Artificielle & Budget
            </span>
          </div>
          <div className="max-w-xl mx-auto text-left">
            <AiSimulationCounter
              allowance={allowance}
              onBuy={() => setPurchaseModalOpen(true)}
              compact
            />
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
            Préparez votre événement par IA :{' '}
            <span className="text-primary underline decoration-primary/30 underline-offset-4">
              3 packs clés en main
            </span>{' '}
            dans votre budget
          </h2>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Indiquez votre budget en Francs Congolais, votre ville et vos envies : l’assistant EventMaster compose{' '}
            <strong>3 formules (Éco, Équilibré, Confort)</strong> à partir du catalogue réel. Les exemples ci-dessous préremplissent le brief — une simulation n’est lancée qu’au clic « Générer ».
          </p>

          <div className="inline-flex items-center p-1 rounded-2xl bg-surface border border-border shadow-xs mt-2">
            <button
              type="button"
              onClick={() => setViewMode('presets')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer touch-manipulation',
                viewMode === 'presets'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              Exemples & briefs types
            </button>
            <button
              type="button"
              onClick={() => setViewMode('live')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer touch-manipulation',
                viewMode === 'live'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Tester mon événement en direct</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold tabular-nums">
                {allowance.totalRemaining} sim{allowance.totalRemaining > 1 ? 's' : ''}
              </span>
            </button>
          </div>
        </div>

        {viewMode === 'presets' && (
          <div className="bg-surface/90 dark:bg-slate-900/90 border border-primary/25 rounded-3xl p-5 sm:p-8 shadow-xl shadow-primary/5 space-y-6 max-w-5xl mx-auto animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/80">
              <p className="text-xs font-bold text-foreground">
                Choisissez un brief type, puis générez de vrais packs catalogue.
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar -mx-1 px-1">
                {SCENARIOS.map((scenario) => {
                  const isSelected = scenario.id === selectedScenarioId;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(scenario.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation cursor-pointer whitespace-nowrap shrink-0 sm:shrink',
                        isSelected
                          ? 'bg-primary text-white shadow-xs shadow-primary/30 ring-2 ring-primary/20'
                          : 'bg-surface-muted border border-border text-muted hover:text-foreground hover:bg-surface',
                      )}
                    >
                      {scenario.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm">
              <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeScenario.imageUrl}
                  alt={activeScenario.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-white">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary text-white inline-block mb-1">
                      Brief type
                    </span>
                    <h3 className="text-base sm:text-lg font-bold drop-shadow-sm">{activeScenario.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-black/50 px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-sm self-start sm:self-auto">
                    Budget cible : {formatFc(activeScenario.budgetTargetFc)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3.5 sm:p-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted flex items-center gap-1 font-medium">
                    <Heart className="w-3.5 h-3.5 text-primary" /> Type d’événement
                  </span>
                  <p className="font-bold text-foreground truncate">{activeScenario.type}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Ville & Commune
                  </span>
                  <p className="font-bold text-foreground truncate">
                    {activeScenario.commune
                      ? `${activeScenario.city} (${activeScenario.commune})`
                      : activeScenario.city}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-primary" /> Nombre d’invités
                  </span>
                  <p className="font-bold text-foreground">{activeScenario.guests} personnes</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted flex items-center gap-1 font-medium">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Budget alloué
                  </span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatFc(activeScenario.budgetTargetFc)}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed bg-surface-muted/60 border border-border rounded-2xl p-3.5">
              {activeScenario.prompt}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80">
              <div className="flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Aucun jeton n’est débité tant que vous n’avez pas cliqué sur Générer.</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  className="shadow-sm shadow-primary/30 sm:w-auto"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => openLiveWithScenario(activeScenario)}
                >
                  Préremplir et simuler ce brief
                </Button>
                <Link href={simulatorUrl} className="flex-1 sm:flex-none">
                  <Button variant="secondary" size="md" fullWidth>
                    Ouvrir le simulateur complet
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            'bg-surface/90 dark:bg-slate-900/90 border-2 border-primary/40 rounded-3xl p-5 sm:p-8 shadow-xl shadow-primary/10 space-y-4 max-w-5xl mx-auto',
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto pt-4">
          <div className="p-5 rounded-2xl border border-border bg-surface space-y-2.5 hover:border-primary/40 transition">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Pour les Particuliers & Mariés</h3>
            <p className="text-xs text-muted leading-relaxed">
              Estimez le coût réel de votre fête en 30 secondes. Choisissez entre formule économique ou confort et ajustez chaque ligne selon vos préférences.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface space-y-2.5 hover:border-primary/40 transition">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Pour les Organisateurs & Entreprises</h3>
            <p className="text-xs text-muted leading-relaxed">
              Respectez scrupuleusement les enveloppes budgétaires de vos clients. Générez des devis pré-remplis et gagnez des jours entiers de recherche.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface space-y-2.5 hover:border-primary/40 transition">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Pour les Prestataires & Salles</h3>
            <p className="text-xs text-muted leading-relaxed">
              Vos offres et fiches sont automatiquement recommandées et intégrées dans les packs IA dès qu’un projet correspond à votre ville et catégorie.
            </p>
          </div>
        </div>
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
