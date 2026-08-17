'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueResults from '@/components/CatalogueResults';
import CatalogueFilterBar, { CatalogueFilterField, catalogueSelectClass } from '@/components/CatalogueFilterBar';
import { Input, Pagination, paginateItems } from '@/components/ui';
import {
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  catalogueItemToMapMarker,
  isCatalogueMapView,
  serviceToCatalogueItem,
  type PublicService,
} from '@/lib/marketplace';
import { Loader2, MapPin } from 'lucide-react';

export default function MarketplaceServicesPage() {
  const { mode, setView } = useCatalogueView();
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [category, setCategory] = useState('');
  const [priceUnit, setPriceUnit] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const search = new URLSearchParams();
      if (q.trim()) search.set('q', q.trim());
      if (city.trim()) search.set('city', city.trim());
      if (commune.trim()) search.set('commune', commune.trim());
      if (neighborhood.trim()) search.set('neighborhood', neighborhood.trim());
      if (category) search.set('category', category);
      if (priceUnit) search.set('priceUnit', priceUnit);
      const data = await api.get(`/public/services${search.toString() ? `?${search}` : ''}`);
      setServices(data.services || []);
      setPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les prestataires.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => services.map(serviceToCatalogueItem), [services]);
  const markers = useMemo(
    () =>
      items
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [items],
  );

  const filterCount = [city, commune, neighborhood, category, priceUnit].filter((v) => v.trim()).length;
  const mapMode = isCatalogueMapView(mode);

  return (
    <PublicPageShell faqHref="/faq">
      {mode !== 'focus' && (
        <PublicPageHero
          chip="Catalogue"
          title="Trouvez un prestataire"
          description="Traiteur, photo, DJ… Filtrez par commune et tarif. En vue carte, seuls les prestataires enregistrés sur EventMaster apparaissent."
        >
          <MarketplacePublicNav active="services" />
        </PublicPageHero>
      )}

      <main className="page-container py-6 sm:py-10 flex-1 space-y-4 sm:space-y-6">
        {mode === 'focus' && <MarketplacePublicNav active="services" />}
        <CatalogueFilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Nom, prestataire…"
          view={mode}
          onViewChange={setView}
          onSubmit={load}
          filterCount={filterCount}
          showSubmit
          filters={
            <>
              <CatalogueFilterField label="Ville">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex. Kinshasa" leftIcon={<MapPin className="w-4 h-4" />} />
              </CatalogueFilterField>
              <CatalogueFilterField label="Commune">
                <Input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Ex. Gombe" />
              </CatalogueFilterField>
              <CatalogueFilterField label="Quartier">
                <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Quartier" />
              </CatalogueFilterField>
              <CatalogueFilterField label="Catégorie">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={catalogueSelectClass}>
                  <option value="">Toutes les catégories</option>
                  {SERVICE_CATEGORIES.map((id) => (
                    <option key={id} value={id}>{SERVICE_CATEGORY_LABELS[id]}</option>
                  ))}
                </select>
              </CatalogueFilterField>
              <CatalogueFilterField label="Tarif">
                <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} className={catalogueSelectClass}>
                  <option value="">Tous les tarifs</option>
                  {PRICE_UNIT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </CatalogueFilterField>
            </>
          }
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : mapMode ? (
          <MarketplaceLocationsMap
            markers={markers}
            listingSearch
            height={480}
            variant={mode === 'focus' ? 'focus' : 'default'}
          />
        ) : (
          <>
            <CatalogueResults
              items={paginateItems(items, page, PAGE_SIZE)}
              mode={mode}
              emptyTitle="Aucun prestataire pour ces filtres"
              emptyDescription="Élargissez la commune ou la catégorie, ou publiez une prestation depuis Marketplace."
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={items.length}
              onPageChange={setPage}
              itemLabel="prestataires"
            />
          </>
        )}
      </main>

      {mode !== 'focus' && (
        <PublicCtaBand
          title="Vous proposez un service ?"
          description="Publiez votre prestation avec zone d’intervention, médias et calendrier."
          primaryHref="/register"
          primaryLabel="Proposer mes services"
          secondaryHref="/contact"
          secondaryLabel="Nous contacter"
        />
      )}
    </PublicPageShell>
  );
}
