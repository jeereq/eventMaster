"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAllowedCity = normalizeAllowedCity;
exports.normalizeAllowedCommune = normalizeAllowedCommune;
exports.pointInCityBounds = pointInCityBounds;
exports.allowedCityPrismaFilter = allowedCityPrismaFilter;
const COMMUNES = {
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
const BOUNDS = {
    Kinshasa: { south: -4.55, west: 15.12, north: -4.18, east: 16.32 },
    Lubumbashi: { south: -11.82, west: 27.32, north: -11.52, east: 27.62 },
};
function normalizeAllowedCity(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw)
        return '';
    if (raw === 'kinshasa' || raw === 'kin')
        return 'Kinshasa';
    if (raw === 'lubumbashi' || raw === 'lshi' || raw === "l'shi" || raw === 'l’shi')
        return 'Lubumbashi';
    return null;
}
function normalizeAllowedCommune(city, commune) {
    const cityName = normalizeAllowedCity(city);
    const raw = String(commune || '').trim();
    if (!raw)
        return '';
    if (!cityName)
        return null;
    const match = COMMUNES[cityName].find((name) => name.toLowerCase() === raw.toLowerCase());
    return match || null;
}
function pointInCityBounds(lat, lng, city) {
    const bounds = BOUNDS[city];
    return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}
function allowedCityPrismaFilter(cityQuery) {
    const normalized = normalizeAllowedCity(cityQuery);
    if (cityQuery && normalized === null) {
        return { city: { in: [] } };
    }
    if (normalized) {
        return { city: { equals: normalized, mode: 'insensitive' } };
    }
    return {
        OR: [
            { city: { equals: 'Kinshasa', mode: 'insensitive' } },
            { city: { equals: 'Lubumbashi', mode: 'insensitive' } },
        ],
    };
}
