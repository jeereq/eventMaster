"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAllowedCity = normalizeAllowedCity;
exports.normalizeAllowedCommune = normalizeAllowedCommune;
exports.pointInCityBounds = pointInCityBounds;
exports.enabledMarketplaceCities = enabledMarketplaceCities;
exports.allowedCityPrismaFilter = allowedCityPrismaFilter;
const platformSettingsService_1 = require("../services/platformSettingsService");
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
function enabledMarketplaceCities() {
    return (0, platformSettingsService_1.sanitizeEnabledCities)((0, platformSettingsService_1.loadPlatformSettings)().enabledCities).filter((city) => city === 'Kinshasa' || city === 'Lubumbashi');
}
function allowedCityPrismaFilter(cityQuery) {
    const enabled = enabledMarketplaceCities();
    const normalized = normalizeAllowedCity(cityQuery);
    if (cityQuery && (normalized === null || (normalized && !enabled.includes(normalized)))) {
        return { city: { in: [] } };
    }
    if (normalized && enabled.includes(normalized)) {
        return { city: { equals: normalized, mode: 'insensitive' } };
    }
    if (enabled.length === 1) {
        return { city: { equals: enabled[0], mode: 'insensitive' } };
    }
    if (enabled.length === 0) {
        return { city: { in: [] } };
    }
    return {
        OR: enabled.map((name) => ({ city: { equals: name, mode: 'insensitive' } })),
    };
}
