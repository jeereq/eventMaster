'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Wand2, Calculator, Users, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
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
  const { site } = usePlatformSite();
  const exchangeRate = resolveUsdExchangeRateCdf(site?.usdExchangeRateCdf);

  return (
    <section
      ref={revealRef}
      id="simulateur-ia"
      className="em-reveal em-landing-defer scroll-mt-20 py-8 sm:py-16 border-t border-border bg-gradient-to-b from-surface/80 via-surface-muted/30 to-surface/80 relative overflow-hidden em-landing-section-glow"
    >
      <div className="page-container relative z-10 space-y-6 sm:space-y-8">
        <div className="rounded-[var(--radius-card)] border border-primary/25 bg-surface p-5 sm:p-8 lg:p-10 shadow-lg shadow-primary/5 relative overflow-hidden">
          {/* Lueur subtile en fond */}
          <div
            className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"
            aria-hidden
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6 lg:gap-10 items-center">
            {/* Texte et présentation */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                <Wand2 className="w-3.5 h-3.5" aria-hidden />
                <span>Simulateur de Budget IA</span>
              </div>

              <div className="space-y-2">
                <h2 className="em-landing-heading text-xl sm:text-3xl text-foreground">
                  Trois formules budget réelles, composées en 1 clic
                </h2>
                <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
                  Indiquez vos invités, votre ville et vos envies : l’IA compose instantanément 3 formules chiffrées (Éco, Équilibré et Confort) à partir des salles et prestataires certifiés du catalogue.
                </p>
              </div>

              {/* Arguments clés */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted font-medium pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>3 packs chiffrés en FC & USD</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Salles, traiteurs et DJ vérifiés</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>4 simulations gratuites sans compte</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Taux officiel : 1 $ = {exchangeRate.toLocaleString('fr-FR')} FC</span>
                </li>
              </ul>

              {/* Boutons d'action */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <Button
                  href="/simulateur"
                  size="lg"
                  variant="primary"
                  className="justify-center shadow-md font-bold text-xs sm:text-sm min-h-11"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Ouvrir le simulateur de budget
                </Button>
                <Link
                  href="/marketplace"
                  className="inline-flex min-h-11 items-center justify-center px-4 rounded-[var(--radius-button)] text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition border border-border"
                >
                  Voir les prix du catalogue
                </Link>
              </div>
            </div>

            {/* Cartes d'aperçu de scénarios types avec liens directs */}
            <div className="space-y-2.5 bg-surface-muted/50 dark:bg-surface-muted/30 p-3 sm:p-4 rounded-2xl border border-border/80">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-primary" />
                  Exemples calculés par l’IA
                </span>
                <span className="text-xs text-muted tabular-nums">1 clic pour tester</span>
              </div>

              <div className="space-y-2">
                {SCENARIO_PREVIEWS.map((sc) => {
                  const usd = Math.round(sc.budgetFc / exchangeRate);
                  return (
                    <Link
                      key={sc.id}
                      href={`/simulateur?scenario=${sc.id}`}
                      className="group p-3 rounded-xl bg-surface border border-border hover:border-primary/50 hover:shadow-sm transition-all duration-200 block cursor-pointer touch-manipulation active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {sc.label}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {sc.tag}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary shrink-0" />
                          {sc.city} · {sc.guests}
                        </span>
                        <span className="font-bold text-foreground tabular-nums shrink-0 ml-2">
                          {formatFc(sc.budgetFc)} <span className="text-muted font-normal">(≈ {usd} $)</span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <p className="text-xs text-muted text-center pt-1">
                Besoin d’un budget sur-mesure ? Testez vos propres critères gratuitement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
