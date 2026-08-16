/**
 * Palette de marque EventMaster — configurable.
 *
 * Priorité d’application :
 * 1. Branding tenant (AuthContext → applyBrandToDocument)
 * 2. Variables d’environnement NEXT_PUBLIC_BRAND_*
 * 3. Palette par défaut ci-dessous
 *
 * Exemple .env.local :
 *   NEXT_PUBLIC_BRAND_PRIMARY=#0f766e
 *   NEXT_PUBLIC_BRAND_ACCENT=#14b8a6
 *   NEXT_PUBLIC_BRAND_AUTH_FROM=#0f172a
 */

export type TenantBranding = {
  primary?: string;
  accent?: string;
  sidebar?: string;
  /** Fond panneau auth (dégradé départ) */
  authFrom?: string;
  authVia?: string;
  authTo?: string;
};

/** Palette par défaut — indigo EventMaster (Asana-adjacent). */
export const DEFAULT_BRAND_PALETTE = {
  primary: '#4f46e5',
  primaryHover: '#4338ca',
  accent: '#6366f1',
  /** Panneau marketing auth (clair → sombre) */
  authFrom: '#312e81',
  authVia: '#1e1b4b',
  authTo: '#0f172a',
  authGlow: '79, 70, 229', // RGB du primary pour blur/glow
};

export type BrandPalette = {
  primary: string;
  primaryHover: string;
  accent: string;
  authFrom: string;
  authVia: string;
  authTo: string;
  authGlow: string;
};

export const DEFAULT_BRANDING: Required<Pick<TenantBranding, 'primary' | 'accent'>> = {
  primary: DEFAULT_BRAND_PALETTE.primary,
  accent: DEFAULT_BRAND_PALETTE.accent,
};

function envHex(key: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  const v = process.env[key]?.trim();
  if (!v || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return undefined;
  return v;
}

/** Résout la palette active (env + défauts), sans branding tenant. */
export function resolveDefaultBrandPalette(): BrandPalette {
  const primary = envHex('NEXT_PUBLIC_BRAND_PRIMARY') || DEFAULT_BRAND_PALETTE.primary;
  const accent = envHex('NEXT_PUBLIC_BRAND_ACCENT') || DEFAULT_BRAND_PALETTE.accent;
  return {
    primary,
    primaryHover: adjustHex(primary, -12),
    accent,
    authFrom: envHex('NEXT_PUBLIC_BRAND_AUTH_FROM') || DEFAULT_BRAND_PALETTE.authFrom,
    authVia: envHex('NEXT_PUBLIC_BRAND_AUTH_VIA') || DEFAULT_BRAND_PALETTE.authVia,
    authTo: envHex('NEXT_PUBLIC_BRAND_AUTH_TO') || DEFAULT_BRAND_PALETTE.authTo,
    authGlow: hexToRgbChannels(primary),
  };
}

/** Assombrit ou éclaircit un hex pour hover / muted. */
export function adjustHex(hex: string, percent: number): string {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (full.length !== 6) return hex;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgbChannels(hex: string): string {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (full.length !== 6) return DEFAULT_BRAND_PALETTE.authGlow;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 0xff}, ${(num >> 8) & 0xff}, ${num & 0xff}`;
}

function setAuthPanelVars(
  root: HTMLElement,
  branding: TenantBranding | null | undefined,
  defaults: BrandPalette,
) {
  const primary = branding?.primary || defaults.primary;
  root.style.setProperty('--auth-from', branding?.authFrom || defaults.authFrom);
  root.style.setProperty('--auth-via', branding?.authVia || defaults.authVia);
  root.style.setProperty('--auth-to', branding?.authTo || defaults.authTo);
  root.style.setProperty('--auth-glow', hexToRgbChannels(primary));
}

export function applyBrandToDocument(branding?: TenantBranding | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const defaults = resolveDefaultBrandPalette();
  const primary = branding?.primary || defaults.primary;
  const accent = branding?.accent || branding?.primary || defaults.accent;
  const primaryHover = adjustHex(primary, -12);

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-hover', primaryHover);
  root.style.setProperty('--brand-accent', accent);
  setAuthPanelVars(root, branding, defaults);

  if (branding?.sidebar) {
    root.style.setProperty('--sidebar', branding.sidebar);
  } else {
    root.style.removeProperty('--sidebar');
  }
}

/** Applique uniquement la palette par défaut / env (pages publiques, auth). */
export function applyDefaultBrandToDocument() {
  applyBrandToDocument(null);
}

export function clearBrandFromDocument() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-hover');
  root.style.removeProperty('--brand-accent');
  root.style.removeProperty('--sidebar');
  root.style.removeProperty('--auth-from');
  root.style.removeProperty('--auth-via');
  root.style.removeProperty('--auth-to');
  root.style.removeProperty('--auth-glow');
  // Réapplique les défauts configurables pour ne pas laisser le CSS :root seul
  applyDefaultBrandToDocument();
}
