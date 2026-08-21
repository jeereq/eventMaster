"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TENANT_BRANDING = void 0;
exports.normalizeBrandHex = normalizeBrandHex;
exports.parseBranding = parseBranding;
exports.resolveBranding = resolveBranding;
exports.brandingRgb = brandingRgb;
exports.mixHexWithWhite = mixHexWithWhite;
exports.escapeHtml = escapeHtml;
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
exports.DEFAULT_TENANT_BRANDING = {
    primary: '#4f46e5',
    accent: '#6366f1',
};
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
function resolveBranding(raw) {
    const parsed = parseBranding(raw);
    const primary = parsed?.primary || exports.DEFAULT_TENANT_BRANDING.primary;
    return {
        primary,
        accent: parsed?.accent || primary,
        sidebar: parsed?.sidebar,
    };
}
function brandingRgb(hex) {
    const raw = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    if (full.length !== 6)
        return '79, 70, 229';
    const num = parseInt(full, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}
/** Mélange un hex avec du blanc (0 = couleur d’origine, 1 = blanc). */
function mixHexWithWhite(hex, whiteRatio = 0.88) {
    const parts = brandingRgb(hex).split(',').map((part) => Number(part.trim()));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n)))
        return '#eef2ff';
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
