import { RDC_CITIES, type RdcCityName } from '@/lib/rdcCities';

/**
 * Villes affichables sur le site public (mentions, hero, contact).
 * Le catalogue géo / simulateur reste limité aux villes de rdcCities.
 */
export const PLATFORM_CITY_CATALOG = [
  'Kinshasa',
  'Lubumbashi',
  'Goma',
  'Kisangani',
  'Bukavu',
  'Matadi',
  'Kolwezi',
] as const;

export type PlatformCityName = (typeof PLATFORM_CITY_CATALOG)[number];

export const DEFAULT_ENABLED_CITIES: PlatformCityName[] = ['Kinshasa', 'Lubumbashi', 'Goma'];

/** Villes pour lesquelles on a des données GPS / communes. */
export const MARKETPLACE_GPS_CITIES: readonly RdcCityName[] = RDC_CITIES.map((city) => city.name);

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
  return MARKETPLACE_GPS_CITIES.filter((name) => enabled.has(name));
}

export function formatCityList(cities: string[]): string {
  if (cities.length === 0) return 'une ville active';
  if (cities.length === 1) return cities[0];
  if (cities.length === 2) return `${cities[0]} ou ${cities[1]}`;
  return cities.join(' · ');
}

export function isEnabledMarketplaceCity(
  value: string | null | undefined,
  site?: { enabledCities?: string[] } | null,
): boolean {
  const name = String(value || '').trim().toLowerCase();
  if (!name) return false;
  return enabledMarketplaceCities(site).some((city) => name.includes(city.toLowerCase()));
}

export function resolveUsdExchangeRateCdf(value: unknown, fallback = 2800): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
