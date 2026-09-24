import type { MetadataRoute } from 'next';
import { getMetadataBase } from '@/lib/publicSiteServer';
import { fetchPublicJson } from '@/lib/listingMetadata';

/** Pages publiques fixes : priorité aux parcours d’acquisition. */
const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/marketplace', priority: 0.9, changeFrequency: 'daily' },
  { path: '/marketplace/salles', priority: 0.9, changeFrequency: 'daily' },
  { path: '/marketplace/prestataires', priority: 0.8, changeFrequency: 'daily' },
  { path: '/marketplace/locations', priority: 0.7, changeFrequency: 'daily' },
  { path: '/marketplace/boissons', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/marketplace/evenements', priority: 0.9, changeFrequency: 'daily' },
  { path: '/simulateur', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/modeles', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/plans-3d', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/tarifs', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/activite', priority: 0.5, changeFrequency: 'daily' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/guide/invite', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/refund', priority: 0.2, changeFrequency: 'monthly' },
];

type Dated = { slug?: string | null; publishedAt?: string | null };
type ServiceRow = Dated & { category?: string | null };

function lastModified(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getMetadataBase().toString().replace(/\/$/, '');
  const now = new Date();

  const [venues, services, events] = await Promise.all([
    fetchPublicJson<{ venues?: Dated[] }>('/public/venues'),
    fetchPublicJson<{ services?: ServiceRow[] }>('/public/services'),
    fetchPublicJson<{ events?: Dated[] }>('/public/events'),
  ]);

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  for (const venue of venues?.venues || []) {
    if (!venue.slug) continue;
    entries.push({
      url: `${base}/marketplace/salles/${venue.slug}`,
      lastModified: lastModified(venue.publishedAt),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  for (const service of services?.services || []) {
    if (!service.slug) continue;
    const section = service.category?.startsWith('RENTAL_') ? 'locations' : 'prestataires';
    entries.push({
      url: `${base}/marketplace/${section}/${service.slug}`,
      lastModified: lastModified(service.publishedAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  for (const event of events?.events || []) {
    if (!event.slug) continue;
    entries.push({
      url: `${base}/marketplace/evenements/${event.slug}`,
      changeFrequency: 'daily',
      priority: 0.7,
    });
  }

  return entries;
}
