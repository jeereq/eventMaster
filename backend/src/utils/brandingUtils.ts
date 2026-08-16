const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type TenantBranding = {
  primary?: string;
  accent?: string;
  sidebar?: string;
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
