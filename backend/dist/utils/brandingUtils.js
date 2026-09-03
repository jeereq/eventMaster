"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TENANT_BRANDING = void 0;
exports.normalizeBrandHex = normalizeBrandHex;
exports.isLegacyDefaultHex = isLegacyDefaultHex;
exports.isLegacyDefaultBrand = isLegacyDefaultBrand;
exports.parseBranding = parseBranding;
exports.getPlatformBrand = getPlatformBrand;
exports.resolveBranding = resolveBranding;
exports.customTenantBranding = customTenantBranding;
exports.brandingRgb = brandingRgb;
exports.mixHexWithWhite = mixHexWithWhite;
exports.escapeHtml = escapeHtml;
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** Palette par défaut — même émeraude que le frontend (`--primary` / `--brand-accent`). */
exports.DEFAULT_TENANT_BRANDING = {
    primary: '#059669',
    accent: '#10b981',
};
/** Ancien indigo livré comme « défaut » : traité comme absence de marque perso. */
const LEGACY_DEFAULT_HEX = new Set(['#4f46e5', '#6366f1', '#4338ca']);
function normalizeBrandHex(value) {
    if (typeof value !== 'string')
        return undefined;
    const v = value.trim();
    if (!HEX.test(v))
        return undefined;
    if (v.length === 4) {
        const r = v[1];
        const g = v[2];
        const b = v[3];
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return v.toLowerCase();
}
function isLegacyDefaultHex(hex) {
    return Boolean(hex && LEGACY_DEFAULT_HEX.has(hex.toLowerCase()));
}
function isLegacyDefaultBrand(branding) {
    if (!branding)
        return true;
    if (branding.sidebar)
        return false;
    const primary = branding.primary?.toLowerCase();
    const accent = branding.accent?.toLowerCase();
    if (!primary)
        return true;
    if (!isLegacyDefaultHex(primary))
        return false;
    return !accent || isLegacyDefaultHex(accent) || accent === primary;
}
function parseBranding(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const o = raw;
    const primary = normalizeBrandHex(o.primary);
    const accent = normalizeBrandHex(o.accent);
    const sidebar = normalizeBrandHex(o.sidebar);
    if (!primary && !accent && !sidebar)
        return null;
    return { primary, accent, sidebar };
}
function readPlatformBrandOverride() {
    try {
        // Chargement tardif : éviter un cycle avec platformSettingsService.
        const { loadPlatformSettings } = require('../services/platformSettingsService');
        const settings = loadPlatformSettings();
        const primary = normalizeBrandHex(settings.brandPrimary);
        if (!primary || isLegacyDefaultHex(primary))
            return null;
        return {
            primary,
            accent: normalizeBrandHex(settings.brandAccent) || primary,
        };
    }
    catch {
        return null;
    }
}
/** Couleurs du thème plateforme (réglages Super Admin), sinon émeraude. */
function getPlatformBrand() {
    return readPlatformBrandOverride() || { ...exports.DEFAULT_TENANT_BRANDING };
}
function resolveBranding(raw) {
    const parsed = parseBranding(raw);
    if (!parsed || isLegacyDefaultBrand(parsed)) {
        return getPlatformBrand();
    }
    const primary = parsed.primary || parsed.accent || exports.DEFAULT_TENANT_BRANDING.primary;
    return {
        primary,
        accent: parsed.accent || primary,
        sidebar: parsed.sidebar,
    };
}
/** Branding orga à appliquer sur le portail invité ; `null` = laisser le thème plateforme. */
function customTenantBranding(raw) {
    const parsed = parseBranding(raw);
    if (!parsed || isLegacyDefaultBrand(parsed))
        return null;
    return parsed;
}
function brandingRgb(hex) {
    const raw = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    if (full.length !== 6)
        return '5, 150, 105';
    const num = parseInt(full, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}
/** Mélange un hex avec du blanc (0 = couleur d’origine, 1 = blanc). */
function mixHexWithWhite(hex, whiteRatio = 0.88) {
    const parts = brandingRgb(hex).split(',').map((part) => Number(part.trim()));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n)))
        return '#ecfdf5';
    const mix = (channel) => Math.round(channel * (1 - whiteRatio) + 255 * whiteRatio);
    return `#${parts.map((channel) => mix(channel).toString(16).padStart(2, '0')).join('')}`;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
