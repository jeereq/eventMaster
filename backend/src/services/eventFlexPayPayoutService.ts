import { randomUUID } from 'crypto';
import { prisma } from '../db';
import { getPublicApiBaseUrl, normalizeFlexPayPhone } from './flexPayCardService';
import {
  FlexPayPayoutError,
  getFlexPayPayoutClient,
  isFlexPayPayoutConfigured,
  type FlexPayPayoutCheckResult,
} from './flexPayPayoutClient';
import { applyFlexPaySettlement, computeEventPayoutAmounts } from './eventPayoutAmounts';
import { eventPayoutRates } from './eventPayoutService';

type EventPayoutTransfer = NonNullable<
  Awaited<ReturnType<typeof prisma.eventPayoutTransfer.findUnique>>
>;

export function flexPayPayoutCallbackUrl(): string {
  return `${getPublicApiBaseUrl()}/api/public/payments/flexpay/payout/callback`;
}

/** Référence FlexPay (≤ 25 caractères, unique). */
function buildEventPayoutReference(): string {
  return `evp${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

async function loadEventForPayout(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      tenantId: true,
      eventPrep: true,
      tenant: { select: { manager: { select: { phone: true } } } },
      ticketOrders: {
        where: { status: 'PAID' },
        select: { amountFc: true, pricingZoneId: true },
      },
    },
  });
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === 'P2002');
}

/**
 * Initie un Pay Out FlexPay du net d'un événement vers le Mobile Money de l'organisation.
 * Action explicite d'un Super Admin uniquement. Le reversement n'est marqué versé qu'après
 * confirmation par l'API « Check transaction » de FlexPay.
 */
export async function initiateEventFlexPayPayout(params: {
  eventId: string;
  initiatedByUserId: string;
  phone?: string | null;
  amountFc?: number | null;
}) {
  if (!isFlexPayPayoutConfigured()) {
    return { error: 'NOT_CONFIGURED' as const };
  }

  const event = await loadEventForPayout(params.eventId);
  if (!event) return { error: 'NOT_FOUND' as const };

  const { ticketRate, donationRate } = eventPayoutRates();
  const amounts = computeEventPayoutAmounts({
    orders: event.ticketOrders,
    eventPrep: event.eventPrep,
    ticketRate,
    donationRate,
  });
  if (amounts.remainingFc <= 0) return { error: 'NOTHING_DUE' as const };

  let amountFc = amounts.remainingFc;
  if (params.amountFc != null) {
    const requested = Math.round(Number(params.amountFc));
    if (!Number.isFinite(requested) || requested <= 0 || requested > amounts.remainingFc) {
      return { error: 'INVALID_AMOUNT' as const, remainingFc: amounts.remainingFc };
    }
    amountFc = requested;
  }

  const phone = normalizeFlexPayPhone(params.phone?.trim() || event.tenant?.manager?.phone || '');
  if (!phone) return { error: 'PHONE_REQUIRED' as const };

  let transfer: EventPayoutTransfer;
  try {
    transfer = await prisma.eventPayoutTransfer.create({
      data: {
        eventId: event.id,
        tenantId: event.tenantId,
        eventTitle: event.title.slice(0, 200),
        amountFc,
        phone,
        status: 'PENDING',
        flexPayReference: buildEventPayoutReference(),
        initiatedByUserId: params.initiatedByUserId,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      const pending = await prisma.eventPayoutTransfer.findFirst({
        where: { eventId: event.id, status: 'PENDING' },
      });
      return { error: 'ALREADY_PENDING' as const, transfer: pending };
    }
    throw err;
  }

  let sent;
  try {
    sent = await getFlexPayPayoutClient().sendMobileMoney({
      reference: transfer.flexPayReference,
      amount: amountFc,
      currency: 'CDF',
      customer: phone,
      description: `Reversement EventMaster - ${event.title}`.slice(0, 120),
      callbackUrl: flexPayPayoutCallbackUrl(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur FlexPay.';
    if (err instanceof FlexPayPayoutError && err.definitive) {
      const failed = await prisma.eventPayoutTransfer.update({
        where: { id: transfer.id },
        data: { status: 'FAILED', lastMessage: message.slice(0, 500) },
      });
      return { error: 'FLEXPAY_REFUSED' as const, message, transfer: failed };
    }
    // Issue inconnue (réseau, délai) : FlexPay a peut-être reçu la demande. On garde le
    // versement en attente pour ne jamais renvoyer deux fois le même argent.
    const pending = await prisma.eventPayoutTransfer.update({
      where: { id: transfer.id },
      data: { lastMessage: message.slice(0, 500) },
    });
    return { error: 'UNCERTAIN' as const, message, transfer: pending };
  }

  // FlexPay a accepté : une erreur ici laisse le versement en attente (jamais en échec).
  const updated = await prisma.eventPayoutTransfer.update({
    where: { id: transfer.id },
    data: { flexPayOrderNumber: sent.orderNumber, lastMessage: sent.message || null },
  });
  return { transfer: updated };
}

/**
 * Applique le résultat vérifié auprès de FlexPay. Le passage PENDING → SUCCESS est gardé
 * (updateMany sur le statut) : un callback et une vérification simultanés ne créditent
 * jamais deux fois le reversement.
 */
async function applyCheckedTransfer(transfer: EventPayoutTransfer, checked: FlexPayPayoutCheckResult) {
  if (!checked.found || checked.status === 'pending') {
    return { status: 'PENDING' as const, transferId: transfer.id };
  }

  if (checked.status === 'failed') {
    await prisma.eventPayoutTransfer.updateMany({
      where: { id: transfer.id, status: 'PENDING' },
      data: {
        status: 'FAILED',
        lastMessage: (checked.message || 'Versement refusé par FlexPay.').slice(0, 500),
        flexPayProviderReference: checked.providerReference,
      },
    });
    return { status: 'FAILED' as const, transferId: transfer.id };
  }

  const now = new Date();
  const applied = await prisma.$transaction(async (tx) => {
    const claimed = await tx.eventPayoutTransfer.updateMany({
      where: { id: transfer.id, status: 'PENDING' },
      data: {
        status: 'SUCCESS',
        settledAt: now,
        flexPayProviderReference: checked.providerReference,
        lastMessage: checked.message,
      },
    });
    if (claimed.count === 0) return false;

    const event = await tx.event.findUnique({
      where: { id: transfer.eventId },
      select: {
        id: true,
        eventPrep: true,
        ticketOrders: { where: { status: 'PAID' }, select: { amountFc: true, pricingZoneId: true } },
      },
    });
    if (!event) return true;

    const { ticketRate, donationRate } = eventPayoutRates();
    const amounts = computeEventPayoutAmounts({
      orders: event.ticketOrders,
      eventPrep: event.eventPrep,
      ticketRate,
      donationRate,
    });
    const nextPayout = applyFlexPaySettlement({
      payoutMeta: amounts.payoutMeta,
      netFc: amounts.net,
      alreadySettledFc: amounts.alreadySettledFc,
      amountFc: transfer.amountFc,
      orderNumber: transfer.flexPayOrderNumber || transfer.flexPayReference,
      providerReference: checked.providerReference,
      actorId: transfer.initiatedByUserId,
      now,
    });
    const prep =
      event.eventPrep && typeof event.eventPrep === 'object'
        ? (event.eventPrep as Record<string, unknown>)
        : {};
    await tx.event.update({
      where: { id: event.id },
      data: { eventPrep: { ...prep, payout: nextPayout } as object },
    });
    return true;
  });

  return { status: 'SUCCESS' as const, transferId: transfer.id, alreadyApplied: !applied };
}

/** Vérifie un reversement auprès de FlexPay (jamais d'après le contenu d'un callback). */
export async function verifyEventFlexPayPayout(transferId: string) {
  const transfer = await prisma.eventPayoutTransfer.findUnique({ where: { id: transferId } });
  if (!transfer) return { error: 'NOT_FOUND' as const };
  if (transfer.status !== 'PENDING') {
    return { status: transfer.status, transferId: transfer.id, lastMessage: transfer.lastMessage };
  }
  if (!transfer.flexPayOrderNumber) {
    return {
      status: 'PENDING' as const,
      transferId: transfer.id,
      lastMessage: transfer.lastMessage,
      canAbandon: true,
    };
  }
  const checked = await getFlexPayPayoutClient().checkTransaction(
    transfer.flexPayOrderNumber,
    transfer.flexPayReference,
  );
  const result = await applyCheckedTransfer(transfer, checked);
  return { ...result, lastMessage: checked.message };
}

/**
 * Abandonne un versement resté en attente sans numéro FlexPay (demande jamais confirmée).
 * L'admin doit d'abord vérifier dans le back-office FlexPay que rien n'est parti.
 */
export async function abandonEventFlexPayPayout(transferId: string, reason: string) {
  const transfer = await prisma.eventPayoutTransfer.findUnique({ where: { id: transferId } });
  if (!transfer) return { error: 'NOT_FOUND' as const };
  if (transfer.status !== 'PENDING') return { error: 'NOT_PENDING' as const };
  if (transfer.flexPayOrderNumber) return { error: 'HAS_ORDER_NUMBER' as const };
  const updated = await prisma.eventPayoutTransfer.updateMany({
    where: { id: transfer.id, status: 'PENDING', flexPayOrderNumber: null },
    data: { status: 'FAILED', lastMessage: `Abandonné par l'admin : ${reason}`.slice(0, 500) },
  });
  return { abandoned: updated.count === 1, transferId: transfer.id };
}

export async function findEventPayoutTransfer(opts: { reference?: string | null; orderNumber?: string | null }) {
  const or = [
    opts.orderNumber ? { flexPayOrderNumber: opts.orderNumber } : null,
    opts.reference ? { flexPayReference: opts.reference } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  if (!or.length) return null;
  return prisma.eventPayoutTransfer.findFirst({ where: { OR: or } });
}
