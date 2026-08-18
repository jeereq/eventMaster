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

export const DEFAULT_TENANT_BRANDING: ResolvedBranding = {
  primary: '#4f46e5',
  accent: '#6366f1',
};

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

export function parseBranding(raw: unknown): TenantBranding | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const primary = normalizeBrandHex(o.primary);
  const accent = normalizeBrandHex(o.accent);
  const sidebar = normalizeBrandHex(o.sidebar);
  if (!primary && !accent && !sidebar) return null;
  return { primary, accent, sidebar };
}

export function resolveBranding(raw: unknown): ResolvedBranding {
  const parsed = parseBranding(raw);
  const primary = parsed?.primary || DEFAULT_TENANT_BRANDING.primary;
  return {
    primary,
    accent: parsed?.accent || primary,
    sidebar: parsed?.sidebar,
  };
}

export function brandingRgb(hex: string): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (full.length !== 6) return '79, 70, 229';
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

/** Mélange un hex avec du blanc (0 = couleur d’origine, 1 = blanc). */
export function mixHexWithWhite(hex: string, whiteRatio = 0.88): string {
  const parts = brandingRgb(hex).split(',').map((part) => Number(part.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '#eef2ff';
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
