const DEFAULT_NAME = 'EventMaster';
const DEFAULT_TAGLINE = 'Préparez votre événement en un clic.';
const DEFAULT_PRIMARY = '#059669';
const DEFAULT_ACCENT = '#10b981';
const DEFAULT_DESCRIPTION =
  'Invitez, placez, accueillez. Trouvez une salle ou un prestataire. RSVP, plan de table et scan QR dans le navigateur.';

export type PublicSiteSnapshot = {
  platformName: string;
  platformTagline: string;
  description: string;
  brandPrimary: string;
  brandAccent: string;
};

export function safeBrandHex(value: string | undefined, fallback: string): string {
  const v = (value || '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5001/api').replace(
    /\/$/,
    '',
  );
}

export function getMetadataBase(): URL {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    const withProto = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    return new URL(withProto.replace(/\/$/, ''));
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL('https://eventmaster.itmafrica.com');
}

/** Origine réelle de la requête (partage WhatsApp / Facebook), sinon env. */
export async function resolveMetadataBase(): Promise<URL> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim();
    if (host) {
      const proto =
        h.get('x-forwarded-proto') || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
      return new URL(`${proto}://${host}`);
    }
  } catch {
    /* hors requête HTTP */
  }
  return getMetadataBase();
}

function clip(value: string, max: number): string {
  const t = value.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export async function fetchPublicSiteSnapshot(): Promise<PublicSiteSnapshot> {
  try {
    const res = await fetch(`${apiBaseUrl()}/public/site`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return {
        platformName: DEFAULT_NAME,
        platformTagline: DEFAULT_TAGLINE,
        description: DEFAULT_DESCRIPTION,
        brandPrimary: DEFAULT_PRIMARY,
        brandAccent: DEFAULT_ACCENT,
      };
    }
    const data = (await res.json()) as {
      platformName?: string;
      platformTagline?: string;
      brandPrimary?: string;
      brandAccent?: string;
    };
    const platformName = clip(data.platformName || DEFAULT_NAME, 60);
    const platformTagline = clip(data.platformTagline || DEFAULT_TAGLINE, 120);
    return {
      platformName,
      platformTagline,
      description: DEFAULT_DESCRIPTION,
      brandPrimary: safeBrandHex(data.brandPrimary, DEFAULT_PRIMARY),
      brandAccent: safeBrandHex(data.brandAccent || data.brandPrimary, DEFAULT_ACCENT),
    };
  } catch {
    return {
      platformName: DEFAULT_NAME,
      platformTagline: DEFAULT_TAGLINE,
      description: DEFAULT_DESCRIPTION,
      brandPrimary: DEFAULT_PRIMARY,
      brandAccent: DEFAULT_ACCENT,
    };
  }
}
