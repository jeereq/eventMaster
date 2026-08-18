import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { parsePhotoUrls, coverFromMedia, priceUnitLabel, serviceCategoryLabel } from '../utils/publicVenue';
import { buildEventPlanProposals } from '../services/eventPlannerService';

function parseKind(value: unknown): 'venue' | 'service' | null {
  return value === 'venue' || value === 'service' ? value : null;
}

function parseSlug(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function listFavorites(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const rows = await prisma.listingFavorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const venueSlugs = rows.filter((row) => row.kind === 'venue').map((row) => row.slug);
    const serviceSlugs = rows.filter((row) => row.kind === 'service').map((row) => row.slug);

    const [venues, services] = await Promise.all([
      venueSlugs.length
        ? prisma.venueListing.findMany({
            where: { slug: { in: venueSlugs }, isPublic: true },
            include: {
              room: { select: { name: true, capacity: true } },
              tenant: { select: { name: true, vendorProfile: { select: { displayName: true } } } },
            },
          })
        : Promise.resolve([]),
      serviceSlugs.length
        ? prisma.serviceOffering.findMany({
            where: { slug: { in: serviceSlugs }, isPublic: true },
            include: {
              vendorProfile: { select: { displayName: true } },
              tenant: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const venueBySlug = new Map(venues.map((row) => [row.slug, row]));
    const serviceBySlug = new Map(services.map((row) => [row.slug, row]));

    const items = rows.flatMap((row): Array<{
      kind: 'venue' | 'service';
      slug: string;
      title: string;
      orgName: string;
      location: string;
      coverUrl: string | null;
      priceFromFc: number | null;
      priceUnitLabel: string;
      categoryLabel?: string;
      capacity?: number | null;
      href: string;
      createdAt: Date;
    }> => {
      if (row.kind === 'venue') {
        const listing = venueBySlug.get(row.slug);
        if (!listing) return [];
        const photos = parsePhotoUrls(listing.photos);
        return [{
          kind: 'venue' as const,
          slug: listing.slug,
          title: listing.headline || listing.room.name,
          orgName: listing.tenant.vendorProfile?.displayName || listing.tenant.name,
          location: [listing.neighborhood, listing.commune, listing.city].filter(Boolean).join(', '),
          coverUrl: coverFromMedia(photos),
          priceFromFc: listing.priceFromFc,
          priceUnitLabel: priceUnitLabel(listing.priceUnit),
          capacity: listing.room.capacity,
          href: `/dashboard/catalogue/salles/${listing.slug}`,
          createdAt: row.createdAt,
        }];
      }
      const offering = serviceBySlug.get(row.slug);
      if (!offering) return [];
      const photos = parsePhotoUrls(offering.photos);
      return [{
        kind: 'service' as const,
        slug: offering.slug,
        title: offering.title,
        orgName: offering.vendorProfile.displayName || offering.tenant.name,
        categoryLabel: serviceCategoryLabel(offering.category),
        location: [offering.neighborhood, offering.commune, offering.city].filter(Boolean).join(', '),
        coverUrl: coverFromMedia(photos),
        priceFromFc: offering.priceFromFc,
        priceUnitLabel: priceUnitLabel(offering.priceUnit),
        href: `/dashboard/catalogue/prestataires/${offering.slug}`,
        capacity: null,
        createdAt: row.createdAt,
      }];
    });

    return res.json({
      favorites: rows.map((row) => ({ kind: row.kind, slug: row.slug, createdAt: row.createdAt })),
      items,
    });
  } catch (error) {
    console.error('listFavorites:', error);
    return res.status(500).json({ error: 'Impossible de charger les favoris.' });
  }
}

export async function addFavorite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const kind = parseKind(req.body?.kind);
    const slug = parseSlug(req.body?.slug);
    if (!kind || !slug) {
      return res.status(400).json({ error: 'Salle ou prestataire invalide.' });
    }

    const exists = kind === 'venue'
      ? await prisma.venueListing.findFirst({ where: { slug, isPublic: true }, select: { slug: true } })
      : await prisma.serviceOffering.findFirst({ where: { slug, isPublic: true }, select: { slug: true } });
    if (!exists) return res.status(404).json({ error: 'Fiche introuvable ou non publiée.' });

    const favorite = await prisma.listingFavorite.upsert({
      where: { userId_kind_slug: { userId: req.user.id, kind, slug } },
      update: {},
      create: { userId: req.user.id, kind, slug },
    });
    return res.json({ ok: true, favorite: { kind: favorite.kind, slug: favorite.slug } });
  } catch (error) {
    console.error('addFavorite:', error);
    return res.status(500).json({ error: 'Impossible d’ajouter aux favoris.' });
  }
}

export async function removeFavorite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const kind = parseKind(req.params.kind);
    const slug = parseSlug(req.params.slug);
    if (!kind || !slug) {
      return res.status(400).json({ error: 'Salle ou prestataire invalide.' });
    }
    await prisma.listingFavorite.deleteMany({
      where: { userId: req.user.id, kind, slug },
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error('removeFavorite:', error);
    return res.status(500).json({ error: 'Impossible de retirer le favori.' });
  }
}

export async function planEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const favorites = await prisma.listingFavorite.findMany({
      where: { userId: req.user.id },
      select: { kind: true, slug: true },
    });
    const result = await buildEventPlanProposals({
      eventType: req.body?.eventType,
      budgetFc: req.body?.budgetFc,
      city: req.body?.city,
      guestCount: req.body?.guestCount,
      favoriteSlugs: favorites,
    });
    return res.json(result);
  } catch (error: any) {
    if (error?.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error('planEvent:', error);
    return res.status(500).json({ error: 'Impossible de préparer la proposition.' });
  }
}
