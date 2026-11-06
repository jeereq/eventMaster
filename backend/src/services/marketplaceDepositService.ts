import { randomUUID } from 'crypto';
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
import {
  FlexPayPayoutError,
  getFlexPayPayoutClient,
  isFlexPayPayoutConfigured,
  type FlexPayPayoutCheckResult,
} from './flexPayPayoutClient';
import { isOnlinePaymentsEnabled } from './platformSettingsService';
import { notifyTenantOperators, notifyUsers } from './platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import { normalizePayoutPhone, maskPayoutPhone } from './eventPayoutAccount';

/**
 * Acompte en ligne d'une réservation marketplace, au choix du prestataire.
 *
 * 1. Le client paie l'acompte via FlexPay (Mobile Money ou carte).
 * 2. Le paiement n'est retenu qu'après vérification serveur auprès de FlexPay
 *    (jamais d'après le contenu d'un callback).
 * 3. L'acompte est alors marqué reçu, la commission EventMaster est retenue dessus
 *    et marquée réglée, puis le reste est reversé au Mobile Money du prestataire.
 *
 * Sans activation par le prestataire, le parcours hors plateforme reste inchangé.
 */

export const ONLINE_DEPOSIT_ACTOR_ID = 'system:online-deposit';

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');

/** Paiement simulé, uniquement hors production et sur demande explicite (tests locaux). */
function isDepositMockEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.MARKETPLACE_DEPOSIT_MOCK === '1';
}

/** Le paiement en ligne peut réellement être encaissé. */
export function isOnlineDepositAvailable(): boolean {
  return isOnlinePaymentsEnabled() && (isFlexPayCardConfigured() || isDepositMockEnabled());
}

export type DepositPaymentMethod = 'mobile' | 'card';

type DepositPayment = NonNullable<Awaited<ReturnType<typeof prisma.marketplaceDepositPayment.findUnique>>>;

export interface VendorDepositSettings {
  enabled: boolean;
  payoutPhone: string | null;
  payoutPhoneMasked: string | null;
  payoutHolder: string | null;
  /** Les paiements en ligne sont ouverts sur la plateforme. */
  platformAvailable: boolean;
}

export async function getVendorDepositSettings(tenantId: string): Promise<VendorDepositSettings> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { marketplaceOnlineDeposit: true, marketplacePayoutPhone: true, marketplacePayoutHolder: true },
  });
  const phone = tenant?.marketplacePayoutPhone || null;
  return {
    enabled: Boolean(tenant?.marketplaceOnlineDeposit && phone),
    payoutPhone: phone,
    payoutPhoneMasked: phone ? maskPayoutPhone(phone) : null,
    payoutHolder: tenant?.marketplacePayoutHolder || null,
    platformAvailable: isOnlineDepositAvailable(),
  };
}

export type SaveDepositSettingsResult =
  | { ok: true; settings: VendorDepositSettings }
  | { ok: false; error: string };

export async function saveVendorDepositSettings(
  tenantId: string,
  input: { enabled?: unknown; payoutPhone?: unknown; payoutHolder?: unknown },
): Promise<SaveDepositSettingsResult> {
  const current = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { marketplacePayoutPhone: true, marketplacePayoutHolder: true },
  });
  const enabled = input.enabled === true || input.enabled === 'true';
  let phone = current?.marketplacePayoutPhone ?? null;
  if (input.payoutPhone !== undefined) {
    const raw = String(input.payoutPhone ?? '').trim();
    if (!raw) phone = null;
    else {
      phone = normalizePayoutPhone(raw);
      if (!phone) return { ok: false, error: 'Numéro Mobile Money invalide (ex : 0812345678 ou 243812345678).' };
    }
  }
  if (enabled && !phone) {
    return { ok: false, error: 'Indiquez le numéro Mobile Money qui recevra vos acomptes.' };
  }
  const holder =
    input.payoutHolder === undefined
      ? current?.marketplacePayoutHolder ?? null
      : String(input.payoutHolder ?? '').trim().slice(0, 120) || null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { marketplaceOnlineDeposit: enabled, marketplacePayoutPhone: phone, marketplacePayoutHolder: holder },
  });
  return { ok: true, settings: await getVendorDepositSettings(tenantId) };
}

/** Commission retenue sur l'acompte et montant reversé au prestataire. */
export function splitDeposit(depositFc: number, commissionFc: number) {
  const deposit = Math.max(0, Math.round(depositFc));
  const commission = Math.min(deposit, Math.max(0, Math.round(commissionFc)));
  return { commissionFc: commission, payoutAmountFc: deposit - commission };
}

function bookingTitle(booking: {
  offering?: { title: string } | null;
  listing?: { headline: string | null; room: { name: string } } | null;
}) {
  return booking.offering?.title || booking.listing?.headline || booking.listing?.room.name || 'Réservation';
}

const bookingForDeposit = {
  offering: { select: { title: true } },
  listing: { select: { headline: true, room: { select: { name: true } } } },
  vendorTenant: { select: { marketplaceOnlineDeposit: true, marketplacePayoutPhone: true } },
} as const;

export type StartDepositResult =
  | {
      ok: true;
      paymentId: string;
      paymentMethod: DepositPaymentMethod;
      redirectUrl: string | null;
      message: string;
    }
  | { ok: false; status: number; error: string };

/** Lance le paiement en ligne de l'acompte par le client de la réservation. */
export async function startDepositPayment(params: {
  bookingId: string;
  tenantId: string | null;
  userId: string;
  paymentMethod: unknown;
  phone?: unknown;
}): Promise<StartDepositResult> {
  if (!isOnlineDepositAvailable()) {
    return { ok: false, status: 400, error: 'Le paiement en ligne est momentanément indisponible. Réglez l’acompte directement auprès du prestataire.' };
  }
  const booking = await prisma.marketplaceBooking.findUnique({
    where: { id: params.bookingId },
    include: bookingForDeposit,
  });
  if (!booking) return { ok: false, status: 404, error: 'Réservation introuvable.' };
  const isOrganizer =
    (Boolean(params.tenantId) && booking.organizerTenantId === params.tenantId) || booking.organizerUserId === params.userId;
  if (!isOrganizer || booking.vendorTenantId === params.tenantId) {
    return { ok: false, status: 403, error: 'Seul le client de la réservation peut payer l’acompte.' };
  }
  if (booking.status !== 'ACCEPTED') {
    return { ok: false, status: 400, error: 'L’acompte se paie une fois la réservation acceptée par le prestataire.' };
  }
  if (booking.depositMarkedAt) {
    return { ok: false, status: 409, error: 'L’acompte de cette réservation est déjà enregistré.' };
  }
  if (!booking.vendorTenant.marketplaceOnlineDeposit || !booking.vendorTenant.marketplacePayoutPhone) {
    return { ok: false, status: 400, error: 'Ce prestataire n’accepte pas encore le paiement en ligne. Réglez l’acompte directement auprès de lui.' };
  }
  if (booking.depositFc <= 0) return { ok: false, status: 400, error: 'Aucun acompte à payer pour cette réservation.' };

  const alreadyPaid = await prisma.marketplaceDepositPayment.findFirst({
    where: { bookingId: booking.id, status: 'PAID' },
    select: { id: true },
  });
  if (alreadyPaid) return { ok: false, status: 409, error: 'L’acompte de cette réservation est déjà payé.' };

  const paymentMethod: DepositPaymentMethod = params.paymentMethod === 'card' ? 'card' : 'mobile';
  let phone: string | null = null;
  if (paymentMethod === 'mobile') {
    phone = normalizeFlexPayPhone(String(params.phone || ''));
    if (!phone) {
      return { ok: false, status: 400, error: 'Numéro Mobile Money invalide (ex : 0812345678 ou 243812345678).' };
    }
  }

  const split = splitDeposit(booking.depositFc, booking.commissionFc);
  const payment = await prisma.marketplaceDepositPayment.create({
    data: {
      bookingId: booking.id,
      vendorTenantId: booking.vendorTenantId,
      payerUserId: params.userId,
      amountFc: booking.depositFc,
      commissionFc: split.commissionFc,
      payoutAmountFc: split.payoutAmountFc,
      currency: 'CDF',
      status: 'PENDING',
      paymentMethod,
      phone,
    },
  });

  const reference = buildFlexPayReference('mkdp', payment.id);
  const apiBase = getPublicApiBaseUrl();
  const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
  const title = bookingTitle(booking);

  try {
    let flex: { orderNumber: string; redirectUrl: string | null };
    if (paymentMethod === 'mobile') {
      flex = isFlexPayCardConfigured()
        ? await createFlexPayMobileCheckout({ reference, amount: booking.depositFc, currency: 'CDF', phone: phone!, callbackUrl })
        : { orderNumber: `FLEX-MM-${Date.now()}`, redirectUrl: null };
    } else {
      const returnBase = `${apiBase}/api/public/payments/flexpay/return?kind=marketplace_deposit&paymentId=${encodeURIComponent(payment.id)}`;
      flex = isFlexPayCardConfigured()
        ? await createFlexPayCardCheckout({
            reference,
            amount: booking.depositFc,
            currency: 'CDF',
            description: `Acompte — ${title}`.slice(0, 120),
            callbackUrl,
            approveUrl: `${returnBase}&result=approve`,
            cancelUrl: `${returnBase}&result=cancel`,
            declineUrl: `${returnBase}&result=decline`,
            language: 'fr',
          })
        : { orderNumber: `FLEX-CARD-${Date.now()}`, redirectUrl: `${returnBase}&result=approve` };
    }

    await prisma.marketplaceDepositPayment.update({
      where: { id: payment.id },
      data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: reference },
    });

    return {
      ok: true,
      paymentId: payment.id,
      paymentMethod,
      redirectUrl: paymentMethod === 'card' ? flex.redirectUrl : null,
      message:
        paymentMethod === 'mobile'
          ? 'Une demande de paiement a été envoyée sur votre téléphone. Validez-la avec votre code secret.'
          : 'Redirection vers la page de paiement sécurisée…',
    };
  } catch (err) {
    console.error('[MarketplaceDeposit] checkout:', err);
    await prisma.marketplaceDepositPayment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', flexPayReference: reference },
    });
    return { ok: false, status: 502, error: 'Le paiement n’a pas pu être lancé. Réessayez dans un instant.' };
  }
}

export async function findDepositPaymentForFlexPay(opts: { reference?: string | null; orderNumber?: string | null }) {
  const or = [
    opts.orderNumber ? { flexPayOrderNumber: opts.orderNumber } : null,
    opts.reference ? { flexPayReference: opts.reference } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  if (!or.length) return null;
  return prisma.marketplaceDepositPayment.findFirst({ where: { OR: or } });
}

/**
 * Vérifie le paiement auprès de FlexPay et l'applique. Idempotent : le passage
 * PENDING → PAID est gardé, un callback et une vérification simultanés n'enregistrent
 * l'acompte qu'une fois.
 */
export async function verifyDepositPayment(paymentId: string): Promise<{ status: string; paymentId: string }> {
  const payment = await prisma.marketplaceDepositPayment.findUnique({ where: { id: paymentId } });
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
      console.warn('[MarketplaceDeposit] check:', err);
      return { status: 'PENDING', paymentId };
    }
  } else {
    outcome = isDepositMockEnabled() ? 'paid' : 'unverified';
  }

  if (outcome === 'unverified') return { status: 'PENDING', paymentId };
  if (outcome === 'failed') {
    await prisma.marketplaceDepositPayment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'FAILED', ...meta },
    });
    return { status: 'FAILED', paymentId };
  }

  const applied = await applyPaidDeposit(payment, meta);
  if (applied) void sendDepositPayout(payment.id);
  return { status: 'PAID', paymentId };
}

async function applyPaidDeposit(payment: DepositPayment, meta: Record<string, unknown>): Promise<boolean> {
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.marketplaceDepositPayment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'PAID', paidAt: now, ...meta },
    });
    if (claimed.count === 0) return null;
    const booking = await tx.marketplaceBooking.findUnique({
      where: { id: payment.bookingId },
      include: { offering: { select: { title: true } }, listing: { select: { headline: true, room: { select: { name: true } } } } },
    });
    if (!booking) return null;
    const note = `[Acompte] Payé en ligne via EventMaster (${payment.amountFc.toLocaleString('fr-FR')} FC).`;
    const commissionCovered = payment.commissionFc >= booking.commissionFc;
    await tx.marketplaceBooking.update({
      where: { id: booking.id },
      data: {
        depositMarkedAt: booking.depositMarkedAt ?? now,
        notes: booking.notes ? `${booking.notes}\n${note}` : note,
        ...(commissionCovered && !booking.commissionSettledAt
          ? { commissionSettledAt: now, commissionSettledBy: ONLINE_DEPOSIT_ACTOR_ID }
          : {}),
      },
    });
    return booking;
  });
  if (!result) return false;

  const title = bookingTitle(result);
  const amount = `${payment.amountFc.toLocaleString('fr-FR')} FC`;
  const vendorHref = `${FRONTEND_URL()}/dashboard/bookings?tab=bookings&role=vendor&bookingId=${result.id}`;
  const organizerHref = `${FRONTEND_URL()}/dashboard/bookings?tab=bookings&bookingId=${result.id}`;
  void notifyTenantOperators(result.vendorTenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
    title: `Acompte payé en ligne — ${title}`,
    message: `Le client a payé l'acompte de ${amount} en ligne. Commission déduite, ${payment.payoutAmountFc.toLocaleString('fr-FR')} FC vous sont reversés sur Mobile Money. Confirmez la réservation pour bloquer la date.`,
    metadata: { bookingId: result.id, href: vendorHref },
    whatsapp: `Acompte payé en ligne pour « ${title} » : ${amount}.\nConfirmez la réservation : ${vendorHref}`,
  });
  const organizerPayload = {
    type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
    title: `Acompte payé — ${title}`,
    message: `Votre acompte de ${amount} est bien reçu. Le prestataire va confirmer la réservation.`,
    metadata: { bookingId: result.id, href: organizerHref },
  };
  if (result.organizerTenantId && result.organizerTenantId !== result.vendorTenantId) {
    void notifyTenantOperators(result.organizerTenantId, organizerPayload);
  } else if (result.organizerUserId) {
    void notifyUsers([result.organizerUserId], organizerPayload);
  }
  return true;
}

function buildDepositPayoutReference(): string {
  return `mkp${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

/**
 * Reverse au prestataire la part de l'acompte qui lui revient. Sans FlexPay Payout
 * configuré, le reversement reste en attente (statut NONE) et sera relancé plus tard.
 * Une issue inconnue (réseau) garde le versement en attente : on ne renvoie jamais
 * deux fois le même argent.
 */
export async function sendDepositPayout(paymentId: string) {
  try {
    if (!isFlexPayPayoutConfigured()) return { status: 'NOT_CONFIGURED' as const };
    const payment = await prisma.marketplaceDepositPayment.findUnique({
      where: { id: paymentId },
      include: { vendorTenant: { select: { marketplacePayoutPhone: true } }, booking: { select: { id: true } } },
    });
    if (!payment || payment.status !== 'PAID') return { status: 'NOT_PAID' as const };
    if (payment.payoutAmountFc <= 0) {
      await prisma.marketplaceDepositPayment.updateMany({
        where: { id: payment.id, payoutStatus: 'NONE' },
        data: { payoutStatus: 'SUCCESS', payoutAt: new Date(), payoutMessage: 'Rien à reverser.' },
      });
      return { status: 'SUCCESS' as const };
    }
    const phone = payment.payoutPhone || payment.vendorTenant.marketplacePayoutPhone;
    if (!phone) return { status: 'PHONE_REQUIRED' as const };

    const reference = buildDepositPayoutReference();
    const claimed = await prisma.marketplaceDepositPayment.updateMany({
      where: { id: payment.id, payoutStatus: { in: ['NONE', 'FAILED'] } },
      data: { payoutStatus: 'PENDING', payoutPhone: phone, payoutReference: reference, payoutOrderNumber: null, payoutMessage: null },
    });
    if (claimed.count === 0) return { status: 'ALREADY_SENT' as const };

    try {
      const sent = await getFlexPayPayoutClient().sendMobileMoney({
        reference,
        amount: payment.payoutAmountFc,
        currency: 'CDF',
        customer: phone,
        description: 'Acompte reservation EventMaster',
        callbackUrl: `${getPublicApiBaseUrl()}/api/public/payments/flexpay/payout/callback`,
      });
      await prisma.marketplaceDepositPayment.update({
        where: { id: payment.id },
        data: { payoutOrderNumber: sent.orderNumber, payoutMessage: sent.message || null },
      });
      return { status: 'PENDING' as const };
    } catch (err) {
      const message = (err instanceof Error ? err.message : 'Erreur FlexPay.').slice(0, 500);
      if (err instanceof FlexPayPayoutError && err.definitive) {
        await prisma.marketplaceDepositPayment.update({
          where: { id: payment.id },
          data: { payoutStatus: 'FAILED', payoutMessage: message },
        });
        return { status: 'FAILED' as const };
      }
      await prisma.marketplaceDepositPayment.update({ where: { id: payment.id }, data: { payoutMessage: message } });
      return { status: 'UNCERTAIN' as const };
    }
  } catch (err) {
    console.error('[MarketplaceDeposit] payout:', err);
    return { status: 'ERROR' as const };
  }
}

async function applyCheckedPayout(payment: DepositPayment, checked: FlexPayPayoutCheckResult) {
  if (!checked.found || checked.status === 'pending') return 'PENDING' as const;
  if (checked.status === 'failed') {
    await prisma.marketplaceDepositPayment.updateMany({
      where: { id: payment.id, payoutStatus: 'PENDING' },
      data: {
        payoutStatus: 'FAILED',
        payoutMessage: (checked.message || 'Versement refusé par FlexPay.').slice(0, 500),
        payoutProviderReference: checked.providerReference,
      },
    });
    return 'FAILED' as const;
  }
  const marked = await prisma.marketplaceDepositPayment.updateMany({
    where: { id: payment.id, payoutStatus: 'PENDING' },
    data: {
      payoutStatus: 'SUCCESS',
      payoutAt: new Date(),
      payoutProviderReference: checked.providerReference,
      payoutMessage: checked.message,
    },
  });
  if (marked.count === 1) {
    void notifyTenantOperators(payment.vendorTenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
      title: 'Acompte reversé',
      message: `${payment.payoutAmountFc.toLocaleString('fr-FR')} FC ont été envoyés sur votre Mobile Money${payment.payoutPhone ? ` (${maskPayoutPhone(payment.payoutPhone)})` : ''}.`,
      metadata: {
        bookingId: payment.bookingId,
        href: `${FRONTEND_URL()}/dashboard/bookings?tab=bookings&role=vendor&bookingId=${payment.bookingId}`,
      },
    });
  }
  return 'SUCCESS' as const;
}

/** Vérifie un reversement d'acompte auprès de FlexPay (jamais d'après un callback). */
export async function verifyDepositPayout(paymentId: string) {
  const payment = await prisma.marketplaceDepositPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { status: 'NOT_FOUND' as const };
  if (payment.payoutStatus !== 'PENDING' || !payment.payoutOrderNumber || !payment.payoutReference) {
    return { status: payment.payoutStatus };
  }
  const checked = await getFlexPayPayoutClient().checkTransaction(payment.payoutOrderNumber, payment.payoutReference);
  return { status: await applyCheckedPayout(payment, checked) };
}

export async function findDepositPayoutForFlexPay(opts: { reference?: string | null; orderNumber?: string | null }) {
  const or = [
    opts.orderNumber ? { payoutOrderNumber: opts.orderNumber } : null,
    opts.reference ? { payoutReference: opts.reference } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  if (!or.length) return null;
  return prisma.marketplaceDepositPayment.findFirst({ where: { OR: or } });
}

/**
 * Rattrapage périodique : paiements restés en attente, reversements jamais partis
 * (FlexPay Payout indisponible au moment du paiement) et reversements à vérifier.
 */
export async function reconcileMarketplaceDeposits() {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const pending = await prisma.marketplaceDepositPayment.findMany({
    where: { status: 'PENDING', flexPayOrderNumber: { not: null }, createdAt: { lt: staleBefore } },
    select: { id: true },
    take: 50,
  });
  for (const row of pending) await verifyDepositPayment(row.id).catch(() => undefined);

  if (!isFlexPayPayoutConfigured()) return;
  const toSend = await prisma.marketplaceDepositPayment.findMany({
    where: { status: 'PAID', payoutStatus: 'NONE' },
    select: { id: true },
    take: 50,
  });
  for (const row of toSend) await sendDepositPayout(row.id);

  const toCheck = await prisma.marketplaceDepositPayment.findMany({
    where: { payoutStatus: 'PENDING', payoutOrderNumber: { not: null } },
    select: { id: true },
    take: 50,
  });
  for (const row of toCheck) await verifyDepositPayout(row.id).catch(() => undefined);
}

export function startMarketplaceDepositWorker() {
  const run = () => {
    reconcileMarketplaceDeposits().catch((error) => console.error('[Marketplace] Rattrapage des acomptes en ligne :', error));
  };
  setTimeout(run, 45_000);
  setInterval(run, 15 * 60 * 1000);
}

/** Résumé de l'acompte en ligne joint à une réservation. */
export function serializeDepositPayment(row: {
  id: string;
  status: string;
  paymentMethod: string;
  amountFc: number;
  commissionFc: number;
  payoutAmountFc: number;
  paidAt: Date | null;
  payoutStatus: string;
  payoutAt: Date | null;
  createdAt: Date;
} | null | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    paymentMethod: row.paymentMethod,
    amountFc: row.amountFc,
    commissionFc: row.commissionFc,
    payoutAmountFc: row.payoutAmountFc,
    paidAt: row.paidAt,
    payoutStatus: row.payoutStatus,
    payoutAt: row.payoutAt,
    createdAt: row.createdAt,
  };
}
