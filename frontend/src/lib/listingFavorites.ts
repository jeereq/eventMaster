'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { isServiceRentalCategory, type CatalogueItem, type ServiceCategory } from '@/lib/marketplace';

export type FavoriteKind = 'venue' | 'service';

export type FavoriteKey = `${FavoriteKind}:${string}`;

export type FavoriteListing = {
  kind: FavoriteKind;
  slug: string;
  title: string;
  orgName: string;
  location: string;
  coverUrl: string | null;
  priceFromFc: number | null;
  priceUnitLabel: string;
  categoryLabel?: string;
  category?: ServiceCategory;
  capacity?: number | null;
  href: string;
};

export function favoriteKey(kind: FavoriteKind, slug: string): FavoriteKey {
  return `${kind}:${slug}`;
}

export function favoriteToCatalogueItem(row: FavoriteListing): CatalogueItem {
  return {
    kind: row.kind,
    id: `${row.kind}:${row.slug}`,
    slug: row.slug,
    href: row.href,
    title: row.title,
    orgName: row.orgName,
    categoryLabel: row.categoryLabel || (row.kind === 'venue' ? 'Salle' : isServiceRentalCategory(row.category) ? 'Location' : 'Prestataire'),
    location: row.location,
    coverUrl: row.coverUrl,
    priceFromFc: row.priceFromFc,
    priceUnitLabel: row.priceUnitLabel,
    latitude: null,
    longitude: null,
    capacity: row.capacity ?? null,
    category: row.category,
  };
}

export function useListingFavorites() {
  const [keys, setKeys] = useState<Set<FavoriteKey>>(new Set());
  const [items, setItems] = useState<FavoriteListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/marketplace/favorites');
      const rows: FavoriteListing[] = data.items || [];
      setItems(rows);
      setKeys(new Set(rows.map((row) => favoriteKey(row.kind, row.slug))));
    } catch {
      setKeys(new Set());
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isFavorite = useCallback(
    (kind: FavoriteKind, slug: string) => keys.has(favoriteKey(kind, slug)),
    [keys],
  );

  const toggleFavorite = useCallback(async (kind: FavoriteKind, slug: string) => {
    const key = favoriteKey(kind, slug);
    const wasActive = keys.has(key);
    setKeys((prev) => {
      const next = new Set(prev);
      if (wasActive) next.delete(key);
      else next.add(key);
      return next;
    });
    if (wasActive) {
      setItems((prev) => prev.filter((row) => !(row.kind === kind && row.slug === slug)));
    }
    try {
      if (wasActive) {
        await api.delete(`/marketplace/favorites/${kind}/${encodeURIComponent(slug)}`);
      } else {
        await api.post('/marketplace/favorites', { kind, slug });
      }
    } catch {
      setKeys((prev) => {
        const next = new Set(prev);
        if (wasActive) next.add(key);
        else next.delete(key);
        return next;
      });
      if (wasActive) void load();
    }
  }, [keys, load]);

  return useMemo(
    () => ({ keys, items, loading, isFavorite, toggleFavorite, reload: load }),
    [keys, items, loading, isFavorite, toggleFavorite, load],
  );
}
