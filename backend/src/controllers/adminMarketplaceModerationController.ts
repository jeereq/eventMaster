import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { auditReq } from '../services/adminAuditService';
import { maskPayoutPhone } from '../services/eventPayoutAccount';
import { isFlexPayPayoutConfigured } from '../services/flexPayPayoutClient';
import { sendDepositPayout, verifyDepositPayment, verifyDepositPayout } from '../services/marketplaceDepositService';

function pager(req: AuthenticatedRequest) {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function searchQ(req: AuthenticatedRequest) {
  return typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
}

function subjectTitle(row: {
  offering?: { title: string } | null;
  listing?: { headline: string | null; room: { name: string } } | null;
}) {
  return row.offering?.title || row.listing?.headline || row.listing?.room.name || 'Réservation';
}

/** Avis clients, avec filtre visible / masqué. */
export async function listAdminReviews(req: AuthenticatedRequest, res: Response) {
  try {
    const { page, pageSize, skip } = pager(req);
    const q = searchQ(req);
    const visibility = String(req.query.visibility || 'all');
    const where = {
      ...(visibility === 'hidden' ? { isHidden: true } : visibility === 'visible' ? { isHidden: false } : {}),
      ...(q
        ? {
            OR: [
              { comment: { contains: q, mode: 'insensitive' as const } },
              { authorName: { contains: q, mode: 'insensitive' as const } },
              { vendorTenant: { name: { contains: q, mode: 'insensitive' as const } } },
              { offering: { title: { contains: q, mode: 'insensitive' as const } } },
              { listing: { headline: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [rows, total, hiddenCount] = await Promise.all([
      prisma.marketplaceReview.findMany({
        where,
        include: {
          vendorTenant: { select: { name: true, vendorProfile: { select: { displayName: true } } } },
          offering: { select: { title: true } },
          listing: { select: { headline: true, room: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.marketplaceReview.count({ where }),
      prisma.marketplaceReview.count({ where: { isHidden: true } }),
    ]);
    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        authorName: row.authorName,
        vendorReply: row.vendorReply,
        isHidden: row.isHidden,
        createdAt: row.createdAt,
        vendorName: row.vendorTenant.vendorProfile?.displayName || row.vendorTenant.name,
        subject: subjectTitle(row),
      })),
      total,
      hiddenCount,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error('listAdminReviews:', error);
    return res.status(500).json({ error: 'Impossible de charger les avis.' });
  }
}

/** Masque ou réaffiche un avis (il sort alors des fiches et des moyennes). */
export async function setAdminReviewVisibility(req: AuthenticatedRequest, res: Response) {
  try {
    const hidden = req.body?.hidden;
    if (typeof hidden !== 'boolean') return res.status(400).json({ error: 'Le champ hidden est requis (boolean).' });
    const review = await prisma.marketplaceReview.findUnique({
      where: { id: String(req.params.id || '') },
      select: { id: true, vendorTenantId: true, rating: true, authorName: true },
    });
    if (!review) return res.status(404).json({ error: 'Avis introuvable.' });
    await prisma.marketplaceReview.update({ where: { id: review.id }, data: { isHidden: hidden } });
    await auditReq(req, {
      action: hidden ? 'CATALOG_REVIEW_HIDE' : 'CATALOG_REVIEW_SHOW',
      targetType: 'marketplace_review',
      targetId: review.id,
      tenantId: review.vendorTenantId,
      summary: `${hidden ? 'Avis masqué' : 'Avis réaffiché'} — ${review.authorName}, ${review.rating}/5`,
    });
    return res.json({ id: review.id, isHidden: hidden, message: hidden ? 'Avis masqué.' : 'Avis réaffiché.' });
  } catch (error) {
    console.error('setAdminReviewVisibility:', error);
    return res.status(500).json({ error: 'Impossible de modifier l’avis.' });
  }
}

/** Acomptes payés en ligne et état de leur reversement. */
export async function listAdminDeposits(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }
    const { page, pageSize, skip } = pager(req);
    const q = searchQ(req);
    const filter = String(req.query.filter || 'attention');
    const where = {
      ...(filter === 'attention'
        ? { status: 'PAID', payoutStatus: { in: ['NONE', 'PENDING', 'FAILED'] } }
        : filter === 'paid'
          ? { status: 'PAID' }
          : filter === 'pending'
            ? { status: 'PENDING' }
            : {}),
      ...(q ? { vendorTenant: { name: { contains: q, mode: 'insensitive' as const } } } : {}),
    };
    const [rows, total, attention, totals] = await Promise.all([
      prisma.marketplaceDepositPayment.findMany({
        where,
        include: {
          vendorTenant: { select: { name: true } },
          booking: {
            select: {
              id: true,
              status: true,
              eventDate: true,
              organizerTenant: { select: { name: true } },
              offering: { select: { title: true } },
              listing: { select: { headline: true, room: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.marketplaceDepositPayment.count({ where }),
      prisma.marketplaceDepositPayment.count({ where: { status: 'PAID', payoutStatus: { in: ['NONE', 'FAILED'] } } }),
      prisma.marketplaceDepositPayment.aggregate({
        where: { status: 'PAID' },
        _sum: { amountFc: true, commissionFc: true, payoutAmountFc: true },
        _count: { _all: true },
      }),
    ]);
    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        bookingId: row.bookingId,
        bookingStatus: row.booking.status,
        eventDate: row.booking.eventDate,
        title: subjectTitle(row.booking),
        vendorName: row.vendorTenant.name,
        organizerName: row.booking.organizerTenant?.name || null,
        status: row.status,
        paymentMethod: row.paymentMethod,
        amountFc: row.amountFc,
        commissionFc: row.commissionFc,
        payoutAmountFc: row.payoutAmountFc,
        paidAt: row.paidAt,
        payoutStatus: row.payoutStatus,
        payoutPhoneMasked: row.payoutPhone ? maskPayoutPhone(row.payoutPhone) : null,
        payoutMessage: row.payoutMessage,
        payoutAt: row.payoutAt,
        createdAt: row.createdAt,
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      summary: {
        paidCount: totals._count._all,
        collectedFc: totals._sum.amountFc ?? 0,
        commissionFc: totals._sum.commissionFc ?? 0,
        payoutFc: totals._sum.payoutAmountFc ?? 0,
        attentionCount: attention,
        payoutConfigured: isFlexPayPayoutConfigured(),
      },
    });
  } catch (error) {
    console.error('listAdminDeposits:', error);
    return res.status(500).json({ error: 'Impossible de charger les acomptes.' });
  }
}

/**
 * Vérifie un acompte auprès de FlexPay, puis relance son reversement s'il n'est jamais
 * parti ou a échoué. Un reversement en attente est seulement vérifié, jamais renvoyé.
 */
export async function retryAdminDeposit(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }
    const id = String(req.params.id || '');
    const payment = await prisma.marketplaceDepositPayment.findUnique({ where: { id } });
    if (!payment) return res.status(404).json({ error: 'Acompte introuvable.' });

    if (payment.status === 'PENDING') {
      const result = await verifyDepositPayment(id);
      return res.json({ status: result.status, message: result.status === 'PAID' ? 'Paiement confirmé par FlexPay.' : 'Paiement toujours non confirmé.' });
    }
    if (payment.status !== 'PAID') return res.status(400).json({ error: 'Ce paiement n’a pas abouti : rien à reverser.' });

    if (payment.payoutStatus === 'PENDING') {
      const checked = await verifyDepositPayout(id);
      return res.json({ status: checked.status, message: checked.status === 'SUCCESS' ? 'Reversement confirmé.' : 'Reversement toujours en attente chez FlexPay.' });
    }
    if (payment.payoutStatus === 'SUCCESS') return res.json({ status: 'SUCCESS', message: 'Reversement déjà effectué.' });
    if (!isFlexPayPayoutConfigured()) {
      return res.status(400).json({ error: 'FlexPay Pay Out n’est pas configuré sur le serveur.' });
    }

    const sent = await sendDepositPayout(id);
    await auditReq(req, {
      action: 'CATALOG_DEPOSIT_PAYOUT_RETRY',
      targetType: 'marketplace_deposit',
      targetId: id,
      tenantId: payment.vendorTenantId,
      summary: `Relance du reversement d'acompte (${payment.payoutAmountFc} FC) — résultat ${sent.status}`,
    });
    const messages: Record<string, string> = {
      PENDING: 'Reversement envoyé. FlexPay doit encore le confirmer.',
      SUCCESS: 'Rien à reverser.',
      FAILED: 'FlexPay a refusé le reversement.',
      UNCERTAIN: 'Réponse FlexPay incertaine : le reversement reste en attente pour éviter un double envoi.',
      PHONE_REQUIRED: 'Le prestataire n’a pas de numéro de reversement.',
    };
    return res.json({ status: sent.status, message: messages[sent.status] || 'Relance effectuée.' });
  } catch (error) {
    console.error('retryAdminDeposit:', error);
    return res.status(500).json({ error: 'Impossible de relancer le reversement.' });
  }
}
