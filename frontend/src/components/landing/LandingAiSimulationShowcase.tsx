'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Sparkles,
  Wand2,
  Building2,
  Utensils,
  Camera,
  Music,
  Palette,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Layers,
  ShieldCheck,
  Zap,
  Sliders,
  DollarSign,
  Users,
  MapPin,
  Clock,
  Briefcase,
  Heart,
  RotateCcw,
  AlertCircle,
  Loader2,
  Check,
  Lock,
  Coins,
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import { LISTING_EVENT_TYPES, type ListingEventTypeId } from '@/lib/listingDetails';
import { communesForCity } from '@/lib/rdcCities';
import {
  MAX_FREE_TRIALS,
  AI_TOKEN_PACK_SIZE,
  AI_TOKEN_PACK_PRICE_FC,
  getAiSimulationAllowance,
  consumeAiSimulation,
  addPurchasedAiTokens,
  type AiAllowance,
} from '@/lib/aiTokens';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';

interface SimulationScenario {
  id: string;
  name: string;
  type: string;
  city: string;
  guests: number;
  budgetTargetFc: number;
  packs: {
    eco: {
      name: string;
      totalFc: number;
      leftoverFc: number;
      venue: string;
      caterer: string;
      photo: string;
      dj: string;
      decor: string;
    };
    balance: {
      name: string;
      totalFc: number;
      leftoverFc: number;
      venue: string;
      caterer: string;
      photo: string;
      dj: string;
      decor: string;
    };
    confort: {
      name: string;
      totalFc: number;
      leftoverFc: number;
      venue: string;
      caterer: string;
      photo: string;
      dj: string;
      decor: string;
    };
  };
}

const SCENARIOS: SimulationScenario[] = [
  {
    id: 'mariage-kin',
    name: 'Mariage Élégance · Kinshasa',
    type: 'Mariage & Réception',
    city: 'Kinshasa (Gombe)',
    guests: 150,
    budgetTargetFc: 8500000,
    packs: {
      eco: {
        name: 'Pack Économique',
        totalFc: 6200000,
        leftoverFc: 2300000,
        venue: 'Salle Polyvalente Les Palmiers (150 pl.)',
        caterer: 'Buffet Congolais & Grillades Gourmandes',
        photo: 'Reportage photo numérique (6h)',
        dj: 'Sonorisation & DJ professionnel',
        decor: 'Habillage tables & arche florale standard',
      },
      balance: {
        name: 'Pack Équilibré (Idéal)',
        totalFc: 8100000,
        leftoverFc: 400000,
        venue: 'Espace Prestige Gombe (200 pl.)',
        caterer: 'Service traiteur complet + Boissons & Cocktail',
        photo: 'Photo & Vidéo HD + Album prestige',
        dj: 'Régie son, jeux de lumières & DJ animateur',
        decor: 'Décoration premium, chaises Napoléon & fleurs fraîches',
      },
      confort: {
        name: 'Pack Confort Prestige',
        totalFc: 11200000,
        leftoverFc: 0,
        venue: 'Grand Salon Grand Hôtel (300 pl.)',
        caterer: 'Menu gastronomique assis 3 services + Bar VIP',
        photo: 'Équipe cinéma drone 4K + 2 photographes',
        dj: 'Scénographie lumineuse, écran LED & orchestre live',
        decor: 'Scénographie royale intégrale & lustres cristal',
      },
    },
  },
  {
    id: 'anniversaire-lshi',
    name: 'Anniversaire & Soirée · Lubumbashi',
    type: 'Fête & Anniversaire',
    city: 'Lubumbashi',
    guests: 80,
    budgetTargetFc: 3800000,
    packs: {
      eco: {
        name: 'Pack Éco Fête',
        totalFc: 2750000,
        leftoverFc: 1050000,
        venue: 'Jardin Privé Golf (80 pl.)',
        caterer: 'Cocktail dînatoire & barbecue braisé',
        photo: 'Shooting photo numérique & photocall',
        dj: 'Pack sono mobile & playlist personnalisée',
        decor: 'Guirlandes guinguette & coin lounge',
      },
      balance: {
        name: 'Pack Équilibré',
        totalFc: 3600000,
        leftoverFc: 200000,
        venue: 'Résidence Bel Air Lounge (100 pl.)',
        caterer: 'Buffet chaud/froid + Gâteau sur-mesure & boissons',
        photo: 'Photographe dédié + borne selfie instantanée',
        dj: 'DJ club & ambiance son/lumières dynamique',
        decor: 'Décoration thématique personnalisée & ballons organiques',
      },
      confort: {
        name: 'Pack VIP All-Inclusive',
        totalFc: 5100000,
        leftoverFc: 0,
        venue: 'Domaine Privé avec Piscine',
        caterer: 'Traiteur signature, mixologue & service à table',
        photo: 'Aftermovie vidéo dynamique + drone',
        dj: 'Sonorisation concert, effets fumée & DJ invité',
        decor: 'Aménagement VIP complet, canapés velours & bar lumineux',
      },
    },
  },
  {
    id: 'gala-pro',
    name: 'Gala d’Entreprise · Kinshasa',
    type: 'Conférence & Gala Pro',
    city: 'Kinshasa',
    guests: 250,
    budgetTargetFc: 16000000,
    packs: {
      eco: {
        name: 'Pack Standard Business',
        totalFc: 12800000,
        leftoverFc: 3200000,
        venue: 'Salle de Conférence Fleuve (250 pl.)',
        caterer: 'Buffet d’affaires & pause-café',
        photo: 'Couverture photo officielle d’entreprise',
        dj: 'Sonorisation conférence, micros sans fil & projecteur',
        decor: 'Roll-ups, pupitre & signalétique sobre',
      },
      balance: {
        name: 'Pack Gala Premium',
        totalFc: 15400000,
        leftoverFc: 600000,
        venue: 'Palais des Congrès Kinshasa (300 pl.)',
        caterer: 'Dîner de gala assis & bar à cocktails',
        photo: 'Reportage photo/vidéo multi-caméras + interviews',
        dj: 'Écran géant LED, sonorisation broadcast & maître de cérémonie',
        decor: 'Moquette rouge, photocall presse & centres de table floraux',
      },
      confort: {
        name: 'Pack Sommet International',
        totalFc: 21500000,
        leftoverFc: 0,
        venue: 'Grand Amphithéâtre Privé (500 pl.)',
        caterer: 'Traiteur international de luxe & service protocole VIP',
        photo: 'Retransmission en direct streaming 4K & studio photo VIP',
        dj: 'Régie technique complète, traduction simultanée & concert',
        decor: 'Scénographie immersive 360°, mapping vidéo & mobilier design',
      },
    },
  },
];

export default function LandingAiSimulationShowcase() {
  const revealRef = useLandingReveal<HTMLElement>();
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  // Mode de visualisation : Scénarios modèles ou Simulateur en direct personnalisé
  const [viewMode, setViewMode] = useState<'presets' | 'live'>('presets');

  // Solde de simulations (10 essais gratuits + packs de 20 jetons payés)
  const [allowance, setAllowance] = useState<AiAllowance>(getAiSimulationAllowance);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const aiStatus = params.get('ai_tokens_status') || params.get('ai_tokens');
        if (aiStatus === 'success' || aiStatus === 'paid') {
          const added = parseInt(params.get('tokens') || String(AI_TOKEN_PACK_SIZE), 10) || AI_TOKEN_PACK_SIZE;
          addPurchasedAiTokens(added);
          // Nettoyage propre de l'URL sans rechargement
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
  }, []);

  // Formulaire live personnalisé
  const [customPrompt, setCustomPrompt] = useState('');
  const [customEventType, setCustomEventType] = useState<ListingEventTypeId>('private');
  const [customCity, setCustomCity] = useState('Kinshasa');
  const [customCommune, setCustomCommune] = useState('');
  const [customGuests, setCustomGuests] = useState('120');
  const [customBudgetFc, setCustomBudgetFc] = useState('7500000');
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [liveResult, setLiveResult] = useState<any | null>(null);
  const [liveSelectedPackId, setLiveSelectedPackId] = useState<string | null>(null);

  const communes = useMemo(() => communesForCity(customCity), [customCity]);

  // Scénarios prédéfinis
  const [selectedScenarioId, setSelectedScenarioId] = useState('mariage-kin');
  const [selectedPackTier, setSelectedPackTier] = useState<'eco' | 'balance' | 'confort'>('balance');

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];
  const activePack = activeScenario.packs[selectedPackTier];

  const simulatorUrl = isLoggedIn
    ? '/dashboard/catalogue?tab=plan&planView=ai'
    : '/register?kind=CLIENT&intent=seeker&action=ai_simulator';

  const handleRunLiveSimulation = async () => {
    if (!isLoggedIn && allowance.totalRemaining <= 0) {
      setPurchaseModalOpen(true);
      return;
    }

    setLiveLoading(true);
    setLiveError('');
    try {
      const cleanGuests = customGuests ? Math.max(1, parseInt(customGuests.replace(/\D/g, ''), 10) || 1) : undefined;
      const cleanBudget = customBudgetFc ? Math.max(0, parseInt(customBudgetFc.replace(/\D/g, ''), 10) || 0) : undefined;

      const res = await api.post('/public/event-plan-ai', {
        eventType: customEventType,
        city: customCity,
        commune: customCommune || undefined,
        guestCount: cleanGuests,
        budgetMaxFc: cleanBudget,
        prompt: customPrompt.trim() || undefined,
      });

      const packages = Array.isArray(res?.packages) ? res.packages : [];
      if (!packages.length) {
        throw new Error('Aucun pack disponible pour ces critères dans le catalogue.');
      }

      setLiveResult(res);
      setLiveSelectedPackId(packages[1]?.id || packages[0]?.id || 'balanced');

      if (!isLoggedIn) {
        const nextAllowance = consumeAiSimulation();
        setAllowance(nextAllowance);
      }
    } catch (err: any) {
      setLiveError(err?.message || 'Impossible de lancer la simulation IA en direct.');
    } finally {
      setLiveLoading(false);
    }
  };

  const selectedLivePack = liveResult?.packages?.find((p: any) => p.id === liveSelectedPackId) || liveResult?.packages?.[0];

  return (
    <section
      ref={revealRef}
      id="simulateur-ia"
      className="em-reveal py-14 sm:py-20 border-t border-border bg-gradient-to-b from-surface/90 via-surface-muted/40 to-surface/90 relative overflow-hidden em-landing-section-glow"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[600px] sm:h-[600px] bg-primary/10 rounded-full blur-2xl sm:blur-3xl pointer-events-none -z-10" />

      <div className="page-container relative z-10 space-y-10 sm:space-y-12">
        {/* En-tête de la section avec badge des 10 essais gratuits et recharge 20 jetons */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <span className="em-festive-chip">
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              Intelligence Artificielle & Budget
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isLoggedIn
                ? 'Compte Connecté · Simulations illimitées'
                : allowance.totalRemaining > 0
                ? `${allowance.totalRemaining} simulation${allowance.totalRemaining > 1 ? 's' : ''} disponible${allowance.totalRemaining > 1 ? 's' : ''}${allowance.bonusTokens > 0 ? ` (${allowance.bonusTokens} bonus)` : ' sans compte'}`
                : '0 simulation restante'}
            </span>
            <button
              type="button"
              onClick={() => setPurchaseModalOpen(true)}
              className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 inline-flex items-center gap-1 transition cursor-pointer touch-manipulation shadow-xs"
            >
              <Coins className="w-3 h-3 text-amber-500" />
              <span>Pack 20 simulations : {formatFc(AI_TOKEN_PACK_PRICE_FC)}</span>
            </button>
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
            Préparez votre événement par IA :{' '}
            <span className="text-primary underline decoration-primary/30 underline-offset-4">
              3 packs clés en main
            </span>{' '}
            dans votre budget
          </h2>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Fini le casse-tête des devis multiples et des dépassements imprévus. Indiquez votre budget en Francs Congolais (CDF), votre ville et vos envies : l’assistant intelligent d’EventMaster génère instantanément <strong>3 formules optimisées (Éco, Équilibré, Confort)</strong> avec salle certifiée, traiteur, photographe, DJ et décoration.
          </p>

          {/* Onglets de bascule Démo vs Simulateur direct */}
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
              Exemples & Scénarios Types
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
              {!isLoggedIn && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
                  {allowance.totalRemaining} dispo
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── VUE 1 : EXEMPLES DE SCÉNARIOS PRÉDÉFINIS ─── */}
        {viewMode === 'presets' && (
          <div className="bg-surface/90 dark:bg-slate-900/90 border border-primary/25 rounded-3xl p-5 sm:p-8 shadow-xl shadow-primary/5 space-y-6 max-w-5xl mx-auto animate-fade-in">
            {/* Barre de sélection de scénario */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/80">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Sliders className="w-4 h-4 text-primary" />
                <span>Tester une simulation type :</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SCENARIOS.map((scenario) => {
                  const isSelected = scenario.id === selectedScenarioId;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(scenario.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation cursor-pointer',
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

            {/* Paramètres simulés du scénario */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-primary/5 border border-primary/15 rounded-2xl p-3.5 sm:p-4 text-xs">
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
                <p className="font-bold text-foreground truncate">{activeScenario.city}</p>
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

            {/* Sélecteur des 3 Formules IA (Éco / Équilibré / Confort) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {[
                {
                  id: 'eco' as const,
                  title: '1. Formule Économique',
                  desc: 'Maîtrise stricte des coûts',
                  data: activeScenario.packs.eco,
                  badge: 'Budget Doux',
                  color: 'border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5',
                  btnColor: 'text-blue-600',
                },
                {
                  id: 'balance' as const,
                  title: '2. Formule Équilibrée',
                  desc: 'Meilleur rapport qualité / prix',
                  data: activeScenario.packs.balance,
                  badge: 'Recommandé par l’IA',
                  color: 'border-primary/50 bg-primary/10 shadow-md ring-2 ring-primary/30',
                  btnColor: 'text-primary font-bold',
                },
                {
                  id: 'confort' as const,
                  title: '3. Formule Confort & Luxe',
                  desc: 'Prestations haut de gamme',
                  data: activeScenario.packs.confort,
                  badge: 'Prestige VIP',
                  color: 'border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5',
                  btnColor: 'text-amber-600',
                },
              ].map((tier) => {
                const isSelected = selectedPackTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedPackTier(tier.id)}
                    className={cn(
                      'p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-full gap-3 cursor-pointer touch-manipulation',
                      isSelected ? tier.color : 'border-border bg-surface hover:border-border/80 opacity-80 hover:opacity-100',
                    )}
                  >
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border text-foreground">
                          {tier.badge}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{tier.title}</h3>
                      <p className="text-[11px] text-muted">{tier.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-border/60 w-full mt-auto">
                      <p className="text-lg font-black text-foreground tracking-tight">
                        {formatFc(tier.data.totalFc)}
                      </p>
                      {tier.data.leftoverFc > 0 ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                          <TrendingDown className="w-3 h-3" />
                          Reste en réserve : {formatFc(tier.data.leftoverFc)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                          Formule intégrale sans compromis
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Détail du Pack Actif Sélectionné */}
            <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {isLoggedIn
                        ? `Composition détaillée du ${activePack.name}`
                        : `Composition synthétique du ${activePack.name}`}
                    </h4>
                    <p className="text-[11px] text-muted">
                      {isLoggedIn
                        ? 'Mix complet optimisé à partir des prestataires certifiés sur EventMaster'
                        : 'Aperçu synthétique budgétaire · Les fiches officielles et contacts réels sont débloqués à la connexion'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-primary px-3 py-1 rounded-lg bg-primary/10">
                  Total estimé : {formatFc(activePack.totalFc)}
                </span>
              </div>

              {isLoggedIn ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" /> Salle & Espace
                      </span>
                      <p className="font-semibold text-foreground mt-1">{activePack.venue}</p>
                    </div>
                    <p className="text-[10px] text-muted pt-1">Avec plan 2D/3D & visite virtuelle</p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-emerald-600" /> Traiteur & Boissons
                      </span>
                      <p className="font-semibold text-foreground mt-1">{activePack.caterer}</p>
                    </div>
                    <p className="text-[10px] text-muted pt-1">Calculé pour {activeScenario.guests} convives</p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-rose-500" /> Décoration & Mobilier
                      </span>
                      <p className="font-semibold text-foreground mt-1">{activePack.decor}</p>
                    </div>
                    <p className="text-[10px] text-muted pt-1">Chaises, tables & arche selon style</p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-blue-600" /> Photo & Vidéo
                      </span>
                      <p className="font-semibold text-foreground mt-1">{activePack.photo}</p>
                    </div>
                    <p className="text-[10px] text-muted pt-1">Remise des fichiers HD & galerie web</p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-amber-500" /> Sonorisation & DJ
                      </span>
                      <p className="font-semibold text-foreground mt-1">{activePack.dj}</p>
                    </div>
                    <p className="text-[10px] text-muted pt-1">Micros, éclairage d’ambiance & DJ</p>
                  </div>

                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Action immédiate
                      </span>
                      <p className="text-[11px] text-muted leading-tight mt-1">
                        Envoyez des demandes de devis directes aux prestataires en 1 clic.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode('live')}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-2 text-left cursor-pointer"
                    >
                      Personnaliser avec mon budget <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                      <div>
                        <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-purple-600" /> Salle & Espace
                        </span>
                        <p className="font-semibold text-foreground mt-1">Salle de réception certifiée ({activeScenario.guests} places)</p>
                      </div>
                      <p className="text-[10px] text-muted pt-1">Plan 2D/3D & visite virtuelle inclus</p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                      <div>
                        <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-emerald-600" /> Traiteur & Boissons
                        </span>
                        <p className="font-semibold text-foreground mt-1">Service traiteur complet & boissons</p>
                      </div>
                      <p className="text-[10px] text-muted pt-1">Menu adapté pour {activeScenario.guests} convives</p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                      <div>
                        <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-rose-500" /> Décoration & Mobilier
                        </span>
                        <p className="font-semibold text-foreground mt-1">Scénographie & habillage des tables</p>
                      </div>
                      <p className="text-[10px] text-muted pt-1">Tables, chaises d’apparat & arche</p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                      <div>
                        <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-blue-600" /> Photo & Vidéo
                        </span>
                        <p className="font-semibold text-foreground mt-1">Couverture média & reportage HD</p>
                      </div>
                      <p className="text-[10px] text-muted pt-1">Galerie numérique privée & fichiers HD</p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 flex flex-col justify-between h-full">
                      <div>
                        <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-amber-500" /> Sonorisation & DJ
                        </span>
                        <p className="font-semibold text-foreground mt-1">Régie son, jeux de lumière & DJ pro</p>
                      </div>
                      <p className="text-[10px] text-muted pt-1">Micros sans fil & ambiance sur mesure</p>
                    </div>

                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 space-y-1 flex flex-col justify-between h-full">
                      <div>
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Fiches prestataires masquées
                        </span>
                        <p className="text-[11px] text-muted leading-tight mt-1">
                          Noms officiels et contacts directs réservés aux comptes connectés.
                        </p>
                      </div>
                      <Link href={simulatorUrl} className="pt-2">
                        <Button size="sm" variant="primary" fullWidth className="text-[11px] h-8">
                          Débloquer ce pack
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Bandeau d'explication déblocage et 20 jetons IA */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-surface to-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          Détails des prestataires et devis complets masqués
                        </p>
                        <p className="text-[11px] text-muted">
                          Vous avez droit à <strong>10 essais gratuits sans compte</strong>. Une fois connecté, vous accédez aux contacts complets et pouvez acheter des <strong>recharges de 20 jetons de recherche IA</strong>.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <Link href="/register?kind=CLIENT&intent=seeker&action=ai_simulator" className="flex-1 sm:flex-none">
                        <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3 h-3" />}>
                          Créer un compte gratuit
                        </Button>
                      </Link>
                      <Link href="/login" className="flex-1 sm:flex-none">
                        <Button size="sm" variant="secondary">
                          Connexion
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Appel à l'action final du simulateur */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80">
              <div className="flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>10 simulations gratuites sans compte · Recharge 20 jetons IA disponible connecté · Devis directs</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('live')}
                  className="flex-1 sm:flex-none"
                >
                  <Button variant="secondary" size="md" fullWidth>
                    Tester en direct (10 essais gratuits)
                  </Button>
                </button>
                <Link href={simulatorUrl} className="flex-1 sm:flex-none">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="shadow-sm shadow-primary/30"
                  >
                    Ouvrir le simulateur complet
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── VUE 2 : SIMULATEUR EN DIRECT (10 ESSAIS SANS CONNEXION) ─── */}
        {viewMode === 'live' && (
          <div className="bg-surface/90 dark:bg-slate-900/90 border-2 border-primary/40 rounded-3xl p-5 sm:p-8 shadow-xl shadow-primary/10 space-y-6 max-w-5xl mx-auto animate-fade-in">
            {/* Bannière de statut d'essais */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Simulateur IA en Direct — Sans Inscription Obligatoire
                  </p>
                  <p className="text-[11px] text-muted">
                    {isLoggedIn
                      ? 'Votre compte est connecté : simulations et devis illimités. Recharge de 20 jetons IA disponible pour vos recherches personnalisées.'
                      : allowance.totalRemaining > 0
                      ? `Il vous reste ${allowance.totalRemaining} simulation(s) disponible(s)${allowance.bonusTokens > 0 ? ` (${allowance.bonusTokens} jetons bonus actifs)` : ' sans compte'}.`
                      : 'Vos 10 essais gratuits sont terminés. Vous pouvez recharger 20 simulations pour 2 000 FC.'}
                  </p>
                </div>
              </div>

              {!isLoggedIn ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                      const used = num <= allowance.freeTrialsUsed;
                      return (
                        <span
                          key={num}
                          className={cn(
                            'w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] font-bold border transition',
                            used
                              ? 'bg-muted/20 border-border text-muted line-through'
                              : 'bg-emerald-500 text-white border-emerald-600 shadow-xs',
                          )}
                          title={`Essai gratuit n°${num}`}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPurchaseModalOpen(true)}
                    className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer touch-manipulation"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>+20 sims (2 000 FC)</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0 transition cursor-pointer touch-manipulation"
                >
                  <Coins className="w-3.5 h-3.5" />
                  Acheter 20 Jetons IA (2 000 FC)
                </button>
              )}
            </div>

            {/* Formulaire de saisie du brief */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  1. Décrivez votre projet d’événement
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={2}
                  placeholder="Ex. Mariage pour 150 convives à Kinshasa Gombe, ambiance sobre et raffinée, cocktail traiteur et photographe..."
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Type d’événement</label>
                  <select
                    value={customEventType}
                    onChange={(e) => setCustomEventType(e.target.value as ListingEventTypeId)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-primary outline-none"
                  >
                    {LISTING_EVENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Ville</label>
                  <select
                    value={customCity}
                    onChange={(e) => {
                      setCustomCity(e.target.value);
                      setCustomCommune('');
                    }}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-primary outline-none"
                  >
                    <option value="Kinshasa">Kinshasa</option>
                    <option value="Lubumbashi">Lubumbashi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Nombre d’invités</label>
                  <Input
                    type="number"
                    value={customGuests}
                    onChange={(e) => setCustomGuests(e.target.value)}
                    placeholder="Ex. 120"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Budget Max (CDF)</label>
                  <Input
                    type="number"
                    value={customBudgetFc}
                    onChange={(e) => setCustomBudgetFc(e.target.value)}
                    placeholder="Ex. 8000000"
                    className="text-xs"
                  />
                </div>
              </div>

              {liveError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{liveError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('presets')}
                  className="text-xs font-semibold text-muted hover:text-foreground flex items-center gap-1 order-2 sm:order-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Revenir aux exemples
                </button>

                <Button
                  variant="primary"
                  size="md"
                  disabled={liveLoading}
                  onClick={handleRunLiveSimulation}
                  leftIcon={liveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : allowance.totalRemaining <= 0 && !isLoggedIn ? <Coins className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                  className="w-full sm:w-auto shadow-md shadow-primary/20 font-bold order-1 sm:order-2"
                >
                  {liveLoading
                    ? 'L’IA compose vos 3 packs…'
                    : allowance.totalRemaining <= 0 && !isLoggedIn
                    ? `Recharger 20 simulations (${formatFc(AI_TOKEN_PACK_PRICE_FC)})`
                    : 'Générer les 3 packs clés en main'}
                </Button>
              </div>
            </div>

            {/* Affichage des 3 packs générés par l'IA */}
            {liveResult && Array.isArray(liveResult.packages) && liveResult.packages.length > 0 && (
              <div className="pt-4 border-t border-border space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>3 Packs générés pour votre budget</span>
                  </h4>
                  <span className="text-xs text-muted">
                    {liveResult.packages.length} combinaisons prêtes
                  </span>
                </div>

                {/* Sélecteur des 3 packs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {liveResult.packages.map((pack: any) => {
                    const isSelected = (liveSelectedPackId || liveResult.packages[0]?.id) === pack.id;
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setLiveSelectedPackId(pack.id)}
                        className={cn(
                          'p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-2.5 cursor-pointer touch-manipulation',
                          isSelected
                            ? 'border-2 border-primary bg-primary/10 shadow-md ring-1 ring-primary/40'
                            : 'border-border bg-surface hover:border-primary/40',
                        )}
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border text-foreground">
                            {pack.label}
                          </span>
                          <h5 className="text-xs font-bold text-foreground mt-1">{pack.summary}</h5>
                          <p className="text-[11px] text-muted line-clamp-2">{pack.blurb}</p>
                        </div>

                        <div className="pt-2 border-t border-border/60">
                          <p className="text-base font-black text-foreground">
                            {formatFc(pack.estimatedTotalFc)}
                          </p>
                          <p className="text-[10px] text-muted">
                            {pack.venue ? '1 salle' : 'Sans salle'} + {pack.services?.length || 0} prestataires
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Détail du pack sélectionné */}
                {selectedLivePack && (
                  <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-primary/20">
                      <div>
                        <h5 className="text-xs font-bold text-foreground">
                          Détail du Pack {selectedLivePack.label}
                        </h5>
                        <p className="text-[11px] text-muted">{selectedLivePack.rationale}</p>
                      </div>
                      <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-lg bg-surface border border-primary/20 shrink-0">
                        Total : {formatFc(selectedLivePack.estimatedTotalFc)}
                      </span>
                    </div>

                    {isLoggedIn ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                        {selectedLivePack.venue && (
                          <div className="p-2.5 rounded-xl bg-surface border border-border space-y-0.5">
                            <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Salle & Espace
                            </span>
                            <p className="font-semibold text-foreground truncate">{selectedLivePack.venue.title}</p>
                            <p className="text-[10px] text-muted">{selectedLivePack.venue.location || 'Kinshasa'}</p>
                            <p className="text-[10px] font-bold text-emerald-600">{formatFc(selectedLivePack.venue.estimatedFc)}</p>
                          </div>
                        )}

                        {Array.isArray(selectedLivePack.services) && selectedLivePack.services.map((svc: any) => (
                          <div key={svc.slug} className="p-2.5 rounded-xl bg-surface border border-border space-y-0.5">
                            <span className="text-[10px] font-bold text-primary flex items-center gap-1 truncate">
                              <Sparkles className="w-3 h-3 shrink-0" />
                              <span className="truncate">{svc.categoryLabel || svc.title}</span>
                            </span>
                            <p className="font-semibold text-foreground truncate">{svc.title}</p>
                            <p className="text-[10px] text-muted truncate">{svc.orgName || svc.location}</p>
                            <p className="text-[10px] font-bold text-emerald-600">{formatFc(svc.estimatedFc)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                          {selectedLivePack.venue && (
                            <div className="p-2.5 rounded-xl bg-surface border border-border space-y-0.5">
                              <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> Salle & Espace ({selectedLivePack.venue.location || customCity})
                              </span>
                              <p className="font-semibold text-foreground truncate">Salle partenaire certifiée (Identité masquée)</p>
                              <p className="text-[10px] text-muted">Plan 2D/3D & capacité certifiée</p>
                              <p className="text-[10px] font-bold text-emerald-600">{formatFc(selectedLivePack.venue.estimatedFc)}</p>
                            </div>
                          )}

                          {Array.isArray(selectedLivePack.services) && selectedLivePack.services.map((svc: any, idx: number) => (
                            <div key={svc.slug || idx} className="p-2.5 rounded-xl bg-surface border border-border space-y-0.5">
                              <span className="text-[10px] font-bold text-primary flex items-center gap-1 truncate">
                                <Sparkles className="w-3 h-3 shrink-0" />
                                <span className="truncate">{svc.categoryLabel || 'Prestation'} ({svc.location || customCity})</span>
                              </span>
                              <p className="font-semibold text-foreground truncate">Prestataire vérifié (Identité masquée)</p>
                              <p className="text-[10px] text-muted truncate">Tarif négocié inclus dans l'enveloppe</p>
                              <p className="text-[10px] font-bold text-emerald-600">{formatFc(svc.estimatedFc)}</p>
                            </div>
                          ))}
                        </div>

                        <div className="p-3.5 rounded-xl bg-surface border border-primary/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                              <Lock className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">
                                Identité des prestataires et devis complets verrouillés
                              </p>
                              <p className="text-[11px] text-muted">
                                Vous disposez de <strong>10 essais gratuits sans compte</strong>. Créez un compte gratuit pour débloquer les coordonnées ou <strong>rechargez 20 simulations pour {formatFc(AI_TOKEN_PACK_PRICE_FC)}</strong>.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => setPurchaseModalOpen(true)}
                              className="flex-1 sm:flex-none"
                            >
                              <Button size="sm" variant="secondary" leftIcon={<Coins className="w-3.5 h-3.5" />}>
                                +20 Sims ({formatFc(AI_TOKEN_PACK_PRICE_FC)})
                              </Button>
                            </button>
                            <Link href={simulatorUrl} className="flex-1 sm:flex-none">
                              <Button size="sm" variant="primary" fullWidth rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                                Créer un compte
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {isLoggedIn && (
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <p className="text-[11px] text-muted">
                          Ces prestataires certifiés sont prêts à recevoir votre demande de réservation.
                        </p>
                        <Link href={simulatorUrl} className="w-full sm:w-auto">
                          <Button size="sm" variant="primary" fullWidth rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Sauvegarder ce pack & Contacter
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Grille des 3 Avantages clés par rôle */}
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

      {/* Modale d'achat de 20 simulations IA pour 2 000 FC */}
      <AiTokenPurchaseModal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={() => setAllowance(getAiSimulationAllowance())}
      />
    </section>
  );
}
