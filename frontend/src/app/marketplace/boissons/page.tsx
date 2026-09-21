'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Wine } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFc } from '@/config/landingPricing';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import { cn } from '@/lib/cn';
import {
  BEVERAGE_KINDS,
  BEVERAGE_KIND_LABELS,
  type BeverageBrandRow,
  type BeverageKind,
} from '@/lib/beverageBrands';

export default function MarketplaceDrinksPage() {
  const [brands, setBrands] = useState<BeverageBrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<BeverageKind | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/public/beverage-brands')
      .then((data) => {
        if (!cancelled) setBrands(Array.isArray(data.brands) ? data.brands : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les boissons.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.filter((brand) => {
      if (kind !== 'ALL' && brand.kind !== kind) return false;
      if (!q) return true;
      return [brand.name, brand.kindLabel, brand.producer, brand.country, brand.volumeLabel]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q));
    });
  }, [brands, kind, query]);

  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero
        compact
        title="Boissons et prix"
        description="Bières, boissons, vins et champagnes du catalogue EventMaster. Le prix affiché est le plus bas publié par un prestataire. Une promotion en cours remplace le tarif normal jusqu’à sa date de fin."
      >
        <MarketplacePublicNav active="drinks" />
      </PublicPageHero>
      <div className="page-container py-6 md:py-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="block min-w-0 sm:max-w-sm flex-1">
            <span className="sr-only">Rechercher une boisson</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, producteur, volume…"
              className="w-full min-h-11 px-3.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Familles de boissons">
            <KindPill active={kind === 'ALL'} label="Toutes" onClick={() => setKind('ALL')} />
            {BEVERAGE_KINDS.map((item) => (
              <KindPill
                key={item}
                active={kind === item}
                label={BEVERAGE_KIND_LABELS[item]}
                onClick={() => setKind(item)}
              />
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted" role="status">Chargement des boissons…</p>
        ) : error ? (
          <p className="text-sm text-rose-700" role="alert">{error}</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
            <Wine className="w-10 h-10 text-muted mx-auto mb-3" />
            <h2 className="font-semibold text-foreground">
              {brands.length === 0 ? 'Aucune boisson au catalogue' : 'Aucune boisson pour cette recherche'}
            </h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              {brands.length === 0
                ? 'Les boissons ajoutées par EventMaster apparaîtront ici, avec le prix prestataire dès qu’il est publié.'
                : 'Élargissez la famille ou le nom recherché.'}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {visible.map((brand) => (
              <li key={brand.id} className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
                <div className="aspect-[4/3] bg-surface-muted">
                  {brand.imageUrl ? (
                    <img
                      src={brand.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <Wine className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted">{brand.kindLabel}</p>
                  <h2 className="text-sm font-bold text-foreground leading-snug">{brand.name}</h2>
                  <p className="text-xs text-muted truncate">
                    {[brand.volumeLabel, brand.producer, brand.country].filter(Boolean).join(' · ') || 'Catalogue EventMaster'}
                  </p>
                  <p className="text-sm font-semibold text-foreground tabular-nums pt-1">
                    {brand.priceFromFc != null ? `Dès ${formatFc(brand.priceFromFc)}` : 'Tarif à venir'}
                  </p>
                  <p className="text-xs text-muted">
                    {brand.vendorCount
                      ? `${brand.vendorCount} prestataire${brand.vendorCount > 1 ? 's' : ''}`
                      : 'Aucun tarif publié'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicPageShell>
  );
}

function KindPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 px-3 rounded-full text-xs font-semibold border',
        active ? 'bg-primary-solid text-primary-foreground border-primary-solid' : 'border-border text-muted bg-surface',
      )}
    >
      {label}
    </button>
  );
}
