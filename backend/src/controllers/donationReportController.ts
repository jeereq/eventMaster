import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { canAccessEvent } from '../services/permissionsService';
import { extractEventDonationsConfig } from '../services/donationsAccess';
import {
  parseDonationMeta,
  resolveChannelLabel,
  csvEscape,
  type DonationMeta,
} from '../utils/donationReportUtils';

/**
 * Rapport détaillé des dons d'un événement pour les organisateurs / gestionnaires.
 */
export async function getEventDonationsReport(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && !(await canAccessEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès non autorisé à cet événement.' });
    }

    const event = await prisma.event.findFirst({
      where: isSuperAdmin ? { id: eventId } : { id: eventId, tenantId },
      select: {
        id: true,
        title: true,
        slug: true,
        date: true,
        location: true,
        eventPrep: true,
        isPublic: true,
        tenant: { select: { id: true, name: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement introuvable.' });
    }

    const donationsConfig = extractEventDonationsConfig(event.eventPrep);

    // Récupérer toutes les commandes de dons pour cet événement
    const orders = await prisma.ticketOrder.findMany({
      where: {
        eventId,
        pricingZoneId: 'donation',
      },
      include: {
        guests: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            rsvp: true,
            checkedInAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let collectedAmountFc = 0;
    let pendingAmountFc = 0;
    let donationsPaidCount = 0;
    let donationsPendingCount = 0;
    let donationsCancelledCount = 0;
    let highestDonationFc = 0;
    let anonymousDonationsCount = 0;
    let attendeePassesCount = 0;

    const uniqueDonors = new Set<string>();
    const channelMap = new Map<string, { label: string; count: number; amountFc: number }>();
    const timelineMap = new Map<string, { date: string; amountFc: number; count: number }>();

    const donationsList = orders.map((ord) => {
      const meta = parseDonationMeta(ord.selectedSeats);
      const isPaid = ord.status === 'PAID';
      const isPending = ord.status === 'PENDING';
      const channelLabel = resolveChannelLabel(ord.flexPayChannel, ord.paymentProvider);

      if (isPaid) {
        collectedAmountFc += ord.amountFc;
        donationsPaidCount += 1;
        if (ord.amountFc > highestDonationFc) highestDonationFc = ord.amountFc;
        uniqueDonors.add(ord.buyerEmail.toLowerCase().trim());

        // Channel breakdown
        const chKey = ord.flexPayChannel || ord.paymentProvider || 'other';
        const curCh = channelMap.get(chKey) || { label: channelLabel, count: 0, amountFc: 0 };
        curCh.count += 1;
        curCh.amountFc += ord.amountFc;
        channelMap.set(chKey, curCh);

        // Timeline (sur date de paiement)
        const dayKey = (ord.paidAt || ord.createdAt).toISOString().slice(0, 10);
        const curDay = timelineMap.get(dayKey) || { date: dayKey, amountFc: 0, count: 0 };
        curDay.amountFc += ord.amountFc;
        curDay.count += 1;
        timelineMap.set(dayKey, curDay);

        if (ord.guests && ord.guests.length > 0) {
          attendeePassesCount += ord.guests.length;
        }
      } else if (isPending) {
        pendingAmountFc += ord.amountFc;
        donationsPendingCount += 1;
      } else {
        donationsCancelledCount += 1;
      }

      if (meta.isAnonymous) {
        anonymousDonationsCount += 1;
      }

      return {
        id: ord.id,
        createdAt: ord.createdAt.toISOString(),
        paidAt: ord.paidAt ? ord.paidAt.toISOString() : null,
        amountFc: ord.amountFc,
        status: ord.status,
        buyerName: meta.isAnonymous ? 'Donateur anonyme' : ord.buyerName,
        actualBuyerName: ord.buyerName,
        buyerEmail: meta.isAnonymous ? '***@***' : ord.buyerEmail,
        buyerPhone: meta.isAnonymous ? null : ord.buyerPhone,
        paymentProvider: ord.paymentProvider,
        flexPayChannel: ord.flexPayChannel,
        channelLabel,
        flexPayOrderNumber: ord.flexPayOrderNumber,
        flexPayReference: ord.flexPayReference,
        donationNote: meta.donationNote,
        isAnonymous: Boolean(meta.isAnonymous),
        donorAttendancePass: Boolean(meta.donorAttendancePass),
        guest: ord.guests?.[0]
          ? {
              id: ord.guests[0].id,
              firstName: ord.guests[0].firstName,
              lastName: ord.guests[0].lastName,
              rsvp: ord.guests[0].rsvp,
              checkedInAt: ord.guests[0].checkedInAt ? ord.guests[0].checkedInAt.toISOString() : null,
            }
          : null,
      };
    });

    const targetAmountFc = donationsConfig?.targetAmountFc ?? null;
    const progressPercent =
      targetAmountFc && targetAmountFc > 0
        ? Math.min(100, Math.round((collectedAmountFc / targetAmountFc) * 100))
        : null;

    const averageDonationFc = donationsPaidCount > 0 ? Math.round(collectedAmountFc / donationsPaidCount) : 0;

    const channels = Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel,
      label: data.label,
      count: data.count,
      amountFc: data.amountFc,
      percent: collectedAmountFc > 0 ? Math.round((data.amountFc / collectedAmountFc) * 100) : 0,
    })).sort((a, b) => b.amountFc - a.amountFc);

    const timeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        date: event.date,
        location: event.location,
        isPublic: event.isPublic,
        tenantName: event.tenant?.name || 'Organisation',
      },
      config: {
        enabled: Boolean(donationsConfig?.enabled),
        targetAmountFc,
        minAmountFc: donationsConfig?.minAmountFc || 1000,
        cause: donationsConfig?.cause || null,
        donorAttendancePass: donationsConfig?.donorAttendancePass !== false,
      },
      summary: {
        collectedAmountFc,
        pendingAmountFc,
        targetAmountFc,
        progressPercent,
        donorsCount: uniqueDonors.size || donationsPaidCount,
        donationsPaidCount,
        donationsPendingCount,
        donationsCancelledCount,
        totalAttemptsCount: orders.length,
        averageDonationFc,
        highestDonationFc,
        anonymousDonationsCount,
        attendeePassesCount,
      },
      channels,
      timeline,
      donations: donationsList,
    });
  } catch (error: any) {
    console.error('[getEventDonationsReport] Erreur:', error);
    return res.status(500).json({ error: 'Impossible de générer le rapport des dons.' });
  }
}

/**
 * Export CSV des dons d'un événement.
 */
export async function exportEventDonationsReport(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && !(await canAccessEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès non autorisé à cet événement.' });
    }

    const event = await prisma.event.findFirst({
      where: isSuperAdmin ? { id: eventId } : { id: eventId, tenantId },
      select: { id: true, title: true, slug: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement introuvable.' });
    }

    const orders = await prisma.ticketOrder.findMany({
      where: { eventId, pricingZoneId: 'donation' },
      include: {
        guests: {
          select: { id: true, checkedInAt: true, rsvp: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'ID Commande',
      'Date création',
      'Date paiement',
      'Statut',
      'Montant (FC)',
      'Nom donateur',
      'Email donateur',
      'Téléphone',
      'Anonyme',
      'Canal de paiement',
      'Référence FlexPay',
      'Pass invité émis',
      'Présence validée au guichet',
      'Message / Note du donateur',
    ].map(csvEscape).join(',');

    const lines = orders.map((ord) => {
      const meta = parseDonationMeta(ord.selectedSeats);
      const isPaid = ord.status === 'PAID';
      const channelLabel = resolveChannelLabel(ord.flexPayChannel, ord.paymentProvider);
      const guest = ord.guests?.[0];

      return [
        csvEscape(ord.id),
        csvEscape(ord.createdAt.toISOString().slice(0, 19).replace('T', ' ')),
        csvEscape(ord.paidAt ? ord.paidAt.toISOString().slice(0, 19).replace('T', ' ') : ''),
        csvEscape(ord.status === 'PAID' ? 'PAYÉ' : ord.status === 'PENDING' ? 'EN ATTENTE' : ord.status),
        ord.amountFc,
        csvEscape(meta.isAnonymous ? 'Donateur anonyme' : ord.buyerName),
        csvEscape(meta.isAnonymous ? 'masqué' : ord.buyerEmail),
        csvEscape(meta.isAnonymous ? '' : ord.buyerPhone || ''),
        csvEscape(meta.isAnonymous ? 'OUI' : 'NON'),
        csvEscape(channelLabel),
        csvEscape(ord.flexPayOrderNumber || ord.flexPayReference || ''),
        csvEscape(guest ? 'OUI' : 'NON'),
        csvEscape(guest?.checkedInAt ? 'OUI' : 'NON'),
        csvEscape(meta.donationNote || ''),
      ].join(',');
    });

    const csv = `\uFEFF${header}\n${lines.join('\n')}`;
    const filename = `dons-${(event.slug || event.id).slice(0, 25)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (error: any) {
    console.error('[exportEventDonationsReport] Erreur:', error);
    return res.status(500).json({ error: 'Impossible d\'exporter les dons.' });
  }
}

/**
 * Rapport consolidé plateforme des dons pour le Super Admin.
 */
export async function getAdminDonationsReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { tenantId, eventId, status, q, period } = req.query;

    const where: Record<string, unknown> = {
      pricingZoneId: 'donation',
    };

    if (tenantId && typeof tenantId === 'string' && tenantId !== 'all') {
      where.event = { tenantId };
    }

    if (eventId && typeof eventId === 'string' && eventId !== 'all') {
      where.eventId = eventId;
    }

    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status.toUpperCase();
    }

    // Période temporelle
    if (period && typeof period === 'string') {
      const now = new Date();
      if (period === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        where.createdAt = { gte: d };
      } else if (period === '90d') {
        const d = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
        where.createdAt = { gte: d };
      } else if (period === '12m') {
        const d = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
        where.createdAt = { gte: d };
      }
    }

    if (q && typeof q === 'string' && q.trim()) {
      const query = q.trim();
      where.OR = [
        { buyerName: { contains: query, mode: 'insensitive' } },
        { buyerEmail: { contains: query, mode: 'insensitive' } },
        { buyerPhone: { contains: query } },
        { flexPayOrderNumber: { contains: query, mode: 'insensitive' } },
        { flexPayReference: { contains: query, mode: 'insensitive' } },
        { event: { title: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const [allDonationOrders, paidAggregate, pendingAggregate] = await Promise.all([
      prisma.ticketOrder.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              date: true,
              eventPrep: true,
              tenantId: true,
              tenant: { select: { id: true, name: true } },
            },
          },
          guests: {
            select: { id: true, checkedInAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ticketOrder.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { amountFc: true },
        _count: { _all: true },
      }),
      prisma.ticketOrder.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { amountFc: true },
        _count: { _all: true },
      }),
    ]);

    const totalCollectedFc = paidAggregate._sum.amountFc || 0;
    const totalDonationsPaid = paidAggregate._count._all || 0;
    const pendingAmountFc = pendingAggregate._sum.amountFc || 0;
    const totalDonationsPending = pendingAggregate._count._all || 0;

    let highestDonationFc = 0;
    let anonymousCount = 0;

    const eventStatsMap = new Map<
      string,
      {
        eventId: string;
        eventTitle: string;
        tenantId: string;
        tenantName: string;
        targetAmountFc: number | null;
        collectedAmountFc: number;
        donorsCount: number;
      }
    >();

    const tenantStatsMap = new Map<
      string,
      {
        tenantId: string;
        tenantName: string;
        eventsCount: Set<string>;
        collectedAmountFc: number;
        donorsCount: number;
      }
    >();

    const channelMap = new Map<string, { label: string; count: number; amountFc: number }>();
    const timelineMap = new Map<string, { date: string; amountFc: number; count: number }>();

    for (const ord of allDonationOrders) {
      const meta = parseDonationMeta(ord.selectedSeats);
      const isPaid = ord.status === 'PAID';
      const channelLabel = resolveChannelLabel(ord.flexPayChannel, ord.paymentProvider);

      if (meta.isAnonymous) anonymousCount++;

      if (isPaid) {
        if (ord.amountFc > highestDonationFc) highestDonationFc = ord.amountFc;

        // Channel breakdown
        const chKey = ord.flexPayChannel || ord.paymentProvider || 'other';
        const curCh = channelMap.get(chKey) || { label: channelLabel, count: 0, amountFc: 0 };
        curCh.count += 1;
        curCh.amountFc += ord.amountFc;
        channelMap.set(chKey, curCh);

        // Timeline
        const dayKey = (ord.paidAt || ord.createdAt).toISOString().slice(0, 10);
        const curDay = timelineMap.get(dayKey) || { date: dayKey, amountFc: 0, count: 0 };
        curDay.amountFc += ord.amountFc;
        curDay.count += 1;
        timelineMap.set(dayKey, curDay);

        // Event breakdown
        if (ord.event) {
          const evId = ord.event.id;
          const conf = extractEventDonationsConfig(ord.event.eventPrep);
          const evRow = eventStatsMap.get(evId) || {
            eventId: evId,
            eventTitle: ord.event.title,
            tenantId: ord.event.tenantId,
            tenantName: ord.event.tenant?.name || 'Organisation',
            targetAmountFc: conf?.targetAmountFc ?? null,
            collectedAmountFc: 0,
            donorsCount: 0,
          };
          evRow.collectedAmountFc += ord.amountFc;
          evRow.donorsCount += 1;
          eventStatsMap.set(evId, evRow);

          // Tenant breakdown
          const tId = ord.event.tenantId;
          const tRow = tenantStatsMap.get(tId) || {
            tenantId: tId,
            tenantName: ord.event.tenant?.name || 'Organisation',
            eventsCount: new Set<string>(),
            collectedAmountFc: 0,
            donorsCount: 0,
          };
          tRow.eventsCount.add(evId);
          tRow.collectedAmountFc += ord.amountFc;
          tRow.donorsCount += 1;
          tenantStatsMap.set(tId, tRow);
        }
      }
    }

    const topEvents = Array.from(eventStatsMap.values())
      .map((ev) => ({
        ...ev,
        progressPercent:
          ev.targetAmountFc && ev.targetAmountFc > 0
            ? Math.min(100, Math.round((ev.collectedAmountFc / ev.targetAmountFc) * 100))
            : null,
      }))
      .sort((a, b) => b.collectedAmountFc - a.collectedAmountFc);

    const topTenants = Array.from(tenantStatsMap.values())
      .map((t) => ({
        tenantId: t.tenantId,
        tenantName: t.tenantName,
        eventsCount: t.eventsCount.size,
        collectedAmountFc: t.collectedAmountFc,
        donorsCount: t.donorsCount,
      }))
      .sort((a, b) => b.collectedAmountFc - a.collectedAmountFc);

    const channels = Array.from(channelMap.entries())
      .map(([channel, data]) => ({
        channel,
        label: data.label,
        count: data.count,
        amountFc: data.amountFc,
        percent: totalCollectedFc > 0 ? Math.round((data.amountFc / totalCollectedFc) * 100) : 0,
      }))
      .sort((a, b) => b.amountFc - a.amountFc);

    const timeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Liste des dons avec aperçu
    const recentDonations = allDonationOrders.slice(0, 150).map((ord) => {
      const meta = parseDonationMeta(ord.selectedSeats);
      return {
        id: ord.id,
        createdAt: ord.createdAt.toISOString(),
        paidAt: ord.paidAt ? ord.paidAt.toISOString() : null,
        amountFc: ord.amountFc,
        status: ord.status,
        buyerName: meta.isAnonymous ? 'Donateur anonyme' : ord.buyerName,
        actualBuyerName: ord.buyerName,
        buyerEmail: meta.isAnonymous ? '***@***' : ord.buyerEmail,
        buyerPhone: meta.isAnonymous ? null : ord.buyerPhone,
        paymentProvider: ord.paymentProvider,
        flexPayChannel: ord.flexPayChannel,
        channelLabel: resolveChannelLabel(ord.flexPayChannel, ord.paymentProvider),
        flexPayOrderNumber: ord.flexPayOrderNumber,
        flexPayReference: ord.flexPayReference,
        donationNote: meta.donationNote,
        isAnonymous: Boolean(meta.isAnonymous),
        donorAttendancePass: Boolean(meta.donorAttendancePass),
        event: ord.event
          ? {
              id: ord.event.id,
              title: ord.event.title,
              slug: ord.event.slug,
              tenantId: ord.event.tenantId,
              tenantName: ord.event.tenant?.name || 'Organisation',
            }
          : null,
      };
    });

    return res.json({
      summary: {
        totalCollectedFc,
        totalDonationsPaid,
        totalDonationsPending,
        pendingAmountFc,
        totalAttemptsCount: allDonationOrders.length,
        averageDonationFc: totalDonationsPaid > 0 ? Math.round(totalCollectedFc / totalDonationsPaid) : 0,
        highestDonationFc,
        eventsWithDonationsCount: eventStatsMap.size,
        activeTenantsCount: tenantStatsMap.size,
        anonymousCount,
      },
      channels,
      timeline,
      topEvents,
      topTenants,
      recentDonations,
    });
  } catch (error: any) {
    console.error('[getAdminDonationsReport] Erreur:', error);
    return res.status(500).json({ error: 'Impossible de générer le rapport Superadmin des dons.' });
  }
}

/**
 * Export CSV global pour le Super Admin.
 */
export async function exportAdminDonationsReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const { tenantId, eventId, status } = req.query;

    const where: Record<string, unknown> = {
      pricingZoneId: 'donation',
    };

    if (tenantId && typeof tenantId === 'string' && tenantId !== 'all') {
      where.event = { tenantId };
    }

    if (eventId && typeof eventId === 'string' && eventId !== 'all') {
      where.eventId = eventId;
    }

    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status.toUpperCase();
    }

    const orders = await prisma.ticketOrder.findMany({
      where,
      include: {
        event: {
          select: {
            title: true,
            tenant: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'ID Commande',
      'Organisation',
      'Événement',
      'Date création',
      'Date paiement',
      'Statut',
      'Montant (FC)',
      'Nom donateur',
      'Email donateur',
      'Téléphone',
      'Anonyme',
      'Canal de paiement',
      'Référence FlexPay',
      'Message / Note du donateur',
    ].map(csvEscape).join(',');

    const lines = orders.map((ord) => {
      const meta = parseDonationMeta(ord.selectedSeats);
      const channelLabel = resolveChannelLabel(ord.flexPayChannel, ord.paymentProvider);

      return [
        csvEscape(ord.id),
        csvEscape(ord.event?.tenant?.name || 'Organisation'),
        csvEscape(ord.event?.title || 'Événement'),
        csvEscape(ord.createdAt.toISOString().slice(0, 19).replace('T', ' ')),
        csvEscape(ord.paidAt ? ord.paidAt.toISOString().slice(0, 19).replace('T', ' ') : ''),
        csvEscape(ord.status === 'PAID' ? 'PAYÉ' : ord.status === 'PENDING' ? 'EN ATTENTE' : ord.status),
        ord.amountFc,
        csvEscape(meta.isAnonymous ? 'Donateur anonyme' : ord.buyerName),
        csvEscape(meta.isAnonymous ? 'masqué' : ord.buyerEmail),
        csvEscape(meta.isAnonymous ? '' : ord.buyerPhone || ''),
        csvEscape(meta.isAnonymous ? 'OUI' : 'NON'),
        csvEscape(channelLabel),
        csvEscape(ord.flexPayOrderNumber || ord.flexPayReference || ''),
        csvEscape(meta.donationNote || ''),
      ].join(',');
    });

    const csv = `\uFEFF${header}\n${lines.join('\n')}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-dons-plateforme.csv"');
    return res.send(csv);
  } catch (error: any) {
    console.error('[exportAdminDonationsReport] Erreur:', error);
    return res.status(500).json({ error: 'Impossible d\'exporter le rapport Superadmin.' });
  }
}
