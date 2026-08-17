export type RdcCityName = 'Kinshasa' | 'Lubumbashi';

export type RdcBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type RdcCommune = {
  name: string;
  center: { lat: number; lng: number };
  neighborhoods: string[];
};

export type RdcCity = {
  name: RdcCityName;
  center: { lat: number; lng: number };
  bounds: RdcBounds;
  communes: RdcCommune[];
};

export const RDC_CITIES: RdcCity[] = [
  {
    name: 'Kinshasa',
    center: { lat: -4.325, lng: 15.322 },
    bounds: { south: -4.55, west: 15.12, north: -4.18, east: 16.32 },
    communes: [
      { name: 'Bandalungwa', center: { lat: -4.345, lng: 15.285 }, neighborhoods: ['Makelele', 'Salongo', 'Adoula', 'Kasa-Vubu II'] },
      { name: 'Barumbu', center: { lat: -4.318, lng: 15.328 }, neighborhoods: ['Barumbu', 'Télécom', 'Tshimanga'] },
      { name: 'Bumbu', center: { lat: -4.365, lng: 15.305 }, neighborhoods: ['Bumbu', 'Matadi-Kibala', 'Salongo'] },
      { name: 'Gombe', center: { lat: -4.305, lng: 15.313 }, neighborhoods: ['Gombe', 'Batetela', 'Golf', 'Premier Mai', 'Kinshasa'] },
      { name: 'Kalamu', center: { lat: -4.338, lng: 15.312 }, neighborhoods: ['Matonge', 'Yolo-Nord', 'Yolo-Sud', 'Kalamu'] },
      { name: 'Kasa-Vubu', center: { lat: -4.335, lng: 15.295 }, neighborhoods: ['Kasa-Vubu', 'Yolo', 'Onatra'] },
      { name: 'Kimbanseke', center: { lat: -4.445, lng: 15.390 }, neighborhoods: ['Kimbanseke', 'Kingasani', 'Mokali', 'Ngampani'] },
      { name: 'Kinshasa', center: { lat: -4.352, lng: 15.355 }, neighborhoods: ['Kinshasa', '17 Mai', 'Kingabwa-PE'] },
      { name: 'Kintambo', center: { lat: -4.322, lng: 15.268 }, neighborhoods: ['Kintambo', 'Camp Kokolo', 'Nganda', 'Salongo'] },
      { name: 'Kisenso', center: { lat: -4.430, lng: 15.340 }, neighborhoods: ['Kisenso', 'Mission', 'Libération'] },
      { name: 'Lemba', center: { lat: -4.405, lng: 15.310 }, neighborhoods: ['Righini', 'Livulu', 'Commercial', 'Mbanza-Lemba', 'Échangeur'] },
      { name: 'Limete', center: { lat: -4.365, lng: 15.345 }, neighborhoods: ['Kingabwa', '7e Rue', 'Résidentiel', 'Industriel', 'Salongo'] },
      { name: 'Lingwala', center: { lat: -4.325, lng: 15.305 }, neighborhoods: ['Lingwala', 'Marché', 'Victoire'] },
      { name: 'Makala', center: { lat: -4.375, lng: 15.295 }, neighborhoods: ['Makala', 'Kimbangu', 'Salongo'] },
      { name: 'Maluku', center: { lat: -4.250, lng: 16.050 }, neighborhoods: ['Maluku', 'Kingankati', 'Mbankana'] },
      { name: 'Masina', center: { lat: -4.390, lng: 15.390 }, neighborhoods: ['Sans Fil', 'Peloustore', 'Mandiangu', 'Masina 1', 'Masina 2'] },
      { name: 'Matete', center: { lat: -4.385, lng: 15.355 }, neighborhoods: ['Matete', 'Salongo', 'Debonhomme'] },
      { name: 'Mont-Ngafula', center: { lat: -4.445, lng: 15.270 }, neighborhoods: ['Kimwenza', 'Mitendi', 'Matadi-Kibala', 'Righini', 'Cité Verte'] },
      { name: 'Ndjili', center: { lat: -4.385, lng: 15.375 }, neighborhoods: ['Ndjili', 'Quartier 1', 'Quartier 7', 'Quartier 13', 'Brasserie'] },
      { name: 'Ngaba', center: { lat: -4.395, lng: 15.325 }, neighborhoods: ['Ngaba', 'Salongo', 'Mukulua'] },
      { name: 'Ngaliema', center: { lat: -4.335, lng: 15.245 }, neighborhoods: ['Ma Campagne', 'Binza Ozone', 'Binza Pigeon', 'Delvaux', 'Kinsuka', 'Mont Fleury'] },
      { name: 'Ngiri-Ngiri', center: { lat: -4.355, lng: 15.300 }, neighborhoods: ['Ngiri-Ngiri', 'Diulu', 'Salongo'] },
      { name: 'Nsele', center: { lat: -4.280, lng: 15.530 }, neighborhoods: ['Nsele', 'Kingabwa-PE', 'Mikonga'] },
      { name: 'Selembao', center: { lat: -4.385, lng: 15.270 }, neighborhoods: ['Selembao', 'Salongo', 'Kitega'] },
    ],
  },
  {
    name: 'Lubumbashi',
    center: { lat: -11.664, lng: 27.479 },
    bounds: { south: -11.82, west: 27.32, north: -11.52, east: 27.62 },
    communes: [
      { name: 'Lubumbashi', center: { lat: -11.664, lng: 27.479 }, neighborhoods: ['Centre-ville', 'Golf', 'Bel-Air', 'La Gavioua', 'Kalubwe'] },
      { name: 'Kenya', center: { lat: -11.678, lng: 27.455 }, neighborhoods: ['Kenya', 'Kigoma', 'Kigoma-Mission'] },
      { name: 'Kamalondo', center: { lat: -11.670, lng: 27.490 }, neighborhoods: ['Kamalondo', 'Gambela'] },
      { name: 'Katuba', center: { lat: -11.710, lng: 27.470 }, neighborhoods: ['Katuba', 'Kasapa', 'Karavia'] },
      { name: 'Kampemba', center: { lat: -11.650, lng: 27.510 }, neighborhoods: ['Kampemba', 'Hewa Bora', 'Kigoma'] },
      { name: 'Annexe', center: { lat: -11.640, lng: 27.430 }, neighborhoods: ['Kasapa', 'Karavia', 'Kalebuka', 'Kipushi-route'] },
      { name: 'Rwashi', center: { lat: -11.630, lng: 27.530 }, neighborhoods: ['Rwashi', 'Kawama', 'Kigoma'] },
    ],
  },
];

export function normalizeRdcCity(value?: string | null): RdcCityName | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'kinshasa' || raw === 'kin') return 'Kinshasa';
  if (raw === 'lubumbashi' || raw === 'lshi' || raw === 'l’shi' || raw === "l'shi") return 'Lubumbashi';
  return null;
}

export function findRdcCity(value?: string | null): RdcCity | null {
  const name = normalizeRdcCity(value);
  return RDC_CITIES.find((city) => city.name === name) || null;
}

export function communesForCity(value?: string | null): RdcCommune[] {
  return findRdcCity(value)?.communes || [];
}

export function findRdcCommune(city?: string | null, commune?: string | null): RdcCommune | null {
  const name = String(commune || '').trim().toLowerCase();
  if (!name) return null;
  return communesForCity(city).find((item) => item.name.toLowerCase() === name) || null;
}

export function neighborhoodsFor(city?: string | null, commune?: string | null): string[] {
  return findRdcCommune(city, commune)?.neighborhoods || [];
}

export function isAllowedRdcCity(value?: string | null): boolean {
  return Boolean(normalizeRdcCity(value));
}

export function pointInBounds(lat: number, lng: number, bounds: RdcBounds): boolean {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

export function pointInRdcCity(lat: number, lng: number, city?: string | null): boolean {
  const found = findRdcCity(city);
  if (!found) return false;
  return pointInBounds(lat, lng, found.bounds);
}

export function cityForPoint(lat: number, lng: number): RdcCity | null {
  return RDC_CITIES.find((city) => pointInBounds(lat, lng, city.bounds)) || null;
}

export function pointInAllowedRdcCities(lat: number, lng: number): boolean {
  return Boolean(cityForPoint(lat, lng));
}

export function leafletMaxBounds(bounds: RdcBounds): [[number, number], [number, number]] {
  return [
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  ];
}

export function nominatimViewbox(bounds: RdcBounds): string {
  return `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`;
}
