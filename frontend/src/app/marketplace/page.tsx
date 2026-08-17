'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueResults from '@/components/CatalogueResults';
import CatalogueFilterBar from '@/components/CatalogueFilterBar';
import { Pagination, paginateItems } from '@/components/ui';
import {
  catalogueItemToMapMarker,
  filterCatalogueItems,
  isCatalogueMapView,
  serviceToCatalogueItem,
  venueToCatalogueItem,
  type CatalogueItem,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';
import { Loader2 } from 'lucide-react';

export default function MarketplaceHubPage() {
  const { mode, setView } = useCatalogueView();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  useEffect(() => {
    async function load() {
      try {
        const [venuesData, servicesData] = await Promise.all([
          api.get('/public/venues').catch(() => ({ venues: [] })),
          api.get('/public/services').catch(() => ({ services: [] })),
        ]);
        setVenues(venuesData.venues || []);
        setServices(servicesData.services || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const items: CatalogueItem[] = useMemo(
    () => [
      ...venues.map(venueToCatalogueItem),
      ...services.map(serviceToCatalogueItem),
    ],
    [venues, services],
  );

  const visible = useMemo(() => filterCatalogueItems(items, query), [items, query]);

  useEffect(() => {
    setPage(1);
  }, [query, mode]);

  const markers = useMemo(
    () =>
      visible
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [visible],
  );

  const mapMode = isCatalogueMapView(mode);

  return (
    <PublicPageShell faqHref="/faq">
      {mode !== 'focus' && (
        <PublicPageHero
          chip="Catalogue"
          title="Salles et prestataires pour vos événements"
          description="Trouvez un lieu ou un professionnel enregistré sur EventMaster. Grille, liste, carte ou focus — la recherche sur la carte ne porte que sur ces fiches."
        >
          <MarketplacePublicNav active="hub" />
        </PublicPageHero>
      )}

      <main className="page-container py-6 sm:py-10 flex-1 space-y-4 sm:space-y-6">
        {mode === 'focus' && <MarketplacePublicNav active="hub" />}
        <CatalogueFilterBar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Nom, organisation, ville…"
          view={mode}
          onViewChange={setView}
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : mapMode ? (
          <div className="space-y-3">
            {mode !== 'focus' && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Salles
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--festive-accent)]" />
                  Prestataires
                </span>
                <span>Survolez un prestataire pour voir son rayon d’action.</span>
              </div>
            )}
            <MarketplaceLocationsMap
              markers={markers}
              listingSearch
              height={480}
              variant={mode === 'focus' ? 'focus' : 'default'}
            />
          </div>
        ) : (
          <>
            <CatalogueResults
              items={paginateItems(visible, page, PAGE_SIZE)}
              mode={mode}
              emptyTitle="Aucune fiche pour cette recherche"
              emptyDescription="Élargissez les mots-clés, ou publiez une salle / prestation depuis votre organisation."
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={visible.length}
              onPageChange={setPage}
              itemLabel="fiches"
            />
          </>
        )}
      </main>

      {mode !== 'focus' && (
        <PublicCtaBand
          title="Vous proposez une salle ou un service ?"
          description="Publiez une fiche depuis votre organisation EventMaster, avec photos, vidéos, carte et calendrier."
          primaryHref="/register"
          primaryLabel="Créer un compte"
          secondaryHref="/contact"
          secondaryLabel="Nous contacter"
        />
      )}
    </PublicPageShell>
  );
}
