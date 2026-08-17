import { Response } from 'express';
import { MarketplaceBookingStatus } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import { sendRealEmail } from '../services/notificationService';
import { getPlanLimits } from '../config/plansConfig';
import { computeMarketplaceAmounts } from '../config/marketplaceBilling';
import { mergeBlockedDate, parseBlockedDates, parseDateKey, toDateKey } from '../utils/marketplaceDates';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const HOLD_STATUSES: MarketplaceBookingStatus[] = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];

const bookingInclude = {
  listing: { select: { slug: true, headline: true, roomId: true, address: true, latitude: true, longitude: true, room: { select: { name: true, location: true } } } },
  offering: { select: { slug: true, title: true, category: true } },
  event: { select: { id: true, title: true, date: true } },
  vendorTenant: { select: { id: true, name: true, managerId: true } },
  organizerTenant: { select: { id: true, name: true } },
};

function serializeBooking(row: {
  id: string;
  listingId: string | null;
  offeringId: string | null;
  vendorTenantId: string;
  organizerTenantId: string | null;
  eventId: string | null;
  eventDate: Date;
  guestCount: number | null;
  amountFc: number;
  depositFc: number;
  commissionRate: number;
  commissionFc: number;
  status: MarketplaceBookingStatus;
  depositMarkedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  listing: { slug: string; headline: string | null; room: { name: string } } | null;
  offering: { slug: string; title: string; category: string } | null;
  event: { id: string; title: string; date: Date } | null;
  vendorTenant: { name: string };
  organizerTenant: { name: string } | null;
}) {
  const kind = row.offeringId ? 'service' : 'venue';
  const title = row.offering?.title || row.listing?.headline || row.listing?.room.name || 'Réservation';
  return {
    id: row.id,
    kind,
    title,
    listingSlug: row.listing?.slug || null,
    offeringSlug: row.offering?.slug || null,
    vendorTenantId: row.vendorTenantId,
    organizerTenantId: row.organizerTenantId,
    vendorName: row.vendorTenant.name,
    organizerName: row.organizerTenant?.name || null,
    eventDate: row.eventDate,
    guestCount: row.guestCount,
    amountFc: row.amountFc,
    depositFc: row.depositFc,
    commissionRate: row.commissionRate,
    commissionFc: row.commissionFc,
    status: row.status,
    depositMarkedAt: row.depositMarkedAt,
    notes: row.notes,
    createdAt: row.createdAt,
    event: row.event,
  };
}

async function ownerEmail(tenantId: string, managerId: string | null) {
  const user = managerId
    ? await prisma.user.findUnique({ where: { id: managerId }, select: { email: true } })
    : await prisma.user.findFirst({ where: { tenantId }, select: { email: true }, orderBy: { createdAt: 'asc' } });
  return user?.email;
}

async function isDateTaken(params: { listingId?: string | null; offeringId?: string | null; dateKey: string; excludeId?: string }) {
  const eventDate = parseDateKey(params.dateKey);
  if (!eventDate) return true;
  const dayStart = new Date(`${params.dateKey}T00:00:00.000Z`);
  const dayEnd = new Date(`${params.dateKey}T23:59:59.999Z`);
  const clash = await prisma.marketplaceBooking.findFirst({
    where: {
      status: { in: HOLD_STATUSES },
      eventDate: { gte: dayStart, lte: dayEnd },
      ...(params.listingId ? { listingId: params.listingId } : {}),
      ...(params.offeringId ? { offeringId: params.offeringId } : {}),
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(clash);
}

export async function createBooking(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Connectez-vous avec une organisation pour réserver.' });
    }

    const { listingSlug, offeringSlug, eventDate, guestCount, eventId, notes } = req.body || {};
    const dateKey = toDateKey(String(eventDate || ''));
    const parsedDate = parseDateKey(dateKey);
    if (!parsedDate || !dateKey) {
      return res.status(400).json({ error: 'Indiquez une date d’événement.' });
    }

    const listing = listingSlug
      ? await prisma.venueListing.findFirst({
          where: { slug: String(listingSlug), isPublic: true },
          include: { room: { select: { name: true, location: true } }, tenant: { select: { id: true, name: true, managerId: true } } },
        })
      : null;
    const offering = offeringSlug
      ? await prisma.serviceOffering.findFirst({
          where: { slug: String(offeringSlug), isPublic: true },
          include: { tenant: { select: { id: true, name: true, managerId: true } } },
        })
      : null;

    if (!listing && !offering) {
      return res.status(404).json({ error: 'Offre introuvable ou non publiée.' });
    }

    const vendorTenantId = listing?.tenantId || offering!.tenantId;
    if (vendorTenantId === tenantId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas réserver votre propre offre.' });
    }

    const price = listing?.priceFromFc ?? offering?.priceFromFc;
    if (price == null || price < 0) {
      return res.status(400).json({ error: 'Cette offre n’a pas de tarif. Envoyez d’abord un devis.' });
    }

    const blocked = parseBlockedDates(listing?.blockedDates ?? offering?.blockedDates);
    if (blocked.includes(dateKey) || await isDateTaken({ listingId: listing?.id, offeringId: offering?.id, dateKey })) {
      return res.status(409).json({ error: 'Cette date n’est plus disponible.' });
    }

    let linkedEventId: string | null = null;
    if (eventId) {
      const event = await prisma.event.findFirst({
        where: { id: String(eventId), tenantId },
        select: { id: true },
      });
      linkedEventId = event?.id || null;
    }

    const amounts = computeMarketplaceAmounts(price);
    const parsedGuests = Number.parseInt(String(guestCount || ''), 10);

    const booking = await prisma.marketplaceBooking.create({
      data: {
        listingId: listing?.id || null,
        offeringId: offering?.id || null,
        vendorTenantId,
        organizerTenantId: tenantId,
        organizerUserId: userId,
        eventId: linkedEventId,
        eventDate: parsedDate,
        guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
        ...amounts,
        notes: notes ? String(notes).trim().slice(0, 2000) : null,
      },
      include: bookingInclude,
    });

    const title = offering?.title || listing?.headline || listing?.room.name || 'Offre';
    const vendorMail = await ownerEmail(vendorTenantId, listing?.tenant.managerId || offering?.tenant.managerId || null);
    if (vendorMail) {
      await sendRealEmail(
        vendorMail,
        `[EventMaster] Demande de réservation — ${title}`,
        `Nouvelle réservation le ${dateKey} pour « ${title} ». Montant ${amounts.amountFc} FC, acompte ${amounts.depositFc} FC.`,
        `<p>Nouvelle réservation le <strong>${dateKey}</strong> pour <strong>${title}</strong>.</p><p>Montant : ${amounts.amountFc} FC · Acompte : ${amounts.depositFc} FC · Commission plateforme : ${amounts.commissionFc} FC (8 %).</p><p><a href="${FRONTEND_URL}/dashboard/marketplace">Ouvrir Marketplace</a></p>`,
      );
    }

    return res.status(201).json({
      booking: serializeBooking(booking),
      message: 'Demande de réservation envoyée. Le professionnel doit l’accepter, puis l’acompte sera marqué hors plateforme.',
    });
  } catch (error) {
    console.error('createBooking:', error);
    return res.status(500).json({ error: 'Impossible de créer la réservation.' });
  }
}

export async function listBookings(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const role = req.query.role === 'organizer' ? 'organizer' : req.query.role === 'vendor' ? 'vendor' : 'all';
    const where =
      role === 'vendor'
        ? { vendorTenantId: tenantId }
        : role === 'organizer'
          ? { organizerTenantId: tenantId }
          : { OR: [{ vendorTenantId: tenantId }, { organizerTenantId: tenantId }] };

    const rows = await prisma.marketplaceBooking.findMany({
      where,
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const commissionDue = rows
      .filter((b) => b.vendorTenantId === tenantId && (b.status === 'CONFIRMED' || b.status === 'COMPLETED'))
      .reduce((sum, b) => sum + b.commissionFc, 0);

    return res.json({
      bookings: rows.map((row) => ({
        ...serializeBooking(row),
        viewerRole: row.vendorTenantId === tenantId ? 'vendor' : 'organizer',
      })),
      commissionDueFc: commissionDue,
      commissionRate: 0.08,
    });
  } catch (error) {
    console.error('listBookings:', error);
    return res.status(500).json({ error: 'Impossible de charger les réservations.' });
  }
}

export async function updateBooking(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const id = req.params.id as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const booking = await prisma.marketplaceBooking.findFirst({
      where: { id, OR: [{ vendorTenantId: tenantId }, { organizerTenantId: tenantId }] },
      include: {
        listing: { include: { room: true } },
        offering: true,
        vendorTenant: { select: { id: true, name: true, managerId: true } },
        organizerTenant: { select: { id: true, name: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Réservation introuvable.' });

    const isVendor = booking.vendorTenantId === tenantId;
    const isOrganizer = booking.organizerTenantId === tenantId;
    const action = String(req.body?.action || '');

    if (action === 'accept') {
      if (!isVendor) return res.status(403).json({ error: 'Seul le professionnel peut accepter.' });
      if (booking.status !== 'REQUESTED') return res.status(400).json({ error: 'Cette demande n’est plus en attente.' });
      const amountFc = req.body?.amountFc != null ? Number.parseInt(String(req.body.amountFc), 10) : booking.amountFc;
      if (!Number.isFinite(amountFc) || amountFc < 0) return res.status(400).json({ error: 'Montant invalide.' });
      const amounts = computeMarketplaceAmounts(amountFc);
      const updated = await prisma.marketplaceBooking.update({
        where: { id },
        data: { status: 'ACCEPTED', ...amounts },
        include: bookingInclude,
      });
      return res.json({ booking: serializeBooking(updated), message: 'Réservation acceptée. En attente de l’acompte.' });
    }

    if (action === 'decline' || action === 'cancel') {
      if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Une réservation confirmée ne peut plus être annulée ici.' });
      }
      if (!isVendor && !isOrganizer) return res.status(403).json({ error: 'Accès refusé.' });
      const updated = await prisma.marketplaceBooking.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: bookingInclude,
      });
      return res.json({ booking: serializeBooking(updated), message: 'Réservation annulée.' });
    }

    if (action === 'mark-deposit') {
      if (booking.status !== 'ACCEPTED') {
        return res.status(400).json({ error: 'Acceptez d’abord la réservation.' });
      }
      if (!isVendor && !isOrganizer) return res.status(403).json({ error: 'Accès refusé.' });
      const updated = await prisma.marketplaceBooking.update({
        where: { id },
        data: { depositMarkedAt: new Date() },
        include: bookingInclude,
      });
      return res.json({ booking: serializeBooking(updated), message: 'Acompte marqué. Confirmez pour bloquer la date.' });
    }

    if (action === 'confirm') {
      if (!isVendor) return res.status(403).json({ error: 'Seul le professionnel peut confirmer.' });
      if (booking.status !== 'ACCEPTED') return res.status(400).json({ error: 'La réservation doit être acceptée.' });
      if (!booking.depositMarkedAt) {
        return res.status(400).json({ error: 'Marquez d’abord l’acompte comme reçu.' });
      }

      const dateKey = toDateKey(booking.eventDate);
      let eventId = booking.eventId;
      const attachEvent = req.body?.attachEvent !== false;

      if (booking.listing && booking.organizerTenantId && attachEvent) {
        if (eventId) {
          await prisma.event.update({
            where: { id: eventId },
            data: {
              roomId: booking.listing.roomId,
              location: booking.listing.address || booking.listing.room.location || undefined,
              latitude: booking.listing.latitude ?? undefined,
              longitude: booking.listing.longitude ?? undefined,
              date: booking.eventDate,
            },
          });
        } else {
          const organizer = await prisma.tenant.findUnique({
            where: { id: booking.organizerTenantId },
            include: { _count: { select: { events: true } } },
          });
          const limits = organizer ? getPlanLimits(organizer.plan) : null;
          if (organizer && limits && organizer._count.events < limits.maxEvents) {
            const created = await prisma.event.create({
              data: {
                tenantId: booking.organizerTenantId,
                title: `Réservation — ${booking.listing.headline || booking.listing.room.name}`,
                date: booking.eventDate,
                location: booking.listing.address || booking.listing.room.location || booking.listing.room.name,
                latitude: booking.listing.latitude,
                longitude: booking.listing.longitude,
                roomId: booking.listing.roomId,
              },
            });
            eventId = created.id;
          }
        }
      }

      if (dateKey) {
        if (booking.listingId) {
          const listing = await prisma.venueListing.findUnique({ where: { id: booking.listingId }, select: { blockedDates: true } });
          await prisma.venueListing.update({
            where: { id: booking.listingId },
            data: { blockedDates: mergeBlockedDate(listing?.blockedDates, dateKey) },
          });
        }
        if (booking.offeringId) {
          const offering = await prisma.serviceOffering.findUnique({ where: { id: booking.offeringId }, select: { blockedDates: true } });
          await prisma.serviceOffering.update({
            where: { id: booking.offeringId },
            data: { blockedDates: mergeBlockedDate(offering?.blockedDates, dateKey) },
          });
        }
      }

      const updated = await prisma.marketplaceBooking.update({
        where: { id },
        data: { status: 'CONFIRMED', eventId },
        include: bookingInclude,
      });

      return res.json({
        booking: serializeBooking(updated),
        message: eventId
          ? 'Réservation confirmée. La salle a été rattachée à l’événement.'
          : 'Réservation confirmée. Date bloquée au calendrier.',
      });
    }

    return res.status(400).json({ error: 'Action inconnue.' });
  } catch (error) {
    console.error('updateBooking:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour la réservation.' });
  }
}

export async function convertInquiryToBooking(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const inquiryId = req.params.id as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });

    const inquiry = await prisma.marketplaceInquiry.findFirst({
      where: {
        id: inquiryId,
        OR: [{ listing: { tenantId } }, { offering: { tenantId } }],
      },
      include: {
        listing: true,
        offering: true,
      },
    });
    if (!inquiry) return res.status(404).json({ error: 'Demande introuvable.' });
    if (!inquiry.eventDate) {
      return res.status(400).json({ error: 'La demande n’a pas de date. Demandez-la au client avant de réserver.' });
    }

    const existing = await prisma.marketplaceBooking.findUnique({ where: { inquiryId } });
    if (existing) return res.status(409).json({ error: 'Une réservation existe déjà pour cette demande.' });

    const price = inquiry.listing?.priceFromFc ?? inquiry.offering?.priceFromFc;
    if (price == null) return res.status(400).json({ error: 'Ajoutez un tarif sur l’offre avant de convertir.' });

    const dateKey = toDateKey(inquiry.eventDate);
    const blocked = parseBlockedDates(inquiry.listing?.blockedDates ?? inquiry.offering?.blockedDates);
    if (!dateKey || blocked.includes(dateKey) || await isDateTaken({ listingId: inquiry.listingId, offeringId: inquiry.offeringId, dateKey })) {
      return res.status(409).json({ error: 'Cette date n’est plus disponible.' });
    }

    const amounts = computeMarketplaceAmounts(price);
    const booking = await prisma.marketplaceBooking.create({
      data: {
        listingId: inquiry.listingId,
        offeringId: inquiry.offeringId,
        inquiryId: inquiry.id,
        vendorTenantId: tenantId,
        organizerTenantId: inquiry.fromTenantId,
        eventId: inquiry.eventId,
        eventDate: inquiry.eventDate,
        guestCount: inquiry.guestCount,
        notes: inquiry.message,
        ...amounts,
        status: 'ACCEPTED',
      },
      include: bookingInclude,
    });

    await prisma.marketplaceInquiry.update({
      where: { id: inquiry.id },
      data: { status: 'CONTACTED' },
    });

    return res.status(201).json({
      booking: serializeBooking(booking),
      message: 'Demande convertie en réservation acceptée. Marquez l’acompte puis confirmez.',
    });
  } catch (error) {
    console.error('convertInquiryToBooking:', error);
    return res.status(500).json({ error: 'Impossible de convertir la demande.' });
  }
}
