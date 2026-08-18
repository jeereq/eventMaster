'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  clampRadiusKm,
  type CatalogueGeoState,
  type CatalogueProximity,
} from '@/lib/marketplace';

const MARKETPLACE_RETURN_KEY = 'em-catalogue-return-marketplace';
const DASHBOARD_RETURN_KEY = 'em-catalogue-return-dashboard';

function pathOnly(href: string): string {
  return href.split('?')[0] || href;
}

function returnKeyFor(href: string): string | null {
  const path = pathOnly(href);
  if (path.startsWith('/dashboard')) return DASHBOARD_RETURN_KEY;
  if (path.startsWith('/marketplace')) return MARKETPLACE_RETURN_KEY;
  return null;
}

export function isCatalogueDetailPath(pathname: string): boolean {
  return (
    /^\/marketplace\/(salles|prestataires|evenements)\/[^/]+$/.test(pathname)
    || /^\/dashboard\/catalogue\/(salles|prestataires)\/[^/]+$/.test(pathname)
  );
}

export function rememberCatalogueReturn(href: string) {
  const path = pathOnly(href);
  if (!isCatalogueListPath(path)) return;
  const key = returnKeyFor(href);
  if (!key) return;
  try {
    sessionStorage.setItem(key, href);
  } catch {
    /* ignore */
  }
}

export function getCatalogueReturn(fallback: string, scope?: string): string {
  const key = returnKeyFor(scope || fallback);
  if (!key) return fallback;
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return fallback;
    const storedPath = pathOnly(stored);
    const expectedPrefix = key === DASHBOARD_RETURN_KEY ? '/dashboard' : '/marketplace';
    if (!stored.startsWith(expectedPrefix)) return fallback;
    if (isCatalogueDetailPath(storedPath)) return fallback;
    if (isCatalogueListPath(storedPath) || stored.startsWith(expectedPrefix)) return stored;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function isCatalogueListPath(pathname: string): boolean {
  return (
    pathname === '/marketplace'
    || pathname === '/marketplace/salles'
    || pathname === '/marketplace/prestataires'
    || pathname === '/marketplace/evenements'
    || pathname === '/dashboard/admin/catalogue'
    || pathname === '/dashboard/rooms'
    || pathname === '/dashboard/marketplace'
    || pathname === '/dashboard/bookings'
    || pathname === '/dashboard/catalogue'
  );
}

export function parseGeoFromSearch(params: URLSearchParams): CatalogueGeoState {
  const latRaw = params.get('lat');
  const lngRaw = params.get('lng');
  const lat = latRaw != null && latRaw !== '' ? Number(latRaw) : NaN;
  const lng = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : NaN;
  const hasGps = Number.isFinite(lat) && Number.isFinite(lng);
  const proximityRaw = params.get('proximity');
  const proximity: CatalogueProximity =
    proximityRaw === 'around' || proximityRaw === 'near'
      ? proximityRaw
      : hasGps
        ? 'around'
        : '';

  return {
    ...EMPTY_CATALOGUE_GEO,
    city: params.get('city') || '',
    commune: params.get('commune') || '',
    neighborhood: params.get('neighborhood') || '',
    street: params.get('street') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    minCapacity: params.get('minCapacity') || '',
    maxCapacity: params.get('maxCapacity') || '',
    availableFrom: params.get('availableFrom') || '',
    availableTo: params.get('availableTo') || '',
    proximity,
    nearPlace: params.get('nearPlace') || '',
    radiusKm: params.get('radiusKm') ? clampRadiusKm(Number(params.get('radiusKm'))) : 10,
    lat: hasGps ? lat : null,
    lng: hasGps ? lng : null,
  };
}

export function serializeCatalogueQuery(opts: {
  q?: string;
  page?: number;
  geo: CatalogueGeoState;
  extra?: Record<string, string>;
}): string {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  appendCatalogueGeoParams(params, opts.geo);
  if (opts.geo.proximity) params.set('proximity', opts.geo.proximity);
  if (opts.geo.proximity === 'near' && opts.geo.nearPlace.trim()) {
    params.set('nearPlace', opts.geo.nearPlace.trim());
  }
  for (const [key, value] of Object.entries(opts.extra || {})) {
    const trimmed = value.trim();
    if (trimmed && trimmed !== 'all') params.set(key, trimmed);
  }
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  return params.toString();
}

export function useRememberListReturn() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useEffect(() => {
    if (!isCatalogueListPath(pathname)) return;
    rememberCatalogueReturn(searchKey ? `${pathname}?${searchKey}` : pathname);
  }, [pathname, searchKey]);
}

export function useCatalogueQueryState<T extends CatalogueGeoState>(opts: {
  extraKeys: string[];
  emptyExtra: Record<string, string>;
  merge: (geo: CatalogueGeoState, extra: Record<string, string>) => T;
  split: (filters: T) => Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchKey = searchParams.toString();

  const parsed = useMemo(() => {
    const params = new URLSearchParams(searchKey);
    const extra: Record<string, string> = { ...opts.emptyExtra };
    for (const key of opts.extraKeys) {
      extra[key] = params.get(key) || opts.emptyExtra[key] || '';
    }
    const pageRaw = Number(params.get('page'));
    return {
      q: params.get('q') || '',
      page: Number.isFinite(pageRaw) && pageRaw > 1 ? Math.floor(pageRaw) : 1,
      filters: opts.merge(parseGeoFromSearch(params), extra),
    };
    // merge/split/emptyExtra are stable per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  const [inputQ, setInputQ] = useState(parsed.q);
  const [draft, setDraft] = useState(parsed.filters);

  useEffect(() => {
    setInputQ(parsed.q);
    setDraft(parsed.filters);
  }, [parsed]);

  const replaceQuery = useCallback(
    (filters: T, search: string, page: number) => {
      const qs = serializeCatalogueQuery({
        q: search,
        page,
        geo: filters,
        extra: opts.split(filters),
      });
      const href = qs ? `${pathname}?${qs}` : pathname;
      const current = searchKey ? `${pathname}?${searchKey}` : pathname;
      if (href === current) return;
      rememberCatalogueReturn(href);
      router.replace(href, { scroll: false });
    },
    [opts, pathname, router, searchKey],
  );

  useEffect(() => {
    rememberCatalogueReturn(searchKey ? `${pathname}?${searchKey}` : pathname);
  }, [pathname, searchKey]);

  useEffect(() => {
    if (inputQ === parsed.q) return;
    const timer = window.setTimeout(() => {
      replaceQuery(parsed.filters, inputQ, 1);
    }, inputQ.trim() ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [inputQ, parsed.q, parsed.filters, replaceQuery]);

  return {
    q: inputQ,
    setQ: setInputQ,
    /** Recherche déjà écrite dans l’URL (après debounce). */
    searchQ: parsed.q,
    applied: parsed.filters,
    draft,
    setDraft,
    page: parsed.page,
    applyFilters: (next: T) => replaceQuery(next, inputQ, 1),
    setPage: (nextPage: number) => replaceQuery(parsed.filters, parsed.q, nextPage),
  };
}
