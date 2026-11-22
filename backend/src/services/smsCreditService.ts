import { prisma } from '../db';
import {
  addMonthsUtc,
  getSmsCreditPack,
  SMS_CREDIT_PACKS,
  SMS_CREDIT_VALIDITY_MONTHS,
  SMS_LOW_THRESHOLD,
  SMS_PRICING_FX_CDF,
  SMS_UNIT_COST_USD,
  smsIncludedForPlan,
  smsPeriodKey,
} from '../config/smsCreditsConfig';
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
 * Crédits SMS d'une organisation.
 *
 * Un envoi consomme d'abord les SMS inclus dans le forfait pour la période, puis les crédits achetés
 * (lot le plus proche de l'expiration d'abord). La réservation est atomique et rendue si l'envoi échoue.
 * L'achat d'un pack passe par FlexPay : les crédits ne sont ajoutés qu'après vérification serveur.
 */

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
const BILLING_HREF = () => `${FRONTEND_URL()}/dashboard/billing`;

export type SmsReservation =
  | { source: 'included'; tenantId: string; period: string }
  | { source: 'credit'; tenantId: string; lotId: string };

export type ReserveSmsResult = { ok: true; reservation: SmsReservation } | { ok: false };

/** Réserve un SMS : quota inclus de la période d'abord, puis crédits achetés non expirés. */
export async function reserveTenantSms(tenantId: string, plan?: string | null): Promise<ReserveSmsResult> {
  const included = smsIncludedForPlan(plan);
  const period = smsPeriodKey(plan);

  if (included > 0) {
    await prisma.smsUsagePeriod.createMany({ data: [{ tenantId, period, used: 0 }], skipDuplicates: true });
    const taken = await prisma.smsUsagePeriod.updateMany({
      where: { tenantId, period, used: { lt: included } },
      data: { used: { increment: 1 } },
    });
    if (taken.count > 0) {
      void notifyIncludedThreshold(tenantId, period, included).catch(() => undefined);
      return { ok: true, reservation: { source: 'included', tenantId, period } };
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const lot = await prisma.smsCreditLot.findFirst({
      where: { tenantId, remaining: { gt: 0 }, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'asc' },
      select: { id: true },
    });
    if (!lot) break;
    const taken = await prisma.smsCreditLot.updateMany({
      where: { id: lot.id, remaining: { gt: 0 } },
      data: { remaining: { decrement: 1 } },
    });
    if (taken.count > 0) return { ok: true, reservation: { source: 'credit', tenantId, lotId: lot.id } };
  }

  void notifyExhausted(tenantId, period).catch(() => undefined);
  return { ok: false };
}

/** Rend le SMS réservé (envoi échoué, simulé ou dédoublonné). */
export async function refundTenantSms(reservation: SmsReservation): Promise<void> {
  try {
    if (reservation.source === 'included') {
      await prisma.smsUsagePeriod.updateMany({
        where: { tenantId: reservation.tenantId, period: reservation.period, used: { gt: 0 } },
        data: { used: { decrement: 1 } },
      });
    } else {
      await prisma.smsCreditLot.updateMany({
        where: { id: reservation.lotId },
        data: { remaining: { increment: 1 } },
      });
    }
  } catch (error) {
    console.warn('[smsCredits] remboursement impossible:', (error as Error)?.message);
  }
}

async function notifyIncludedThreshold(tenantId: string, period: string, included: number) {
  const row = await prisma.smsUsagePeriod.findUnique({ where: { tenantId_period: { tenantId, period } } });
  if (!row || row.notifiedLow || row.used < Math.ceil(included * SMS_LOW_THRESHOLD)) return;
  const claimed = await prisma.smsUsagePeriod.updateMany({
    where: { tenantId, period, notifiedLow: false },
    data: { notifiedLow: true },
  });
  if (claimed.count === 0) return;
  await notifyTenantOperators(tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.SMS_CREDITS_LOW,
    title: 'SMS inclus bientôt épuisés',
    message: `Vous avez utilisé ${Math.round(SMS_LOW_THRESHOLD * 100)} % des ${included.toLocaleString('fr-FR')} SMS inclus dans votre forfait. Rechargez des SMS pour ne pas être bloqué.`,
    metadata: { href: BILLING_HREF() },
  });
}

async function notifyExhausted(tenantId: string, period: string) {
  await prisma.smsUsagePeriod.createMany({ data: [{ tenantId, period, used: 0 }], skipDuplicates: true });
  const claimed = await prisma.smsUsagePeriod.updateMany({
    where: { tenantId, period, notifiedEmpty: false },
    data: { notifiedEmpty: true },
  });
  if (claimed.count === 0) return;
  await notifyTenantOperators(tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.SMS_CREDITS_LOW,
    title: 'Plus de SMS disponibles',
    message: 'Vos SMS inclus et vos crédits sont épuisés. Les invitations continuent par WhatsApp et e-mail. Rechargez des SMS pour reprendre les envois par SMS.',
    metadata: { href: BILLING_HREF() },
  });
}

export interface SmsCreditSummary {
  plan: string | null;
  period: string;
  included: number;
  used: number;
  includedRemaining: number;
  creditBalance: number;
  nextExpiry: Date | null;
  available: number;
  validityMonths: number;
  packs: Array<{ id: string; smsCount: number; priceFc: number }>;
  onlinePaymentAvailable: boolean;
}

export async function getSmsCreditSummary(tenantId: string, plan?: string | null): Promise<SmsCreditSummary> {
  const included = smsIncludedForPlan(plan);
  const period = smsPeriodKey(plan);
  const [usage, lots] = await Promise.all([
    prisma.smsUsagePeriod.findUnique({ where: { tenantId_period: { tenantId, period } } }),
    prisma.smsCreditLot.findMany({
      where: { tenantId, remaining: { gt: 0 }, expiresAt: { gt: new Date() } },
      select: { remaining: true, expiresAt: true },
      orderBy: { expiresAt: 'asc' },
    }),
  ]);
  const used = Math.min(usage?.used ?? 0, included);
  const creditBalance = lots.reduce((sum, lot) => sum + lot.remaining, 0);
  return {
    plan: plan ?? null,
    period,
    included,
    used,
    includedRemaining: Math.max(0, included - used),
    creditBalance,
    nextExpiry: lots[0]?.expiresAt ?? null,
    available: Math.max(0, included - used) + creditBalance,
    validityMonths: SMS_CREDIT_VALIDITY_MONTHS,
    packs: SMS_CREDIT_PACKS.map((pack) => ({ id: pack.id, smsCount: pack.smsCount, priceFc: pack.priceFc })),
    onlinePaymentAvailable: isOnlineDepositAvailable(),
  };
}

export type StartSmsCreditResult =
  | { ok: true; orderId: string; paymentMethod: 'mobile' | 'card'; redirectUrl: string | null; amountFc: number; message: string }
  | { ok: false; status: number; error: string };

export async function startSmsCreditPurchase(params: {
  tenantId: string;
  userId: string;
  plan?: string | null;
  packId: unknown;
  paymentMethod: unknown;
  phone?: unknown;
}): Promise<StartSmsCreditResult> {
  if (smsIncludedForPlan(params.plan) <= 0 && String(params.plan || 'FREE').toUpperCase() === 'FREE') {
    return { ok: false, status: 403, error: 'Les SMS ne sont pas disponibles sur l’essai gratuit : choisissez un forfait payant.' };
  }
  if (!isOnlineDepositAvailable()) {
    return { ok: false, status: 400, error: 'Le paiement en ligne est momentanément indisponible.' };
  }
  const pack = getSmsCreditPack(params.packId);
  if (!pack) return { ok: false, status: 400, error: 'Pack de SMS inconnu.' };

  const paymentMethod = params.paymentMethod === 'card' ? 'card' : 'mobile';
  let phone: string | null = null;
  if (paymentMethod === 'mobile') {
    phone = normalizeFlexPayPhone(String(params.phone || ''));
    if (!phone) return { ok: false, status: 400, error: 'Numéro Mobile Money invalide (ex : 0812345678 ou 243812345678).' };
  }

  const order = await prisma.smsCreditOrder.create({
    data: {
      tenantId: params.tenantId,
      payerUserId: params.userId,
      packId: pack.id,
      smsCount: pack.smsCount,
      amountFc: pack.priceFc,
      unitCostUsd: SMS_UNIT_COST_USD,
      fxRateCdf: SMS_PRICING_FX_CDF,
      status: 'PENDING',
      paymentMethod,
      phone,
    },
  });

  const reference = buildFlexPayReference('smsc', order.id);
  const apiBase = getPublicApiBaseUrl();
  const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
  try {
    let flex: { orderNumber: string; redirectUrl: string | null };
    if (paymentMethod === 'mobile') {
      flex = isFlexPayCardConfigured()
        ? await createFlexPayMobileCheckout({ reference, amount: pack.priceFc, currency: 'CDF', phone: phone!, callbackUrl })
        : { orderNumber: `FLEX-MM-${Date.now()}`, redirectUrl: null };
    } else {
      const returnBase = `${apiBase}/api/public/payments/flexpay/return?kind=sms_credits&orderId=${encodeURIComponent(order.id)}`;
      flex = isFlexPayCardConfigured()
        ? await createFlexPayCardCheckout({
            reference,
            amount: pack.priceFc,
            currency: 'CDF',
            description: `Pack ${pack.smsCount} SMS EventMaster`,
            callbackUrl,
            approveUrl: `${returnBase}&result=approve`,
            cancelUrl: `${returnBase}&result=cancel`,
            declineUrl: `${returnBase}&result=decline`,
            language: 'fr',
          })
        : { orderNumber: `FLEX-CARD-${Date.now()}`, redirectUrl: `${returnBase}&result=approve` };
    }
    await prisma.smsCreditOrder.update({
      where: { id: order.id },
      data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: reference },
    });
    return {
      ok: true,
      orderId: order.id,
      paymentMethod,
      redirectUrl: paymentMethod === 'card' ? flex.redirectUrl : null,
      amountFc: pack.priceFc,
      message:
        paymentMethod === 'mobile'
          ? 'Une demande de paiement a été envoyée sur votre téléphone. Validez-la avec votre code secret.'
          : 'Redirection vers la page de paiement sécurisée…',
    };
  } catch (err) {
    console.error('[SmsCredits] checkout:', err);
    await prisma.smsCreditOrder.update({ where: { id: order.id }, data: { status: 'FAILED', flexPayReference: reference } });
    return { ok: false, status: 502, error: 'Le paiement n’a pas pu être lancé. Réessayez dans un instant.' };
  }
}

export async function findSmsCreditOrderForFlexPay(opts: { reference?: string | null; orderNumber?: string | null }) {
  const or = [
    opts.orderNumber ? { flexPayOrderNumber: opts.orderNumber } : null,
    opts.reference ? { flexPayReference: opts.reference } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  if (!or.length) return null;
  return prisma.smsCreditOrder.findFirst({ where: { OR: or } });
}

/** Vérifie auprès de FlexPay et, si payé, crédite le lot (une seule fois, même si le callback arrive deux fois). */
export async function verifySmsCreditOrder(orderId: string): Promise<{ status: string; orderId: string }> {
  const order = await prisma.smsCreditOrder.findUnique({ where: { id: orderId } });
  if (!order) return { status: 'NOT_FOUND', orderId };
  if (order.status !== 'PENDING') return { status: order.status, orderId };
  if (!order.flexPayOrderNumber) return { status: 'PENDING', orderId };

  let outcome: ReturnType<typeof decideFlexPayCallbackOutcome>;
  let meta = {};
  if (isFlexPayCardConfigured()) {
    try {
      const checked = await checkFlexPayCardOrder(order.flexPayOrderNumber);
      outcome = decideFlexPayCallbackOutcome(checked);
      meta = buildFlexPayMetadataUpdate(checked);
    } catch (err) {
      console.warn('[SmsCredits] check:', err);
      return { status: 'PENDING', orderId };
    }
  } else {
    outcome = isDepositMockEnabled() ? 'paid' : 'unverified';
  }

  if (outcome === 'unverified') return { status: 'PENDING', orderId };
  if (outcome === 'failed') {
    await prisma.smsCreditOrder.updateMany({ where: { id: order.id, status: 'PENDING' }, data: { status: 'FAILED', ...meta } });
    return { status: 'FAILED', orderId };
  }

  const now = new Date();
  const credited = await prisma.$transaction(async (tx) => {
    const claimed = await tx.smsCreditOrder.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'PAID', paidAt: now, ...meta },
    });
    if (claimed.count === 0) return false;
    await tx.smsCreditLot.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        initialCount: order.smsCount,
        remaining: order.smsCount,
        expiresAt: addMonthsUtc(now, SMS_CREDIT_VALIDITY_MONTHS),
      },
    });
    // Un nouveau pack rouvre les alertes de la période en cours.
    await tx.smsUsagePeriod.updateMany({ where: { tenantId: order.tenantId, notifiedEmpty: true }, data: { notifiedEmpty: false } });
    return true;
  });

  if (credited) {
    void notifyTenantOperators(order.tenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.PAYMENT_RECEIVED,
      title: 'Crédits SMS ajoutés',
      message: `Votre paiement de ${order.amountFc.toLocaleString('fr-FR')} FC est reçu : ${order.smsCount.toLocaleString('fr-FR')} SMS ont été ajoutés à votre solde.`,
      metadata: { href: BILLING_HREF() },
    });
  }
  return { status: 'PAID', orderId };
}

/** Rattrapage des commandes restées en attente (callback perdu). */
export async function reconcileSmsCreditOrders() {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const pending = await prisma.smsCreditOrder.findMany({
    where: { status: 'PENDING', flexPayOrderNumber: { not: null }, createdAt: { lt: staleBefore } },
    select: { id: true },
    take: 50,
  });
  for (const row of pending) await verifySmsCreditOrder(row.id).catch(() => undefined);
}

export function startSmsCreditWorker() {
  const run = () => {
    reconcileSmsCreditOrders().catch((error) => console.error('[SmsCredits] Rattrapage des commandes :', error));
  };
  setTimeout(run, 75_000);
  setInterval(run, 15 * 60 * 1000);
}
