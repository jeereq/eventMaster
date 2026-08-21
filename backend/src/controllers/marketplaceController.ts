import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import { sendRealEmail } from '../services/notificationService';
import { uniqueSlug } from '../utils/slug';
import { buildInquiryOperatorNotify } from '../utils/marketplaceNotifyCopy';
import {
  parsePhotoUrls,
  isVideoUrl,
  coverFromMedia,
  MARKETPLACE_MAX_VIDEOS,
  parsePriceUnit,
  parseServiceCategory,
  parseServiceGroup,
  serviceGroupPrismaFilter,
  isServiceRentalCategory,
  priceUnitLabel,
  sanitizeLayoutBlueprint,
  serviceCategoryLabel,
} from '../utils/publicVenue';
import {
  collectUnavailableDates,
  haversineKm,
  isRangeAvailable,
  parseBlockedDates,
  toDateKey,
} from '../utils/marketplaceDates';
import { parseListingDetails } from '../utils/listingDetails';
import { Prisma, RoomType, ServiceCategory, TenantAccountKind, MarketplaceBookingStatus, VenuePriceUnit } from '@prisma/client';
import { PlanFeatureError, assertServiceQuota, assertVenueCatalogPublish } from '../services/planFeaturesService';
import { notifyTenantOperators } from '../services/platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import {
  allowedCityPrismaFilter,
  normalizeAllowedCity,
  normalizeAllowedCommune,
  pointInCityBounds,
} from '../utils/rdcCities';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function resolveInquirer(req: AuthenticatedRequest) {
  if (!req.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: req.user.id },
    select: { name: true, email: true, phone: true },
  });
}

function inquiryIdentity(
  account: { name: string | null; email: string; phone: string | null },
  body: { name?: unknown; phone?: unknown },
) {
  const fromName = String(body.name || account.name || '').trim().slice(0, 120) || account.email;
  const fromPhone = body.phone ? String(body.phone).trim().slice(0, 40) : account.phone;
  return {
    fromName,
    fromEmail: account.email.trim().toLowerCase(),
    fromPhone: fromPhone || null,
  };
}

async function resolveLinkedEventId(req: AuthenticatedRequest, eventId: unknown): Promise<string | null> {
  if (!eventId || !req.user?.tenantId) return null;
  const event = await prisma.event.findFirst({
    where: { id: String(eventId), tenantId: req.user.tenantId },
    select: { id: true },
  });
  return event?.id || null;
}

function toPublicVenue(listing: {
  slug: string;
  headline: string | null;
  city: string | null;
  commune?: string | null;
  neighborhood?: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  quotaMin?: number | null;
  quotaMax?: number | null;
  photos: unknown;
  blockedDates?: unknown;
  publishedAt: Date | null;
  room: {
    name: string;
    description: string | null;
    capacity: number | null;
    roomType: string;
    location: string | null;
    floor: string | null;
    layoutBlueprint: unknown;
  };
  tenant: {
    name: string;
    branding: unknown;
    vendorProfile: { displayName: string; city: string | null; slug?: string | null } | null;
  };
  bookings?: Array<{ eventDate: Date; eventEndDate?: Date | null }>;
  details?: unknown;
}) {
  const photos = parsePhotoUrls(listing.photos);
  const extra = parseListingDetails(listing.details);
  return {
    slug: listing.slug,
    name: listing.room.name,
    headline: listing.headline || listing.room.name,
    description: extra.description || listing.room.description,
    city: listing.city,
    commune: listing.commune || null,
    neighborhood: listing.neighborhood || null,
    address: listing.address || listing.room.location,
    floor: listing.room.floor,
    capacity: listing.room.capacity,
    roomType: listing.room.roomType,
    latitude: listing.latitude,
    longitude: listing.longitude,
    priceFromFc: listing.priceFromFc,
    priceUnit: listing.priceUnit,
    priceUnitLabel: priceUnitLabel(listing.priceUnit),
    quotaMin: listing.quotaMin ?? null,
    quotaMax: listing.quotaMax ?? null,
    photos,
    coverUrl: coverFromMedia(photos),
    publishedAt: listing.publishedAt,
    orgName: listing.tenant.vendorProfile?.displayName || listing.tenant.name,
    orgSlug: listing.tenant.vendorProfile?.slug || null,
    orgCity: listing.tenant.vendorProfile?.city || listing.city,
    layoutPreview: sanitizeLayoutBlueprint(listing.room.layoutBlueprint),
    blockedDates: parseBlockedDates(listing.blockedDates),
    bookedDates: collectUnavailableDates([], listing.bookings),
    unavailableDates: collectUnavailableDates(listing.blockedDates, listing.bookings),
    details: extra,
  };
}

function readGeoQuery(req: Request) {
  const lat = Number.parseFloat(String(req.query.lat || ''));
  const lng = Number.parseFloat(String(req.query.lng || ''));
  const rawRadius = Number.parseFloat(String(req.query.radiusKm || ''));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(rawRadius) || rawRadius <= 0) {
    return null;
  }
  return { lat, lng, radiusKm: Math.min(80, Math.max(0.5, rawRadius)) };
}

function publicWithDistance<T extends { latitude?: number | null; longitude?: number | null }>(
  rows: T[],
  geo: { lat: number; lng: number; radiusKm: number } | null,
  toPublic: (row: T) => object,
) {
  const mapped = rows.map((row) => {
    const lat = row.latitude ?? null;
    const lng = row.longitude ?? null;
    const distanceKm = geo && lat != null && lng != null
      ? haversineKm(geo.lat, geo.lng, lat, lng)
      : null;
    return { row, distanceKm };
  });
  const filtered = geo
    ? mapped.filter((entry) => entry.distanceKm != null && entry.distanceKm <= geo.radiusKm)
    : mapped;
  if (geo) {
    filtered.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }
  return filtered.flatMap(({ row, distanceKm }) => {
    try {
      return [{
        ...toPublic(row),
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      }];
    } catch (error) {
      console.error('publicWithDistance: fiche ignorée', error);
      return [];
    }
  });
}

function readStreetQuery(req: Request) {
  return typeof req.query.street === 'string' ? req.query.street.trim() : '';
}

function readPriceRange(req: Request) {
  const minPrice = Number.parseInt(String(req.query.minPrice || ''), 10);
  const maxPrice = Number.parseInt(String(req.query.maxPrice || ''), 10);
  const filter: { gte?: number; lte?: number } = {};
  if (Number.isFinite(minPrice) && minPrice > 0) filter.gte = minPrice;
  if (Number.isFinite(maxPrice) && maxPrice > 0) filter.lte = maxPrice;
  return Object.keys(filter).length ? filter : null;
}

function readAvailabilityRange(req: Request): { from: string; to: string } | null {
  const from = toDateKey(String(req.query.availableFrom || ''));
  const to = toDateKey(String(req.query.availableTo || ''));
  if (!from && !to) return null;
  const start = from || to!;
  const end = to || from!;
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

function filterByAvailability<T extends { blockedDates?: unknown; bookings?: Array<{ eventDate: Date; eventEndDate?: Date | null }> }>(
  rows: T[],
  range: { from: string; to: string } | null,
): T[] {
  if (!range) return rows;
  return rows.filter((row) => {
    const unavailable = collectUnavailableDates(row.blockedDates, row.bookings);
    return isRangeAvailable(unavailable, range.from, range.to);
  });
}

function publishLocationError(
  city: unknown,
  commune: unknown,
  neighborhood: unknown,
  latitude: unknown,
  longitude: unknown,
): string | null {
  const cityName = normalizeAllowedCity(city);
  if (cityName === null) return 'La ville doit être Kinshasa ou Lubumbashi.';
  if (!cityName) return 'Choisissez Kinshasa ou Lubumbashi pour publier.';
  const communeName = normalizeAllowedCommune(cityName, commune);
  if (communeName === null) return `La commune doit appartenir à ${cityName}.`;
  if (!communeName) return 'La commune est requise pour publier.';
  if (!String(neighborhood || '').trim()) return 'Le quartier est requis pour publier.';
  const lat = latitude != null && latitude !== '' ? Number(latitude) : NaN;
  const lng = longitude != null && longitude !== '' ? Number(longitude) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Placez la position GPS sur la carte pour publier.';
  }
  if (!pointInCityBounds(lat, lng, cityName)) {
    return `Placez la position GPS dans le cadre de ${cityName}.`;
  }
  return null;
}

function normalizeListingPlace(
  city: unknown,
  commune: unknown,
  neighborhood: unknown,
): { error: string } | { city: string | null; commune: string | null; neighborhood: string | null } {
  const cityName = normalizeAllowedCity(city);
  if (cityName === null) {
    return { error: 'La ville doit être Kinshasa ou Lubumbashi.' };
  }
  const communeName = cityName
    ? normalizeAllowedCommune(cityName, commune)
    : (String(commune || '').trim() ? null : '');
  if (communeName === null) {
    return { error: cityName ? `La commune doit appartenir à ${cityName}.` : 'Choisissez d’abord Kinshasa ou Lubumbashi.' };
  }
  return {
    city: cityName || null,
    commune: communeName || null,
    neighborhood: String(neighborhood || '').trim() || null,
  };
}

function parseOptionalInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const HOLD_BOOKING_STATUSES: MarketplaceBookingStatus[] = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];

const listingInclude = {
  room: true,
  tenant: {
    select: {
      name: true,
      branding: true,
      vendorProfile: { select: { displayName: true, city: true, slug: true } },
    },
  },
  bookings: {
    where: { status: { in: HOLD_BOOKING_STATUSES } },
    select: { eventDate: true, eventEndDate: true },
  },
};

export async function listPublicVenues(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const commune = typeof req.query.commune === 'string' ? req.query.commune.trim() : '';
    const neighborhood = typeof req.query.neighborhood === 'string' ? req.query.neighborhood.trim() : '';
    const street = readStreetQuery(req);
    const roomType = typeof req.query.roomType === 'string' ? req.query.roomType.trim() : '';
    const minCapacity = Number.parseInt(String(req.query.minCapacity || ''), 10);
    const maxCapacity = Number.parseInt(String(req.query.maxCapacity || ''), 10);
    const priceRange = readPriceRange(req);
    const availability = readAvailabilityRange(req);

    const roomFilter: { roomType?: RoomType; capacity?: { gte?: number; lte?: number } } = {};
    const allowedTypes: RoomType[] = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];
    if (roomType && allowedTypes.includes(roomType as RoomType)) {
      roomFilter.roomType = roomType as RoomType;
    }
    if (Number.isFinite(minCapacity) && minCapacity > 0) {
      roomFilter.capacity = { ...roomFilter.capacity, gte: minCapacity };
    }
    if (Number.isFinite(maxCapacity) && maxCapacity > 0) {
      roomFilter.capacity = { ...roomFilter.capacity, lte: maxCapacity };
    }

    const listings = await prisma.venueListing.findMany({
      where: {
        isPublic: true,
        isBlockedByAdmin: false,
        tenant: {
          vendorProfile: {
            isBlockedByAdmin: false
          }
        },
        ...allowedCityPrismaFilter(city),
        ...(commune ? { commune: { contains: commune, mode: 'insensitive' } } : {}),
        ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' } } : {}),
        ...(priceRange ? { priceFromFc: priceRange } : {}),
        ...(Object.keys(roomFilter).length > 0 ? { room: roomFilter } : {}),
        ...((street || q)
          ? {
              AND: [
                ...(street
                  ? [{
                      OR: [
                        { address: { contains: street, mode: 'insensitive' as const } },
                        { neighborhood: { contains: street, mode: 'insensitive' as const } },
                        { commune: { contains: street, mode: 'insensitive' as const } },
                      ],
                    }]
                  : []),
                ...(q
                  ? [{
                      OR: [
                        { headline: { contains: q, mode: 'insensitive' as const } },
                        { city: { contains: q, mode: 'insensitive' as const } },
                        { commune: { contains: q, mode: 'insensitive' as const } },
                        { neighborhood: { contains: q, mode: 'insensitive' as const } },
                        { address: { contains: q, mode: 'insensitive' as const } },
                        { room: { name: { contains: q, mode: 'insensitive' as const } } },
                        { tenant: { name: { contains: q, mode: 'insensitive' as const } } },
                      ],
                    }]
                  : []),
              ],
            }
          : {}),
      },
      include: listingInclude,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: availability ? 240 : 160,
    });

    const geo = readGeoQuery(req);
    const venues = publicWithDistance(filterByAvailability(listings, availability), geo, toPublicVenue);

    return res.json({
      venues,
      total: venues.length,
    });
  } catch (error) {
    console.error('listPublicVenues:', error);
    return res.status(500).json({ error: 'Impossible de charger les salles.' });
  }
}

function canViewUnpublishedListing(req: Request, tenantId: string): boolean {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.tenantId === tenantId;
}

export async function getPublicVenue(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug requis.' });

    const listing = await prisma.venueListing.findFirst({
      where: { 
        slug,
        isBlockedByAdmin: false
      },
      include: listingInclude,
    });
    if (!listing) {
      return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
    }
    if (!listing.isPublic && !canViewUnpublishedListing(req, listing.tenantId)) {
      return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
    }

    return res.json({ ...toPublicVenue(listing), isPublic: listing.isPublic });
  } catch (error) {
    console.error('getPublicVenue:', error);
    return res.status(500).json({ error: 'Impossible de charger la salle.' });
  }
}

export async function createVenueInquiry(req: AuthenticatedRequest, res: Response) {
  try {
    const account = await resolveInquirer(req);
    if (!account?.email) {
      return res.status(401).json({ error: 'Connectez-vous pour envoyer un devis.' });
    }

    const slug = String(req.params.slug || '').trim();
    const { name, phone, eventDate, guestCount, message, eventId } = req.body || {};

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Le message est requis.' });
    }

    const listing = await prisma.venueListing.findFirst({
      where: { slug, isPublic: true },
      include: {
        room: { select: { name: true } },
        tenant: { select: { id: true, name: true, managerId: true } },
      },
    });
    if (!listing) {
      return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
    }

    const identity = inquiryIdentity(account, { name, phone });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.marketplaceInquiry.count({
      where: { listingId: listing.id, fromEmail: identity.fromEmail, createdAt: { gte: since } },
    });
    if (recent >= 3) {
      return res.status(429).json({ error: 'Trop de demandes aujourd’hui pour cette salle. Réessayez demain.' });
    }

    const parsedDate = eventDate ? new Date(eventDate) : null;
    const parsedGuests = Number.parseInt(String(guestCount || ''), 10);
    const linkedEventId = await resolveLinkedEventId(req, eventId);

    const inquiry = await prisma.marketplaceInquiry.create({
      data: {
        listingId: listing.id,
        fromName: identity.fromName,
        fromEmail: identity.fromEmail,
        fromPhone: identity.fromPhone,
        eventDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
        message: String(message).trim().slice(0, 4000),
        fromTenantId: req.user?.tenantId || null,
        eventId: linkedEventId,
      },
    });

    const listingUrl = `${FRONTEND_URL}/marketplace/salles/${listing.slug}`;
    const dashboardHref = `${FRONTEND_URL}/dashboard/marketplace`;
    const operatorCopy = buildInquiryOperatorNotify({
      subjectTitle: listing.room.name,
      ownerOrgName: listing.tenant.name,
      publicUrl: listingUrl,
      dashboardHref,
      inquiry,
    });

    void notifyTenantOperators(listing.tenant.id, {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
      title: `Devis — ${listing.room.name}`,
      message: `${inquiry.fromName} a demandé un devis pour votre salle.`,
      metadata: {
        listingId: listing.id,
        inquiryId: inquiry.id,
        href: dashboardHref,
      },
      email: operatorCopy.email,
      whatsapp: operatorCopy.whatsapp,
    });

    await sendRealEmail(
      inquiry.fromEmail,
      `Votre demande — ${listing.room.name}`,
      `Nous avons transmis votre demande pour « ${listing.room.name} » à ${listing.tenant.name}. Ils vous recontacteront directement.`,
      `<p>Nous avons transmis votre demande pour <strong>${listing.room.name}</strong> à ${listing.tenant.name}.</p><p>Ils vous recontacteront directement.</p>`,
    );

    return res.status(201).json({
      success: true,
      message: 'Votre demande a été transmise au propriétaire de la salle.',
    });
  } catch (error) {
    console.error('createVenueInquiry:', error);
    return res.status(500).json({ error: 'Impossible d’envoyer la demande.' });
  }
}

async function ensureVendorProfile(tenantId: string, displayName: string, city?: string | null) {
  const existing = await prisma.vendorProfile.findUnique({ where: { tenantId } });
  if (existing) return existing;
  const slug = await uniqueSlug(displayName, async (s) => {
    const hit = await prisma.vendorProfile.findUnique({ where: { slug: s }, select: { id: true } });
    return Boolean(hit);
  });
  return prisma.vendorProfile.create({
    data: { tenantId, slug, displayName, city: city || null },
  });
}

export async function upsertRoomListing(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const roomId = req.params.roomId as string;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent publier une salle.' });
    }

    const room = await prisma.organizationRoom.findFirst({ where: { id: roomId, tenantId } });
    if (!room) return res.status(404).json({ error: 'Salle introuvable.' });

    const {
      isPublic,
      headline,
      city,
      commune,
      neighborhood,
      address,
      latitude,
      longitude,
      priceFromFc,
      priceUnit,
      quotaMin,
      quotaMax,
      photos,
      blockedDates,
      details,
    } = req.body || {};

    const wantPublic = Boolean(isPublic);
    const parsedPrice = Number.parseInt(String(priceFromFc ?? ''), 10);
    const photosSafe = parsePhotoUrls(photos);
    if (photosSafe.filter(isVideoUrl).length > MARKETPLACE_MAX_VIDEOS) {
      return res.status(400).json({ error: `Maximum ${MARKETPLACE_MAX_VIDEOS} vidéos par salle.` });
    }
    const blockedSafe = parseBlockedDates(blockedDates);
    const detailsSafe = parseListingDetails(details);
    const place = normalizeListingPlace(city, commune, neighborhood);
    if ('error' in place) return res.status(400).json({ error: place.error });

    if (wantPublic) {
      try {
        await assertVenueCatalogPublish(tenantId);
      } catch (err) {
        if (err instanceof PlanFeatureError) {
          return res.status(403).json({ error: err.message });
        }
        throw err;
      }
      const locationError = publishLocationError(city, commune, neighborhood, latitude, longitude);
      if (locationError) return res.status(400).json({ error: locationError });
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'Indiquez un tarif de départ en FC.' });
      }
    }

    const existing = await prisma.venueListing.findUnique({ where: { roomId } });
    const slug = existing?.slug
      || await uniqueSlug(`${room.name}-${place.city || room.location || 'kinshasa'}`, async (s) => {
        const hit = await prisma.venueListing.findUnique({ where: { slug: s }, select: { id: true } });
        return Boolean(hit);
      });

    const listing = await prisma.venueListing.upsert({
      where: { roomId },
      create: {
        tenantId,
        roomId,
        slug,
        isPublic: wantPublic,
        headline: headline?.trim() || room.name,
        city: place.city,
        commune: place.commune,
        neighborhood: place.neighborhood,
        address: address?.trim() || room.location,
        latitude: latitude != null && latitude !== '' ? Number(latitude) : null,
        longitude: longitude != null && longitude !== '' ? Number(longitude) : null,
        priceFromFc: Number.isFinite(parsedPrice) ? parsedPrice : null,
        priceUnit: parsePriceUnit(priceUnit),
        quotaMin: parseOptionalInt(quotaMin),
        quotaMax: parseOptionalInt(quotaMax),
        photos: photosSafe,
        blockedDates: blockedSafe,
        details: detailsSafe,
        publishedAt: wantPublic ? new Date() : null,
      },
      update: {
        isPublic: wantPublic,
        headline: headline !== undefined ? (headline?.trim() || room.name) : undefined,
        city: city !== undefined ? place.city : undefined,
        commune: commune !== undefined ? place.commune : undefined,
        neighborhood: neighborhood !== undefined ? place.neighborhood : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        latitude: latitude !== undefined ? (latitude != null && latitude !== '' ? Number(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude != null && longitude !== '' ? Number(longitude) : null) : undefined,
        priceFromFc: priceFromFc !== undefined ? (Number.isFinite(parsedPrice) ? parsedPrice : null) : undefined,
        priceUnit: priceUnit !== undefined ? parsePriceUnit(priceUnit) : undefined,
        quotaMin: quotaMin !== undefined ? parseOptionalInt(quotaMin) : undefined,
        quotaMax: quotaMax !== undefined ? parseOptionalInt(quotaMax) : undefined,
        photos: photos !== undefined ? photosSafe : undefined,
        blockedDates: blockedDates !== undefined ? blockedSafe : undefined,
        details: details !== undefined ? detailsSafe : undefined,
        publishedAt: wantPublic ? (existing?.publishedAt || new Date()) : null,
      },
    });

    if (wantPublic) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, accountKind: true } });
      await ensureVendorProfile(tenantId, tenant?.name || room.name, place.city || listing.city);
      if (tenant && tenant.accountKind === TenantAccountKind.ORGANIZER) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { accountKind: TenantAccountKind.BOTH },
        });
      }
    }

    return res.json(listing);
  } catch (error) {
    console.error('upsertRoomListing:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer la publication.' });
  }
}

function toPublicService(offering: {
  slug: string;
  category: ServiceCategory;
  title: string;
  description: string | null;
  city: string | null;
  commune?: string | null;
  neighborhood?: string | null;
  coverageRadiusKm: number | null;
  travels: boolean;
  latitude?: number | null;
  longitude?: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  quotaMin?: number | null;
  quotaMax?: number | null;
  photos: unknown;
  details?: unknown;
  blockedDates?: unknown;
  publishedAt: Date | null;
  vendorProfile: { displayName: string; city: string | null; slug: string };
  tenant: { name: string };
  bookings?: Array<{ eventDate: Date; eventEndDate?: Date | null }>;
}) {
  const photos = parsePhotoUrls(offering.photos);
  const extra = parseListingDetails(offering.details);
  return {
    slug: offering.slug,
    title: offering.title,
    description: extra.description || offering.description,
    category: offering.category,
    categoryLabel: serviceCategoryLabel(offering.category),
    city: offering.city,
    commune: offering.commune || null,
    neighborhood: offering.neighborhood || null,
    coverageRadiusKm: offering.travels ? offering.coverageRadiusKm : null,
    travels: Boolean(offering.travels),
    latitude: offering.latitude ?? null,
    longitude: offering.longitude ?? null,
    priceFromFc: offering.priceFromFc,
    priceUnit: offering.priceUnit,
    priceUnitLabel: priceUnitLabel(offering.priceUnit),
    quotaMin: offering.quotaMin ?? null,
    quotaMax: offering.quotaMax ?? null,
    photos,
    coverUrl: coverFromMedia(photos),
    publishedAt: offering.publishedAt,
    orgName: offering.vendorProfile.displayName || offering.tenant.name,
    orgSlug: offering.vendorProfile.slug,
    blockedDates: parseBlockedDates(offering.blockedDates),
    bookedDates: collectUnavailableDates([], offering.bookings),
    unavailableDates: collectUnavailableDates(offering.blockedDates, offering.bookings),
    details: extra,
  };
}

const offeringInclude = {
  vendorProfile: { select: { displayName: true, city: true, slug: true } },
  tenant: { select: { name: true } },
  bookings: {
    where: { status: { in: HOLD_BOOKING_STATUSES } },
    select: { eventDate: true, eventEndDate: true },
  },
};

export async function listPublicServices(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const commune = typeof req.query.commune === 'string' ? req.query.commune.trim() : '';
    const neighborhood = typeof req.query.neighborhood === 'string' ? req.query.neighborhood.trim() : '';
    const street = readStreetQuery(req);
    const category = parseServiceCategory(req.query.category);
    const group = parseServiceGroup(req.query.group);
    const priceUnit = parsePriceUnit(req.query.priceUnit);
    const wantUnit = typeof req.query.priceUnit === 'string' && req.query.priceUnit.trim()
      ? priceUnit
      : null;
    const priceRange = readPriceRange(req);
    const availability = readAvailabilityRange(req);
    const mobility = typeof req.query.mobility === 'string' ? req.query.mobility.trim() : '';
    const travelsFilter = mobility === 'travels' ? true : mobility === 'on_site' ? false : null;

    const where: Prisma.ServiceOfferingWhereInput = {
      isPublic: true,
      isBlockedByAdmin: false,
      vendorProfile: {
        isBlockedByAdmin: false
      },
      ...allowedCityPrismaFilter(city),
      ...(commune ? { commune: { contains: commune, mode: 'insensitive' as const } } : {}),
      ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' as const } } : {}),
      ...(category ? { category } : serviceGroupPrismaFilter(group)),
      ...(wantUnit ? { priceUnit: wantUnit } : {}),
      ...(priceRange ? { priceFromFc: priceRange } : {}),
      ...(travelsFilter == null ? {} : { travels: travelsFilter }),
      ...((street || q)
        ? {
            AND: [
              ...(street
                ? [{
                    OR: [
                      { neighborhood: { contains: street, mode: 'insensitive' as const } },
                      { commune: { contains: street, mode: 'insensitive' as const } },
                      { city: { contains: street, mode: 'insensitive' as const } },
                      { title: { contains: street, mode: 'insensitive' as const } },
                      { description: { contains: street, mode: 'insensitive' as const } },
                    ],
                  }]
                : []),
              ...(q
                ? [{
                    OR: [
                      { title: { contains: q, mode: 'insensitive' as const } },
                      { description: { contains: q, mode: 'insensitive' as const } },
                      { city: { contains: q, mode: 'insensitive' as const } },
                      { commune: { contains: q, mode: 'insensitive' as const } },
                      { neighborhood: { contains: q, mode: 'insensitive' as const } },
                      { vendorProfile: { displayName: { contains: q, mode: 'insensitive' as const } } },
                    ],
                  }]
                : []),
            ],
          }
        : {}),
    };

    const findOfferings = (extraWhere: Prisma.ServiceOfferingWhereInput, take: number) => prisma.serviceOffering.findMany({
      where: { AND: [where, extraWhere] },
      include: offeringInclude,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take,
    });

    const take = availability ? 200 : 80;
    const offerings = !category && !group
      ? (await Promise.all([
          findOfferings(serviceGroupPrismaFilter('trade'), availability ? 100 : 50),
          findOfferings(serviceGroupPrismaFilter('rental'), availability ? 100 : 50),
        ])).flat()
      : await findOfferings({}, take);

    const geo = readGeoQuery(req);
    const services = publicWithDistance(filterByAvailability(offerings, availability), geo, toPublicService);

    return res.json({ services, total: services.length });
  } catch (error) {
    console.error('listPublicServices:', error);
    return res.status(500).json({ error: 'Impossible de charger les prestataires.' });
  }
}

export async function getPublicService(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug requis.' });
    const offering = await prisma.serviceOffering.findFirst({
      where: { 
        slug,
        isBlockedByAdmin: false,
        vendorProfile: {
          isBlockedByAdmin: false
        }
      },
      include: offeringInclude,
    });
    if (!offering) return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
    if (!offering.isPublic && !canViewUnpublishedListing(req, offering.tenantId)) {
      return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
    }
    return res.json({ ...toPublicService(offering), isPublic: offering.isPublic });
  } catch (error) {
    console.error('getPublicService:', error);
    return res.status(500).json({ error: 'Impossible de charger la prestation.' });
  }
}

export async function getPublicVendor(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug requis.' });
    const profile = await prisma.vendorProfile.findFirst({
      where: { 
        slug,
        isBlockedByAdmin: false
      },
      select: {
        slug: true,
        displayName: true,
        city: true,
        bio: true,
      },
    });
    if (!profile) return res.status(404).json({ error: 'Prestataire introuvable.' });
    return res.json(profile);
  } catch (error) {
    console.error('getPublicVendor:', error);
    return res.status(500).json({ error: 'Impossible de charger le prestataire.' });
  }
}

async function notifyInquiry(params: {
  ownerOrgName: string;
  subjectTitle: string;
  publicUrl: string;
  dashboardHref: string;
  vendorTenantId: string;
  inquiry: {
    id: string;
    fromName: string;
    fromEmail: string;
    fromPhone: string | null;
    eventDate: Date | null;
    guestCount: number | null;
    message: string;
  };
  offeringId?: string;
}) {
  const { inquiry } = params;
  const operatorCopy = buildInquiryOperatorNotify({
    subjectTitle: params.subjectTitle,
    ownerOrgName: params.ownerOrgName,
    publicUrl: params.publicUrl,
    dashboardHref: params.dashboardHref,
    inquiry,
  });
  void notifyTenantOperators(params.vendorTenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
    title: `Devis — ${params.subjectTitle}`,
    message: `${inquiry.fromName} a demandé un devis pour votre prestation.`,
    metadata: {
      offeringId: params.offeringId,
      inquiryId: inquiry.id,
      href: params.dashboardHref,
    },
    email: operatorCopy.email,
    whatsapp: operatorCopy.whatsapp,
  });
  await sendRealEmail(
    inquiry.fromEmail,
    `Votre demande — ${params.subjectTitle}`,
    `Nous avons transmis votre demande pour « ${params.subjectTitle} » à ${params.ownerOrgName}. Ils vous recontacteront directement.`,
    `<p>Nous avons transmis votre demande pour <strong>${params.subjectTitle}</strong> à ${params.ownerOrgName}.</p><p>Ils vous recontacteront directement.</p>`,
  );
}

export async function createServiceInquiry(req: AuthenticatedRequest, res: Response) {
  try {
    const account = await resolveInquirer(req);
    if (!account?.email) {
      return res.status(401).json({ error: 'Connectez-vous pour envoyer un devis.' });
    }

    const slug = String(req.params.slug || '').trim();
    const { name, phone, eventDate, guestCount, message, eventId } = req.body || {};
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Le message est requis.' });
    }

    const offering = await prisma.serviceOffering.findFirst({
      where: { slug, isPublic: true },
      include: { tenant: { select: { id: true, name: true, managerId: true } } },
    });
    if (!offering) return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });

    const identity = inquiryIdentity(account, { name, phone });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.marketplaceInquiry.count({
      where: { offeringId: offering.id, fromEmail: identity.fromEmail, createdAt: { gte: since } },
    });
    if (recent >= 3) {
      return res.status(429).json({ error: 'Trop de demandes aujourd’hui pour ce prestataire. Réessayez demain.' });
    }

    const parsedDate = eventDate ? new Date(eventDate) : null;
    const parsedGuests = Number.parseInt(String(guestCount || ''), 10);
    const linkedEventId = await resolveLinkedEventId(req, eventId);

    const inquiry = await prisma.marketplaceInquiry.create({
      data: {
        offeringId: offering.id,
        fromName: identity.fromName,
        fromEmail: identity.fromEmail,
        fromPhone: identity.fromPhone,
        eventDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
        message: String(message).trim().slice(0, 4000),
        fromTenantId: req.user?.tenantId || null,
        eventId: linkedEventId,
      },
    });

    await notifyInquiry({
      ownerOrgName: offering.tenant.name,
      subjectTitle: offering.title,
      publicUrl: `${FRONTEND_URL}/marketplace/prestataires/${offering.slug}`,
      dashboardHref: `${FRONTEND_URL}/dashboard/marketplace`,
      vendorTenantId: offering.tenant.id,
      offeringId: offering.id,
      inquiry,
    });

    return res.status(201).json({
      success: true,
      message: 'Votre demande a été transmise au prestataire.',
    });
  } catch (error) {
    console.error('createServiceInquiry:', error);
    return res.status(500).json({ error: 'Impossible d’envoyer la demande.' });
  }
}

export async function listMyServices(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const services = await prisma.serviceOffering.findMany({
      where: { tenantId },
      include: {
        bookings: {
          where: { status: { in: HOLD_BOOKING_STATUSES } },
          select: { eventDate: true, eventEndDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({
      services: services.map(({ bookings, ...rest }) => ({
        ...rest,
        blockedDates: parseBlockedDates(rest.blockedDates),
        bookedDates: collectUnavailableDates([], bookings),
      })),
    });
  } catch (error) {
    console.error('listMyServices:', error);
    return res.status(500).json({ error: 'Impossible de charger les prestations.' });
  }
}

export async function upsertService(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent gérer les prestations.' });
    }

    const {
      title, description, city, commune, neighborhood, coverageRadiusKm, travels, latitude, longitude,
      priceFromFc, priceUnit, quotaMin, quotaMax, photos, isPublic, category, blockedDates, details,
    } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'Le titre est requis.' });
    const parsedCategory = parseServiceCategory(category) || 'OTHER';
    const wantPublic = Boolean(isPublic);
    const parsedPrice = Number.parseInt(String(priceFromFc ?? ''), 10);
    const parsedRadius = Number.parseInt(String(coverageRadiusKm ?? ''), 10);
    const doesTravel = travels === undefined || travels === null
      ? Number.isFinite(parsedRadius) && parsedRadius > 0
      : Boolean(travels);
    const photosSafe = parsePhotoUrls(photos);
    if (photosSafe.filter(isVideoUrl).length > MARKETPLACE_MAX_VIDEOS) {
      return res.status(400).json({ error: `Maximum ${MARKETPLACE_MAX_VIDEOS} vidéos par prestation.` });
    }
    const blockedSafe = parseBlockedDates(blockedDates);
    const detailsSafe = parseListingDetails(details);
    const place = normalizeListingPlace(city, commune, neighborhood);
    if ('error' in place) return res.status(400).json({ error: place.error });

    if (wantPublic) {
      const locationError = publishLocationError(city, commune, neighborhood, latitude, longitude);
      if (locationError) return res.status(400).json({ error: locationError });
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'Indiquez un tarif de départ en FC.' });
      }
      if (doesTravel && !(Number.isFinite(parsedRadius) && parsedRadius > 0)) {
        return res.status(400).json({ error: 'Indiquez le rayon d’intervention (km) si vous vous déplacez.' });
      }
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, accountKind: true } });
    const profile = await ensureVendorProfile(tenantId, tenant?.name || title, place.city);
    const serviceId = typeof req.params.id === 'string' ? req.params.id : '';

    const existing = serviceId
      ? await prisma.serviceOffering.findFirst({ where: { id: serviceId, tenantId } })
      : null;
    if (serviceId && !existing) return res.status(404).json({ error: 'Prestation introuvable.' });

    if (!existing) {
      try {
        await assertServiceQuota(tenantId);
      } catch (err) {
        if (err instanceof PlanFeatureError) {
          return res.status(403).json({ error: err.message });
        }
        throw err;
      }
    }

    const slug = existing?.slug
      || await uniqueSlug(`${title}-${place.city || 'kinshasa'}`, async (s) => {
        const hit = await prisma.serviceOffering.findUnique({ where: { slug: s }, select: { id: true } });
        return Boolean(hit);
      });

    const data = {
      title: String(title).trim(),
      description: description?.trim() || null,
      city: place.city,
      commune: place.commune,
      neighborhood: place.neighborhood,
      coverageRadiusKm: doesTravel && Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : null,
      travels: doesTravel,
      latitude: latitude != null && latitude !== '' && Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      longitude: longitude != null && longitude !== '' && Number.isFinite(Number(longitude)) ? Number(longitude) : null,
      priceFromFc: Number.isFinite(parsedPrice) ? parsedPrice : null,
      priceUnit: parsePriceUnit(priceUnit),
      quotaMin: parseOptionalInt(quotaMin),
      quotaMax: parseOptionalInt(quotaMax),
      photos: photosSafe,
      blockedDates: blockedSafe,
      details: detailsSafe,
      isPublic: wantPublic,
      category: parsedCategory,
      publishedAt: wantPublic ? (existing?.publishedAt || new Date()) : null,
    };

    const offering = existing
      ? await prisma.serviceOffering.update({ where: { id: existing.id }, data })
      : await prisma.serviceOffering.create({
          data: { ...data, tenantId, vendorProfileId: profile.id, slug },
        });

    if (wantPublic && tenant?.accountKind === TenantAccountKind.ORGANIZER) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { accountKind: TenantAccountKind.BOTH },
      });
    }

    return res.json(offering);
  } catch (error) {
    console.error('upsertService:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer la prestation.' });
  }
}

export async function deleteService(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const id = req.params.id as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });

    const existing = await prisma.serviceOffering.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Prestation introuvable.' });
    await prisma.serviceOffering.delete({ where: { id } });
    return res.json({ message: 'Prestation supprimée.' });
  } catch (error) {
    console.error('deleteService:', error);
    return res.status(500).json({ error: 'Impossible de supprimer la prestation.' });
  }
}

export async function listMyInquiries(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const role = req.query.role === 'organizer' ? 'organizer' : 'vendor';

    if (role === 'vendor') {
      const access = await resolveOrgAccess(userId, tenantId);
      if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });
    }

    const sender = role === 'organizer'
      ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      : null;
    const senderEmail = sender?.email?.trim().toLowerCase() || '';

    const inquiries = await prisma.marketplaceInquiry.findMany({
      where: role === 'organizer'
        ? {
            OR: [
              { fromTenantId: tenantId },
              ...(senderEmail ? [{ fromEmail: senderEmail }] : []),
            ],
          }
        : {
            OR: [
              { listing: { tenantId } },
              { offering: { tenantId } },
            ],
          },
      include: {
        listing: {
          select: {
            slug: true,
            headline: true,
            room: { select: { name: true } },
            tenant: { select: { name: true, vendorProfile: { select: { slug: true, displayName: true } } } },
          },
        },
        offering: {
          select: {
            slug: true,
            title: true,
            category: true,
            tenant: { select: { name: true } },
            vendorProfile: { select: { slug: true, displayName: true } },
          },
        },
        event: { select: { id: true, title: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const linked = await prisma.marketplaceBooking.findMany({
      where: { inquiryId: { in: inquiries.map((item) => item.id) } },
      select: { inquiryId: true, id: true, status: true },
    });
    const bookingByInquiry = new Map(
      linked
        .filter((row): row is typeof row & { inquiryId: string } => Boolean(row.inquiryId))
        .map((row) => [row.inquiryId, row]),
    );

    return res.json({
      inquiries: inquiries.map((item) => {
        const booking = bookingByInquiry.get(item.id);
        return {
          id: item.id,
          kind: item.offeringId
            ? (isServiceRentalCategory(item.offering?.category) ? 'rental' : 'service')
            : 'venue',
          title: item.offering?.title || item.listing?.headline || item.listing?.room.name || 'Demande',
          fromName: item.fromName,
          fromEmail: item.fromEmail,
          fromPhone: item.fromPhone,
          eventDate: item.eventDate,
          guestCount: item.guestCount,
          message: item.message,
          status: item.status,
          createdAt: item.createdAt,
          event: item.event,
          hasBooking: Boolean(booking),
          bookingId: booking?.id || null,
          bookingStatus: booking?.status || null,
          vendorName:
            item.offering?.vendorProfile?.displayName
            || item.offering?.tenant.name
            || item.listing?.tenant.vendorProfile?.displayName
            || item.listing?.tenant.name
            || null,
          vendorSlug: item.offering?.vendorProfile?.slug || item.listing?.tenant.vendorProfile?.slug || null,
          listingSlug: item.listing?.slug || null,
          offeringSlug: item.offering?.slug || null,
          offeringCategory: item.offering?.category || null,
          viewerRole: role,
        };
      }),
    });
  } catch (error) {
    console.error('listMyInquiries:', error);
    return res.status(500).json({ error: 'Impossible de charger les demandes.' });
  }
}

export async function updateInquiryStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const id = req.params.id as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });

    const status = req.body?.status === 'CONTACTED' ? 'CONTACTED' : req.body?.status === 'NEW' ? 'NEW' : null;
    if (!status) return res.status(400).json({ error: 'Statut invalide.' });

    const existing = await prisma.marketplaceInquiry.findFirst({
      where: {
        id,
        OR: [{ listing: { tenantId } }, { offering: { tenantId } }],
      },
    });
    if (!existing) return res.status(404).json({ error: 'Demande introuvable.' });

    const updated = await prisma.marketplaceInquiry.update({
      where: { id },
      data: { status },
    });
    return res.json(updated);
  } catch (error) {
    console.error('updateInquiryStatus:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour la demande.' });
  }
}
