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
  parsePriceUnitFilter,
  parseServiceCategory,
  parseServiceGroup,
  serviceGroupPrismaFilter,
  isServiceRentalCategory,
  parseDeliveryMode,
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
import { fetchActivityPreview } from './marketplaceFeedController';
import { Prisma, RoomType, ServiceCategory, MarketplaceBookingStatus, VenuePriceUnit } from '@prisma/client';
import { parseOfferPromotion, activePromoPrice } from '../services/offerPromotion';
import {
  beverageInquiryTitle,
  beverageLineRecords,
  beverageOrderMessage,
  resolveVendorDrinkLines,
} from '../services/beverageOrderService';
import { rentalDeliverySurcharge } from '../services/eventBudgetCost';
import { PlanFeatureError, assertServiceQuota, assertVenueCatalogPublish } from '../services/planFeaturesService';
import { listTenantOperatorIds, notifyTenantOperators, notifyUsers } from '../services/platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import {
  allowedCityPrismaFilter,
  normalizeAllowedCity,
  normalizeAllowedCommune,
  pointInCityBounds,
} from '../utils/rdcCities';
import { loadPlatformSettings, sanitizeEnabledCities } from '../services/platformSettingsService';

function enabledMarketplaceCityNames(): string[] {
  return sanitizeEnabledCities(loadPlatformSettings().enabledCities).filter(
    (city) => city === 'Kinshasa' || city === 'Lubumbashi',
  );
}

function cityNotEnabledError(cityName: string): string | null {
  const enabled = enabledMarketplaceCityNames();
  if (enabled.includes(cityName)) return null;
  const list = enabled.join(' ou ') || 'une ville active';
  return `${cityName} n’est pas une ville active. Choisissez ${list}.`;
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const INQUIRY_MESSAGE_MAX_CHARS = 2000;
const INQUIRY_AUTHOR_CLIENT = 'CLIENT';
const INQUIRY_AUTHOR_VENDOR = 'VENDOR';

function inquiryClientHref(inquiryId: string) {
  return `${FRONTEND_URL}/dashboard/bookings?tab=quotes&inquiryId=${inquiryId}`;
}

function inquiryVendorHref(inquiryId: string) {
  return `${FRONTEND_URL}/dashboard/bookings?tab=quotes&role=vendor&inquiryId=${inquiryId}`;
}

function inquiryTitleOf(item: {
  offering?: { title: string } | null;
  listing?: { headline: string | null; room?: { name: string } | null } | null;
  beveragePackCount?: number | null;
  beveragePrice?: { unitLabel: string; brand: { name: string } } | null;
  beverageLines?: { packCount: number; unitLabel: string; brandName: string }[];
}) {
  return beverageInquiryTitle(item)
    || item.offering?.title
    || item.listing?.headline
    || item.listing?.room?.name
    || 'Demande';
}

async function notifyInquiryClient(opts: {
  inquiry: { id: string; fromTenantId: string | null; fromEmail: string };
  actorUserId?: string;
  title: string;
  message: string;
  whatsapp?: string;
}) {
  const href = inquiryClientHref(opts.inquiry.id);
  const payload = {
    type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
    title: opts.title,
    message: opts.message,
    metadata: { inquiryId: opts.inquiry.id, href },
    whatsapp: opts.whatsapp || `${opts.message}\nConsultez la conversation : ${href}`,
  };
  const exclude = opts.actorUserId ? [opts.actorUserId] : [];
  const operatorIds = new Set<string>();
  if (opts.inquiry.fromTenantId) {
    (await listTenantOperatorIds(opts.inquiry.fromTenantId)).forEach((id) => operatorIds.add(id));
    await notifyTenantOperators(opts.inquiry.fromTenantId, payload, { excludeUserIds: exclude });
  }
  const inquirer = await prisma.user.findFirst({
    where: { email: { equals: opts.inquiry.fromEmail, mode: 'insensitive' } },
    select: { id: true },
  });
  if (inquirer && inquirer.id !== opts.actorUserId && !operatorIds.has(inquirer.id)) {
    void notifyUsers([inquirer.id], payload);
  }
}

async function notifyInquiryVendor(opts: {
  vendorTenantId: string;
  inquiryId: string;
  actorUserId?: string;
  title: string;
  message: string;
}) {
  const href = inquiryVendorHref(opts.inquiryId);
  void notifyTenantOperators(
    opts.vendorTenantId,
    {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
      title: opts.title,
      message: opts.message,
      metadata: { inquiryId: opts.inquiryId, href },
      whatsapp: `${opts.message}\nRépondez dans EventMaster : ${href}`,
    },
    { excludeUserIds: opts.actorUserId ? [opts.actorUserId] : [] },
  );
}

async function resolveInquiryAccess(opts: {
  inquiryId: string;
  userId: string;
  tenantId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { email: true },
  });
  const email = user?.email?.trim().toLowerCase() || '';
  const inquiry = await prisma.marketplaceInquiry.findFirst({
    where: {
      id: opts.inquiryId,
      OR: [
        { fromTenantId: opts.tenantId },
        { listing: { tenantId: opts.tenantId } },
        { offering: { tenantId: opts.tenantId } },
        { beveragePrice: { tenantId: opts.tenantId } },
        ...(email ? [{ fromEmail: { equals: email, mode: 'insensitive' as const } }] : []),
      ],
    },
    include: {
      listing: { select: { tenantId: true, headline: true, room: { select: { name: true } } } },
      offering: { select: { tenantId: true, title: true } },
      beveragePrice: { select: { tenantId: true, unitLabel: true, brand: { select: { name: true } } } },
      beverageLines: { select: { packCount: true, unitLabel: true, brandName: true } },
    },
  });
  if (!inquiry) return null;
  const vendorTenantId = inquiry.listing?.tenantId || inquiry.offering?.tenantId || inquiry.beveragePrice?.tenantId || null;
  const isVendor = vendorTenantId === opts.tenantId;
  const isClient =
    inquiry.fromTenantId === opts.tenantId
    || Boolean(email && inquiry.fromEmail.trim().toLowerCase() === email);
  return { inquiry, isVendor, isClient, vendorTenantId };
}

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
  if (!cityName) return 'Choisissez une ville active pour publier.';
  const blocked = cityNotEnabledError(cityName);
  if (blocked) return blocked;
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
  if (cityName) {
    const blocked = cityNotEnabledError(cityName);
    if (blocked) return { error: blocked };
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

/** SuperAdmin (et org propriétaire) : voir fiches non publiques ou bloquées pour modération. */
function canViewRestrictedListing(req: Request, tenantId: string): boolean {
  return canViewUnpublishedListing(req, tenantId);
}

export async function getPublicVenue(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug requis.' });

    const listing = await prisma.venueListing.findFirst({
      where: { slug },
      include: listingInclude,
    });
    if (!listing) {
      return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
    }
    const canStaffView = canViewRestrictedListing(req, listing.tenantId);
    if (listing.isBlockedByAdmin && !canStaffView) {
      return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
    }
    if (!listing.isPublic && !canStaffView) {
      return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
    }

    const [relatedVenues, relatedOfferings] = await Promise.all([
      prisma.venueListing.findMany({
        where: {
          tenantId: listing.tenantId,
          id: { not: listing.id },
          isPublic: true,
          isBlockedByAdmin: false,
        },
        include: listingInclude,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      prisma.serviceOffering.findMany({
        where: {
          tenantId: listing.tenantId,
          isPublic: true,
          isBlockedByAdmin: false,
        },
        include: offeringInclude,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 12,
      }),
    ]);

    return res.json({
      ...toPublicVenue(listing),
      isPublic: listing.isPublic,
      isBlockedByAdmin: listing.isBlockedByAdmin,
      relatedVenues: relatedVenues.map(toPublicVenue),
      relatedServices: relatedOfferings.map(toPublicService),
      activityPreview: await fetchActivityPreview({ venueListingId: listing.id }),
    });
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
    const vendorDashboardHref = `${FRONTEND_URL}/dashboard/bookings?tab=quotes&role=vendor&inquiryId=${inquiry.id}`;
    const clientDashboardHref = `${FRONTEND_URL}/dashboard/bookings?tab=quotes&inquiryId=${inquiry.id}`;
    const operatorCopy = buildInquiryOperatorNotify({
      subjectTitle: listing.room.name,
      ownerOrgName: listing.tenant.name,
      publicUrl: listingUrl,
      dashboardHref: vendorDashboardHref,
      inquiry,
    });

    void notifyTenantOperators(listing.tenant.id, {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
      title: `Devis — ${listing.room.name}`,
      message: `${inquiry.fromName} a demandé un devis pour votre salle.`,
      metadata: {
        listingId: listing.id,
        inquiryId: inquiry.id,
        href: vendorDashboardHref,
      },
      email: operatorCopy.email,
      whatsapp: operatorCopy.whatsapp,
    });

    const inquirerUserId = req.user?.id || (await prisma.user.findFirst({
      where: { email: { equals: inquiry.fromEmail, mode: 'insensitive' } },
      select: { id: true },
    }))?.id;

    if (inquirerUserId) {
      void notifyUsers([inquirerUserId], {
        type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
        title: `Devis envoyé — ${listing.room.name}`,
        message: `Votre demande de devis pour « ${listing.room.name} » (${listing.tenant.name}) a bien été transmise. Vous recevrez une notification dès sa prise en charge.`,
        metadata: {
          listingId: listing.id,
          inquiryId: inquiry.id,
          href: clientDashboardHref,
        },
        whatsapp: `Votre demande de devis pour « ${listing.room.name} » a été transmise à ${listing.tenant.name}.\nSuivez l'avancement sur : ${clientDashboardHref}`,
      });
    } else {
      await sendRealEmail(
        inquiry.fromEmail,
        `Votre demande — ${listing.room.name}`,
        `Nous avons transmis votre demande pour « ${listing.room.name} » à ${listing.tenant.name}. Ils vous recontacteront directement.`,
        `<p>Nous avons transmis votre demande pour <strong>${listing.room.name}</strong> à ${listing.tenant.name}.</p><p>Ils vous recontacteront directement.</p>`,
      );
    }

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
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
      await ensureVendorProfile(tenantId, tenant?.name || room.name, place.city || listing.city);
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
  deliveryMode?: string | null;
  deliveryPriceFc?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  promoPriceFc?: number | null;
  promoLabel?: string | null;
  promoEndsAt?: Date | null;
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
  const deliveryMode = parseDeliveryMode(offering.deliveryMode) || parseDeliveryMode(extra.deliveryMode);
  const parsedDetailPrice = Number.parseInt(String(extra.deliveryPriceFc || ''), 10);
  const deliveryPriceFc = offering.deliveryPriceFc ?? (Number.isFinite(parsedDetailPrice) ? parsedDetailPrice : null);
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
    deliveryMode,
    deliveryPriceFc,
    latitude: offering.latitude ?? null,
    longitude: offering.longitude ?? null,
    priceFromFc: offering.priceFromFc,
    promoPriceFc: offering.promoPriceFc ?? null,
    promoLabel: offering.promoLabel ?? null,
    promoEndsAt: offering.promoEndsAt ?? null,
    promoActive: activePromoPrice({
      priceFc: offering.priceFromFc,
      promoPriceFc: offering.promoPriceFc,
      promoEndsAt: offering.promoEndsAt,
    }) != null,
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
    details: {
      ...extra,
      deliveryMode: deliveryMode || '',
      deliveryPriceFc: deliveryPriceFc != null ? String(deliveryPriceFc) : '',
    },
  };
}

const offeringInclude = {
  vendorProfile: { select: { displayName: true, city: true, slug: true, isBlockedByAdmin: true } },
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
    const priceUnit = parsePriceUnitFilter(req.query.priceUnit);
    const priceRange = readPriceRange(req);
    const availability = readAvailabilityRange(req);
    const mobility = typeof req.query.mobility === 'string' ? req.query.mobility.trim() : '';
    const travelsFilter = mobility === 'travels' ? true : mobility === 'on_site' ? false : null;
    const delivery = parseDeliveryMode(req.query.delivery);

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
      ...(priceUnit ? { priceUnit } : {}),
      ...(priceRange ? { priceFromFc: priceRange } : {}),
      ...(travelsFilter == null ? {} : { travels: travelsFilter }),
      ...(delivery === 'included' || delivery === 'extra_fee'
        ? {
            OR: [
              { deliveryMode: delivery },
              { AND: [{ deliveryMode: null }, { details: { path: ['deliveryMode'], equals: delivery } }] },
            ],
          }
        : delivery === 'pickup'
          ? {
              OR: [
                { deliveryMode: 'pickup' },
                { AND: [{ deliveryMode: null }, { travels: false }] },
                { AND: [{ deliveryMode: null }, { details: { path: ['deliveryMode'], equals: 'pickup' } }] },
              ],
            }
          : {}),
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
      where: { slug },
      include: offeringInclude,
    });
    if (!offering) return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
    const canStaffView = canViewRestrictedListing(req, offering.tenantId);
    const vendorBlocked = Boolean(offering.vendorProfile?.isBlockedByAdmin);
    if ((offering.isBlockedByAdmin || vendorBlocked) && !canStaffView) {
      return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
    }
    if (!offering.isPublic && !canStaffView) {
      return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
    }
    const [relatedOfferings, relatedVenues] = await Promise.all([
      prisma.serviceOffering.findMany({
        where: {
          tenantId: offering.tenantId,
          id: { not: offering.id },
          isPublic: true,
          isBlockedByAdmin: false,
        },
        include: offeringInclude,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      prisma.venueListing.findMany({
        where: {
          tenantId: offering.tenantId,
          isPublic: true,
          isBlockedByAdmin: false,
        },
        include: listingInclude,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 12,
      }),
    ]);

    return res.json({
      ...toPublicService(offering),
      isPublic: offering.isPublic,
      isBlockedByAdmin: offering.isBlockedByAdmin || Boolean(offering.vendorProfile?.isBlockedByAdmin),
      relatedServices: relatedOfferings.map(toPublicService),
      relatedVenues: relatedVenues.map(toPublicVenue),
      activityPreview: await fetchActivityPreview({
        OR: [
          { serviceOfferingId: offering.id },
          { vendorProfileId: offering.vendorProfileId },
        ],
      }),
    });
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
      include: {
        offerings: {
          where: { isPublic: true, isBlockedByAdmin: false },
          include: offeringInclude,
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          take: 24,
        },
        tenant: {
          include: {
            venueListings: {
              where: { isPublic: true, isBlockedByAdmin: false },
              include: listingInclude,
              orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
              take: 24,
            },
          },
        },
      },
    });
    if (!profile) return res.status(404).json({ error: 'Prestataire introuvable.' });
    return res.json({
      id: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
      city: profile.city,
      bio: profile.bio,
      services: (profile.offerings || []).map(toPublicService),
      venues: (profile.tenant?.venueListings || []).map(toPublicVenue),
      activityPreview: await fetchActivityPreview({ vendorProfileId: profile.id }),
    });
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
}

export async function createServiceInquiry(req: AuthenticatedRequest, res: Response) {
  try {
    const account = await resolveInquirer(req);
    if (!account?.email) {
      return res.status(401).json({ error: 'Connectez-vous pour envoyer un devis.' });
    }

    const slug = String(req.params.slug || '').trim();
    const { name, phone, eventDate, guestCount, message, eventId, destinationCommune: rawDestinationCommune } = req.body || {};
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Le message est requis.' });
    }

    const offering = await prisma.serviceOffering.findFirst({
      where: { slug, isPublic: true },
      include: { tenant: { select: { id: true, name: true, managerId: true } } },
    });
    if (!offering) return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });

    const destinationCommune = normalizeAllowedCommune('Kinshasa', rawDestinationCommune);
    if (rawDestinationCommune && destinationCommune == null) {
      return res.status(400).json({ error: 'Choisissez une commune de Kinshasa.' });
    }
    const offeringDetails = parseListingDetails(offering.details);
    const deliveryMode = parseDeliveryMode(offering.deliveryMode) || parseDeliveryMode(offeringDetails.deliveryMode);
    const kinshasaDelivery = isServiceRentalCategory(offering.category)
      && deliveryMode === 'extra_fee'
      && normalizeAllowedCity(offering.city) === 'Kinshasa';
    if (kinshasaDelivery && !destinationCommune) {
      return res.status(400).json({ error: 'Indiquez la commune de livraison à Kinshasa.' });
    }

    const identity = inquiryIdentity(account, { name, phone });
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
        destinationCommune: destinationCommune || null,
        fromTenantId: req.user?.tenantId || null,
        eventId: linkedEventId,
      },
    });

    const vendorDashboardHref = `${FRONTEND_URL}/dashboard/bookings?tab=quotes&role=vendor&inquiryId=${inquiry.id}`;
    const clientDashboardHref = `${FRONTEND_URL}/dashboard/bookings?tab=quotes&inquiryId=${inquiry.id}`;

    await notifyInquiry({
      ownerOrgName: offering.tenant.name,
      subjectTitle: offering.title,
      publicUrl: `${FRONTEND_URL}/marketplace/prestataires/${offering.slug}`,
      dashboardHref: vendorDashboardHref,
      vendorTenantId: offering.tenant.id,
      offeringId: offering.id,
      inquiry,
    });

    const inquirerUserId = req.user?.id || (await prisma.user.findFirst({
      where: { email: { equals: inquiry.fromEmail, mode: 'insensitive' } },
      select: { id: true },
    }))?.id;

    if (inquirerUserId) {
      void notifyUsers([inquirerUserId], {
        type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
        title: `Devis envoyé — ${offering.title}`,
        message: `Votre demande de devis pour « ${offering.title} » (${offering.tenant.name}) a bien été transmise. Vous recevrez une notification dès sa prise en charge.`,
        metadata: {
          offeringId: offering.id,
          inquiryId: inquiry.id,
          href: clientDashboardHref,
        },
        whatsapp: `Votre demande de devis pour « ${offering.title} » a été transmise à ${offering.tenant.name}.\nSuivez l'avancement sur : ${clientDashboardHref}`,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Votre demande a été transmise au prestataire.',
    });
  } catch (error) {
    console.error('createServiceInquiry:', error);
    return res.status(500).json({ error: 'Impossible d’envoyer la demande.' });
  }
}

export async function createBeverageInquiry(req: AuthenticatedRequest, res: Response) {
  try {
    const account = await resolveInquirer(req);
    if (!account?.email) {
      return res.status(401).json({ error: 'Connectez-vous pour envoyer un devis.' });
    }
    const id = String(req.params.id || '').trim();
    const packs = Math.round(Number(req.body?.packCount));
    if (!Number.isFinite(packs) || packs < 1 || packs > 500) {
      return res.status(400).json({ error: 'Indiquez une quantité entre 1 et 500.' });
    }
    const offer = await prisma.vendorBeveragePrice.findFirst({
      where: { id, isAvailable: true, brand: { isActive: true } },
      include: {
        brand: { select: { name: true } },
        tenant: { select: { id: true, name: true } },
      },
    });
    if (!offer) return res.status(404).json({ error: 'Cette proposition n’est plus disponible.' });
    if (offer.tenantId === req.user?.tenantId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas demander un devis sur votre propre tarif.' });
    }
    const identity = inquiryIdentity(account, req.body || {});
    const parsedDate = req.body?.eventDate ? new Date(String(req.body.eventDate)) : null;
    const note = req.body?.message ? String(req.body.message).trim().slice(0, 2000) : '';
    const message = [`${packs} × ${offer.unitLabel} de ${offer.brand.name}.`, note].filter(Boolean).join(' ');
    const inquiry = await prisma.marketplaceInquiry.create({
      data: {
        beveragePriceId: offer.id,
        beveragePackCount: packs,
        fromName: identity.fromName,
        fromEmail: identity.fromEmail,
        fromPhone: identity.fromPhone,
        eventDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        message: message.slice(0, 4000),
        fromTenantId: req.user?.tenantId || null,
      },
    });
    const vendorHref = `${FRONTEND_URL}/dashboard/bookings?tab=quotes&role=vendor&inquiryId=${inquiry.id}`;
    const clientHref = `${FRONTEND_URL}/dashboard/bookings?tab=quotes&inquiryId=${inquiry.id}`;
    await notifyInquiry({
      ownerOrgName: offer.tenant.name,
      subjectTitle: `${offer.brand.name} · ${packs} × ${offer.unitLabel}`,
      publicUrl: `${FRONTEND_URL}/marketplace/boissons`,
      dashboardHref: vendorHref,
      vendorTenantId: offer.tenant.id,
      inquiry,
    });
    if (req.user?.id) {
      void notifyUsers([req.user.id], {
        type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
        title: `Devis envoyé — ${offer.brand.name}`,
        message: `Votre demande de ${packs} × ${offer.unitLabel} a été transmise.`,
        metadata: { inquiryId: inquiry.id, href: clientHref },
      });
    }
    return res.status(201).json({ success: true, message: 'Votre demande a été transmise au prestataire.' });
  } catch (error) {
    console.error('createBeverageInquiry:', error);
    return res.status(500).json({ error: 'Impossible d’envoyer la demande.' });
  }
}

export async function createVendorBeverageInquiry(req: AuthenticatedRequest, res: Response) {
  try {
    const account = await resolveInquirer(req);
    if (!account?.email) {
      return res.status(401).json({ error: 'Connectez-vous pour envoyer un devis.' });
    }
    const slug = String(req.params.slug || '');
    const resolved = await resolveVendorDrinkLines(slug, req.body?.lines);
    if (!resolved.ok) return res.status(resolved.status).json({ error: resolved.error });
    if (resolved.profile.tenantId === req.user?.tenantId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas demander un devis sur vos propres tarifs.' });
    }
    const identity = inquiryIdentity(account, req.body || {});
    const parsedDate = req.body?.eventDate ? new Date(String(req.body.eventDate)) : null;
    const eventDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
    const note = req.body?.message ? String(req.body.message).trim().slice(0, 2000) : '';
    const dateLabel = eventDate ? eventDate.toISOString().slice(0, 10) : null;
    const message = beverageOrderMessage(resolved.lines, note, dateLabel);
    const first = resolved.lines[0];
    const inquiry = await prisma.marketplaceInquiry.create({
      data: {
        beveragePriceId: first.id,
        beveragePackCount: first.packCount,
        fromName: identity.fromName,
        fromEmail: identity.fromEmail,
        fromPhone: identity.fromPhone,
        eventDate,
        message,
        fromTenantId: req.user?.tenantId || null,
        beverageLines: { create: beverageLineRecords(resolved.lines) },
      },
    });
    const title = beverageInquiryTitle({ beverageLines: resolved.lines }) || 'Boissons';
    const vendorHref = `${FRONTEND_URL}/dashboard/bookings?tab=quotes&role=vendor&inquiryId=${inquiry.id}`;
    const clientHref = `${FRONTEND_URL}/dashboard/bookings?tab=quotes&inquiryId=${inquiry.id}`;
    await notifyInquiry({
      ownerOrgName: resolved.vendorName,
      subjectTitle: title,
      publicUrl: `${FRONTEND_URL}/marketplace/boissons/${resolved.profile.slug}`,
      dashboardHref: vendorHref,
      vendorTenantId: resolved.profile.tenantId,
      inquiry,
    });
    if (req.user?.id) {
      void notifyUsers([req.user.id], {
        type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
        title: `Devis envoyé — ${title}`,
        message: `Votre demande a été transmise à ${resolved.vendorName}. Vous pouvez poursuivre l’échange dans la conversation du devis.`,
        metadata: { inquiryId: inquiry.id, href: clientHref },
      });
    }
    return res.status(201).json({
      success: true,
      inquiryId: inquiry.id,
      message: 'Votre demande a été transmise. Le prestataire peut répondre dans la conversation du devis.',
    });
  } catch (error) {
    console.error('createVendorBeverageInquiry:', error);
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
      priceFromFc, priceUnit, promoPriceFc, promoLabel, promoEndsAt, quotaMin, quotaMax, photos, isPublic, category, blockedDates, details,
      deliveryMode: rawDeliveryMode, deliveryPriceFc: rawDeliveryPrice,
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

    const rental = isServiceRentalCategory(parsedCategory);
    let deliveryMode: ReturnType<typeof parseDeliveryMode> = null;
    let deliveryPriceFc: number | null = null;
    if (rental) {
      if (!doesTravel) {
        deliveryMode = 'pickup';
      } else {
        deliveryMode = parseDeliveryMode(rawDeliveryMode);
        const parsedDelivery = Number.parseInt(String(rawDeliveryPrice ?? ''), 10);
        if (wantPublic && deliveryMode !== 'included' && deliveryMode !== 'extra_fee') {
          return res.status(400).json({ error: 'Précisez si le prix de la livraison est inclus dans le tarif ou facturé en plus.' });
        }
        if (deliveryMode === 'included' || deliveryMode === 'extra_fee') {
          if (!Number.isFinite(parsedDelivery) || parsedDelivery <= 0) {
            if (wantPublic) return res.status(400).json({ error: 'Indiquez le prix de la livraison en FC.' });
          } else {
            deliveryPriceFc = parsedDelivery;
          }
        }
      }
      detailsSafe.deliveryMode = deliveryMode || '';
      detailsSafe.deliveryPriceFc = deliveryPriceFc != null ? String(deliveryPriceFc) : '';
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

    const promo = parseOfferPromotion({
      priceFc: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      promoPriceFc,
      promoLabel,
      promoEndsAt,
    });
    if ('error' in promo) return res.status(400).json({ error: promo.error });

    const data = {
      title: String(title).trim(),
      description: description?.trim() || null,
      city: place.city,
      commune: place.commune,
      neighborhood: place.neighborhood,
      coverageRadiusKm: doesTravel && Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : null,
      travels: doesTravel,
      deliveryMode,
      deliveryPriceFc,
      latitude: latitude != null && latitude !== '' && Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      longitude: longitude != null && longitude !== '' && Number.isFinite(Number(longitude)) ? Number(longitude) : null,
      priceFromFc: Number.isFinite(parsedPrice) ? parsedPrice : null,
      priceUnit: parsePriceUnit(priceUnit),
      promoPriceFc: promo.promo.promoPriceFc,
      promoLabel: promo.promo.promoLabel,
      promoEndsAt: promo.promo.promoEndsAt,
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
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { accountKind: true },
      });
      const isVendorDesk =
        access.canManageRooms
        || tenant?.accountKind === 'VENDOR'
        || tenant?.accountKind === 'BOTH';
      if (!isVendorDesk) return res.status(403).json({ error: 'Accès refusé.' });
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
              { beveragePrice: { tenantId } },
            ],
          },
      include: {
        listing: {
          select: {
            slug: true,
            headline: true,
            room: { select: { name: true } },
            tenant: { select: { name: true, manager: { select: { phone: true } }, vendorProfile: { select: { slug: true, displayName: true } } } },
          },
        },
        offering: {
          select: {
            slug: true,
            title: true,
            category: true,
            deliveryMode: true,
            deliveryPriceFc: true,
            details: true,
            tenant: { select: { name: true, manager: { select: { phone: true } } } },
            vendorProfile: { select: { slug: true, displayName: true } },
          },
        },
        beveragePrice: {
          select: {
            unitLabel: true,
            brand: { select: { name: true } },
            tenant: {
              select: {
                name: true,
                manager: { select: { phone: true } },
                vendorProfile: { select: { slug: true, displayName: true } },
              },
            },
          },
        },
        beverageLines: { select: { packCount: true, unitLabel: true, brandName: true } },
        event: { select: { id: true, title: true, date: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, authorRole: true },
        },
        _count: { select: { messages: true } },
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
          kind: item.beveragePriceId
            ? 'beverage'
            : item.offeringId
              ? (isServiceRentalCategory(item.offering?.category) ? 'rental' : 'service')
              : 'venue',
          title: beverageInquiryTitle(item)
            || item.offering?.title
            || item.listing?.headline
            || item.listing?.room?.name
            || 'Demande',
          fromName: item.fromName,
          fromEmail: item.fromEmail,
          fromPhone: item.fromPhone,
          eventDate: item.eventDate,
          guestCount: item.guestCount,
          message: item.message,
          destinationCommune: item.destinationCommune || null,
          status: item.status,
          quotedAmountFc: item.quotedAmountFc ?? null,
          responseNotes: item.responseNotes ?? null,
          declineReason: item.declineReason ?? null,
          respondedAt: item.respondedAt ?? null,
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
            || item.beveragePrice?.tenant.vendorProfile?.displayName
            || item.beveragePrice?.tenant.name
            || null,
          vendorSlug: item.offering?.vendorProfile?.slug || item.listing?.tenant.vendorProfile?.slug || item.beveragePrice?.tenant.vendorProfile?.slug || null,
          vendorPhone: item.offering?.tenant.manager?.phone || item.listing?.tenant.manager?.phone || item.beveragePrice?.tenant.manager?.phone || null,
          listingSlug: item.listing?.slug || null,
          offeringSlug: item.offering?.slug || null,
          offeringCategory: item.offering?.category || null,
          deliveryExtraFc: item.offering
            ? rentalDeliverySurcharge({
                deliveryMode: item.offering.deliveryMode,
                deliveryPriceFc: item.offering.deliveryPriceFc,
                details: item.offering.details,
                destinationCommune: item.destinationCommune,
              })
            : 0,
          viewerRole: role,
          closedAt: item.closedAt,
          closedByRole: item.closedByRole,
          messageCount: item._count.messages,
          lastMessage: item.messages[0]
            ? {
                body: item.messages[0].body,
                createdAt: item.messages[0].createdAt,
                authorRole: item.messages[0].authorRole,
              }
            : null,
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

    const action = typeof req.body?.action === 'string' ? req.body.action.toLowerCase() : '';
    const requestedStatus = req.body?.status;

    const existing = await prisma.marketplaceInquiry.findFirst({
      where: {
        id,
        OR: [{ listing: { tenantId } }, { offering: { tenantId } }, { beveragePrice: { tenantId } }],
      },
      include: {
        listing: { select: { headline: true, room: { select: { name: true } } } },
        offering: { select: { title: true } },
        beveragePrice: { select: { unitLabel: true, brand: { select: { name: true } } } },
        beverageLines: { select: { packCount: true, unitLabel: true, brandName: true } },
      },
    });
    if (!existing) return res.status(404).json({ error: 'Demande introuvable.' });

    const inquiryTitle = beverageInquiryTitle(existing)
      || existing.offering?.title
      || existing.listing?.headline
      || existing.listing?.room.name
      || 'Demande';

    let updateData: Prisma.MarketplaceInquiryUpdateInput = {};

    if (action === 'quote' || requestedStatus === 'QUOTED') {
      const quotedAmountFc = Number.parseInt(String(req.body?.quotedAmountFc ?? ''), 10);
      if (!Number.isFinite(quotedAmountFc) || quotedAmountFc < 0) {
        return res.status(400).json({ error: 'Montant du devis invalide.' });
      }
      const responseNotes = req.body?.responseNotes ? String(req.body.responseNotes).trim().slice(0, 2000) : null;
      updateData = {
        status: 'QUOTED',
        quotedAmountFc,
        responseNotes,
        respondedAt: new Date(),
      };

      const amountFormatted = `${quotedAmountFc.toLocaleString('fr-FR')} FC`;
      const quoteBody = [`Devis proposé : ${amountFormatted}`, responseNotes].filter(Boolean).join('\n\n');
      await prisma.marketplaceInquiryMessage.create({
        data: {
          inquiryId: existing.id,
          authorRole: INQUIRY_AUTHOR_VENDOR,
          authorUserId: userId,
          body: quoteBody.slice(0, INQUIRY_MESSAGE_MAX_CHARS),
        },
      });
      void notifyInquiryClient({
        inquiry: existing,
        actorUserId: userId,
        title: `Devis chiffré — ${inquiryTitle}`,
        message: `Devis chiffré reçu pour « ${inquiryTitle} » : ${amountFormatted}.${responseNotes ? ` Note : ${responseNotes}` : ''} Vous pouvez répondre au professionnel.`,
      });
    } else if (action === 'decline' || requestedStatus === 'DECLINED') {
      const declineReason = req.body?.declineReason
        ? String(req.body.declineReason).trim().slice(0, 500)
        : 'Indisponible sur cette date ou hors périmètre';
      const responseNotes = req.body?.responseNotes ? String(req.body.responseNotes).trim().slice(0, 2000) : null;
      updateData = {
        status: 'DECLINED',
        declineReason,
        responseNotes,
        respondedAt: new Date(),
        closedAt: existing.closedAt ?? new Date(),
        closedByRole: existing.closedByRole ?? INQUIRY_AUTHOR_VENDOR,
      };

      const declineBody = [`Demande déclinée. Motif : ${declineReason}`, responseNotes].filter(Boolean).join('\n\n');
      await prisma.marketplaceInquiryMessage.create({
        data: {
          inquiryId: existing.id,
          authorRole: INQUIRY_AUTHOR_VENDOR,
          authorUserId: userId,
          body: declineBody.slice(0, INQUIRY_MESSAGE_MAX_CHARS),
        },
      });
      void notifyInquiryClient({
        inquiry: existing,
        actorUserId: userId,
        title: `Demande déclinée — ${inquiryTitle}`,
        message: `Votre demande pour « ${inquiryTitle} » a été déclinée. Motif : ${declineReason}.${responseNotes ? ` Précision : ${responseNotes}` : ''} Vous pouvez répondre au professionnel.`,
      });
    } else if (action === 'contacted' || requestedStatus === 'CONTACTED') {
      updateData = {
        status: 'CONTACTED',
        respondedAt: new Date(),
      };
    } else if (action === 'new' || requestedStatus === 'NEW') {
      updateData = {
        status: 'NEW',
      };
    } else {
      return res.status(400).json({ error: 'Action ou statut invalide.' });
    }

    const updated = await prisma.marketplaceInquiry.update({
      where: { id },
      data: updateData,
    });
    return res.json(updated);
  } catch (error) {
    console.error('updateInquiryStatus:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour la demande.' });
  }
}

export async function listInquiryMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const inquiryId = req.params.id as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const access = await resolveInquiryAccess({ inquiryId, userId, tenantId });
    if (!access) return res.status(404).json({ error: 'Demande introuvable.' });

    const messages = await prisma.marketplaceInquiryMessage.findMany({
      where: { inquiryId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        authorRole: true,
        authorUserId: true,
        body: true,
        createdAt: true,
      },
    });

    return res.json({
      messages,
      closedAt: access.inquiry.closedAt,
      closedByRole: access.inquiry.closedByRole,
      status: access.inquiry.status,
      viewerRole: access.isVendor && !access.isClient
        ? INQUIRY_AUTHOR_VENDOR
        : access.isClient && !access.isVendor
          ? INQUIRY_AUTHOR_CLIENT
          : access.isVendor
            ? INQUIRY_AUTHOR_VENDOR
            : INQUIRY_AUTHOR_CLIENT,
    });
  } catch (error) {
    console.error('listInquiryMessages:', error);
    return res.status(500).json({ error: 'Impossible de charger la conversation.' });
  }
}

export async function postInquiryMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const inquiryId = req.params.id as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Écrivez un message pour répondre.' });
    if (body.length > INQUIRY_MESSAGE_MAX_CHARS) {
      return res.status(400).json({ error: `Le message ne peut pas dépasser ${INQUIRY_MESSAGE_MAX_CHARS} caractères.` });
    }

    const access = await resolveInquiryAccess({ inquiryId, userId, tenantId });
    if (!access) return res.status(404).json({ error: 'Demande introuvable.' });
    if (!access.isClient && !access.isVendor) {
      return res.status(403).json({ error: 'Vous ne pouvez pas répondre à cette demande.' });
    }
    if (access.inquiry.closedAt) {
      return res.status(409).json({ error: 'Cette conversation est clôturée. Vous ne pouvez plus envoyer de message.' });
    }
    if (access.inquiry.status === 'DECLINED') {
      return res.status(409).json({ error: 'Cette demande a été déclinée. La conversation est fermée.' });
    }

    const requestedRole = String(req.body?.authorRole || '').toUpperCase();
    let authorRole = access.isVendor && !access.isClient
      ? INQUIRY_AUTHOR_VENDOR
      : access.isClient && !access.isVendor
        ? INQUIRY_AUTHOR_CLIENT
        : requestedRole === INQUIRY_AUTHOR_CLIENT
          ? INQUIRY_AUTHOR_CLIENT
          : INQUIRY_AUTHOR_VENDOR;

    const created = await prisma.marketplaceInquiryMessage.create({
      data: {
        inquiryId,
        authorRole,
        authorUserId: userId,
        body,
      },
      select: {
        id: true,
        authorRole: true,
        authorUserId: true,
        body: true,
        createdAt: true,
      },
    });

    if (authorRole === INQUIRY_AUTHOR_VENDOR && access.inquiry.status === 'NEW') {
      await prisma.marketplaceInquiry.update({
        where: { id: inquiryId },
        data: { status: 'CONTACTED', respondedAt: new Date() },
      });
    }

    const title = inquiryTitleOf(access.inquiry);
    const preview = body.length > 140 ? `${body.slice(0, 137)}…` : body;
    if (authorRole === INQUIRY_AUTHOR_VENDOR) {
      void notifyInquiryClient({
        inquiry: access.inquiry,
        actorUserId: userId,
        title: `Réponse devis — ${title}`,
        message: `Le professionnel a répondu à propos de « ${title} » : ${preview}`,
      });
    } else if (access.vendorTenantId) {
      void notifyInquiryVendor({
        vendorTenantId: access.vendorTenantId,
        inquiryId,
        actorUserId: userId,
        title: `Réponse client — ${title}`,
        message: `${access.inquiry.fromName} a répondu à propos de « ${title} » : ${preview}`,
      });
    }

    return res.status(201).json({
      message: created,
      status: authorRole === INQUIRY_AUTHOR_VENDOR && access.inquiry.status === 'NEW'
        ? 'CONTACTED'
        : access.inquiry.status,
    });
  } catch (error) {
    console.error('postInquiryMessage:', error);
    return res.status(500).json({ error: 'Impossible d’envoyer la réponse.' });
  }
}

export async function closeInquiryThread(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const inquiryId = req.params.id as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const access = await resolveInquiryAccess({ inquiryId, userId, tenantId });
    if (!access) return res.status(404).json({ error: 'Demande introuvable.' });
    if (!access.isClient && !access.isVendor) {
      return res.status(403).json({ error: 'Vous ne pouvez pas clôturer cette conversation.' });
    }
    if (access.inquiry.closedAt) {
      return res.json({
        closedAt: access.inquiry.closedAt,
        closedByRole: access.inquiry.closedByRole,
        alreadyClosed: true,
      });
    }

    const closedByRole = access.isVendor && !access.isClient
      ? INQUIRY_AUTHOR_VENDOR
      : access.isClient && !access.isVendor
        ? INQUIRY_AUTHOR_CLIENT
        : access.isVendor
          ? INQUIRY_AUTHOR_VENDOR
          : INQUIRY_AUTHOR_CLIENT;
    const closedAt = new Date();
    await prisma.marketplaceInquiry.update({
      where: { id: inquiryId },
      data: { closedAt, closedByRole },
    });

    const title = inquiryTitleOf(access.inquiry);
    const closerLabel = closedByRole === INQUIRY_AUTHOR_VENDOR ? 'Le professionnel' : access.inquiry.fromName;
    if (closedByRole === INQUIRY_AUTHOR_VENDOR) {
      void notifyInquiryClient({
        inquiry: access.inquiry,
        actorUserId: userId,
        title: `Conversation clôturée — ${title}`,
        message: `${closerLabel} a clôturé la conversation pour « ${title} ».`,
      });
    } else if (access.vendorTenantId) {
      void notifyInquiryVendor({
        vendorTenantId: access.vendorTenantId,
        inquiryId,
        actorUserId: userId,
        title: `Conversation clôturée — ${title}`,
        message: `${closerLabel} a clôturé la conversation pour « ${title} ».`,
      });
    }

    return res.json({ closedAt, closedByRole, alreadyClosed: false });
  } catch (error) {
    console.error('closeInquiryThread:', error);
    return res.status(500).json({ error: 'Impossible de clôturer la conversation.' });
  }
}

export async function saveVendorOnboarding(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const {
      displayName,
      category,
      city,
      commune,
      neighborhood,
      travels = true,
      coverageRadiusKm,
      title,
      description,
      priceFromFc,
      priceUnit = 'EVENT',
    } = req.body || {};

    const nameToUse = String(displayName || '').trim() || 'Mon Entreprise';
    const place = normalizeListingPlace(city, commune, neighborhood);
    const resolvedCity = ('error' in place ? null : place.city) || (city ? String(city).trim() : null);

    // 1. S'assurer du profil prestataire
    let profile = await prisma.vendorProfile.findUnique({ where: { tenantId } });
    if (profile) {
      profile = await prisma.vendorProfile.update({
        where: { tenantId },
        data: {
          displayName: nameToUse,
          city: resolvedCity,
        },
      });
    } else {
      const slug = await uniqueSlug(nameToUse, async (s) => {
        const hit = await prisma.vendorProfile.findUnique({ where: { slug: s }, select: { id: true } });
        return Boolean(hit);
      });
      profile = await prisma.vendorProfile.create({
        data: {
          tenantId,
          slug,
          displayName: nameToUse,
          city: resolvedCity,
        },
      });
    }

    // 2. Créer ou mettre à jour la 1ère prestation si category est fournie
    let offering = null;
    if (category) {
      const parsedCategory = parseServiceCategory(category) || 'OTHER';
      const parsedPrice = Number.parseInt(String(priceFromFc ?? ''), 10);
      const parsedRadius = Number.parseInt(String(coverageRadiusKm ?? ''), 10);
      const offerTitle = String(title || '').trim() || `Prestation ${parsedCategory}`;

      const existingOffer = await prisma.serviceOffering.findFirst({
        where: { tenantId, vendorProfileId: profile.id },
      });

      const offerSlug = existingOffer?.slug || await uniqueSlug(`${offerTitle}-${resolvedCity || 'kinshasa'}`, async (s) => {
        const hit = await prisma.serviceOffering.findUnique({ where: { slug: s }, select: { id: true } });
        return Boolean(hit);
      });

      const offerData = {
        title: offerTitle,
        description: description?.trim() || null,
        category: parsedCategory,
        city: resolvedCity,
        commune: ('error' in place ? null : place.commune) || (commune ? String(commune).trim() : null),
        neighborhood: ('error' in place ? null : place.neighborhood) || (neighborhood ? String(neighborhood).trim() : null),
        travels: Boolean(travels),
        coverageRadiusKm: travels && Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : null,
        priceFromFc: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : null,
        priceUnit: parsePriceUnit(priceUnit),
      };

      if (existingOffer) {
        offering = await prisma.serviceOffering.update({
          where: { id: existingOffer.id },
          data: offerData,
        });
      } else {
        offering = await prisma.serviceOffering.create({
          data: {
            ...offerData,
            tenantId,
            vendorProfileId: profile.id,
            slug: offerSlug,
            isPublic: false,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      vendorProfile: profile,
      serviceOffering: offering,
    });
  } catch (error) {
    console.error('saveVendorOnboarding error:', error);
    return res.status(500).json({ error: 'Erreur lors de la configuration initiale du profil prestataire.' });
  }
}
