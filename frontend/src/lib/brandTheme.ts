export type TenantBranding = {
  primary?: string;
  accent?: string;
  sidebar?: string;
};

export const DEFAULT_BRANDING: Required<Pick<TenantBranding, 'primary' | 'accent'>> = {
  primary: '#4f46e5',
  accent: '#6366f1',
};

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

export function applyBrandToDocument(branding?: TenantBranding | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = branding?.primary || DEFAULT_BRANDING.primary;
  const accent = branding?.accent || branding?.primary || DEFAULT_BRANDING.accent;
  const primaryHover = adjustHex(primary, -12);

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-hover', primaryHover);
  root.style.setProperty('--brand-accent', accent);

  if (branding?.sidebar) {
    root.style.setProperty('--sidebar', branding.sidebar);
  } else {
    root.style.removeProperty('--sidebar');
  }
}

export function clearBrandFromDocument() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-hover');
  root.style.removeProperty('--brand-accent');
  root.style.removeProperty('--sidebar');
}
