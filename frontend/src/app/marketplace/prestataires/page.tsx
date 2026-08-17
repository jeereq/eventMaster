'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  PRICE_UNIT_OPTIONS,
  RADIUS_KM_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  formatLocationLine,
  formatQuotaLabel,
  type PublicService,
} from '@/lib/marketplace';
import { geocodeLocation, type GeoPlace } from '@/lib/leafletLoader';
import { ArrowRight, Loader2, MapPin, Search, Sparkles } from 'lucide-react';

const fieldClass = 'w-full px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm';

export default function MarketplaceServicesPage() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [around, setAround] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [category, setCategory] = useState('');
  const [priceUnit, setPriceUnit] = useState('');
  const [error, setError] = useState('');
  const [mapOrigin, setMapOrigin] = useState<GeoPlace | null>(null);

  const load = async (origin: GeoPlace | null = mapOrigin) => {
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
      const radius = radiusKm || (origin ? '15' : '');
      if (origin) {
        search.set('lat', String(origin.lat));
        search.set('lng', String(origin.lng));
        search.set('radiusKm', radius);
      } else if (around.trim() && radius) {
        const geo = await geocodeLocation(`${around.trim()}, RD Congo`);
        if (geo) {
          search.set('lat', String(geo.lat));
          search.set('lng', String(geo.lng));
          search.set('radiusKm', radius);
        }
      }
      const data = await api.get(`/public/services${search.toString() ? `?${search}` : ''}`);
      setServices(data.services || []);
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

  const markers = useMemo(
    () =>
      services
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s.slug,
          lat: s.latitude as number,
          lng: s.longitude as number,
          title: s.title,
          href: `/marketplace/prestataires/${s.slug}`,
          subtitle: [
            formatLocationLine(s),
            s.coverageRadiusKm ? `rayon ${s.coverageRadiusKm} km` : null,
          ].filter(Boolean).join(' · ') || undefined,
        })),
    [services],
  );

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
            Trouvez un prestataire
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Traiteur, photo, DJ… Filtrez par commune, rayon d’intervention et type de tarif (tête, heure, jour, quota).
          </p>
          <MarketplacePublicNav active="services" />
        </div>
      </section>

      <main className="page-container py-8 flex-1 space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMapOrigin(null);
            load(null);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, prestataire…" leftIcon={<Search className="w-4 h-4" />} />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" leftIcon={<MapPin className="w-4 h-4" />} />
          <Input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Commune" />
          <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Quartier" />
          <Input value={around} onChange={(e) => setAround(e.target.value)} placeholder="Autour de (lieu)" />
          <select value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} className={fieldClass}>
            <option value="">Rayon — tous</option>
            {RADIUS_KM_OPTIONS.map((km) => (
              <option key={km} value={km}>{km} km</option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
            <option value="">Toutes les catégories</option>
            {SERVICE_CATEGORIES.map((id) => (
              <option key={id} value={id}>{SERVICE_CATEGORY_LABELS[id]}</option>
            ))}
          </select>
          <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} className={fieldClass}>
            <option value="">Tous les tarifs</option>
            {PRICE_UNIT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">Rechercher</Button>
          </div>
        </form>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Carte des prestataires</h2>
          <MarketplaceLocationsMap
            markers={markers}
            searchable
            searchCenter={mapOrigin}
            radiusKm={Number(radiusKm || (mapOrigin ? 15 : 0))}
            onPlaceSelect={(place) => {
              setAround(place.label);
              if (!radiusKm) setRadiusKm('15');
              setMapOrigin(place);
              void load(place);
            }}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 px-6 border border-border rounded-[var(--radius-card)] bg-surface">
            <Sparkles className="w-10 h-10 text-muted mx-auto mb-3" />
            <h2 className="font-semibold">Aucun prestataire pour ces filtres</h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto">
              Élargissez le rayon ou la commune, ou publiez une prestation depuis Marketplace.
            </p>
            <Link href="/register" className="inline-block mt-5">
              <Button size="sm">Proposer mes services</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/marketplace/prestataires/${service.slug}`}
                className="group bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden hover:border-primary/40 transition"
              >
                <div className="aspect-[16/10] bg-surface-muted overflow-hidden">
                  {service.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {service.categoryLabel}
                  </p>
                  <h2 className="font-display font-semibold group-hover:text-primary transition">{service.title}</h2>
                  <p className="text-xs text-muted truncate">{service.orgName}</p>
                  <p className="text-xs text-muted">
                    {[formatLocationLine(service), service.coverageRadiusKm ? `rayon ${service.coverageRadiusKm} km` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {formatQuotaLabel(service.quotaMin, service.quotaMax) && (
                    <p className="text-xs text-muted">{formatQuotaLabel(service.quotaMin, service.quotaMax)}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold">
                      {service.priceFromFc != null ? `Dès ${formatFc(service.priceFromFc)}` : 'Sur devis'}
                      <span className="block text-[11px] font-normal text-muted">{service.priceUnitLabel}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Voir <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter faqHref="/faq" />
    </div>
  );
}
