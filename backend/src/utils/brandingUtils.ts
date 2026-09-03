const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type TenantBranding = {
  primary?: string;
  accent?: string;
  sidebar?: string;
};

export type ResolvedBranding = {
  primary: string;
  accent: string;
  sidebar?: string;
};

/** Palette par défaut — même émeraude que le frontend (`--primary` / `--brand-accent`). */
export const DEFAULT_TENANT_BRANDING: ResolvedBranding = {
  primary: '#059669',
  accent: '#10b981',
};

/** Ancien indigo livré comme « défaut » : traité comme absence de marque perso. */
const LEGACY_DEFAULT_HEX = new Set(['#4f46e5', '#6366f1', '#4338ca']);

export function normalizeBrandHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!HEX.test(v)) return undefined;
  if (v.length === 4) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return v.toLowerCase();
}

export function isLegacyDefaultHex(hex?: string | null): boolean {
  return Boolean(hex && LEGACY_DEFAULT_HEX.has(hex.toLowerCase()));
}

export function isLegacyDefaultBrand(branding: TenantBranding | null | undefined): boolean {
  if (!branding) return true;
  if (branding.sidebar) return false;
  const primary = branding.primary?.toLowerCase();
  const accent = branding.accent?.toLowerCase();
  if (!primary) return true;
  if (!isLegacyDefaultHex(primary)) return false;
  return !accent || isLegacyDefaultHex(accent) || accent === primary;
}

export function parseBranding(raw: unknown): TenantBranding | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const primary = normalizeBrandHex(o.primary);
  const accent = normalizeBrandHex(o.accent);
  const sidebar = normalizeBrandHex(o.sidebar);
  if (!primary && !accent && !sidebar) return null;
  return { primary, accent, sidebar };
}

function readPlatformBrandOverride(): ResolvedBranding | null {
  try {
    // Chargement tardif : éviter un cycle avec platformSettingsService.
    const { loadPlatformSettings } = require('../services/platformSettingsService') as {
      loadPlatformSettings: () => { brandPrimary?: string; brandAccent?: string };
    };
    const settings = loadPlatformSettings();
    const primary = normalizeBrandHex(settings.brandPrimary);
    if (!primary || isLegacyDefaultHex(primary)) return null;
    return {
      primary,
      accent: normalizeBrandHex(settings.brandAccent) || primary,
    };
  } catch {
    return null;
  }
}

/** Couleurs du thème plateforme (réglages Super Admin), sinon émeraude. */
export function getPlatformBrand(): ResolvedBranding {
  return readPlatformBrandOverride() || { ...DEFAULT_TENANT_BRANDING };
}

export function resolveBranding(raw: unknown): ResolvedBranding {
  const parsed = parseBranding(raw);
  if (!parsed || isLegacyDefaultBrand(parsed)) {
    return getPlatformBrand();
  }
  const primary = parsed.primary || parsed.accent || DEFAULT_TENANT_BRANDING.primary;
  return {
    primary,
    accent: parsed.accent || primary,
    sidebar: parsed.sidebar,
  };
}

/** Branding orga à appliquer sur le portail invité ; `null` = laisser le thème plateforme. */
export function customTenantBranding(raw: unknown): TenantBranding | null {
  const parsed = parseBranding(raw);
  if (!parsed || isLegacyDefaultBrand(parsed)) return null;
  return parsed;
}

export function brandingRgb(hex: string): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (full.length !== 6) return '5, 150, 105';
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

/** Mélange un hex avec du blanc (0 = couleur d’origine, 1 = blanc). */
export function mixHexWithWhite(hex: string, whiteRatio = 0.88): string {
  const parts = brandingRgb(hex).split(',').map((part) => Number(part.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '#ecfdf5';
  const mix = (channel: number) => Math.round(channel * (1 - whiteRatio) + 255 * whiteRatio);
  return `#${parts.map((channel) => mix(channel).toString(16).padStart(2, '0')).join('')}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
