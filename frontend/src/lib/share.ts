export type SharePayload = {
  title: string;
  text?: string;
  url?: string;
};

export function currentPageUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

export function listingPublicUrl(kind: 'venue' | 'service' | 'event', slug: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const path =
    kind === 'venue'
      ? `/marketplace/salles/${encodeURIComponent(slug)}`
      : kind === 'service'
        ? `/marketplace/prestataires/${encodeURIComponent(slug)}`
        : `/marketplace/evenements/${encodeURIComponent(slug)}`;
  return `${base}${path}`;
}

export function listingShareTitle(kind: 'venue' | 'service' | 'event', name: string): string {
  const prefix = kind === 'venue' ? 'Salle' : kind === 'service' ? 'Prestataire' : 'Événement';
  return `${name} · ${prefix} EventMaster`;
}

export async function shareOrCopy(payload: SharePayload): Promise<'shared' | 'copied' | 'aborted'> {
  const url = payload.url || currentPageUrl();
  const title = payload.title.trim() || 'EventMaster';
  const text = payload.text?.trim() || title;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
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
