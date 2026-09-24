/**
 * Métadonnées serveur des fiches publiques (salles, prestataires, matériel, boissons, événements).
 *
 * Objectif : un lien partagé par WhatsApp, SMS ou e-mail affiche l’aperçu de la fiche
 * (titre, description, photo) au lieu du titre générique du site.
 *
 * Module serveur uniquement : aucune dépendance aux helpers client (`lib/api`, `lib/marketplace`).
 */
import type { Metadata } from 'next';
import { apiBaseUrl, fetchPublicSiteSnapshot } from '@/lib/publicSiteServer';

const FETCH_TIMEOUT_MS = 4000;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const DESCRIPTION_MAX = 180;

/** GET JSON sur l’API publique. Renvoie `null` en cas d’erreur (jamais d’exception). */
export async function fetchPublicJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function clip(value: string | null | undefined, max = DESCRIPTION_MAX): string {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function formatFc(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FC`;
}

function locationLine(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');
}

function isVideoUrl(url: string): boolean {
  return /\/video\/upload\//.test(url) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

/** Choisit la première image (pas de vidéo) et la redimensionne au format d’aperçu 1200×630. */
export function shareImageUrl(
  coverUrl: string | null | undefined,
  photos: string[] | null | undefined,
): string | null {
  const candidates = [coverUrl, ...(photos || [])].filter((url): url is string => Boolean(url));
  const image = candidates.find((url) => !isVideoUrl(url));
  if (!image) return null;

  if (image.includes('res.cloudinary.com/') && image.includes('/image/upload/')) {
    return image.replace(
      '/image/upload/',
      `/image/upload/c_fill,g_auto,w_${OG_WIDTH},h_${OG_HEIGHT},f_jpg,q_auto/`,
    );
  }
  if (image.includes('images.unsplash.com')) {
    try {
      const url = new URL(image);
      url.searchParams.set('w', String(OG_WIDTH));
      url.searchParams.set('h', String(OG_HEIGHT));
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('fm', 'jpg');
      url.searchParams.set('q', '75');
      return url.toString();
    } catch {
      return image;
    }
  }
  return image;
}

type ListingMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
};

async function buildListingMetadata({
  title,
  description,
  path,
  image,
  noIndex,
}: ListingMetadataInput): Promise<Metadata> {
  const site = await fetchPublicSiteSnapshot();
  const fullTitle = `${title} — ${site.platformName}`;
  const desc = clip(description) || site.description;
  const images = image
    ? [{ url: image, width: OG_WIDTH, height: OG_HEIGHT, alt: title }]
    : undefined;

  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: path },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      siteName: site.platformName,
      url: path,
      title: fullTitle,
      description: desc,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: fullTitle,
      description: desc,
      ...(images ? { images: images.map((img) => img.url) } : {}),
    },
  };
}

function notFoundMetadata(label: string, path: string): Promise<Metadata> {
  return buildListingMetadata({
    title: `${label} introuvable`,
    description: 'Cette fiche n’est plus disponible. Découvrez les autres offres du marketplace.',
    path,
    noIndex: true,
  });
}

/* ------------------------------------------------------------------ */
/* Salles                                                              */
/* ------------------------------------------------------------------ */

type VenueShare = {
  name: string;
  headline?: string | null;
  description?: string | null;
  city?: string | null;
  commune?: string | null;
  neighborhood?: string | null;
  capacity?: number | null;
  priceFromFc?: number | null;
  priceUnitLabel?: string | null;
  coverUrl?: string | null;
  photos?: string[];
};

export async function venueMetadata(slug: string): Promise<Metadata> {
  const path = `/marketplace/salles/${slug}`;
  const venue = await fetchPublicJson<VenueShare>(`/public/venues/${encodeURIComponent(slug)}`);
  if (!venue?.name) return notFoundMetadata('Salle', path);

  const price = formatFc(venue.priceFromFc);
  const facts = locationLine([
    locationLine([venue.commune, venue.city]),
    venue.capacity ? `${venue.capacity} personnes` : null,
    price ? `dès ${price}${venue.priceUnitLabel ? ` ${venue.priceUnitLabel}` : ''}` : null,
  ]);
  const pitch = clip(venue.headline || venue.description, 110);

  return buildListingMetadata({
    title: venue.name,
    description: [facts, pitch].filter(Boolean).join('. '),
    path,
    image: shareImageUrl(venue.coverUrl, venue.photos),
  });
}

/* ------------------------------------------------------------------ */
/* Prestataires & matériel                                             */
/* ------------------------------------------------------------------ */

type ServiceShare = {
  title: string;
  description?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  city?: string | null;
  commune?: string | null;
  priceFromFc?: number | null;
  promoPriceFc?: number | null;
  promoActive?: boolean;
  priceUnitLabel?: string | null;
  orgName?: string | null;
  coverUrl?: string | null;
  photos?: string[];
};

export async function serviceMetadata(
  slug: string,
  basePath: '/marketplace/prestataires' | '/marketplace/locations',
): Promise<Metadata> {
  const service = await fetchPublicJson<ServiceShare>(`/public/services/${encodeURIComponent(slug)}`);
  const isRental = Boolean(service?.category?.startsWith('RENTAL_'));
  const canonicalBase = service ? (isRental ? '/marketplace/locations' : '/marketplace/prestataires') : basePath;
  const path = `${canonicalBase}/${slug}`;
  if (!service?.title) return notFoundMetadata(isRental ? 'Offre' : 'Prestation', path);

  const amount = service.promoActive && service.promoPriceFc ? service.promoPriceFc : service.priceFromFc;
  const price = formatFc(amount);
  const facts = locationLine([
    service.categoryLabel,
    locationLine([service.commune, service.city]),
    price ? `dès ${price}${service.priceUnitLabel ? ` ${service.priceUnitLabel}` : ''}` : null,
  ]);

  return buildListingMetadata({
    title: service.orgName ? `${service.title} · ${service.orgName}` : service.title,
    description: [facts, clip(service.description, 110)].filter(Boolean).join('. '),
    path,
    image: shareImageUrl(service.coverUrl, service.photos),
  });
}

/* ------------------------------------------------------------------ */
/* Événements publics                                                  */
/* ------------------------------------------------------------------ */

type EventShare = {
  title: string;
  description?: string | null;
  date?: string | null;
  location?: string | null;
  city?: string | null;
  ticketingEnabled?: boolean;
  paid?: boolean;
  priceFromFc?: number | null;
  ticketPriceFc?: number | null;
  soldOut?: boolean;
  coverUrl?: string | null;
  photos?: string[];
};

function formatEventDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Kinshasa',
  }).format(date);
}

export async function eventMetadata(slug: string): Promise<Metadata> {
  const path = `/marketplace/evenements/${slug}`;
  const data = await fetchPublicJson<{ event?: EventShare }>(`/public/events/${encodeURIComponent(slug)}`);
  const event = data?.event;
  if (!event?.title) return notFoundMetadata('Événement', path);

  const price = formatFc(event.priceFromFc ?? event.ticketPriceFc);
  const ticketLine = event.soldOut
    ? 'Complet'
    : event.ticketingEnabled && event.paid && price
      ? `Billets dès ${price}, paiement Mobile Money ou carte`
      : event.ticketingEnabled
        ? 'Entrée libre sur inscription'
        : null;
  const facts = locationLine([formatEventDate(event.date), event.location || event.city]);

  return buildListingMetadata({
    title: event.title,
    description: [facts, ticketLine, clip(event.description, 90)].filter(Boolean).join('. '),
    path,
    image: shareImageUrl(event.coverUrl, event.photos),
  });
}

/* ------------------------------------------------------------------ */
/* Boissons (vitrine vendeur)                                          */
/* ------------------------------------------------------------------ */

type BeverageVendorShare = {
  vendor?: { displayName?: string | null; city?: string | null; bio?: string | null };
  offers?: Array<{ imageUrl?: string | null }>;
};

export async function beverageVendorMetadata(slug: string): Promise<Metadata> {
  const path = `/marketplace/boissons/${slug}`;
  const data = await fetchPublicJson<BeverageVendorShare>(
    `/public/beverage-vendors/${encodeURIComponent(slug)}`,
  );
  const vendor = data?.vendor;
  if (!vendor?.displayName) return notFoundMetadata('Vendeur', path);

  const offerCount = data?.offers?.length ?? 0;
  const facts = locationLine([
    vendor.city,
    offerCount ? `${offerCount} boisson${offerCount > 1 ? 's' : ''} disponible${offerCount > 1 ? 's' : ''}` : null,
  ]);
  const firstPhoto = data?.offers?.map((offer) => offer.imageUrl).find(Boolean) || null;

  return buildListingMetadata({
    title: `Boissons · ${vendor.displayName}`,
    description: [facts, clip(vendor.bio, 110) || 'Commande livrée pour votre réception.'].filter(Boolean).join('. '),
    path,
    image: shareImageUrl(firstPhoto, null),
  });
}
