import { MarketplaceBookingStatus } from '@prisma/client';
import { prisma } from '../db';
import {
  buildFlexPayMetadataUpdate,
  buildFlexPayReference,
  checkFlexPayCardOrder,
  createFlexPayCardCheckout,
  createFlexPayMobileCheckout,
  getPublicApiBaseUrl,
  isFlexPayCardConfigured,
  normalizeFlexPayPhone,
} from './flexPayCardService';
import { decideFlexPayCallbackOutcome } from './flexPayCallbackVerification';
import { isDepositMockEnabled, isOnlineDepositAvailable } from './marketplaceDepositService';
import { notifyTenantOperators } from './platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';

/**
 * Règlement en ligne de la commission marketplace par le prestataire (acomptes réglés
 * hors plateforme). Le paiement couvre les réservations dont la commission est due au
 * moment du lancement ; il n'est retenu qu'après vérification serveur auprès de FlexPay.
 */

export const ONLINE_COMMISSION_ACTOR_ID = 'system:online-commission';

const BILLABLE: MarketplaceBookingStatus[] = ['CONFIRMED', 'COMPLETED'];
const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');

type CommissionPayment = NonNullable<Awaited<ReturnType<typeof prisma.marketplaceCommissionPayment.findUnique>>>;

export async function dueCommissionBookings(vendorTenantId: string) {
  return prisma.marketplaceBooking.findMany({
    where: { vendorTenantId, status: { in: BILLABLE }, commissionSettledAt: null, commissionFc: { gt: 0 } },
    select: { id: true, commissionFc: true },
  });
}

export type StartCommissionResult =
  | { ok: true; paymentId: string; paymentMethod: 'mobile' | 'card'; redirectUrl: string | null; amountFc: number; message: string }
  | { ok: false; status: number; error: string };

export async function startCommissionPayment(params: {
  vendorTenantId: string;
  userId: string;
  paymentMethod: unknown;
  phone?: unknown;
}): Promise<StartCommissionResult> {
  if (!isOnlineDepositAvailable()) {
    return { ok: false, status: 400, error: 'Le paiement en ligne est momentanément indisponible.' };
  }
  const due = await dueCommissionBookings(params.vendorTenantId);
  const amountFc = due.reduce((sum, row) => sum + row.commissionFc, 0);
  if (amountFc <= 0) return { ok: false, status: 400, error: 'Aucune commission à régler.' };

  const paymentMethod = params.paymentMethod === 'card' ? 'card' : 'mobile';
  let phone: string | null = null;
  if (paymentMethod === 'mobile') {
    phone = normalizeFlexPayPhone(String(params.phone || ''));
    if (!phone) return { ok: false, status: 400, error: 'Numéro Mobile Money invalide (ex : 0812345678 ou 243812345678).' };
  }

  const payment = await prisma.marketplaceCommissionPayment.create({
    data: {
      vendorTenantId: params.vendorTenantId,
      payerUserId: params.userId,
      amountFc,
      bookingIds: due.map((row) => row.id),
      status: 'PENDING',
      paymentMethod,
      phone,
    },
  });

  const reference = buildFlexPayReference('mkcm', payment.id);
  const apiBase = getPublicApiBaseUrl();
  const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
  try {
    let flex: { orderNumber: string; redirectUrl: string | null };
    if (paymentMethod === 'mobile') {
      flex = isFlexPayCardConfigured()
        ? await createFlexPayMobileCheckout({ reference, amount: amountFc, currency: 'CDF', phone: phone!, callbackUrl })
        : { orderNumber: `FLEX-MM-${Date.now()}`, redirectUrl: null };
    } else {
      const returnBase = `${apiBase}/api/public/payments/flexpay/return?kind=marketplace_commission&paymentId=${encodeURIComponent(payment.id)}`;
      flex = isFlexPayCardConfigured()
        ? await createFlexPayCardCheckout({
            reference,
            amount: amountFc,
            currency: 'CDF',
            description: 'Commission marketplace EventMaster',
            callbackUrl,
            approveUrl: `${returnBase}&result=approve`,
            cancelUrl: `${returnBase}&result=cancel`,
            declineUrl: `${returnBase}&result=decline`,
            language: 'fr',
          })
        : { orderNumber: `FLEX-CARD-${Date.now()}`, redirectUrl: `${returnBase}&result=approve` };
    }
    await prisma.marketplaceCommissionPayment.update({
      where: { id: payment.id },
      data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: reference },
    });
    return {
      ok: true,
      paymentId: payment.id,
      paymentMethod,
      redirectUrl: paymentMethod === 'card' ? flex.redirectUrl : null,
      amountFc,
      message:
        paymentMethod === 'mobile'
          ? 'Une demande de paiement a été envoyée sur votre téléphone. Validez-la avec votre code secret.'
          : 'Redirection vers la page de paiement sécurisée…',
    };
  } catch (err) {
    console.error('[MarketplaceCommission] checkout:', err);
    await prisma.marketplaceCommissionPayment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', flexPayReference: reference },
    });
    return { ok: false, status: 502, error: 'Le paiement n’a pas pu être lancé. Réessayez dans un instant.' };
  }
}

export async function findCommissionPaymentForFlexPay(opts: { reference?: string | null; orderNumber?: string | null }) {
  const or = [
    opts.orderNumber ? { flexPayOrderNumber: opts.orderNumber } : null,
    opts.reference ? { flexPayReference: opts.reference } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  if (!or.length) return null;
  return prisma.marketplaceCommissionPayment.findFirst({ where: { OR: or } });
}

function bookingIdsOf(payment: CommissionPayment): string[] {
  return Array.isArray(payment.bookingIds) ? payment.bookingIds.filter((id): id is string => typeof id === 'string') : [];
}

/** Vérifie auprès de FlexPay et, si payé, marque les commissions couvertes comme réglées (une seule fois). */
export async function verifyCommissionPayment(paymentId: string): Promise<{ status: string; paymentId: string }> {
  const payment = await prisma.marketplaceCommissionPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { status: 'NOT_FOUND', paymentId };
  if (payment.status !== 'PENDING') return { status: payment.status, paymentId };
  if (!payment.flexPayOrderNumber) return { status: 'PENDING', paymentId };

  let outcome: ReturnType<typeof decideFlexPayCallbackOutcome>;
  let meta = {};
  if (isFlexPayCardConfigured()) {
    try {
      const checked = await checkFlexPayCardOrder(payment.flexPayOrderNumber);
      outcome = decideFlexPayCallbackOutcome(checked);
      meta = buildFlexPayMetadataUpdate(checked);
    } catch (err) {
      console.warn('[MarketplaceCommission] check:', err);
      return { status: 'PENDING', paymentId };
    }
  } else {
    outcome = isDepositMockEnabled() ? 'paid' : 'unverified';
  }

  if (outcome === 'unverified') return { status: 'PENDING', paymentId };
  if (outcome === 'failed') {
    await prisma.marketplaceCommissionPayment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'FAILED', ...meta },
    });
    return { status: 'FAILED', paymentId };
  }

  const now = new Date();
  const settled = await prisma.$transaction(async (tx) => {
    const claimed = await tx.marketplaceCommissionPayment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'PAID', paidAt: now, ...meta },
    });
    if (claimed.count === 0) return null;
    const marked = await tx.marketplaceBooking.updateMany({
      where: { id: { in: bookingIdsOf(payment) }, vendorTenantId: payment.vendorTenantId, commissionSettledAt: null },
      data: { commissionSettledAt: now, commissionSettledBy: ONLINE_COMMISSION_ACTOR_ID },
    });
    return marked.count;
  });

  if (settled !== null) {
    void notifyTenantOperators(payment.vendorTenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
      title: 'Commission réglée',
      message: `Votre paiement de ${payment.amountFc.toLocaleString('fr-FR')} FC est reçu : la commission de ${settled} réservation${settled > 1 ? 's' : ''} est réglée.`,
      metadata: { href: `${FRONTEND_URL()}/dashboard/bookings?tab=bookings&role=vendor` },
    });
  }
  return { status: 'PAID', paymentId };
}

/** Rattrapage des paiements restés en attente (callback perdu). */
export async function reconcileCommissionPayments() {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const pending = await prisma.marketplaceCommissionPayment.findMany({
    where: { status: 'PENDING', flexPayOrderNumber: { not: null }, createdAt: { lt: staleBefore } },
    select: { id: true },
    take: 50,
  });
  for (const row of pending) await verifyCommissionPayment(row.id).catch(() => undefined);
}

export function startMarketplaceCommissionWorker() {
  const run = () => {
    reconcileCommissionPayments().catch((error) => console.error('[Marketplace] Rattrapage des commissions en ligne :', error));
  };
  setTimeout(run, 60_000);
  setInterval(run, 15 * 60 * 1000);
}
