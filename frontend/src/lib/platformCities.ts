import { RDC_CITIES, type RdcCityName } from '@/lib/rdcCities';

/** Villes que le SuperAdmin peut activer (affichage public). */
export const PLATFORM_CITY_CATALOG = ['Kinshasa', 'Lubumbashi', 'Goma'] as const;
export type PlatformCityName = (typeof PLATFORM_CITY_CATALOG)[number];

export const DEFAULT_ENABLED_CITIES: PlatformCityName[] = ['Kinshasa', 'Lubumbashi', 'Goma'];

export function sanitizeEnabledCities(value: unknown): PlatformCityName[] {
  const allowed = new Set<string>(PLATFORM_CITY_CATALOG);
  const raw = Array.isArray(value) ? value : DEFAULT_ENABLED_CITIES;
  const picked = raw.map((item) => String(item || '').trim()).filter((item) => allowed.has(item));
  const ordered = PLATFORM_CITY_CATALOG.filter((city) => picked.includes(city));
  if (!ordered.includes('Kinshasa') && !ordered.includes('Lubumbashi')) {
    return ['Kinshasa', ...ordered];
  }
  return ordered.length > 0 ? ordered : ['Kinshasa'];
}

/** Villes affichées sur le site public (hero, mentions). */
export function enabledPublicCities(site?: { enabledCities?: string[] } | null): PlatformCityName[] {
  return sanitizeEnabledCities(site?.enabledCities);
}

/** Villes utilisables dans le catalogue et le simulateur (données géo). */
export function enabledMarketplaceCities(site?: { enabledCities?: string[] } | null): RdcCityName[] {
  const enabled = new Set(enabledPublicCities(site));
  return RDC_CITIES.map((city) => city.name).filter((name) => enabled.has(name));
}

export function formatCityList(cities: string[]): string {
  return cities.join(' · ');
}

export function resolveUsdExchangeRateCdf(value: unknown, fallback = 2800): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
