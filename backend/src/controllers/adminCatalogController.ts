import { Response } from 'express';
import { MarketplaceBookingStatus, MarketplaceInquiryStatus, RoomType, VenuePriceUnit } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { auditReq } from '../services/adminAuditService';
import { parseServiceCategory, parsePriceUnit, priceUnitLabel, serviceCategoryLabel, parsePhotoUrls, coverFromMedia } from '../utils/publicVenue';

function pager(req: AuthenticatedRequest) {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function searchQ(req: AuthenticatedRequest) {
  return typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
}

function cityFilter(req: AuthenticatedRequest) {
  return typeof req.query.city === 'string' && req.query.city.trim() ? req.query.city.trim() : undefined;
}

function communeFilter(req: AuthenticatedRequest) {
  return typeof req.query.commune === 'string' && req.query.commune.trim() ? req.query.commune.trim() : undefined;
}

function neighborhoodFilter(req: AuthenticatedRequest) {
  return typeof req.query.neighborhood === 'string' && req.query.neighborhood.trim() ? req.query.neighborhood.trim() : undefined;
}

function streetFilter(req: AuthenticatedRequest) {
  return typeof req.query.street === 'string' && req.query.street.trim() ? req.query.street.trim() : undefined;
}

const ROOM_TYPES: RoomType[] = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];

function roomTypeFilter(req: AuthenticatedRequest): RoomType | undefined {
  const raw = typeof req.query.roomType === 'string' ? req.query.roomType.trim() : '';
  return ROOM_TYPES.includes(raw as RoomType) ? (raw as RoomType) : undefined;
}

function capacityRange(req: AuthenticatedRequest): { gte?: number; lte?: number } | undefined {
  const min = Number.parseInt(String(req.query.minCapacity || ''), 10);
  const max = Number.parseInt(String(req.query.maxCapacity || ''), 10);
  const range: { gte?: number; lte?: number } = {};
  if (Number.isFinite(min) && min > 0) range.gte = min;
  if (Number.isFinite(max) && max > 0) range.lte = max;
  return range.gte != null || range.lte != null ? range : undefined;
}

function priceUnitFilter(req: AuthenticatedRequest): VenuePriceUnit | undefined {
  const raw = typeof req.query.priceUnit === 'string' ? req.query.priceUnit.trim() : '';
  if (!raw) return undefined;
  return parsePriceUnit(raw);
}

function travelsFilter(req: AuthenticatedRequest): boolean | undefined {
  const mobility = typeof req.query.mobility === 'string' ? req.query.mobility.trim() : '';
  if (mobility === 'travels') return true;
  if (mobility === 'on_site') return false;
  return undefined;
}

function priceRange(req: AuthenticatedRequest): { gte?: number; lte?: number } | undefined {
  const min = Number.parseInt(String(req.query.minPrice || ''), 10);
  const max = Number.parseInt(String(req.query.maxPrice || ''), 10);
  const range: { gte?: number; lte?: number } = {};
  if (Number.isFinite(min) && min >= 0) range.gte = min;
  if (Number.isFinite(max) && max >= 0) range.lte = max;
  return range.gte != null || range.lte != null ? range : undefined;
}

function listingHref(kind: 'venue' | 'offering', slug: string) {
  return kind === 'venue'
    ? `/dashboard/catalogue/salles/${slug}`
    : `/dashboard/catalogue/prestataires/${slug}`;
}

function publicFilter(req: AuthenticatedRequest): boolean | undefined {
  const raw = typeof req.query.isPublic === 'string' ? req.query.isPublic : '';
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return undefined;
}

const INQUIRY_STATUSES: MarketplaceInquiryStatus[] = ['NEW', 'CONTACTED'];
const BOOKING_STATUSES: MarketplaceBookingStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
];

function parseInquiryStatus(value: unknown): MarketplaceInquiryStatus | undefined {
  if (typeof value === 'string' && INQUIRY_STATUSES.includes(value as MarketplaceInquiryStatus)) {
    return value as MarketplaceInquiryStatus;
  }
  return undefined;
}

function parseBookingStatus(value: unknown): MarketplaceBookingStatus | undefined {
  if (typeof value === 'string' && BOOKING_STATUSES.includes(value as MarketplaceBookingStatus)) {
    return value as MarketplaceBookingStatus;
  }
  return undefined;
}

export async function getCatalogOverview(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const [
      venuesTotal,
      venuesPublic,
      offeringsTotal,
      offeringsPublic,
      inquiriesTotal,
      inquiriesNew,
      bookingsTotal,
      bookingsRequested,
    ] = await Promise.all([
      prisma.venueListing.count(),
      prisma.venueListing.count({ where: { isPublic: true } }),
      prisma.serviceOffering.count(),
      prisma.serviceOffering.count({ where: { isPublic: true } }),
      prisma.marketplaceInquiry.count(),
      prisma.marketplaceInquiry.count({ where: { status: 'NEW' } }),
      prisma.marketplaceBooking.count(),
      prisma.marketplaceBooking.count({ where: { status: 'REQUESTED' } }),
    ]);

    return res.json({
      venues: { total: venuesTotal, publicCount: venuesPublic },
      offerings: { total: offeringsTotal, publicCount: offeringsPublic },
      inquiries: { total: inquiriesTotal, newCount: inquiriesNew },
      bookings: { total: bookingsTotal, requestedCount: bookingsRequested },
    });
  } catch (error) {
    console.error('Erreur catalog overview admin:', error);
    return res.status(500).json({ error: 'Impossible de charger le catalogue.' });
  }
}

export async function listAdminVenues(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { page, pageSize, skip } = pager(req);
    const q = searchQ(req);
    const isPublic = publicFilter(req);
    const city = cityFilter(req);
    const commune = communeFilter(req);
    const neighborhood = neighborhoodFilter(req);
    const street = streetFilter(req);
    const price = priceRange(req);
    const roomType = roomTypeFilter(req);
    const capacity = capacityRange(req);
    const unit = priceUnitFilter(req);

    const roomWhere = {
      ...(roomType ? { roomType } : {}),
      ...(capacity ? { capacity } : {}),
    };

    const where = {
      isPublic,
      ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
      ...(commune ? { commune: { contains: commune, mode: 'insensitive' as const } } : {}),
      ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' as const } } : {}),
      ...(street ? { address: { contains: street, mode: 'insensitive' as const } } : {}),
      ...(price ? { priceFromFc: price } : {}),
      ...(unit ? { priceUnit: unit } : {}),
      ...(Object.keys(roomWhere).length > 0 ? { room: roomWhere } : {}),
      ...(q
        ? {
            OR: [
              { headline: { contains: q, mode: 'insensitive' as const } },
              { slug: { contains: q, mode: 'insensitive' as const } },
              { city: { contains: q, mode: 'insensitive' as const } },
              { commune: { contains: q, mode: 'insensitive' as const } },
              { neighborhood: { contains: q, mode: 'insensitive' as const } },
              { address: { contains: q, mode: 'insensitive' as const } },
              { room: { name: { contains: q, mode: 'insensitive' as const } } },
              { tenant: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.venueListing.findMany({
        where,
        include: {
          room: { select: { name: true, roomType: true, capacity: true } },
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.venueListing.count({ where }),
    ]);

    return res.json({
      items: rows.map((row) => {
        const photos = parsePhotoUrls(row.photos);
        return {
          id: row.id,
          slug: row.slug,
          isPublic: row.isPublic,
          headline: row.headline || row.room.name,
          roomName: row.room.name,
          roomType: row.room.roomType,
          capacity: row.room.capacity,
          city: row.city,
          commune: row.commune,
          neighborhood: row.neighborhood,
          address: row.address,
          latitude: row.latitude,
          longitude: row.longitude,
          coverUrl: coverFromMedia(photos),
          photos,
          priceFromFc: row.priceFromFc,
          priceUnit: row.priceUnit,
          priceUnitLabel: priceUnitLabel(row.priceUnit),
          publishedAt: row.publishedAt,
          createdAt: row.createdAt,
          tenantId: row.tenantId,
          tenantName: row.tenant.name,
          href: listingHref('venue', row.slug),
        };
      }),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error('Erreur catalog venues admin:', error);
    return res.status(500).json({ error: 'Impossible de charger les salles.' });
  }
}

export async function listAdminOfferings(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { page, pageSize, skip } = pager(req);
    const q = searchQ(req);
    const isPublic = publicFilter(req);
    const category = parseServiceCategory(req.query.category) || undefined;
    const city = cityFilter(req);
    const commune = communeFilter(req);
    const neighborhood = neighborhoodFilter(req);
    const street = streetFilter(req);
    const price = priceRange(req);
    const unit = priceUnitFilter(req);
    const travels = travelsFilter(req);

    const where = {
      isPublic,
      category,
      ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
      ...(commune ? { commune: { contains: commune, mode: 'insensitive' as const } } : {}),
      ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' as const } } : {}),
      ...(street
        ? {
            OR: [
              { neighborhood: { contains: street, mode: 'insensitive' as const } },
              { commune: { contains: street, mode: 'insensitive' as const } },
              { city: { contains: street, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(price ? { priceFromFc: price } : {}),
      ...(unit ? { priceUnit: unit } : {}),
      ...(travels == null ? {} : { travels }),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { slug: { contains: q, mode: 'insensitive' as const } },
              { city: { contains: q, mode: 'insensitive' as const } },
              { commune: { contains: q, mode: 'insensitive' as const } },
              { neighborhood: { contains: q, mode: 'insensitive' as const } },
              { tenant: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.serviceOffering.findMany({
        where,
        include: { tenant: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.serviceOffering.count({ where }),
    ]);

    return res.json({
      items: rows.map((row) => {
        const photos = parsePhotoUrls(row.photos);
        return {
          id: row.id,
          slug: row.slug,
          isPublic: row.isPublic,
          title: row.title,
          category: row.category,
          categoryLabel: serviceCategoryLabel(row.category),
          city: row.city,
          commune: row.commune,
          neighborhood: row.neighborhood,
          latitude: row.latitude,
          longitude: row.longitude,
          coverUrl: coverFromMedia(photos),
          photos,
          priceFromFc: row.priceFromFc,
          priceUnit: row.priceUnit,
          priceUnitLabel: priceUnitLabel(row.priceUnit),
          travels: row.travels,
          publishedAt: row.publishedAt,
          createdAt: row.createdAt,
          tenantId: row.tenantId,
          tenantName: row.tenant.name,
          href: listingHref('offering', row.slug),
        };
      }),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error('Erreur catalog offerings admin:', error);
    return res.status(500).json({ error: 'Impossible de charger les prestataires.' });
  }
}

export async function listAdminInquiries(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { page, pageSize, skip } = pager(req);
    const q = searchQ(req);
    const status = parseInquiryStatus(req.query.status);

    const where = {
      status,
      ...(q
        ? {
            OR: [
              { fromName: { contains: q, mode: 'insensitive' as const } },
              { fromEmail: { contains: q, mode: 'insensitive' as const } },
              { message: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.marketplaceInquiry.findMany({
        where,
        include: {
          listing: {
            select: {
              slug: true,
              headline: true,
              tenantId: true,
              tenant: { select: { name: true } },
              room: { select: { name: true } },
            },
          },
          offering: {
            select: {
              slug: true,
              title: true,
              tenantId: true,
              tenant: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.marketplaceInquiry.count({ where }),
    ]);

    return res.json({
      items: rows.map((row) => {
        const vendorTenantId = row.listing?.tenantId || row.offering?.tenantId || null;
        const vendorName = row.listing?.tenant.name || row.offering?.tenant.name || null;
        const title = row.offering?.title || row.listing?.headline || row.listing?.room.name || 'Fiche';
        const slug = row.offering?.slug || row.listing?.slug;
        const kind = row.offeringId ? 'offering' : 'venue';
        return {
          id: row.id,
          kind,
          title,
          status: row.status,
          fromName: row.fromName,
          fromEmail: row.fromEmail,
          fromPhone: row.fromPhone,
          message: row.message,
          eventDate: row.eventDate,
          guestCount: row.guestCount,
          createdAt: row.createdAt,
          vendorTenantId,
          vendorName,
          href: slug
            ? listingHref(kind === 'offering' ? 'offering' : 'venue', slug)
            : null,
        };
      }),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error('Erreur catalog inquiries admin:', error);
    return res.status(500).json({ error: 'Impossible de charger les demandes.' });
  }
}

export async function listAdminBookings(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { page, pageSize, skip } = pager(req);
    const q = searchQ(req);
    const status = parseBookingStatus(req.query.status);

    const where = {
      status,
      ...(q
        ? {
            OR: [
              { vendorTenant: { name: { contains: q, mode: 'insensitive' as const } } },
              { organizerTenant: { name: { contains: q, mode: 'insensitive' as const } } },
              { listing: { headline: { contains: q, mode: 'insensitive' as const } } },
              { offering: { title: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.marketplaceBooking.findMany({
        where,
        include: {
          listing: { select: { slug: true, headline: true, room: { select: { name: true } } } },
          offering: { select: { slug: true, title: true } },
          vendorTenant: { select: { id: true, name: true } },
          organizerTenant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.marketplaceBooking.count({ where }),
    ]);

    return res.json({
      items: rows.map((row) => {
        const kind = row.offeringId ? 'offering' : 'venue';
        const slug = row.offering?.slug || row.listing?.slug;
        const title = row.offering?.title || row.listing?.headline || row.listing?.room.name || 'Réservation';
        return {
          id: row.id,
          kind,
          title,
          status: row.status,
          eventDate: row.eventDate,
          eventEndDate: row.eventEndDate,
          amountFc: row.amountFc,
          depositFc: row.depositFc,
          commissionFc: row.commissionFc,
          createdAt: row.createdAt,
          vendorTenantId: row.vendorTenantId,
          vendorName: row.vendorTenant.name,
          organizerTenantId: row.organizerTenantId,
          organizerName: row.organizerTenant?.name || null,
          href: slug
            ? listingHref(kind === 'offering' ? 'offering' : 'venue', slug)
            : null,
        };
      }),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error('Erreur catalog bookings admin:', error);
    return res.status(500).json({ error: 'Impossible de charger les réservations.' });
  }
}

export async function unpublishVenueListing(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const listing = await prisma.venueListing.findUnique({
      where: { id },
      include: { room: { select: { name: true } }, tenant: { select: { name: true } } },
    });
    if (!listing) return res.status(404).json({ error: 'Fiche salle introuvable.' });

    const updated = await prisma.venueListing.update({
      where: { id },
      data: { isPublic: false },
    });

    await auditReq(req, {
      action: 'CATALOG_UNPUBLISH',
      targetType: 'venueListing',
      targetId: listing.id,
      tenantId: listing.tenantId,
      summary: `Dépublication de la salle « ${listing.headline || listing.room.name} » (${listing.tenant.name})`,
      metadata: { slug: listing.slug },
    });

    return res.json({
      id: updated.id,
      isPublic: updated.isPublic,
      message: 'Fiche salle dépubliée.',
    });
  } catch (error) {
    console.error('Erreur unpublish venue admin:', error);
    return res.status(500).json({ error: 'Impossible de dépublier la fiche.' });
  }
}

export async function unpublishServiceOffering(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const offering = await prisma.serviceOffering.findUnique({
      where: { id },
      include: { tenant: { select: { name: true } } },
    });
    if (!offering) return res.status(404).json({ error: 'Prestation introuvable.' });

    const updated = await prisma.serviceOffering.update({
      where: { id },
      data: { isPublic: false },
    });

    await auditReq(req, {
      action: 'CATALOG_UNPUBLISH',
      targetType: 'serviceOffering',
      targetId: offering.id,
      tenantId: offering.tenantId,
      summary: `Dépublication de la prestation « ${offering.title} » (${offering.tenant.name})`,
      metadata: { slug: offering.slug },
    });

    return res.json({
      id: updated.id,
      isPublic: updated.isPublic,
      message: 'Prestation dépubliée.',
    });
  } catch (error) {
    console.error('Erreur unpublish offering admin:', error);
    return res.status(500).json({ error: 'Impossible de dépublier la prestation.' });
  }
}
