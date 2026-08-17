'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import { Button } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import type { PublicService, PublicVenue } from '@/lib/marketplace';
import { ArrowRight, Building2, Loader2, Sparkles } from 'lucide-react';

export default function MarketplaceHubPage() {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [venuesData, servicesData] = await Promise.all([
          api.get('/public/venues').catch(() => ({ venues: [] })),
          api.get('/public/services').catch(() => ({ services: [] })),
        ]);
        setVenues((venuesData.venues || []).slice(0, 6));
        setServices((servicesData.services || []).slice(0, 6));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <CelebrateMood />
      <SiteHeader variant="contact" />
      <section className="border-b border-border">
        <div className="page-container py-12 sm:py-16 space-y-4 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--festive-accent)]">
            Marketplace
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight">
            Salles et prestataires pour vos événements
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Trouvez un lieu, un traiteur, un DJ ou un photographe. Devis libre, ou réservation de date
            (acompte hors plateforme, commission vendeur 8 % distincte de l’abonnement SaaS).
          </p>
          <MarketplacePublicNav active="hub" />
        </div>
      </section>

      <main className="page-container py-10 flex-1 space-y-12">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Salles</h2>
                  <p className="text-xs text-muted mt-1">Espaces publiés avec capacité et plan 2D.</p>
                </div>
                <Link href="/marketplace/salles" className="text-xs font-semibold text-primary hover:underline">
                  Tout voir
                </Link>
              </div>
              {venues.length === 0 ? (
                <p className="text-sm text-muted border border-border rounded-[var(--radius-card)] px-4 py-8 text-center">
                  Aucune salle publiée pour le moment.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {venues.map((venue) => (
                    <Link
                      key={venue.slug}
                      href={`/marketplace/salles/${venue.slug}`}
                      className="bg-surface border border-border rounded-[var(--radius-card)] p-4 hover:border-primary/40 transition space-y-2"
                    >
                      <Building2 className="w-4 h-4 text-primary" />
                      <h3 className="font-display font-semibold">{venue.headline}</h3>
                      <p className="text-xs text-muted">{[venue.city, venue.orgName].filter(Boolean).join(' · ')}</p>
                      <p className="text-sm font-semibold">
                        {venue.priceFromFc != null ? `Dès ${formatFc(venue.priceFromFc)}` : 'Sur devis'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Prestataires</h2>
                  <p className="text-xs text-muted mt-1">Traiteur, photo, DJ, déco, sécurité…</p>
                </div>
                <Link href="/marketplace/prestataires" className="text-xs font-semibold text-primary hover:underline">
                  Tout voir
                </Link>
              </div>
              {services.length === 0 ? (
                <p className="text-sm text-muted border border-border rounded-[var(--radius-card)] px-4 py-8 text-center">
                  Aucun prestataire publié pour le moment.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/marketplace/prestataires/${service.slug}`}
                      className="bg-surface border border-border rounded-[var(--radius-card)] p-4 hover:border-primary/40 transition space-y-2"
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{service.categoryLabel}</p>
                      <h3 className="font-display font-semibold">{service.title}</h3>
                      <p className="text-xs text-muted">{[service.city, service.orgName].filter(Boolean).join(' · ')}</p>
                      <p className="text-sm font-semibold">
                        {service.priceFromFc != null ? `Dès ${formatFc(service.priceFromFc)}` : 'Sur devis'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <div className="border border-border rounded-[var(--radius-card)] p-6 bg-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-semibold">Vous proposez une salle ou un service ?</h2>
            <p className="text-sm text-muted mt-1">Publiez une fiche depuis votre organisation EventMaster.</p>
          </div>
          <Link href="/register">
            <Button rightIcon={<ArrowRight className="w-4 h-4" />}>Créer un compte</Button>
          </Link>
        </div>
      </main>
      <SiteFooter faqHref="/faq" />
    </div>
  );
}
