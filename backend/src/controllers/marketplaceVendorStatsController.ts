import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import { getMarketplaceBillingRates } from '../config/marketplaceBilling';
import { completePastMarketplaceBookings } from '../services/marketplaceBookingCompletion';
import { ratingSummary } from './marketplaceReviewController';

const MONTHS = 12;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Statistiques du prestataire (salle, prestations, boissons) : demandes de devis,
 * réponses, réservations, chiffre et commission, sur les 12 derniers mois.
 */
export async function getVendorStats(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const access = await resolveOrgAccess(userId, tenantId);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { accountKind: true } });
    const isVendorDesk = access.canManageRooms || tenant?.accountKind === 'VENDOR' || tenant?.accountKind === 'BOTH';
    if (!isVendorDesk || access.isProtocolOnly) return res.status(403).json({ error: 'Accès refusé.' });

    await completePastMarketplaceBookings({ tenantId }).catch(() => undefined);

    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));

    const [inquiries, bookings, listings, offerings, viewDays, rating] = await Promise.all([
      prisma.marketplaceInquiry.findMany({
        where: {
          createdAt: { gte: since },
          OR: [
            { listing: { tenantId } },
            { offering: { tenantId } },
            { beveragePrice: { tenantId } },
          ],
        },
        select: { id: true, status: true, createdAt: true, respondedAt: true, listingId: true, offeringId: true },
      }),
      prisma.marketplaceBooking.findMany({
        where: { vendorTenantId: tenantId },
        select: {
          status: true,
          amountFc: true,
          commissionFc: true,
          commissionSettledAt: true,
          eventDate: true,
          createdAt: true,
          listingId: true,
          offeringId: true,
          inquiryId: true,
        },
      }),
      prisma.venueListing.findMany({
        where: { tenantId },
        select: { id: true, headline: true, isPublic: true, room: { select: { name: true } } },
      }),
      prisma.serviceOffering.findMany({
        where: { tenantId },
        select: { id: true, title: true, isPublic: true, isBlockedByAdmin: true },
      }),
      prisma.listingViewDay.findMany({
        where: { tenantId, day: { gte: since } },
        select: { listingId: true, offeringId: true, day: true, views: true },
      }),
      ratingSummary({ vendorTenantId: tenantId }),
    ]);
    const vendorProfile = await prisma.vendorProfile.findUnique({ where: { tenantId }, select: { slug: true, isBlockedByAdmin: true } });

    const billable = (status: string) => status === 'CONFIRMED' || status === 'COMPLETED';

    // ── Demandes de devis ────────────────────────────────────────────────
    const inquiryIds = new Set(inquiries.map((i) => i.id));
    const convertedInquiryIds = new Set(
      bookings.filter((b) => b.inquiryId && inquiryIds.has(b.inquiryId)).map((b) => b.inquiryId as string),
    );
    const answered = inquiries.filter((i) => i.status !== 'NEW' || i.respondedAt);
    const responseHours = inquiries
      .filter((i) => i.respondedAt)
      .map((i) => ((i.respondedAt as Date).getTime() - i.createdAt.getTime()) / 3_600_000)
      .filter((h) => Number.isFinite(h) && h >= 0)
      .sort((a, b) => a - b);
    const medianResponseHours = responseHours.length
      ? Math.round(responseHours[Math.floor(responseHours.length / 2)] * 10) / 10
      : null;

    // ── Réservations ─────────────────────────────────────────────────────
    const statusCounts: Record<string, number> = { REQUESTED: 0, ACCEPTED: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
    let revenueFc = 0;
    let commissionDueFc = 0;
    let commissionPaidFc = 0;
    let pipelineFc = 0;
    for (const b of bookings) {
      statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
      if (billable(b.status)) {
        revenueFc += b.amountFc;
        if (b.commissionSettledAt) commissionPaidFc += b.commissionFc;
        else commissionDueFc += b.commissionFc;
      } else if (b.status === 'REQUESTED' || b.status === 'ACCEPTED') {
        pipelineFc += b.amountFc;
      }
    }

    // ── Évolution sur 12 mois ────────────────────────────────────────────
    const months: Array<{ month: string; views: number; inquiries: number; confirmedBookings: number; revenueFc: number }> = [];
    const byMonth = new Map<string, (typeof months)[number]>();
    for (let i = 0; i < MONTHS; i += 1) {
      const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
      const row = { month: monthKey(d), views: 0, inquiries: 0, confirmedBookings: 0, revenueFc: 0 };
      months.push(row);
      byMonth.set(row.month, row);
    }
    for (const v of viewDays) {
      const row = byMonth.get(monthKey(v.day));
      if (row) row.views += v.views;
    }
    for (const i of inquiries) {
      const row = byMonth.get(monthKey(i.createdAt));
      if (row) row.inquiries += 1;
    }
    for (const b of bookings) {
      if (!billable(b.status)) continue;
      const row = byMonth.get(monthKey(b.eventDate));
      if (!row) continue;
      row.confirmedBookings += 1;
      row.revenueFc += b.amountFc;
    }

    // ── Fiches les plus demandées ────────────────────────────────────────
    type OfferRow = { id: string; kind: 'venue' | 'service'; title: string; isPublic: boolean; views: number; inquiries: number; confirmedBookings: number; revenueFc: number };
    const offers = new Map<string, OfferRow>();
    for (const l of listings) {
      offers.set(`l:${l.id}`, { id: l.id, kind: 'venue', title: l.headline || l.room.name, isPublic: l.isPublic, views: 0, inquiries: 0, confirmedBookings: 0, revenueFc: 0 });
    }
    for (const o of offerings) {
      offers.set(`o:${o.id}`, { id: o.id, kind: 'service', title: o.title, isPublic: o.isPublic && !o.isBlockedByAdmin, views: 0, inquiries: 0, confirmedBookings: 0, revenueFc: 0 });
    }
    const offerKey = (row: { listingId: string | null; offeringId: string | null }) =>
      row.listingId ? `l:${row.listingId}` : row.offeringId ? `o:${row.offeringId}` : null;
    for (const v of viewDays) {
      const key = offerKey(v);
      const row = key ? offers.get(key) : null;
      if (row) row.views += v.views;
    }
    for (const i of inquiries) {
      const key = offerKey(i);
      const row = key ? offers.get(key) : null;
      if (row) row.inquiries += 1;
    }
    for (const b of bookings) {
      if (!billable(b.status)) continue;
      const key = offerKey(b);
      const row = key ? offers.get(key) : null;
      if (!row) continue;
      row.confirmedBookings += 1;
      row.revenueFc += b.amountFc;
    }
    const topOffers = [...offers.values()]
      .sort((a, b) => b.revenueFc - a.revenueFc || b.inquiries - a.inquiries || b.views - a.views)
      .slice(0, 8);

    return res.json({
      periodStart: since,
      vendorSlug: vendorProfile && !vendorProfile.isBlockedByAdmin ? vendorProfile.slug : null,
      views: { total: viewDays.reduce((sum, v) => sum + v.views, 0) },
      rating,
      inquiries: {
        total: inquiries.length,
        answered: answered.length,
        pending: inquiries.filter((i) => i.status === 'NEW').length,
        declined: inquiries.filter((i) => i.status === 'DECLINED').length,
        converted: convertedInquiryIds.size,
        responseRate: inquiries.length ? answered.length / inquiries.length : null,
        conversionRate: inquiries.length ? convertedInquiryIds.size / inquiries.length : null,
        medianResponseHours,
      },
      bookings: {
        total: bookings.length,
        byStatus: statusCounts,
        revenueFc,
        pipelineFc,
        commissionDueFc,
        commissionPaidFc,
        commissionRate: getMarketplaceBillingRates().commissionRate,
      },
      months,
      topOffers,
    });
  } catch (error) {
    console.error('getVendorStats:', error);
    return res.status(500).json({ error: 'Impossible de charger vos statistiques.' });
  }
}
