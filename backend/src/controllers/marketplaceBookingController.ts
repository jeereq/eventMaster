import { Response } from 'express';
import { MarketplaceBookingStatus } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import { notifyTenantOperators, notifyUsers } from '../services/platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import { getPlanLimitsForTenant } from '../config/plansConfig';
import { computeMarketplaceAmounts, billedMarketplaceAmount } from '../config/marketplaceBilling';
import {
  eachDateKey,
  isRangeAvailable,
  mergeBlockedDates,
  parseBlockedDates,
  parseDateKey,
  toDateKey,
} from '../utils/marketplaceDates';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const HOLD_STATUSES: MarketplaceBookingStatus[] = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];

const bookingInclude = {
  listing: { select: { slug: true, headline: true, roomId: true, address: true, latitude: true, longitude: true, room: { select: { name: true, location: true } } } },
  offering: { select: { slug: true, title: true, category: true } },
  event: { select: { id: true, title: true, date: true } },
  vendorTenant: { select: { id: true, name: true, managerId: true, manager: { select: { phone: true, phoneCountryCode: true } }, vendorProfile: { select: { slug: true, displayName: true } } } },
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
  eventEndDate: Date | null;
  guestCount: number | null;
  amountFc: number;
  depositFc: number;
  commissionRate: number;
  commissionFc: number;
  status: MarketplaceBookingStatus;
  depositMarkedAt: Date | null;
  declineReason?: string | null;
  declinedAt?: Date | null;
  notes: string | null;
  createdAt: Date;
  listing?: { slug: string; headline: string | null; room?: { name: string } | null } | null;
  offering?: { slug: string; title: string; category: string } | null;
  event?: { id: string; title: string; date: Date } | null;
  vendorTenant?: { name: string; manager?: { phone?: string | null; phoneCountryCode?: string | null } | null; vendorProfile?: { slug: string; displayName: string } | null } | null;
  organizerTenant?: { name: string } | null;
}) {
  const kind = row.offeringId ? 'service' : 'venue';
  const title = row.offering?.title || row.listing?.headline || row.listing?.room?.name || 'Réservation';
  return {
    id: row.id,
    kind,
    title,
    listingSlug: row.listing?.slug || null,
    offeringSlug: row.offering?.slug || null,
    offeringCategory: row.offering?.category || null,
    vendorTenantId: row.vendorTenantId,
    organizerTenantId: row.organizerTenantId,
    vendorName: row.vendorTenant?.vendorProfile?.displayName || row.vendorTenant?.name || 'Prestataire',
    vendorSlug: row.vendorTenant?.vendorProfile?.slug || null,
    vendorPhone: row.vendorTenant?.manager?.phone || null,
    organizerName: row.organizerTenant?.name || null,
    eventDate: row.eventDate,
    eventEndDate: row.eventEndDate,
    guestCount: row.guestCount,
    amountFc: row.amountFc,
    depositFc: row.depositFc,
    commissionRate: row.commissionRate,
    commissionFc: row.commissionFc,
    status: row.status,
    depositMarkedAt: row.depositMarkedAt,
    declineReason: row.declineReason ?? null,
    declinedAt: row.declinedAt ?? null,
    notes: row.notes,
    createdAt: row.createdAt,
    event: row.event,
  };
}

async function notifyBookingStatus(
  booking: {
    id: string;
    vendorTenantId: string;
    organizerTenantId?: string | null;
    organizerUserId: string | null;
    listing: { headline: string | null; room: { name: string } } | null;
    offering: { title: string } | null;
  },
  payload:
    | string
    | {
        title?: string;
        vendorMessage?: string;
        organizerMessage?: string;
        vendorWhatsApp?: string;
        organizerWhatsApp?: string;
      },
) {
  const isString = typeof payload === 'string';
  const defaultTitle = booking.offering?.title || booking.listing?.headline || booking.listing?.room.name || 'Réservation';
  const title = (!isString && payload.title) || defaultTitle;
  const vendorMessage = isString ? payload : (payload.vendorMessage || payload.organizerMessage || '');
  const organizerMessage = isString ? payload : (payload.organizerMessage || payload.vendorMessage || '');
  const vendorWhatsApp = !isString ? payload.vendorWhatsApp : undefined;
  const organizerWhatsApp = !isString ? payload.organizerWhatsApp : undefined;

  const vendorHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&role=vendor&bookingId=${booking.id}`;
  const organizerHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&bookingId=${booking.id}`;

  void notifyTenantOperators(booking.vendorTenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
    title,
    message: vendorMessage,
    metadata: { bookingId: booking.id, href: vendorHref },
    whatsapp: vendorWhatsApp,
  });

  if (booking.organizerUserId) {
    void notifyUsers([booking.organizerUserId], {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
      title,
      message: organizerMessage,
      metadata: { bookingId: booking.id, href: organizerHref },
      whatsapp: organizerWhatsApp,
    });
  }

  if (booking.organizerTenantId && booking.organizerTenantId !== booking.vendorTenantId) {
    void notifyTenantOperators(booking.organizerTenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
      title,
      message: organizerMessage,
      metadata: { bookingId: booking.id, href: organizerHref },
      whatsapp: organizerWhatsApp,
    });
  }
}

async function isRangeTaken(params: {
  listingId?: string | null;
  offeringId?: string | null;
  from: string;
  to: string;
  excludeId?: string;
}) {
  const start = parseDateKey(params.from);
  const end = parseDateKey(params.to);
  if (!start || !end) return true;
  const rangeStart = new Date(`${params.from <= params.to ? params.from : params.to}T00:00:00.000Z`);
  const rangeEnd = new Date(`${params.from <= params.to ? params.to : params.from}T23:59:59.999Z`);
  const clash = await prisma.marketplaceBooking.findFirst({
    where: {
      status: { in: HOLD_STATUSES },
      ...(params.listingId ? { listingId: params.listingId } : {}),
      ...(params.offeringId ? { offeringId: params.offeringId } : {}),
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      OR: [
        {
          eventEndDate: null,
          eventDate: { gte: rangeStart, lte: rangeEnd },
        },
        {
          eventEndDate: { not: null },
          AND: [
            { eventDate: { lte: rangeEnd } },
            { eventEndDate: { gte: rangeStart } },
          ],
        },
      ],
    },
    select: { id: true },
  });
  return Boolean(clash);
}

function parseBookingRange(eventDate: unknown, eventEndDate: unknown) {
  const from = toDateKey(String(eventDate || ''));
  const to = toDateKey(String(eventEndDate || eventDate || '')) || from;
  if (!from || !to) return null;
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const keys = eachDateKey(start, end);
  if (!keys.length || keys.length > 31) return null;
  const parsedStart = parseDateKey(start);
  const parsedEnd = parseDateKey(end);
  if (!parsedStart || !parsedEnd) return null;
  return {
    from: start,
    to: end,
    keys,
    parsedStart,
    parsedEnd: start === end ? null : parsedEnd,
    dayCount: keys.length,
  };
}

function formatRangeLabel(from: string, to: string) {
  return from === to ? from : `du ${from} au ${to}`;
}

export async function createBooking(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Connectez-vous pour réserver.' });
    }

    const { listingSlug, offeringSlug, eventDate, eventEndDate, guestCount, eventId, notes } = req.body || {};
    const range = parseBookingRange(eventDate, eventEndDate);
    if (!range) {
      return res.status(400).json({ error: 'Indiquez une date, ou une plage de 31 jours maximum.' });
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
    const taken = await isRangeTaken({
      listingId: listing?.id,
      offeringId: offering?.id,
      from: range.from,
      to: range.to,
    });
    if (!isRangeAvailable(blocked, range.from, range.to) || taken) {
      return res.status(409).json({ error: 'Une ou plusieurs dates de cette plage ne sont plus disponibles.' });
    }

    let linkedEventId: string | null = null;
    if (eventId) {
      const organizer = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { accountKind: true },
      });
      if (organizer?.accountKind !== 'CLIENT') {
        const event = await prisma.event.findFirst({
          where: { id: String(eventId), tenantId },
          select: { id: true },
        });
        linkedEventId = event?.id || null;
      }
    }

    const amounts = billedMarketplaceAmount(price, listing?.priceUnit ?? offering?.priceUnit, range.dayCount);
    const parsedGuests = Number.parseInt(String(guestCount || ''), 10);

    const inquiryCandidates = await prisma.marketplaceInquiry.findMany({
      where: {
        fromTenantId: tenantId,
        ...(listing ? { listingId: listing.id } : { offeringId: offering!.id }),
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { id: true, eventId: true },
    });
    const takenInquiries = inquiryCandidates.length
      ? await prisma.marketplaceBooking.findMany({
          where: { inquiryId: { in: inquiryCandidates.map((row) => row.id) } },
          select: { inquiryId: true },
        })
      : [];
    const takenInquiryIds = new Set(takenInquiries.map((row) => row.inquiryId).filter(Boolean));
    const openInquiries = inquiryCandidates.filter((row) => !takenInquiryIds.has(row.id));
    const linkedInquiryId =
      (linkedEventId ? openInquiries.find((row) => row.eventId === linkedEventId)?.id : null)
      || openInquiries.find((row) => !row.eventId)?.id
      || (!linkedEventId ? openInquiries[0]?.id : null)
      || null;

    const booking = await prisma.marketplaceBooking.create({
      data: {
        listingId: listing?.id || null,
        offeringId: offering?.id || null,
        inquiryId: linkedInquiryId,
        vendorTenantId,
        organizerTenantId: tenantId,
        organizerUserId: userId,
        eventId: linkedEventId,
        eventDate: range.parsedStart,
        eventEndDate: range.parsedEnd,
        guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
        ...amounts,
        notes: notes ? String(notes).trim().slice(0, 2000) : null,
      },
      include: bookingInclude,
    });

    const title = offering?.title || listing?.headline || listing?.room.name || 'Offre';
    const period = formatRangeLabel(range.from, range.to);
    const vendorHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&role=vendor&bookingId=${booking.id}`;
    const organizerHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&bookingId=${booking.id}`;
    const amountFormatted = `${amounts.amountFc.toLocaleString('fr-FR')} FC`;
    const depositFormatted = `${amounts.depositFc.toLocaleString('fr-FR')} FC`;
    const vendorMessage = `Demande ${period}. Montant ${amountFormatted}, acompte ${depositFormatted}.`;

    void notifyTenantOperators(vendorTenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING,
      title: `Réservation — ${title}`,
      message: vendorMessage,
      metadata: {
        bookingId: booking.id,
        href: vendorHref,
      },
      whatsapp: `Nouvelle réservation ${period} pour « ${title} ». Montant ${amountFormatted}, acompte ${depositFormatted}.\nConsultez : ${vendorHref}`,
    });
    void notifyUsers([userId], {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING,
      title: `Demande envoyée — ${title}`,
      message: `Votre demande de réservation (${period}) a été transmise. En attente de validation du professionnel.`,
      metadata: {
        bookingId: booking.id,
        href: organizerHref,
      },
      whatsapp: `Votre réservation pour « ${title} » (${period}) a bien été transmise au prestataire.\nSuivez l'avancement : ${organizerHref}`,
    });

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
    const isOrganizer = booking.organizerTenantId === tenantId || (Boolean(booking.organizerUserId) && booking.organizerUserId === userId);
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
      const title = booking.offering?.title || booking.listing?.headline || booking.listing?.room.name || 'Réservation';
      const depositFormatted = `${amounts.depositFc.toLocaleString('fr-FR')} FC`;
      const organizerHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&bookingId=${booking.id}`;
      const vendorHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&role=vendor&bookingId=${booking.id}`;

      void notifyBookingStatus(
        { ...booking, organizerUserId: booking.organizerUserId },
        {
          title: `Réservation acceptée — ${title}`,
          vendorMessage: `Vous avez accepté la réservation pour « ${title} ». En attente de l'acompte (${depositFormatted}).`,
          organizerMessage: `Votre réservation pour « ${title} » a été acceptée ! Veuillez verser l'acompte de ${depositFormatted} pour bloquer la date.`,
          organizerWhatsApp: `Bonne nouvelle ! Votre réservation pour « ${title} » a été acceptée par le professionnel.\nAcompte requis : ${depositFormatted}.\nConsultez et finalisez : ${organizerHref}`,
          vendorWhatsApp: `Vous avez accepté la réservation pour « ${title} ». Acompte attendu : ${depositFormatted} : ${vendorHref}`,
        },
      );
      return res.json({ booking: serializeBooking(updated), message: 'Réservation acceptée. En attente de l’acompte.' });
    }

    if (action === 'decline' || action === 'cancel') {
      if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Une réservation confirmée ne peut plus être annulée ici.' });
      }
      if (!isVendor && !isOrganizer) return res.status(403).json({ error: 'Accès refusé.' });
      const declineReason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : null;
      const updated = await prisma.marketplaceBooking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          declineReason,
          declinedAt: new Date(),
        },
        include: bookingInclude,
      });
      const title = booking.offering?.title || booking.listing?.headline || booking.listing?.room.name || 'Réservation';
      const reasonSuffix = declineReason ? ` Motif : ${declineReason}` : '';
      const actionLabel = action === 'decline' ? 'refusée' : 'annulée';

      void notifyBookingStatus(booking, {
        title: `Réservation ${actionLabel} — ${title}`,
        vendorMessage: `Réservation pour « ${title} » ${actionLabel}.${reasonSuffix}`,
        organizerMessage: `Votre réservation pour « ${title} » a été ${actionLabel}.${reasonSuffix}`,
        organizerWhatsApp: `Information : votre réservation pour « ${title} » a été ${actionLabel}.${reasonSuffix}`,
      });
      return res.json({ booking: serializeBooking(updated), message: `Réservation ${action === 'decline' ? 'refusée' : 'annulée'}.` });
    }

    if (action === 'mark-deposit') {
      if (booking.status !== 'ACCEPTED') {
        return res.status(400).json({ error: 'Acceptez d’abord la réservation.' });
      }
      if (!isVendor && !isOrganizer) return res.status(403).json({ error: 'Accès refusé.' });
      const depositNote = req.body?.depositNote ? String(req.body.depositNote).trim().slice(0, 300) : null;
      const updatedNotes = depositNote
        ? (booking.notes ? `${booking.notes}\n[Acompte] ${depositNote}` : `[Acompte] ${depositNote}`)
        : booking.notes;
      const updated = await prisma.marketplaceBooking.update({
        where: { id },
        data: {
          depositMarkedAt: new Date(),
          notes: updatedNotes,
        },
        include: bookingInclude,
      });

      const title = booking.offering?.title || booking.listing?.headline || booking.listing?.room.name || 'Réservation';
      const depositFormatted = `${booking.depositFc.toLocaleString('fr-FR')} FC`;
      const noteSuffix = depositNote ? ` (Réf : ${depositNote})` : '';
      const vendorHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&role=vendor&bookingId=${booking.id}`;
      const organizerHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&bookingId=${booking.id}`;

      if (isOrganizer) {
        // Le client indique avoir versé l'acompte -> Notifier le professionnel pour vérification
        void notifyTenantOperators(booking.vendorTenantId, {
          type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
          title: `Acompte déclaré — ${title}`,
          message: `Le client a déclaré avoir versé l'acompte de ${depositFormatted}${noteSuffix}. Vérifiez votre compte et confirmez la réservation.`,
          metadata: { bookingId: booking.id, href: vendorHref },
          whatsapp: `Acompte déclaré pour « ${title} » : Le client indique avoir versé ${depositFormatted}${noteSuffix}.\nVérifiez votre compte et confirmez la réservation : ${vendorHref}`,
        });
        if (booking.organizerUserId) {
          void notifyUsers([booking.organizerUserId], {
            type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
            title: `Acompte transmis — ${title}`,
            message: `Votre déclaration de versement d'acompte (${depositFormatted})${noteSuffix} a été transmise au prestataire pour validation.`,
            metadata: { bookingId: booking.id, href: organizerHref },
          });
        }
      } else {
        // Le professionnel a validé la réception de l'acompte
        void notifyTenantOperators(booking.vendorTenantId, {
          type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
          title: `Acompte validé — ${title}`,
          message: `Vous avez validé la réception de l'acompte (${depositFormatted}). Confirmez pour verrouiller la date.`,
          metadata: { bookingId: booking.id, href: vendorHref },
        });
        if (booking.organizerUserId) {
          void notifyUsers([booking.organizerUserId], {
            type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
            title: `Acompte validé — ${title}`,
            message: `Le professionnel a confirmé la réception de votre acompte de ${depositFormatted}. La réservation sera confirmée sous peu.`,
            metadata: { bookingId: booking.id, href: organizerHref },
            whatsapp: `Bonne nouvelle ! Votre acompte de ${depositFormatted} pour « ${title} » a été validé par le professionnel.\nConsultez : ${organizerHref}`,
          });
        }
        if (booking.organizerTenantId && booking.organizerTenantId !== booking.vendorTenantId) {
          void notifyTenantOperators(booking.organizerTenantId, {
            type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
            title: `Acompte validé — ${title}`,
            message: `Le professionnel a validé la réception de l'acompte de ${depositFormatted}.`,
            metadata: { bookingId: booking.id, href: organizerHref },
          });
        }
      }

      return res.json({ booking: serializeBooking(updated), message: 'Acompte marqué. Confirmez pour bloquer la date.' });
    }

    if (action === 'confirm') {
      if (!isVendor) return res.status(403).json({ error: 'Seul le professionnel peut confirmer.' });
      if (booking.status !== 'ACCEPTED') return res.status(400).json({ error: 'La réservation doit être acceptée.' });
      if (!booking.depositMarkedAt) {
        return res.status(400).json({ error: 'Marquez d’abord l’acompte comme reçu.' });
      }

      const dateKeys = eachDateKey(
        toDateKey(booking.eventDate) || '',
        toDateKey(booking.eventEndDate || booking.eventDate) || toDateKey(booking.eventDate) || '',
      );
      let eventId = booking.eventId;
      const attachEvent = req.body?.attachEvent !== false;

      if (booking.listing && booking.organizerTenantId && attachEvent) {
        const organizer = await prisma.tenant.findUnique({
          where: { id: booking.organizerTenantId },
          include: { _count: { select: { events: true } } },
        });
        if (organizer?.accountKind !== 'CLIENT') {
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
            const limits = organizer ? getPlanLimitsForTenant(organizer.plan, organizer.accountKind) : null;
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
      }

      if (dateKeys.length) {
        if (booking.listingId) {
          const listing = await prisma.venueListing.findUnique({ where: { id: booking.listingId }, select: { blockedDates: true } });
          await prisma.venueListing.update({
            where: { id: booking.listingId },
            data: { blockedDates: mergeBlockedDates(listing?.blockedDates, dateKeys) },
          });
        }
        if (booking.offeringId) {
          const offering = await prisma.serviceOffering.findUnique({ where: { id: booking.offeringId }, select: { blockedDates: true } });
          await prisma.serviceOffering.update({
            where: { id: booking.offeringId },
            data: { blockedDates: mergeBlockedDates(offering?.blockedDates, dateKeys) },
          });
        }
      }

      const updated = await prisma.marketplaceBooking.update({
        where: { id },
        data: { status: 'CONFIRMED', eventId },
        include: bookingInclude,
      });
      const confirmTitle = updated.offering?.title || updated.listing?.headline || updated.listing?.room.name || 'Réservation';
      const confirmPeriod = formatRangeLabel(toDateKey(booking.eventDate) || '', toDateKey(booking.eventEndDate || booking.eventDate) || '');
      const vendorConfirmHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&role=vendor&bookingId=${booking.id}`;
      const organizerConfirmHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&bookingId=${booking.id}`;

      notifyBookingStatus(updated, {
        title: `Réservation confirmée — ${confirmTitle}`,
        vendorMessage: `Réservation confirmée pour « ${confirmTitle} » (${confirmPeriod}). Date bloquée au calendrier.`,
        organizerMessage: `Votre réservation pour « ${confirmTitle} » (${confirmPeriod}) est officiellement confirmée ! La date est verrouillée.`,
        organizerWhatsApp: `Félicitations ! Votre réservation pour « ${confirmTitle} » (${confirmPeriod}) est officiellement confirmée sur EventMaster !\nConsultez votre reçu et récapitulatif : ${organizerConfirmHref}`,
        vendorWhatsApp: `Réservation confirmée pour « ${confirmTitle} » (${confirmPeriod}). Le calendrier a été mis à jour automatiquement : ${vendorConfirmHref}`,
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

    const customAmount = req.body?.amountFc != null ? Number.parseInt(String(req.body.amountFc), 10) : null;
    const price = (Number.isFinite(customAmount) && (customAmount ?? 0) >= 0)
      ? customAmount
      : (inquiry.quotedAmountFc ?? inquiry.listing?.priceFromFc ?? inquiry.offering?.priceFromFc);
    if (price == null) return res.status(400).json({ error: 'Ajoutez un tarif sur l’offre ou fournissez un montant pour convertir.' });

    const dateKey = toDateKey(inquiry.eventDate);
    const blocked = parseBlockedDates(inquiry.listing?.blockedDates ?? inquiry.offering?.blockedDates);
    if (
      !dateKey
      || !isRangeAvailable(blocked, dateKey, dateKey)
      || await isRangeTaken({ listingId: inquiry.listingId, offeringId: inquiry.offeringId, from: dateKey, to: dateKey })
    ) {
      return res.status(409).json({ error: 'Cette date n’est plus disponible.' });
    }

    const inquirerUser = await prisma.user.findFirst({
      where: { email: { equals: inquiry.fromEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    const organizerUserId = inquirerUser?.id || null;

    const amounts = computeMarketplaceAmounts(price);
    const booking = await prisma.marketplaceBooking.create({
      data: {
        listingId: inquiry.listingId,
        offeringId: inquiry.offeringId,
        inquiryId: inquiry.id,
        vendorTenantId: tenantId,
        organizerTenantId: inquiry.fromTenantId,
        organizerUserId,
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

    const bookingTitle = booking.offering?.title || booking.listing?.headline || booking.listing?.room.name || 'Réservation';
    const depositFormatted = `${amounts.depositFc.toLocaleString('fr-FR')} FC`;
    const amountFormatted = `${amounts.amountFc.toLocaleString('fr-FR')} FC`;
    const clientBookingHref = `${FRONTEND_URL}/dashboard/bookings?tab=bookings&bookingId=${booking.id}`;

    if (inquiry.fromTenantId) {
      void notifyTenantOperators(inquiry.fromTenantId, {
        type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING,
        title: `Réservation acceptée — ${bookingTitle}`,
        message: `Votre devis a été converti en réservation acceptée (${amountFormatted}). Veuillez verser l'acompte de ${depositFormatted}.`,
        metadata: { bookingId: booking.id, href: clientBookingHref },
        whatsapp: `Votre devis pour « ${bookingTitle} » a été converti en réservation acceptée au montant de ${amountFormatted}.\nAcompte requis : ${depositFormatted}.\nConsultez les détails : ${clientBookingHref}`,
      });
    }
    if (organizerUserId) {
      void notifyUsers([organizerUserId], {
        type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING,
        title: `Réservation acceptée — ${bookingTitle}`,
        message: `Votre devis a été converti en réservation acceptée (${amountFormatted}). Veuillez verser l'acompte de ${depositFormatted}.`,
        metadata: { bookingId: booking.id, href: clientBookingHref },
        whatsapp: `Votre devis pour « ${bookingTitle} » a été converti en réservation acceptée au montant de ${amountFormatted}.\nAcompte requis : ${depositFormatted}.\nConsultez les détails : ${clientBookingHref}`,
      });
    }

    return res.status(201).json({
      booking: serializeBooking(booking),
      message: 'Demande convertie en réservation acceptée. Marquez l’acompte puis confirmez.',
    });
  } catch (error) {
    console.error('convertInquiryToBooking:', error);
    return res.status(500).json({ error: 'Impossible de convertir la demande.' });
  }
}
