import { PlanType } from '@prisma/client';
import { prisma } from '../db';
import { getPlanAmount, computeApprovedAmount } from './invoiceService';
import { resolveDurationDaysForPlan } from '../config/plansConfig';
import { notifyPlatformStaff, notifyTenantOperators } from './platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import { isFlexPayCardConfigured } from './flexPayCardService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const QUOTE_TTL_DAYS = 14;

export function subscriptionPayHref(requestId: string): string {
  return `${FRONTEND_URL.replace(/\/$/, '')}/dashboard/billing?payRequest=${encodeURIComponent(requestId)}`;
}

/** Un devis validé reste payable après un échec FlexPay (le montant négocié est conservé). */
export function statusAfterFailedQuotedPayment<T extends string>(status: T): T | 'REJECTED' {
  return status === 'QUOTED' ? status : 'REJECTED';
}

export function computeCatalogBaseAmount(requestedPlan: string, durationDays: number): number {
  const days = resolveDurationDaysForPlan(requestedPlan, durationDays);
  return getPlanAmount(requestedPlan as PlanType, days);
}

export async function notifyDiscountRequestSubmitted(opts: {
  tenantId: string;
  tenantName: string;
  requestId: string;
  requestedPlan: string;
  durationDays: number;
  requestedDiscountPercent?: number | null;
  requestedAmount?: number | null;
}) {
  const discountHint =
    opts.requestedAmount != null
      ? `Montant souhaité : ${Math.round(opts.requestedAmount).toLocaleString('fr-FR')} FC`
      : opts.requestedDiscountPercent != null
        ? `Rabais demandé : ${opts.requestedDiscountPercent} %`
        : 'Rabais à négocier';

  await notifyPlatformStaff({
    type: PLATFORM_NOTIFICATION_TYPE.DISCOUNT_REQUEST_PENDING,
    title: `Demande de rabais — ${opts.tenantName}`,
    message: `Forfait ${opts.requestedPlan} · ${opts.durationDays} jours. ${discountHint}. Validez le devis dans Demandes d’abonnement.`,
    metadata: {
      tenantId: opts.tenantId,
      requestId: opts.requestId,
      requestedPlan: opts.requestedPlan,
      href: `${FRONTEND_URL}/dashboard?tab=subscription-requests`,
    },
    includeCommercials: true,
  });
}

export async function approveDiscountQuote(opts: {
  requestId: string;
  reviewerId: string;
  discountPercent?: number;
  approvedAmount?: number;
}) {
  const request = await prisma.subscriptionRequest.findUnique({
    where: { id: opts.requestId },
    include: { tenant: { select: { id: true, name: true, accountKind: true } } },
  });
  if (!request) {
    throw new Error('Demande introuvable.');
  }
  if (request.status !== 'PENDING' && request.status !== 'QUOTED') {
    throw new Error('Cette demande a déjà été traitée.');
  }

  const durationDays = resolveDurationDaysForPlan(request.requestedPlan, request.durationDays);
  const baseAmount = getPlanAmount(request.requestedPlan, durationDays);
  const pricing = computeApprovedAmount(baseAmount, {
    discountPercent: opts.discountPercent,
    approvedAmount: opts.approvedAmount,
  });

  const quoteExpiresAt = new Date();
  quoteExpiresAt.setDate(quoteExpiresAt.getDate() + QUOTE_TTL_DAYS);

  const updated = await prisma.subscriptionRequest.update({
    where: { id: request.id },
    data: {
      status: 'QUOTED',
      requestKind: 'discount',
      specialDiscountPercent: pricing.discountPercent > 0 ? pricing.discountPercent : null,
      baseAmount: pricing.baseAmount,
      approvedAmount: pricing.finalAmount,
      quoteExpiresAt,
      quoteReviewedAt: new Date(),
      quoteReviewedById: opts.reviewerId,
    },
  });

  const payHref = subscriptionPayHref(request.id);
  const canPayOnline = isFlexPayCardConfigured();
  const amountLabel = `${Math.round(pricing.finalAmount).toLocaleString('fr-FR')} FC`;

  await notifyTenantOperators(request.tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.DISCOUNT_QUOTE_READY,
    title: 'Votre rabais a été validé',
    message: canPayOnline
      ? `Le Superadmin / commercial a accepté un tarif de ${amountLabel} pour le forfait ${request.requestedPlan}. Ouvrez le lien pour payer.`
      : `Le tarif négocié est de ${amountLabel} pour le forfait ${request.requestedPlan}. Contactez le support pour finaliser le paiement.`,
    metadata: {
      requestId: request.id,
      tenantId: request.tenantId,
      href: `/dashboard/billing?payRequest=${request.id}`,
      approvedAmount: pricing.finalAmount,
    },
    email: {
      subject: `Rabais validé — ${request.requestedPlan} · ${amountLabel}`,
      text: [
        `Bonjour,`,
        ``,
        `Votre demande de rabais pour le forfait ${request.requestedPlan} a été validée.`,
        `Montant catalogue : ${Math.round(pricing.baseAmount).toLocaleString('fr-FR')} FC`,
        `Montant à payer : ${amountLabel}`,
        pricing.discountPercent > 0 ? `Réduction : ${pricing.discountPercent} %` : '',
        ``,
        canPayOnline ? `Payer maintenant : ${payHref}` : `Ouvrez votre espace facturation : ${payHref}`,
        ``,
        `Ce devis reste valable jusqu’au ${quoteExpiresAt.toLocaleDateString('fr-FR')}.`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
    whatsapp: [
      `Rabais validé — ${request.requestedPlan}`,
      `À payer : ${amountLabel}`,
      canPayOnline ? `Lien de paiement : ${payHref}` : `Espace facturation : ${payHref}`,
    ].join('\n'),
  });

  return {
    request: updated,
    payHref,
    canPayOnline,
    pricing,
    quoteExpiresAt,
    tenantName: request.tenant.name,
  };
}
