'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
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
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { useLandingReveal } from '@/components/landing/useLandingReveal';

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
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const [selectedScenarioId, setSelectedScenarioId] = useState('mariage-kin');
  const [selectedPackTier, setSelectedPackTier] = useState<'eco' | 'balance' | 'confort'>('balance');

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];
  const activePack = activeScenario.packs[selectedPackTier];

  const simulatorUrl = isLoggedIn
    ? '/dashboard/catalogue?tab=plan&planView=ai'
    : '/register?kind=CLIENT&intent=seeker&action=ai_simulator';

  return (
    <section
      ref={revealRef}
      id="simulateur-ia"
      className="em-reveal py-14 sm:py-20 border-t border-border bg-gradient-to-b from-surface/90 via-surface-muted/40 to-surface/90 relative overflow-hidden em-landing-section-glow"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="page-container relative z-10 space-y-10 sm:space-y-12">
        {/* En-tête de la section */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2">
            <span className="em-festive-chip">
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              Intelligence Artificielle & Budget
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Simulateur Événementiel
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
            Préparez votre événement par IA :{' '}
            <span className="text-primary underline decoration-primary/30 underline-offset-4">
              3 packs clés en main
            </span>{' '}
            dans votre budget
          </h2>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Fini le casse-tête des devis multiples et des dépassements imprévus. Indiquez votre budget en Francs Congolais (CDF), votre ville et vos envies : l’assistant intelligent d’EventMaster sélectionne la meilleure combinaison de salle vérifiée, traiteur, photographe, DJ et décoration.
          </p>
        </div>

        {/* Démonstrateur Interactif */}
        <div className="bg-surface/90 dark:bg-slate-900/90 border border-primary/25 rounded-3xl p-5 sm:p-8 shadow-xl shadow-primary/5 space-y-6 max-w-5xl mx-auto">
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
                    'p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 cursor-pointer touch-manipulation',
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

                  <div className="pt-2 border-t border-border/60 w-full">
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
                    Composition détaillée du {activePack.name}
                  </h4>
                  <p className="text-[11px] text-muted">
                    Mix optimisé à partir des prestataires certifiés sur EventMaster
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-primary px-3 py-1 rounded-lg bg-primary/10">
                Total estimé : {formatFc(activePack.totalFc)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1">
                <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" /> Salle & Espace
                </span>
                <p className="font-semibold text-foreground">{activePack.venue}</p>
                <p className="text-[10px] text-muted">Avec plan 2D/3D & visite virtuelle</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1">
                <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" /> Traiteur & Boissons
                </span>
                <p className="font-semibold text-foreground">{activePack.caterer}</p>
                <p className="text-[10px] text-muted">Calculé pour {activeScenario.guests} convives</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1">
                <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-rose-500" /> Décoration & Mobilier
                </span>
                <p className="font-semibold text-foreground">{activePack.decor}</p>
                <p className="text-[10px] text-muted">Chaises, tables & arche selon style</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1">
                <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-600" /> Photo & Vidéo
                </span>
                <p className="font-semibold text-foreground">{activePack.photo}</p>
                <p className="text-[10px] text-muted">Remise des fichiers HD & galerie web</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1">
                <span className="text-[11px] font-bold text-muted flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-500" /> Sonorisation & DJ
                </span>
                <p className="font-semibold text-foreground">{activePack.dj}</p>
                <p className="text-[10px] text-muted">Micros, éclairage d’ambiance & DJ</p>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Action immédiate
                </span>
                <p className="text-[11px] text-muted leading-tight">
                  Envoyez des demandes de devis directes aux prestataires en 1 clic.
                </p>
                <Link
                  href={simulatorUrl}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-1"
                >
                  Lancer cette simulation <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Appel à l'action final du simulateur */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80">
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Simulateur 100% gratuit · Aucune carte bancaire requise · Devis directs</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <Link href="/marketplace" className="flex-1 sm:flex-none">
                <Button variant="secondary" size="md" fullWidth>
                  Explorer le catalogue
                </Button>
              </Link>
              <Link href={simulatorUrl} className="flex-1 sm:flex-none">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shadow-sm shadow-primary/30"
                >
                  Lancer mon simulateur IA
                </Button>
              </Link>
            </div>
          </div>
        </div>

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
    </section>
  );
}
