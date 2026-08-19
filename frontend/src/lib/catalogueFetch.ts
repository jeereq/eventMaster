import { api } from '@/lib/api';
import { publicServiceQueryVariants, type CatalogueKind } from '@/lib/catalogueEntityFilters';
import type { PublicService } from '@/lib/marketplace';

export async function fetchPublicServicesForCatalogue(
  params: URLSearchParams,
  kind: CatalogueKind,
): Promise<PublicService[]> {
  const variants = publicServiceQueryVariants(params, kind);
  const rows = await Promise.all(
    variants.map((query) => {
      const qs = query.toString();
      return api
        .get(`/public/services${qs ? `?${qs}` : ''}`)
        .catch(() => ({ services: [] as PublicService[] }));
    }),
  );
  const seen = new Set<string>();
  const services: PublicService[] = [];
  for (const row of rows) {
    for (const service of row.services || []) {
      if (!service?.slug || seen.has(service.slug)) continue;
      seen.add(service.slug);
      services.push(service);
    }
  }
  return services;
}
