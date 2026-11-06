import { buildBrandLogoSvg } from '@/lib/brandLogo';
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

/** Palette par défaut — les deux verts du logo EventMaster (forêt #31714c + menthe #6ee6b6). */
export const DEFAULT_BRAND_PALETTE = {
  primary: '#31714c',
  primaryHover: '#275a3d',
  accent: '#6ee6b6',
  /** Panneau marketing auth (clair → sombre) */
  authFrom: '#1f4a33',
  authVia: '#10291c',
  authTo: '#0f172a',
  authGlow: '49, 113, 76', // RGB du primary pour blur/glow
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

/** Dégradé du panneau marketing auth dérivé de la couleur primaire. */
export function deriveAuthPanelFromPrimary(primary: string): {
  authFrom: string;
  authVia: string;
  authTo: string;
} {
  return {
    authFrom: adjustHex(primary, -18),
    authVia: adjustHex(primary, -42),
    authTo: '#0f172a',
  };
}

function setAuthPanelVars(
  root: HTMLElement,
  branding: TenantBranding | null | undefined,
  defaults: BrandPalette,
) {
  const primary = branding?.primary || defaults.primary;
  const derived = deriveAuthPanelFromPrimary(primary);
  const useDerived = Boolean(branding?.primary) && !branding?.authFrom;

  root.style.setProperty(
    '--auth-from',
    branding?.authFrom || (useDerived ? derived.authFrom : defaults.authFrom),
  );
  root.style.setProperty(
    '--auth-via',
    branding?.authVia || (useDerived ? derived.authVia : defaults.authVia),
  );
  root.style.setProperty(
    '--auth-to',
    branding?.authTo || (useDerived ? derived.authTo : defaults.authTo),
  );
  root.style.setProperty('--auth-glow', hexToRgbChannels(primary));
}

/** SVG favicon : logo EventMaster sur tuile noire (identique quel que soit le thème). */
export function buildBrandFaviconSvg(): string {
  return buildBrandLogoSvg({ tile: true });
}

function upsertLinkIcon(rel: string, href: string, type = 'image/svg+xml') {
  // Nœud marqué à nous — ne jamais .remove() les <link> Next/React
  // (sinon removeChild null au prochain reconcile du metadata manager).
  const mark = rel === 'shortcut icon' ? 'icon' : rel;
  const ATTR = 'data-em-brand-icon';
  let link = document.querySelector<HTMLLinkElement>(`link[${ATTR}="${mark}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute(ATTR, mark);
    link.rel = mark;
    document.head.appendChild(link);
  }
  link.type = type;
  link.href = href;
}

/** Met à jour favicon + theme-color navigateur selon la marque active. */
export function syncBrandFavicon(primary: string, accent?: string) {
  if (typeof document === 'undefined') return;
  const defaults = resolveDefaultBrandPalette();
  const from = primary || defaults.primary;
  void accent;
  const href = `data:image/svg+xml,${encodeURIComponent(buildBrandFaviconSvg())}`;

  upsertLinkIcon('icon', href);
  upsertLinkIcon('apple-touch-icon', href);

  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = from;
}

/** Favicon depuis les variables CSS déjà appliquées (thème clair/sombre ou marque). */
export function syncFaviconFromComputedStyles() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const defaults = resolveDefaultBrandPalette();
  const primary =
    getComputedStyle(root).getPropertyValue('--primary').trim() || defaults.primary;
  const accent =
    getComputedStyle(root).getPropertyValue('--brand-accent').trim() || primary || defaults.accent;
  syncBrandFavicon(primary, accent);
}

/** Anciennes couleurs par défaut (émeraude Tailwind) et couleurs du logo : pas une marque personnalisée. */
const BUILT_IN_BRAND_HEX = new Set(['#059669', '#10b981', '#047857', '#31714c', '#6ee6b6']);

function isBuiltInBrandHex(hex?: string): boolean {
  return !hex || BUILT_IN_BRAND_HEX.has(hex.trim().toLowerCase());
}

export function applyBrandToDocument(branding?: TenantBranding | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const defaults = resolveDefaultBrandPalette();
  /*
   * Une marque égale à la palette du logo (ou à l'ancien émeraude par défaut) ne pose pas de
   * --primary inline : les tokens de globals.css gardent ainsi leurs variantes clair / sombre
   * (vert forêt en clair, menthe en sombre) et leurs contrastes AA.
   */
  const hasCustom =
    Boolean(branding?.primary || branding?.accent) &&
    !(isBuiltInBrandHex(branding?.primary) && isBuiltInBrandHex(branding?.accent));

  if (hasCustom) {
    const primary = branding?.primary || branding?.accent || defaults.primary;
    const accent = branding?.accent || branding?.primary || defaults.accent;
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-hover', adjustHex(primary, -12));
    root.style.setProperty('--brand-accent', accent);
    root.dataset.brand = 'custom';
  } else {
    delete root.dataset.brand;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-hover');
    root.style.removeProperty('--brand-accent');
  }

  setAuthPanelVars(root, branding, defaults);

  if (branding?.sidebar) {
    root.style.setProperty('--sidebar', branding.sidebar);
  } else {
    root.style.removeProperty('--sidebar');
  }

  syncFaviconFromComputedStyles();
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
