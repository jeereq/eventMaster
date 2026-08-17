export type AllowedRdcCity = 'Kinshasa' | 'Lubumbashi';

export type RdcBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const COMMUNES: Record<AllowedRdcCity, string[]> = {
  Kinshasa: [
    'Bandalungwa', 'Barumbu', 'Bumbu', 'Gombe', 'Kalamu', 'Kasa-Vubu', 'Kimbanseke',
    'Kinshasa', 'Kintambo', 'Kisenso', 'Lemba', 'Limete', 'Lingwala', 'Makala',
    'Maluku', 'Masina', 'Matete', 'Mont-Ngafula', 'Ndjili', 'Ngaba', 'Ngaliema',
    'Ngiri-Ngiri', 'Nsele', 'Selembao',
  ],
  Lubumbashi: [
    'Lubumbashi', 'Kenya', 'Kamalondo', 'Katuba', 'Kampemba', 'Annexe', 'Rwashi',
  ],
};

const BOUNDS: Record<AllowedRdcCity, RdcBounds> = {
  Kinshasa: { south: -4.55, west: 15.12, north: -4.18, east: 16.32 },
  Lubumbashi: { south: -11.82, west: 27.32, north: -11.52, east: 27.62 },
};

export function normalizeAllowedCity(value: unknown): AllowedRdcCity | '' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'kinshasa' || raw === 'kin') return 'Kinshasa';
  if (raw === 'lubumbashi' || raw === 'lshi' || raw === "l'shi" || raw === 'l’shi') return 'Lubumbashi';
  return null;
}

export function normalizeAllowedCommune(city: unknown, commune: unknown): string | '' | null {
  const cityName = normalizeAllowedCity(city);
  const raw = String(commune || '').trim();
  if (!raw) return '';
  if (!cityName) return null;
  const match = COMMUNES[cityName].find((name) => name.toLowerCase() === raw.toLowerCase());
  return match || null;
}

export function pointInCityBounds(lat: number, lng: number, city: AllowedRdcCity): boolean {
  const bounds = BOUNDS[city];
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

export function allowedCityPrismaFilter(cityQuery?: string) {
  const normalized = normalizeAllowedCity(cityQuery);
  if (cityQuery && normalized === null) {
    return { city: { in: [] as string[] } };
  }
  if (normalized) {
    return { city: { equals: normalized, mode: 'insensitive' as const } };
  }
  return {
    OR: [
      { city: { equals: 'Kinshasa', mode: 'insensitive' as const } },
      { city: { equals: 'Lubumbashi', mode: 'insensitive' as const } },
    ],
  };
}
