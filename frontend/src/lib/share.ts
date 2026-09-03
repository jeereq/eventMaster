export type SharePayload = {
  title: string;
  text?: string;
  url?: string;
};

const INTERNAL_QUERY_KEYS = [
  '_rsc',
  'tab',
  'hub',
  '_nextid',
  '__nextid',
];

const LANDING_HASH_TO_PATH: Record<string, string> = {
  salles: '/marketplace/salles',
  prestataires: '/marketplace/prestataires',
  locations: '/marketplace/locations',
  evenements: '/marketplace/evenements',
  modeles: '/',
  catalogue: '/marketplace',
  marketplace: '/marketplace',
  parcours: '/',
};

function keepLandingHash(hash: string): boolean {
  return hash === 'modeles' || hash === 'parcours';
}

export function appOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

export function absoluteUrl(pathOrUrl: string, origin = appOrigin()): string {
  if (!pathOrUrl) return origin;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${path}`;
}

function decodePathOnce(pathname: string): string {
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded !== pathname) return decoded;
  } catch {
    /* keep */
  }
  return pathname;
}

function mapInternalPathToPublic(pathname: string, hash = ''): string {
  const path = decodePathOnce(pathname);
  const key = hash.replace(/^#/, '').trim();

  if (path === '/' || path === '') {
    return LANDING_HASH_TO_PATH[key] || '/';
  }

  if (path === '/dashboard/catalogue' || path === '/dashboard/catalogue/') {
    return '/marketplace';
  }

  const exact: Array<[string, string]> = [
    ['/dashboard/catalogue/salles', '/marketplace/salles'],
    ['/dashboard/catalogue/prestataires', '/marketplace/prestataires'],
    ['/dashboard/catalogue/locations', '/marketplace/locations'],
    ['/dashboard/catalogue/evenements', '/marketplace/evenements'],
  ];
  for (const [from, to] of exact) {
    if (path === from || path === `${from}/`) return to;
  }

  const prefixes: Array<[string, string]> = [
    ['/dashboard/catalogue/salles/', '/marketplace/salles/'],
    ['/dashboard/catalogue/prestataires/', '/marketplace/prestataires/'],
    ['/dashboard/catalogue/locations/', '/marketplace/locations/'],
    ['/dashboard/catalogue/evenements/', '/marketplace/evenements/'],
  ];
  for (const [from, to] of prefixes) {
    if (path.startsWith(from)) return `${to}${path.slice(from.length)}`;
  }

  return path;
}

function stripInternalParams(url: URL) {
  for (const key of INTERNAL_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
  if (url.pathname.startsWith('/rsvp/')) {
    url.search = '';
  }
}

function rebaseToAppOrigin(url: URL, origin: string): URL {
  if (!origin || !/^https?:\/\//i.test(origin)) return url;
  const next = new URL(url.pathname + url.search + url.hash, origin);
  return next;
}

/** URL publique à partager : hors dashboard, origine courante, sans hash ni params internes. */
export function canonicalShareUrl(href?: string | null): string {
  const origin = appOrigin();
  const raw = (href && href.trim()) || (typeof window !== 'undefined' ? window.location.href : origin);
  try {
    const parsed = new URL(raw, origin || 'http://localhost');
    const hashKey = parsed.hash.replace(/^#/, '').trim();
    parsed.pathname = mapInternalPathToPublic(parsed.pathname, parsed.hash);
    const keepHash = parsed.pathname === '/' && keepLandingHash(hashKey);
    parsed.hash = keepHash ? `#${hashKey}` : '';
    stripInternalParams(parsed);
    const rebased = rebaseToAppOrigin(parsed, origin || parsed.origin);
    rebased.hash = parsed.hash;
    return rebased.toString();
  } catch {
    return absoluteUrl(raw, origin);
  }
}

export function currentPageUrl(): string {
  return canonicalShareUrl();
}

export function encodePathSlug(slug: string): string {
  let clean = slug.trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {
    /* keep */
  }
  return encodeURIComponent(clean);
}

export function listingPublicUrl(
  kind: 'venue' | 'service' | 'event' | 'rental',
  slug: string,
  origin?: string,
): string {
  const encoded = encodePathSlug(slug);
  const path =
    kind === 'venue'
      ? `/marketplace/salles/${encoded}`
      : kind === 'rental'
        ? `/marketplace/locations/${encoded}`
        : kind === 'service'
          ? `/marketplace/prestataires/${encoded}`
          : `/marketplace/evenements/${encoded}`;
  return canonicalShareUrl(absoluteUrl(path, origin ?? appOrigin()));
}

export function listingShareTitle(kind: 'venue' | 'service' | 'event' | 'rental', name: string): string {
  const prefix =
    kind === 'venue' ? 'Salle' : kind === 'rental' ? 'Matériel & Équipements' : kind === 'service' ? 'Prestataire' : 'Événement';
  return `${name} · ${prefix} EventMaster`;
}

export function guestRsvpUrl(guestId: string, origin?: string): string {
  const id = encodePathSlug(guestId);
  return canonicalShareUrl(absoluteUrl(`/rsvp/${id}`, origin ?? appOrigin()));
}

export function marketplaceSectionUrl(
  section: 'venues' | 'services' | 'rentals' | 'events' | 'templates' | 'all',
  query?: string,
): string {
  const path =
    section === 'venues'
      ? '/marketplace/salles'
      : section === 'services'
        ? '/marketplace/prestataires'
        : section === 'rentals'
          ? '/marketplace/locations'
          : section === 'events'
            ? '/marketplace/evenements'
            : section === 'templates'
              ? '/modeles'
              : '/marketplace';
  const url = new URL(path, appOrigin() || 'http://localhost');
  const q = query?.trim();
  if (q && !path.includes('#')) url.searchParams.set('q', q);
  return canonicalShareUrl(url.toString());
}

export async function shareOrCopy(payload: SharePayload): Promise<'shared' | 'copied' | 'aborted'> {
  const url = canonicalShareUrl(payload.url);
  const title = payload.title.trim() || 'EventMaster';
  const text = payload.text?.trim() || title;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'aborted';
    }
    try {
      await navigator.share({ title, text: `${text}\n${url}` });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'aborted';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return 'copied';
  }

  throw new Error('Impossible de partager ce lien.');
}
