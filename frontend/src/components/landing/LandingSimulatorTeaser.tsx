'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Wand2, Calculator, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import { useHideAiFabWhileVisible } from '@/components/landing/useHideAiFabWhileVisible';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { resolveUsdExchangeRateCdf } from '@/lib/platformCities';
import { formatFc } from '@/config/landingPricing';

const SCENARIO_PREVIEWS = [
  {
    id: 'mariage-kin',
    label: 'Mariage Élégance',
    city: 'Kinshasa (Gombe)',
    guests: '150 convives',
    budgetFc: 8_500_000,
    tag: 'Populaire',
  },
  {
    id: 'anniversaire-lshi',
    label: 'Anniversaire & Soirée',
    city: 'Lubumbashi',
    guests: '80 personnes',
    budgetFc: 3_800_000,
    tag: 'Fête',
  },
  {
    id: 'gala-pro',
    label: 'Gala d’Entreprise',
    city: 'Kinshasa',
    guests: '250 invités',
    budgetFc: 16_000_000,
    tag: 'Corporate',
  },
];

export default function LandingSimulatorTeaser() {
  const revealRef = useLandingReveal<HTMLElement>();
  useHideAiFabWhileVisible(revealRef);
  const { site } = usePlatformSite();
  const exchangeRate = resolveUsdExchangeRateCdf(site?.usdExchangeRateCdf);
  const isBudgetBlocked = site?.studioVisibility?.budget === false;

  const checklist = [
    `Chiffrage immédiat en CDF & USD${isBudgetBlocked ? ' (À venir)' : ''}`,
    'Salles et prestataires certifiés',
    isBudgetBlocked ? 'Tarifs transparents catalogue' : 'Simulations gratuites sans compte',
    `Taux officiel : 1 $ = ${exchangeRate.toLocaleString('fr-FR')} FC`,
  ];

  return (
    <section
      ref={revealRef}
      id="simulateur-ia"
      className="em-reveal em-landing-defer scroll-mt-20 py-8 sm:py-14 border-t border-border bg-gradient-to-b from-surface/80 via-surface-muted/30 to-surface/80 relative overflow-hidden em-landing-section-glow"
    >
      <div className="page-container relative z-10">
        <div
          className={`rounded-[var(--radius-card)] border bg-surface p-5 sm:p-8 lg:p-10 shadow-lg relative overflow-hidden ${
            isBudgetBlocked
              ? 'border-amber-500/30 shadow-amber-500/5'
              : 'border-primary/25 shadow-primary/5'
          }`}
        >
          {/* Lueur subtile en fond */}
          <div
            className={`absolute top-0 left-0 -ml-24 -mt-24 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
              isBudgetBlocked ? 'bg-amber-500/10' : 'bg-primary/10'
            }`}
            aria-hidden
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-7 lg:gap-12 items-center">
            {/* Texte et présentation */}
            <div className="flex flex-col gap-5 sm:gap-6">
              <div
                className={`self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isBudgetBlocked
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300'
                    : 'bg-primary/10 border border-primary/20 text-primary'
                }`}
              >
                {isBudgetBlocked ? (
                  <>
                    <Clock className="w-3.5 h-3.5" aria-hidden />
                    <span>Fonctionnalité à venir</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" aria-hidden />
                    <span>Simulateur de Budget IA</span>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="em-landing-heading text-2xl sm:text-4xl text-foreground text-balance">
                  {isBudgetBlocked
                    ? '3 formules budget automatiques'
                    : '3 formules budget clés en main en 1 clic'}
                </h2>
                <p className="text-sm sm:text-base text-muted leading-relaxed max-w-xl text-pretty">
                  {isBudgetBlocked
                    ? 'Bientôt disponible : composition automatique de 3 formules (Éco, Équilibré, Confort) selon vos critères.'
                    : 'Indiquez vos invités et votre ville : l’IA compose 3 formules chiffrées (Éco, Équilibré, Confort) avec les prestataires certifiés.'}
                </p>
              </div>

              {/* Arguments clés */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-foreground/80" role="list">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <Button
                  href="/simulateur"
                  size="lg"
                  variant={isBudgetBlocked ? 'secondary' : 'primary'}
                  className="justify-center shadow-md font-bold text-sm min-h-11"
                  rightIcon={isBudgetBlocked ? <Clock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                >
                  {isBudgetBlocked ? 'Découvrir la fonctionnalité' : 'Ouvrir le simulateur'}
                </Button>
                <Link
                  href="/marketplace"
                  className="inline-flex min-h-11 items-center justify-center px-5 rounded-[var(--radius-button)] text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-surface-muted transition border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Voir les tarifs
                </Link>
              </div>
            </div>

            {/* Cartes d'aperçu de scénarios types avec liens directs */}
            <div className="bg-surface-muted/60 dark:bg-surface-muted/30 p-3 sm:p-4 rounded-2xl border border-border/80">
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" aria-hidden />
                  {isBudgetBlocked ? 'Aperçu des scénarios types' : 'Exemples calculés par l’IA'}
                </span>
                <span className="text-xs font-medium text-muted">
                  {isBudgetBlocked ? 'À venir' : '1 clic pour tester'}
                </span>
              </div>

              <ul className="space-y-2" role="list">
                {SCENARIO_PREVIEWS.map((sc) => {
                  const usd = Math.round(sc.budgetFc / exchangeRate);
                  return (
                    <li key={sc.id}>
                      <Link
                        href={`/simulateur?scenario=${sc.id}`}
                        className="group flex items-center gap-3 p-3.5 sm:p-4 rounded-xl bg-surface border border-border hover:border-primary/50 hover:shadow-sm transition-all duration-200 cursor-pointer touch-manipulation active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-x-4 gap-y-2">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                {sc.label}
                              </span>
                              <span
                                className={`text-[0.6875rem] leading-none font-semibold px-2 py-1 rounded-full border shrink-0 ${
                                  isBudgetBlocked
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}
                              >
                                {isBudgetBlocked ? 'À venir' : sc.tag}
                              </span>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-muted">
                              <MapPin className="w-3 h-3 text-primary shrink-0" aria-hidden />
                              <span className="truncate">{sc.city} · {sc.guests}</span>
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0.5 shrink-0">
                            <span className="text-sm sm:text-base font-bold text-foreground tabular-nums whitespace-nowrap">
                              {formatFc(sc.budgetFc)}
                            </span>
                            <span className="text-xs text-muted tabular-nums whitespace-nowrap">
                              ≈ {usd.toLocaleString('fr-FR')} $
                            </span>
                          </div>
                        </div>
                        <ArrowRight
                          className="w-4 h-4 text-muted shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <p className="text-xs text-muted text-center pt-3 px-2 text-pretty">
                {isBudgetBlocked
                  ? 'Cette fonctionnalité sera activée dans une prochaine version.'
                  : 'Besoin d’un budget sur-mesure ? Testez vos propres critères gratuitement.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
