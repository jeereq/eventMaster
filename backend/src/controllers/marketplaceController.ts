import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import { sendRealEmail } from '../services/notificationService';
import { uniqueSlug } from '../utils/slug';
import {
  parsePhotoUrls,
  parsePriceUnit,
  parseServiceCategory,
  priceUnitLabel,
  sanitizeLayoutBlueprint,
  serviceCategoryLabel,
} from '../utils/publicVenue';
import { RoomType, ServiceCategory, TenantAccountKind } from '@prisma/client';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function toPublicVenue(listing: {
  slug: string;
  headline: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  priceFromFc: number | null;
  priceUnit: 'EVENT' | 'DAY' | 'HOUR';
  photos: unknown;
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
    vendorProfile: { displayName: string; city: string | null } | null;
  };
}) {
  const photos = parsePhotoUrls(listing.photos);
  return {
    slug: listing.slug,
    name: listing.room.name,
    headline: listing.headline || listing.room.name,
    description: listing.room.description,
    city: listing.city,
    address: listing.address || listing.room.location,
    floor: listing.room.floor,
    capacity: listing.room.capacity,
    roomType: listing.room.roomType,
    latitude: listing.latitude,
    longitude: listing.longitude,
    priceFromFc: listing.priceFromFc,
    priceUnit: listing.priceUnit,
    priceUnitLabel: priceUnitLabel(listing.priceUnit),
    photos,
    coverUrl: photos[0] || null,
    publishedAt: listing.publishedAt,
    orgName: listing.tenant.vendorProfile?.displayName || listing.tenant.name,
    orgCity: listing.tenant.vendorProfile?.city || listing.city,
    layoutPreview: sanitizeLayoutBlueprint(listing.room.layoutBlueprint),
  };
}

const listingInclude = {
  room: true,
  tenant: {
    select: {
      name: true,
      branding: true,
      vendorProfile: { select: { displayName: true, city: true } },
    },
  },
} as const;

export async function listPublicVenues(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const roomType = typeof req.query.roomType === 'string' ? req.query.roomType.trim() : '';
    const minCapacity = Number.parseInt(String(req.query.minCapacity || ''), 10);
    const maxPrice = Number.parseInt(String(req.query.maxPrice || ''), 10);

    const roomFilter: { roomType?: RoomType; capacity?: { gte: number } } = {};
    const allowedTypes: RoomType[] = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];
    if (roomType && allowedTypes.includes(roomType as RoomType)) {
      roomFilter.roomType = roomType as RoomType;
    }
    if (Number.isFinite(minCapacity) && minCapacity > 0) {
      roomFilter.capacity = { gte: minCapacity };
    }

    const listings = await prisma.venueListing.findMany({
      where: {
        isPublic: true,
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        ...(Number.isFinite(maxPrice) && maxPrice > 0
          ? { priceFromFc: { lte: maxPrice } }
          : {}),
        ...(Object.keys(roomFilter).length > 0 ? { room: roomFilter } : {}),
        ...(q
          ? {
              OR: [
                { headline: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
                { address: { contains: q, mode: 'insensitive' } },
                { room: { name: { contains: q, mode: 'insensitive' } } },
                { tenant: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: listingInclude,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    });

    return res.json({
      venues: listings.map(toPublicVenue),
      total: listings.length,
    });
  } catch (error) {
    console.error('listPublicVenues:', error);
    return res.status(500).json({ error: 'Impossible de charger les salles.' });
  }
}

export async function getPublicVenue(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug requis.' });

    const listing = await prisma.venueListing.findFirst({
      where: { slug, isPublic: true },
      include: listingInclude,
    });
    if (!listing) {
      return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
    }

    return res.json(toPublicVenue(listing));
  } catch (error) {
    console.error('getPublicVenue:', error);
    return res.status(500).json({ error: 'Impossible de charger la salle.' });
  }
}

export async function createVenueInquiry(req: AuthenticatedRequest, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    const { name, email, phone, eventDate, guestCount, message } = req.body || {};

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Nom, e-mail et message sont requis.' });
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

    const fromEmail = String(email).trim().toLowerCase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.marketplaceInquiry.count({
      where: { listingId: listing.id, fromEmail, createdAt: { gte: since } },
    });
    if (recent >= 3) {
      return res.status(429).json({ error: 'Trop de demandes aujourd’hui pour cette salle. Réessayez demain.' });
    }

    const parsedDate = eventDate ? new Date(eventDate) : null;
    const parsedGuests = Number.parseInt(String(guestCount || ''), 10);

    const inquiry = await prisma.marketplaceInquiry.create({
      data: {
        listingId: listing.id,
        fromName: String(name).trim().slice(0, 120),
        fromEmail,
        fromPhone: phone ? String(phone).trim().slice(0, 40) : null,
        eventDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
        message: String(message).trim().slice(0, 4000),
        fromTenantId: req.user?.tenantId || null,
      },
    });

    const manager = listing.tenant.managerId
      ? await prisma.user.findUnique({
          where: { id: listing.tenant.managerId },
          select: { email: true, name: true },
        })
      : await prisma.user.findFirst({
          where: { tenantId: listing.tenant.id },
          select: { email: true, name: true },
          orderBy: { createdAt: 'asc' },
        });

    const listingUrl = `${FRONTEND_URL}/marketplace/salles/${listing.slug}`;
    const ownerEmail = manager?.email;
    if (ownerEmail) {
      const subject = `[EventMaster] Demande de devis — ${listing.room.name}`;
      const text = [
        `Nouvelle demande pour « ${listing.room.name} » (${listing.tenant.name}).`,
        '',
        `Nom : ${inquiry.fromName}`,
        `E-mail : ${inquiry.fromEmail}`,
        inquiry.fromPhone ? `Téléphone : ${inquiry.fromPhone}` : null,
        inquiry.eventDate ? `Date souhaitée : ${inquiry.eventDate.toLocaleDateString('fr-FR')}` : null,
        inquiry.guestCount ? `Invités estimés : ${inquiry.guestCount}` : null,
        '',
        inquiry.message,
        '',
        `Fiche : ${listingUrl}`,
      ]
        .filter(Boolean)
        .join('\n');
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;">
          <h2 style="margin-top:0;">Demande de devis — ${listing.room.name}</h2>
          <p><strong>Nom :</strong> ${inquiry.fromName}</p>
          <p><strong>E-mail :</strong> <a href="mailto:${inquiry.fromEmail}">${inquiry.fromEmail}</a></p>
          ${inquiry.fromPhone ? `<p><strong>Téléphone :</strong> ${inquiry.fromPhone}</p>` : ''}
          ${inquiry.eventDate ? `<p><strong>Date :</strong> ${inquiry.eventDate.toLocaleDateString('fr-FR')}</p>` : ''}
          ${inquiry.guestCount ? `<p><strong>Invités :</strong> ${inquiry.guestCount}</p>` : ''}
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:16px;white-space:pre-line;">${inquiry.message}</div>
          <p style="margin-top:16px;"><a href="${listingUrl}">Voir la fiche salle</a></p>
        </div>
      `;
      await sendRealEmail(ownerEmail, subject, text, html);
    }

    await sendRealEmail(
      fromEmail,
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
      address,
      latitude,
      longitude,
      priceFromFc,
      priceUnit,
      photos,
    } = req.body || {};

    const wantPublic = Boolean(isPublic);
    const parsedPrice = Number.parseInt(String(priceFromFc ?? ''), 10);
    const photosSafe = parsePhotoUrls(photos);

    if (wantPublic) {
      if (!city?.trim()) {
        return res.status(400).json({ error: 'La ville est requise pour publier la salle.' });
      }
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'Indiquez un tarif de départ en FC.' });
      }
    }

    const existing = await prisma.venueListing.findUnique({ where: { roomId } });
    const slug = existing?.slug
      || await uniqueSlug(`${room.name}-${city || room.location || 'kinshasa'}`, async (s) => {
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
        city: city?.trim() || null,
        address: address?.trim() || room.location,
        latitude: latitude != null && latitude !== '' ? Number(latitude) : null,
        longitude: longitude != null && longitude !== '' ? Number(longitude) : null,
        priceFromFc: Number.isFinite(parsedPrice) ? parsedPrice : null,
        priceUnit: parsePriceUnit(priceUnit),
        photos: photosSafe,
        publishedAt: wantPublic ? new Date() : null,
      },
      update: {
        isPublic: wantPublic,
        headline: headline !== undefined ? (headline?.trim() || room.name) : undefined,
        city: city !== undefined ? (city?.trim() || null) : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        latitude: latitude !== undefined ? (latitude != null && latitude !== '' ? Number(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude != null && longitude !== '' ? Number(longitude) : null) : undefined,
        priceFromFc: priceFromFc !== undefined ? (Number.isFinite(parsedPrice) ? parsedPrice : null) : undefined,
        priceUnit: priceUnit !== undefined ? parsePriceUnit(priceUnit) : undefined,
        photos: photos !== undefined ? photosSafe : undefined,
        publishedAt: wantPublic ? (existing?.publishedAt || new Date()) : null,
      },
    });

    if (wantPublic) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, accountKind: true } });
      await ensureVendorProfile(tenantId, tenant?.name || room.name, city?.trim() || listing.city);
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
  coverageRadiusKm: number | null;
  priceFromFc: number | null;
  priceUnit: 'EVENT' | 'DAY' | 'HOUR';
  photos: unknown;
  publishedAt: Date | null;
  vendorProfile: { displayName: string; city: string | null; slug: string };
  tenant: { name: string };
}) {
  const photos = parsePhotoUrls(offering.photos);
  return {
    slug: offering.slug,
    title: offering.title,
    description: offering.description,
    category: offering.category,
    categoryLabel: serviceCategoryLabel(offering.category),
    city: offering.city,
    coverageRadiusKm: offering.coverageRadiusKm,
    priceFromFc: offering.priceFromFc,
    priceUnit: offering.priceUnit,
    priceUnitLabel: priceUnitLabel(offering.priceUnit),
    photos,
    coverUrl: photos[0] || null,
    publishedAt: offering.publishedAt,
    orgName: offering.vendorProfile.displayName || offering.tenant.name,
    orgSlug: offering.vendorProfile.slug,
  };
}

const offeringInclude = {
  vendorProfile: { select: { displayName: true, city: true, slug: true } },
  tenant: { select: { name: true } },
} as const;

export async function listPublicServices(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const category = parseServiceCategory(req.query.category);

    const offerings = await prisma.serviceOffering.findMany({
      where: {
        isPublic: true,
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
                { vendorProfile: { displayName: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: offeringInclude,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    });

    return res.json({ services: offerings.map(toPublicService), total: offerings.length });
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
      where: { slug, isPublic: true },
      include: offeringInclude,
    });
    if (!offering) return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
    return res.json(toPublicService(offering));
  } catch (error) {
    console.error('getPublicService:', error);
    return res.status(500).json({ error: 'Impossible de charger la prestation.' });
  }
}

async function notifyInquiry(params: {
  ownerEmail: string | undefined;
  ownerOrgName: string;
  subjectTitle: string;
  publicUrl: string;
  inquiry: {
    fromName: string;
    fromEmail: string;
    fromPhone: string | null;
    eventDate: Date | null;
    guestCount: number | null;
    message: string;
  };
}) {
  const { inquiry } = params;
  if (params.ownerEmail) {
    const subject = `[EventMaster] Demande de devis — ${params.subjectTitle}`;
    const text = [
      `Nouvelle demande pour « ${params.subjectTitle} » (${params.ownerOrgName}).`,
      '',
      `Nom : ${inquiry.fromName}`,
      `E-mail : ${inquiry.fromEmail}`,
      inquiry.fromPhone ? `Téléphone : ${inquiry.fromPhone}` : null,
      inquiry.eventDate ? `Date souhaitée : ${inquiry.eventDate.toLocaleDateString('fr-FR')}` : null,
      inquiry.guestCount ? `Invités estimés : ${inquiry.guestCount}` : null,
      '',
      inquiry.message,
      '',
      `Fiche : ${params.publicUrl}`,
    ]
      .filter(Boolean)
      .join('\n');
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;">
        <h2 style="margin-top:0;">Demande de devis — ${params.subjectTitle}</h2>
        <p><strong>Nom :</strong> ${inquiry.fromName}</p>
        <p><strong>E-mail :</strong> <a href="mailto:${inquiry.fromEmail}">${inquiry.fromEmail}</a></p>
        ${inquiry.fromPhone ? `<p><strong>Téléphone :</strong> ${inquiry.fromPhone}</p>` : ''}
        ${inquiry.eventDate ? `<p><strong>Date :</strong> ${inquiry.eventDate.toLocaleDateString('fr-FR')}</p>` : ''}
        ${inquiry.guestCount ? `<p><strong>Invités :</strong> ${inquiry.guestCount}</p>` : ''}
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:16px;white-space:pre-line;">${inquiry.message}</div>
        <p style="margin-top:16px;"><a href="${params.publicUrl}">Voir la fiche</a></p>
      </div>
    `;
    await sendRealEmail(params.ownerEmail, subject, text, html);
  }
  await sendRealEmail(
    inquiry.fromEmail,
    `Votre demande — ${params.subjectTitle}`,
    `Nous avons transmis votre demande pour « ${params.subjectTitle} » à ${params.ownerOrgName}. Ils vous recontacteront directement.`,
    `<p>Nous avons transmis votre demande pour <strong>${params.subjectTitle}</strong> à ${params.ownerOrgName}.</p><p>Ils vous recontacteront directement.</p>`,
  );
}

async function resolveOwnerEmail(tenant: { id: string; managerId: string | null }) {
  const manager = tenant.managerId
    ? await prisma.user.findUnique({ where: { id: tenant.managerId }, select: { email: true } })
    : await prisma.user.findFirst({
        where: { tenantId: tenant.id },
        select: { email: true },
        orderBy: { createdAt: 'asc' },
      });
  return manager?.email;
}

export async function createServiceInquiry(req: AuthenticatedRequest, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    const { name, email, phone, eventDate, guestCount, message, eventId } = req.body || {};
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Nom, e-mail et message sont requis.' });
    }

    const offering = await prisma.serviceOffering.findFirst({
      where: { slug, isPublic: true },
      include: { tenant: { select: { id: true, name: true, managerId: true } } },
    });
    if (!offering) return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });

    const fromEmail = String(email).trim().toLowerCase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.marketplaceInquiry.count({
      where: { offeringId: offering.id, fromEmail, createdAt: { gte: since } },
    });
    if (recent >= 3) {
      return res.status(429).json({ error: 'Trop de demandes aujourd’hui pour ce prestataire. Réessayez demain.' });
    }

    const parsedDate = eventDate ? new Date(eventDate) : null;
    const parsedGuests = Number.parseInt(String(guestCount || ''), 10);
    let linkedEventId: string | null = null;
    if (eventId && req.user?.tenantId) {
      const event = await prisma.event.findFirst({
        where: { id: String(eventId), tenantId: req.user.tenantId },
        select: { id: true },
      });
      linkedEventId = event?.id || null;
    }

    const inquiry = await prisma.marketplaceInquiry.create({
      data: {
        offeringId: offering.id,
        fromName: String(name).trim().slice(0, 120),
        fromEmail,
        fromPhone: phone ? String(phone).trim().slice(0, 40) : null,
        eventDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
        message: String(message).trim().slice(0, 4000),
        fromTenantId: req.user?.tenantId || null,
        eventId: linkedEventId,
      },
    });

    await notifyInquiry({
      ownerEmail: await resolveOwnerEmail(offering.tenant),
      ownerOrgName: offering.tenant.name,
      subjectTitle: offering.title,
      publicUrl: `${FRONTEND_URL}/marketplace/prestataires/${offering.slug}`,
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
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ services });
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
      title, description, city, coverageRadiusKm, priceFromFc, priceUnit, photos, isPublic, category,
    } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'Le titre est requis.' });
    const parsedCategory = parseServiceCategory(category) || 'OTHER';
    const wantPublic = Boolean(isPublic);
    const parsedPrice = Number.parseInt(String(priceFromFc ?? ''), 10);
    const parsedRadius = Number.parseInt(String(coverageRadiusKm ?? ''), 10);
    const photosSafe = parsePhotoUrls(photos);

    if (wantPublic) {
      if (!city?.trim()) return res.status(400).json({ error: 'La ville / zone est requise pour publier.' });
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'Indiquez un tarif de départ en FC.' });
      }
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, accountKind: true } });
    const profile = await ensureVendorProfile(tenantId, tenant?.name || title, city?.trim() || null);
    const serviceId = typeof req.params.id === 'string' ? req.params.id : '';

    const existing = serviceId
      ? await prisma.serviceOffering.findFirst({ where: { id: serviceId, tenantId } })
      : null;
    if (serviceId && !existing) return res.status(404).json({ error: 'Prestation introuvable.' });

    const slug = existing?.slug
      || await uniqueSlug(`${title}-${city || 'kinshasa'}`, async (s) => {
        const hit = await prisma.serviceOffering.findUnique({ where: { slug: s }, select: { id: true } });
        return Boolean(hit);
      });

    const data = {
      title: String(title).trim(),
      description: description?.trim() || null,
      city: city?.trim() || null,
      coverageRadiusKm: Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : null,
      priceFromFc: Number.isFinite(parsedPrice) ? parsedPrice : null,
      priceUnit: parsePriceUnit(priceUnit),
      photos: photosSafe,
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
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });

    const inquiries = await prisma.marketplaceInquiry.findMany({
      where: {
        OR: [
          { listing: { tenantId } },
          { offering: { tenantId } },
        ],
      },
      include: {
        listing: { select: { slug: true, headline: true, room: { select: { name: true } } } },
        offering: { select: { slug: true, title: true, category: true } },
        event: { select: { id: true, title: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({
      inquiries: inquiries.map((item) => ({
        id: item.id,
        kind: item.offeringId ? 'service' : 'venue',
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
      })),
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
