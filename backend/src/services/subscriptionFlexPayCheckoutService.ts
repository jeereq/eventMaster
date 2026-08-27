import { PlanType, SubscriptionRequest } from '@prisma/client';
import { prisma } from '../db';
import {
  buildFlexPayReference,
  createFlexPayCardCheckout,
  createFlexPayMobileCheckout,
  getPublicApiBaseUrl,
  assertFlexPayConfigured,
} from './flexPayCardService';
import { computeSubscriptionCheckoutAmount } from './subscriptionActivationService';

export type FlexPaySubscriptionMethod = 'card' | 'mobile';

/**
 * Relance / démarre une session FlexPay sur une SubscriptionRequest existante.
 * Met à jour montants, provider, orderNumber.
 */
export async function initiateFlexPaySessionForRequest(params: {
  request: SubscriptionRequest;
  tenantName: string;
  method: FlexPaySubscriptionMethod;
  phone?: string | null;
}): Promise<{
  paid: boolean;
  mock: boolean;
  provider: string;
  requestId: string;
  checkoutUrl?: string;
  orderNumber?: string;
  message?: string;
  tenant?: unknown;
}> {
  assertFlexPayConfigured();

  const { request, tenantName, method, phone } = params;
  const days = request.durationDays;
  const plan = request.requestedPlan as PlanType;
  const { baseAmount, amountFc } = computeSubscriptionCheckoutAmount(plan, days);

  if (amountFc <= 0) {
    throw new Error('Montant de forfait invalide.');
  }
  if (method === 'mobile' && !phone?.trim()) {
    throw new Error('Numéro Mobile Money requis (243…).');
  }

  const reference = buildFlexPayReference('sub', request.id);

  // Libérer l’unicité de l’ancien orderNumber avant d’en créer un nouveau
  await prisma.subscriptionRequest.update({
    where: { id: request.id },
    data: {
      status: 'PENDING',
      baseAmount,
      approvedAmount: amountFc,
      paymentProvider: method === 'mobile' ? 'flexpay_mobile' : 'flexpay_card',
      flexPayOrderNumber: null,
      flexPayReference: reference,
      paidAt: null,
      specialDiscountPercent: null,
    },
  });

  const apiBase = getPublicApiBaseUrl();
  const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
  const description = `Forfait ${plan} — ${days} jours — ${tenantName}`;

  if (method === 'mobile') {
    const flex = await createFlexPayMobileCheckout({
      reference,
      amount: amountFc,
      currency: 'CDF',
      phone: String(phone),
      callbackUrl,
    });
    await prisma.subscriptionRequest.update({
      where: { id: request.id },
      data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: reference },
    });
    return {
      paid: false,
      mock: false,
      provider: 'flexpay_mobile',
      requestId: request.id,
      orderNumber: flex.orderNumber,
      message:
        'Demande de paiement envoyée sur votre téléphone. Confirmez sur Mobile Money, puis revenez vérifier le statut.',
    };
  }

  const flex = await createFlexPayCardCheckout({
    reference,
    amount: amountFc,
    currency: 'CDF',
    description,
    callbackUrl,
    approveUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=approve`,
    cancelUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=cancel`,
    declineUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=decline`,
    language: 'fr',
  });
  await prisma.subscriptionRequest.update({
    where: { id: request.id },
    data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: reference },
  });
  return {
    paid: false,
    mock: false,
    provider: 'flexpay_card',
    requestId: request.id,
    checkoutUrl: flex.redirectUrl ?? undefined,
  };
}
