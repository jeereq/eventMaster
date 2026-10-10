import { randomUUID } from 'crypto';
import { prisma } from '../db';
import { buildFlexPayMetadataUpdate, normalizeFlexPayPhone } from './flexPayCardService';
import {
  FlexPayPayoutError,
  getFlexPayPayoutClient,
  isFlexPayPayoutConfigured,
} from './flexPayPayoutClient';
import { flexPayPayoutCallbackUrl } from './eventFlexPayPayoutService';
import {
  formatBillingPeriodLabel,
  isPlatformCommercialAccount,
  listMonthlyPayouts,
  listOrgSaaSPayouts,
  markCommercialPeriodPaid,
  markOrgPeriodPaid,
} from './commercialPayoutService';

export type PayoutKind = 'platform' | 'org';

function buildPayoutReference(kind: PayoutKind, commercialId: string, period: string): string {
  // FlexPay reference: unique, alphanumeric-friendly
  const short = randomUUID().replace(/-/g, '').slice(0, 12);
  return `cp${kind === 'platform' ? 'p' : 'o'}${short}`;
}

async function resolveUnpaidAmount(params: {
  kind: PayoutKind;
  commercialId: string;
  period: string;
  tenantId?: string | null;
}): Promise<number> {
  if (params.kind === 'platform') {
    const rows = await listMonthlyPayouts(params.period);
    const row = rows.find((r) => r.commercialId === params.commercialId);
    return Math.round(row?.unpaidCommission || 0);
  }
  if (!params.tenantId) return 0;
  const result = await listOrgSaaSPayouts({
    payerTenantId: params.tenantId,
    period: params.period,
    settlement: 'due',
    page: 1,
    pageSize: 500,
  });
  const row = result.items.find((r) => r.commercialId === params.commercialId);
  return Math.round(row?.unpaidCommission || 0);
}

/**
 * Initie un Pay Out FlexPay vers le Mobile Money du commercial.
 * Ne marque pas paid tant que le callback / check n’a pas réussi.
 */
export async function initiateCommercialFlexPayPayout(params: {
  kind: PayoutKind;
  commercialId: string;
  period: string;
  initiatedByUserId: string;
  phone?: string | null;
  tenantId?: string | null;
}) {
  if (!isFlexPayPayoutConfigured()) {
    return { error: 'NOT_CONFIGURED' as const };
  }
  // Les commissions des commerciaux d'une organisation sont dues par l'organisation :
  // elles ne doivent pas être payées depuis le compte marchand FlexPay d'EventMaster.
  if (params.kind === 'org') {
    return { error: 'ORG_FLEXPAY_DISABLED' as const };
  }

  const commercial = await prisma.user.findUnique({
    where: { id: params.commercialId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      orgRole: true,
      tenantId: true,
    },
  });
  if (!commercial) {
    return { error: 'NOT_FOUND' as const };
  }

  if (!isPlatformCommercialAccount(commercial)) {
    return { error: 'NOT_PLATFORM' as const };
  }

  const existingPending = await prisma.commercialPayoutTransfer.findFirst({
    where: {
      kind: params.kind,
      commercialId: params.commercialId,
      billingPeriod: params.period,
      status: 'PENDING',
    },
  });
  if (existingPending) {
    return {
      error: 'ALREADY_PENDING' as const,
      transfer: existingPending,
    };
  }

  const amountFc = await resolveUnpaidAmount({
    kind: params.kind,
    commercialId: params.commercialId,
    period: params.period,
    tenantId: params.tenantId,
  });
  if (amountFc <= 0) {
    return { error: 'NOTHING_DUE' as const };
  }

  const phoneRaw = params.phone?.trim() || commercial.phone || '';
  const phone = normalizeFlexPayPhone(phoneRaw);
  if (!phone) {
    return { error: 'PHONE_REQUIRED' as const };
  }

  const reference = buildPayoutReference(params.kind, params.commercialId, params.period);
  const transfer = await prisma.commercialPayoutTransfer.create({
    data: {
      kind: params.kind,
      commercialId: params.commercialId,
      tenantId: null,
      billingPeriod: params.period,
      amountFc,
      phone,
      status: 'PENDING',
      flexPayReference: reference,
      initiatedByUserId: params.initiatedByUserId,
    },
  });

  let sent;
  try {
    sent = await getFlexPayPayoutClient().sendMobileMoney({
      reference,
      amount: amountFc,
      currency: 'CDF',
      customer: phone,
      description: `Commission EventMaster ${formatBillingPeriodLabel(params.period)}`,
      callbackUrl: flexPayPayoutCallbackUrl(),
    });
  } catch (err) {
    if (err instanceof FlexPayPayoutError && !err.definitive) {
      // FlexPay a peut-être reçu la demande : on garde le versement en attente
      // pour ne jamais renvoyer deux fois la même commission.
      return {
        transfer,
        message: `${err.message} Le versement reste en attente : vérifiez dans FlexPay avant toute nouvelle tentative.`,
      };
    }
    await prisma.commercialPayoutTransfer.update({
      where: { id: transfer.id },
      data: { status: 'FAILED' },
    });
    throw err;
  }

  // FlexPay a accepté : une erreur ici laisse le versement en attente (jamais en échec).
  const updated = await prisma.commercialPayoutTransfer.update({
    where: { id: transfer.id },
    data: { flexPayOrderNumber: sent.orderNumber },
  });
  return {
    transfer: updated,
    message: `Versement FlexPay envoyé (${formatBillingPeriodLabel(params.period)} · ${amountFc.toLocaleString('fr-FR')} FC). La commission sera marquée versée dès que FlexPay confirme.`,
  };
}

export async function finalizeCommercialFlexPayPayout(opts: {
  reference?: string | null;
  orderNumber?: string | null;
  success: boolean;
  channel?: string | null;
  providerReference?: string | null;
  amountCustomer?: number | null;
}) {
  let transfer = null as Awaited<ReturnType<typeof prisma.commercialPayoutTransfer.findFirst>>;

  if (opts.orderNumber) {
    transfer = await prisma.commercialPayoutTransfer.findFirst({
      where: { flexPayOrderNumber: opts.orderNumber },
    });
  }
  if (!transfer && opts.reference) {
    transfer = await prisma.commercialPayoutTransfer.findFirst({
      where: { flexPayReference: opts.reference },
    });
  }
  if (!transfer) return { handled: false as const };

  if (transfer.status === 'SUCCESS') {
    return { handled: true as const, alreadyPaid: true, transferId: transfer.id };
  }

  const meta = buildFlexPayMetadataUpdate({
    channel: opts.channel,
    amountCustomer: opts.amountCustomer,
    providerReference: opts.providerReference,
  });

  if (!opts.success) {
    await prisma.commercialPayoutTransfer.updateMany({
      where: { id: transfer.id, status: 'PENDING' },
      data: {
        status: 'FAILED',
        flexPayChannel: meta.flexPayChannel,
        flexPayProviderReference: meta.flexPayProviderReference,
      },
    });
    return { handled: true as const, paid: false, transferId: transfer.id };
  }

  // Revendique le passage PENDING → SUCCESS une seule fois (callback et vérification simultanés).
  const claimed = await prisma.commercialPayoutTransfer.updateMany({
    where: { id: transfer.id, status: { not: 'SUCCESS' } },
    data: { status: 'SUCCESS' },
  });
  if (claimed.count === 0) {
    return { handled: true as const, alreadyPaid: true, transferId: transfer.id };
  }

  const proofUrl = `flexpay:${transfer.flexPayOrderNumber || transfer.flexPayReference}`;
  const note = [
    'Versement FlexPay Pay Out',
    meta.flexPayChannel ? `canal ${meta.flexPayChannel}` : null,
    meta.flexPayProviderReference ? `réf. ${meta.flexPayProviderReference}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (transfer.kind === 'platform') {
    await markCommercialPeriodPaid({
      commercialId: transfer.commercialId,
      period: transfer.billingPeriod,
      paidByUserId: transfer.initiatedByUserId,
      proofUrl,
      note,
    });
  } else {
    if (!transfer.tenantId) {
      await prisma.commercialPayoutTransfer.update({
        where: { id: transfer.id },
        data: { status: 'FAILED' },
      });
      return { handled: true as const, paid: false, transferId: transfer.id, error: 'NO_TENANT' };
    }
    await markOrgPeriodPaid({
      payerTenantId: transfer.tenantId,
      commercialId: transfer.commercialId,
      period: transfer.billingPeriod,
      paidByUserId: transfer.initiatedByUserId,
      proofUrl,
      note,
    });
  }

  await prisma.commercialPayoutTransfer.update({
    where: { id: transfer.id },
    data: {
      status: 'SUCCESS',
      flexPayChannel: meta.flexPayChannel,
      flexPayProviderReference: meta.flexPayProviderReference,
    },
  });

  return { handled: true as const, paid: true, transferId: transfer.id };
}

/** Vérifie un payout PENDING via l’API check FlexPay. */
export async function verifyCommercialFlexPayPayout(transferId: string) {
  const transfer = await prisma.commercialPayoutTransfer.findUnique({ where: { id: transferId } });
  if (!transfer) return { error: 'NOT_FOUND' as const };
  if (transfer.status === 'SUCCESS') {
    return { paid: true, status: 'SUCCESS' as const, transfer };
  }
  if (!transfer.flexPayOrderNumber) {
    return { paid: false, status: transfer.status, transfer, canRetry: transfer.status === 'FAILED' };
  }

  const checked = await getFlexPayPayoutClient().checkTransaction(
    transfer.flexPayOrderNumber,
    transfer.flexPayReference,
  );
  if (checked.found && checked.status === 'success') {
    const result = await finalizeCommercialFlexPayPayout({
      reference: transfer.flexPayReference,
      orderNumber: transfer.flexPayOrderNumber,
      success: true,
      providerReference: checked.providerReference,
    });
    return { paid: Boolean(result.paid), status: 'SUCCESS' as const, transferId: transfer.id };
  }
  if (checked.found && checked.status === 'failed') {
    await finalizeCommercialFlexPayPayout({
      reference: transfer.flexPayReference,
      orderNumber: transfer.flexPayOrderNumber,
      success: false,
      providerReference: checked.providerReference,
    });
    return { paid: false, status: 'FAILED' as const, canRetry: true, transferId: transfer.id };
  }
  return { paid: false, status: 'PENDING' as const, transfer };
}
