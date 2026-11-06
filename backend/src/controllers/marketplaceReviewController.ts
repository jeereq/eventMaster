import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import { notifyTenantOperators } from '../services/platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import { startOfKinshasaDay } from '../services/marketplaceBookingCompletion';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const COMMENT_MAX = 1000;

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  vendorReply: string | null;
  vendorRepliedAt: Date | null;
  createdAt: Date;
  listing?: { slug: string; headline: string | null; room: { name: string } } | null;
  offering?: { slug: string; title: string; category: string } | null;
};

export function serializeReview(row: ReviewRow) {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    authorName: row.authorName,
    vendorReply: row.vendorReply,
    vendorRepliedAt: row.vendorRepliedAt,
    createdAt: row.createdAt,
    subject: row.offering
      ? { kind: 'service' as const, slug: row.offering.slug, title: row.offering.title, category: row.offering.category }
      : row.listing
        ? { kind: 'venue' as const, slug: row.listing.slug, title: row.listing.headline || row.listing.room.name, category: null }
        : null,
  };
}

const reviewInclude = {
  listing: { select: { slug: true, headline: true, room: { select: { name: true } } } },
  offering: { select: { slug: true, title: true, category: true } },
};

/** « Prénom N. » : jamais le nom complet d'un particulier sur une fiche publique. */
function publicAuthorName(userName: string | null | undefined, orgName: string | null | undefined): string {
  const parts = String(userName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  if (parts.length === 1) return parts[0];
  return String(orgName || '').trim() || 'Client EventMaster';
}

export async function ratingSummary(where: { listingId?: string; offeringId?: string; vendorTenantId?: string }) {
  const agg = await prisma.marketplaceReview.aggregate({
    where: { ...where, isHidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  return { count, average: count ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : null };
}

/** Le client note une réservation terminée (une seule fois). */
export async function createBookingReview(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Connectez-vous pour laisser un avis.' });
    const id = String(req.params.id || '');

    const booking = await prisma.marketplaceBooking.findUnique({
      where: { id },
      include: {
        review: { select: { id: true } },
        organizerTenant: { select: { name: true } },
        listing: { select: { headline: true, room: { select: { name: true } } } },
        offering: { select: { title: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Réservation introuvable.' });
    const isOrganizer =
      (Boolean(tenantId) && booking.organizerTenantId === tenantId) || booking.organizerUserId === userId;
    if (!isOrganizer || booking.vendorTenantId === tenantId) {
      return res.status(403).json({ error: 'Seul le client de cette réservation peut laisser un avis.' });
    }
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Vous pourrez laisser un avis une fois la date passée.' });
    }
    if (booking.review) return res.status(409).json({ error: 'Vous avez déjà laissé un avis pour cette réservation.' });

    const rating = Math.round(Number(req.body?.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Choisissez une note de 1 à 5 étoiles.' });
    }
    const comment = String(req.body?.comment || '').trim().slice(0, COMMENT_MAX) || null;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const review = await prisma.marketplaceReview.create({
      data: {
        bookingId: booking.id,
        vendorTenantId: booking.vendorTenantId,
        listingId: booking.listingId,
        offeringId: booking.offeringId,
        authorUserId: userId,
        authorName: publicAuthorName(user?.name, booking.organizerTenant?.name),
        rating,
        comment,
      },
      include: reviewInclude,
    });

    const title = booking.offering?.title || booking.listing?.headline || booking.listing?.room.name || 'votre offre';
    void notifyTenantOperators(booking.vendorTenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
      title: `Nouvel avis — ${rating}/5`,
      message: `${review.authorName} a laissé un avis sur « ${title} ». Vous pouvez y répondre publiquement.`,
      metadata: { bookingId: booking.id, href: `${FRONTEND_URL}/dashboard/bookings?tab=bookings&role=vendor&bookingId=${booking.id}` },
    });

    return res.status(201).json({ review: serializeReview(review), message: 'Merci ! Votre avis est publié.' });
  } catch (error) {
    console.error('createBookingReview:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer votre avis.' });
  }
}

/** Le prestataire répond publiquement à un avis (propriétaire et managers). */
export async function replyToReview(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent répondre aux avis.' });
    }
    const review = await prisma.marketplaceReview.findFirst({ where: { id: String(req.params.id || ''), vendorTenantId: tenantId } });
    if (!review) return res.status(404).json({ error: 'Avis introuvable.' });
    const reply = String(req.body?.reply || '').trim().slice(0, COMMENT_MAX);
    const updated = await prisma.marketplaceReview.update({
      where: { id: review.id },
      data: { vendorReply: reply || null, vendorRepliedAt: reply ? new Date() : null },
      include: reviewInclude,
    });
    return res.json({ review: serializeReview(updated), message: reply ? 'Réponse publiée.' : 'Réponse retirée.' });
  } catch (error) {
    console.error('replyToReview:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer la réponse.' });
  }
}

/** Avis reçus par le prestataire connecté. */
export async function listReceivedReviews(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const rows = await prisma.marketplaceReview.findMany({
      where: { vendorTenantId: tenantId, isHidden: false },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({
      summary: await ratingSummary({ vendorTenantId: tenantId }),
      reviews: rows.map(serializeReview),
    });
  } catch (error) {
    console.error('listReceivedReviews:', error);
    return res.status(500).json({ error: 'Impossible de charger les avis.' });
  }
}

/** Avis publics d'une salle, d'une prestation ou de tout un prestataire. */
export async function listPublicReviews(req: Request, res: Response) {
  try {
    const kind = String(req.query.kind || '');
    const slug = String(req.query.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug requis.' });

    let where: { listingId?: string; offeringId?: string; vendorTenantId?: string } | null = null;
    if (kind === 'venue') {
      const listing = await prisma.venueListing.findFirst({ where: { slug, isPublic: true, isBlockedByAdmin: false }, select: { id: true } });
      if (listing) where = { listingId: listing.id };
    } else if (kind === 'service') {
      const offering = await prisma.serviceOffering.findFirst({ where: { slug, isPublic: true, isBlockedByAdmin: false }, select: { id: true } });
      if (offering) where = { offeringId: offering.id };
    } else if (kind === 'vendor') {
      const profile = await prisma.vendorProfile.findFirst({ where: { slug, isBlockedByAdmin: false }, select: { tenantId: true } });
      if (profile) where = { vendorTenantId: profile.tenantId };
    } else {
      return res.status(400).json({ error: 'Type inconnu.' });
    }
    if (!where) return res.status(404).json({ error: 'Fiche introuvable.' });

    const rows = await prisma.marketplaceReview.findMany({
      where: { ...where, isHidden: false },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.json({ summary: await ratingSummary(where), reviews: rows.map(serializeReview) });
  } catch (error) {
    console.error('listPublicReviews:', error);
    return res.status(500).json({ error: 'Impossible de charger les avis.' });
  }
}

/**
 * Compte une vue de fiche publique (le navigateur n'envoie qu'une vue par fiche et par session).
 * Les visites de l'organisation propriétaire ne sont pas comptées.
 */
export async function recordListingView(req: AuthenticatedRequest, res: Response) {
  try {
    const kind = String(req.body?.kind || '');
    const slug = String(req.body?.slug || '').trim().slice(0, 200);
    if (!slug || (kind !== 'venue' && kind !== 'service')) return res.status(204).end();

    const target = kind === 'venue'
      ? await prisma.venueListing.findFirst({ where: { slug, isPublic: true }, select: { id: true, tenantId: true } })
      : await prisma.serviceOffering.findFirst({ where: { slug, isPublic: true }, select: { id: true, tenantId: true } });
    if (!target || (req.user?.tenantId && req.user.tenantId === target.tenantId)) return res.status(204).end();

    // Jour civil de Kinshasa, stocké en date UTC.
    const day = new Date(startOfKinshasaDay().getTime() + 60 * 60 * 1000);
    day.setUTCHours(0, 0, 0, 0);

    if (kind === 'venue') {
      await prisma.listingViewDay.upsert({
        where: { listingId_day: { listingId: target.id, day } },
        create: { tenantId: target.tenantId, listingId: target.id, day, views: 1 },
        update: { views: { increment: 1 } },
      });
    } else {
      await prisma.listingViewDay.upsert({
        where: { offeringId_day: { offeringId: target.id, day } },
        create: { tenantId: target.tenantId, offeringId: target.id, day, views: 1 },
        update: { views: { increment: 1 } },
      });
    }
    return res.status(204).end();
  } catch (error) {
    console.error('recordListingView:', error);
    return res.status(204).end();
  }
}
