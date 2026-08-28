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

/** Palette par défaut — vert émeraude EventMaster. */
export const DEFAULT_BRAND_PALETTE = {
  primary: '#059669',
  primaryHover: '#047857',
  accent: '#10b981',
  /** Panneau marketing auth (clair → sombre) */
  authFrom: '#064e3b',
  authVia: '#022c22',
  authTo: '#0f172a',
  authGlow: '5, 150, 105', // RGB du primary pour blur/glow
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

/** SVG favicon (étoile) colorée selon la palette active. */
export function buildBrandFaviconSvg(primary: string, accent: string): string {
  const from = primary || DEFAULT_BRAND_PALETTE.primary;
  const to = accent || DEFAULT_BRAND_PALETTE.accent;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient><linearGradient id="star" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><rect width="512" height="512" rx="128" fill="url(#bg)"/><g transform="translate(128,128) scale(0.5)"><path d="M256 0 C256 150 362 256 512 256 C362 256 256 362 256 512 C256 362 150 256 0 256 C150 256 256 150 256 0 Z" fill="url(#star)"/><path d="M384 128 C384 180 437 224 512 224 C437 224 384 268 384 320 C384 268 331 224 256 224 C331 224 384 180 384 128 Z" fill="#ffffff" opacity="0.8"/></g></svg>`;
}

function upsertLinkIcon(rel: string, href: string, type = 'image/svg+xml') {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`));
  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = rel;
    link.type = type;
    link.href = href;
    document.head.appendChild(link);
    return;
  }
  for (const link of links) {
    link.type = type;
    link.href = href;
  }
}

/** Met à jour favicon + theme-color navigateur selon la marque active. */
export function syncBrandFavicon(primary: string, accent?: string) {
  if (typeof document === 'undefined') return;
  const defaults = resolveDefaultBrandPalette();
  const from = primary || defaults.primary;
  const to = accent || from || defaults.accent;
  const href = `data:image/svg+xml,${encodeURIComponent(buildBrandFaviconSvg(from, to))}`;

  upsertLinkIcon('icon', href);
  upsertLinkIcon('apple-touch-icon', href);
  upsertLinkIcon('shortcut icon', href);

  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = from;
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

  syncBrandFavicon(primary, accent);
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
