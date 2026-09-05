import { prisma } from '../db';
import { notifyAiTokenPayment } from './paymentTraceService';
import { creditPaidAiTokenOrder } from './aiSimulationWalletService';
import { loadPlatformSettings } from './platformSettingsService';
import {
  calculateAmountForTokens as calcAmountForTokens,
  calculateTokensForAmount as calcTokensForAmount,
  resolveAiTokenPricing,
  type AiTokenPricing,
} from './aiTokenPricing';

export function currentAiTokenPricing(): AiTokenPricing {
  return resolveAiTokenPricing(loadPlatformSettings());
}
import {
  buildFlexPayMetadataUpdate,
  buildFlexPayReference,
  checkFlexPayCardOrder,
  createFlexPayCardCheckout,
  createFlexPayMobileCheckout,
  getPublicApiBaseUrl,
  isFlexPayCardConfigured,
  normalizeFlexPayPhone,
  type FlexPayCheckResult,
  type FlexPayMetadataUpdate,
} from './flexPayCardService';

export const AI_TOKEN_BASE_COUNT = 6;
export const AI_TOKEN_BASE_PRICE_CDF = 2500;
export const AI_TOKEN_MIN_AMOUNT_CDF = 2500;
export const AI_TOKEN_MIN_COUNT = 6;
export const AI_TOKEN_PACK_COUNT = 6;
export const AI_TOKEN_PACK_PRICE_CDF = 2500;

export function calculateTokensForAmount(amountFc: number, pricing = currentAiTokenPricing()): number {
  return calcTokensForAmount(amountFc, pricing);
}

export function calculateAmountForTokens(tokensCount: number, pricing = currentAiTokenPricing()): number {
  return calcAmountForTokens(tokensCount, pricing);
}

export type AiTokenPaymentMethod = 'mobile' | 'card';

export interface InitiateAiTokenPaymentInput {
  userId?: string | null;
  deviceId?: string | null;
  paymentMethod: AiTokenPaymentMethod;
  phone?: string | null;
  operator?: string | null;
  tokensCount?: number;
  amountFc?: number;
}

export interface InitiateAiTokenPaymentResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  reference: string;
  paymentMethod: AiTokenPaymentMethod;
  status: 'PENDING' | 'PAID' | 'FAILED';
  redirectUrl?: string | null;
  tokensCount: number;
  amountFc: number;
  message?: string;
}

// Mémoire de secours en cas d'indisponibilité momentanée de la table DB
const memoryOrders = new Map<string, any>();

/**
 * Crée une commande et lance le paiement réel FlexPay (Mobile Money ou Carte).
 * Applique une tarification proportionnelle (2 500 FC / 6 jetons) avec un minimum payable de 2 500 FC.
 */
export async function initiateAiTokenPayment(
  input: InitiateAiTokenPaymentInput,
): Promise<InitiateAiTokenPaymentResult> {
  const paymentMethod: AiTokenPaymentMethod =
    input.paymentMethod === 'card' ? 'card' : 'mobile';

  let amountFc: number;
  let tokensCount: number;

  const pricing = currentAiTokenPricing();
  if (input.amountFc && input.amountFc > 0) {
    if (input.amountFc < pricing.minAmountCdf) {
      throw new Error(
        `Le montant minimum de recharge est de ${pricing.minAmountCdf.toLocaleString('fr-FR')} FC (soit ${pricing.minCount} jeton${pricing.minCount > 1 ? 's' : ''}).`,
      );
    }
    amountFc = Math.round(input.amountFc);
    tokensCount = calculateTokensForAmount(amountFc, pricing);
  } else if (input.tokensCount && input.tokensCount > 0) {
    tokensCount = Math.max(pricing.minCount, Math.round(input.tokensCount));
    amountFc = calculateAmountForTokens(tokensCount, pricing);
  } else {
    amountFc = pricing.minAmountCdf;
    tokensCount = pricing.minCount;
  }

  let normalizedPhone: string | null = null;
  if (paymentMethod === 'mobile') {
    normalizedPhone = normalizeFlexPayPhone(input.phone || '');
    if (!normalizedPhone) {
      throw new Error(
        'Numéro Mobile Money invalide. Veuillez saisir un numéro RDC valide (ex: 24389XXXXXXX, 24381XXXXXXX, 24399XXXXXXX).',
      );
    }
  }

  // Création initiale de la commande
  let dbOrder: any = null;
  try {
    dbOrder = await (prisma as any).aiTokenOrder.create({
      data: {
        userId: input.userId || null,
        deviceId: input.deviceId || null,
        tokensCount,
        amountFc,
        currency: 'CDF',
        status: 'PENDING',
        paymentMethod,
        phone: normalizedPhone || input.phone || null,
        operator: input.operator || null,
      },
    });
  } catch (err) {
    console.warn('[AiTokenPayment] Prisma create order fallback to memory:', err);
    const mockId = `aitok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    dbOrder = {
      id: mockId,
      userId: input.userId || null,
      deviceId: input.deviceId || null,
      tokensCount,
      amountFc,
      currency: 'CDF',
      status: 'PENDING',
      paymentMethod,
      phone: normalizedPhone || input.phone || null,
      operator: input.operator || null,
      createdAt: new Date(),
    };
  }

  const orderId = dbOrder.id;
  const reference = buildFlexPayReference('aitok', orderId);
  const apiBase = getPublicApiBaseUrl();
  const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;

  // 1) Paiement Mobile Money (Orange Money, M-Pesa, Airtel Money)
  if (paymentMethod === 'mobile') {
    let flex: { orderNumber: string; redirectUrl: string | null; raw: Record<string, unknown> };

    if (isFlexPayCardConfigured()) {
      flex = await createFlexPayMobileCheckout({
        reference,
        amount: amountFc,
        currency: 'CDF',
        phone: normalizedPhone!,
        callbackUrl,
      });
    } else {
      // Si FlexPay n'est pas configuré en dev local
      const mockOrderNumber = `FLEX-MM-${Date.now()}`;
      flex = {
        orderNumber: mockOrderNumber,
        redirectUrl: null,
        raw: { code: '0', message: 'Mode sandbox / dev' },
      };
    }

    try {
      await (prisma as any).aiTokenOrder.update({
        where: { id: orderId },
        data: {
          flexPayOrderNumber: flex.orderNumber,
          flexPayReference: reference,
        },
      });
    } catch {
      memoryOrders.set(orderId, {
        ...dbOrder,
        flexPayOrderNumber: flex.orderNumber,
        flexPayReference: reference,
      });
    }

    return {
      success: true,
      orderId,
      orderNumber: flex.orderNumber,
      reference,
      paymentMethod: 'mobile',
      status: 'PENDING',
      tokensCount,
      amountFc,
      message:
        'Une demande de paiement a été envoyée sur votre téléphone. Veuillez valider le code secret PIN sur votre mobile.',
    };
  }

  // 2) Paiement Carte Bancaire (Visa / Mastercard)
  const approveUrl = `${apiBase}/api/public/payments/flexpay/return?kind=ai_tokens&result=approve&orderId=${encodeURIComponent(orderId)}`;
  const cancelUrl = `${apiBase}/api/public/payments/flexpay/return?kind=ai_tokens&result=cancel&orderId=${encodeURIComponent(orderId)}`;
  const declineUrl = `${apiBase}/api/public/payments/flexpay/return?kind=ai_tokens&result=decline&orderId=${encodeURIComponent(orderId)}`;

  let flexCard: { orderNumber: string; redirectUrl: string | null; raw: Record<string, unknown> };

  if (isFlexPayCardConfigured()) {
    flexCard = await createFlexPayCardCheckout({
      reference,
      amount: amountFc,
      currency: 'CDF',
      description: `Recharge ${tokensCount} simulations IA — EventMaster`,
      callbackUrl,
      approveUrl,
      cancelUrl,
      declineUrl,
      language: 'fr',
    });
  } else {
    const mockOrderNumber = `FLEX-CARD-${Date.now()}`;
    flexCard = {
      orderNumber: mockOrderNumber,
      redirectUrl: `${apiBase}/api/public/payments/flexpay/return?kind=ai_tokens&result=approve&orderId=${encodeURIComponent(orderId)}`,
      raw: { code: '0', message: 'Mode sandbox / dev' },
    };
  }

  try {
    await (prisma as any).aiTokenOrder.update({
      where: { id: orderId },
      data: {
        flexPayOrderNumber: flexCard.orderNumber,
        flexPayReference: reference,
      },
    });
  } catch {
    memoryOrders.set(orderId, {
      ...dbOrder,
      flexPayOrderNumber: flexCard.orderNumber,
      flexPayReference: reference,
    });
  }

  return {
    success: true,
    orderId,
    orderNumber: flexCard.orderNumber,
    reference,
    paymentMethod: 'card',
    status: 'PENDING',
    redirectUrl: flexCard.redirectUrl,
    tokensCount,
    amountFc,
    message: 'Redirection vers la passerelle sécurisée FlexPay (Visa / Mastercard)...',
  };
}

/**
 * Recherche une commande de jetons IA par référence ou orderNumber FlexPay.
 */
export async function findAiTokenOrderForFlexPay(opts: {
  reference?: string;
  orderNumber?: string;
  orderId?: string;
}) {
  try {
    if (opts.orderId) {
      const order = await (prisma as any).aiTokenOrder.findUnique({ where: { id: opts.orderId } });
      if (order) return order;
    }
    if (opts.orderNumber) {
      const order = await (prisma as any).aiTokenOrder.findFirst({
        where: { flexPayOrderNumber: opts.orderNumber },
      });
      if (order) return order;
    }
    if (opts.reference) {
      const order = await (prisma as any).aiTokenOrder.findFirst({
        where: {
          OR: [{ id: opts.reference }, { flexPayReference: opts.reference }],
        },
      });
      if (order) return order;
    }
  } catch (err) {
    console.warn('[AiTokenPayment] findAiTokenOrder fallback to memory:', err);
  }

  // Recherche dans la mémoire si non trouvé en DB
  for (const order of memoryOrders.values()) {
    if (opts.orderId && order.id === opts.orderId) return order;
    if (opts.orderNumber && order.flexPayOrderNumber === opts.orderNumber) return order;
    if (opts.reference && (order.id === opts.reference || order.flexPayReference === opts.reference)) {
      return order;
    }
  }

  return null;
}

/**
 * Vérifie le statut réel du paiement auprès de FlexPay et met à jour la commande.
 */
export async function verifyAndFinalizeAiTokenOrder(orderIdOrNumber: string): Promise<{
  found: boolean;
  paid: boolean;
  status: string;
  tokensCount: number;
  orderId: string;
  orderNumber?: string | null;
  message?: string;
}> {
  const order = await findAiTokenOrderForFlexPay({
    orderId: orderIdOrNumber,
    orderNumber: orderIdOrNumber,
    reference: orderIdOrNumber,
  });

  if (!order) {
    return {
      found: false,
      paid: false,
      status: 'NOT_FOUND',
      tokensCount: 0,
      orderId: orderIdOrNumber,
      message: 'Commande de jetons introuvable.',
    };
  }

  if (order.status === 'PAID') {
    void creditPaidAiTokenOrder(order).catch((err) =>
      console.error('[AiTokenPayment] wallet credit:', err),
    );
    return {
      found: true,
      paid: true,
      status: 'PAID',
      tokensCount: order.tokensCount,
      orderId: order.id,
      orderNumber: order.flexPayOrderNumber,
      message: 'Paiement déjà validé.',
    };
  }

  const orderNumber = order.flexPayOrderNumber;
  if (!orderNumber) {
    return {
      found: true,
      paid: false,
      status: order.status,
      tokensCount: order.tokensCount,
      orderId: order.id,
      message: 'En attente d’initialisation.',
    };
  }

  let checked: FlexPayCheckResult;
  try {
    checked = await checkFlexPayCardOrder(orderNumber);
  } catch (err) {
    console.warn('[AiTokenPayment] checkFlexPayCardOrder error:', err);
    return {
      found: true,
      paid: false,
      status: 'PENDING',
      tokensCount: order.tokensCount,
      orderId: order.id,
      orderNumber,
      message: 'Vérification en cours auprès de l’opérateur...',
    };
  }

  const isSuccess = checked.status === 'success';
  const isFailed = checked.status === 'failed';

  const metaUpdate: FlexPayMetadataUpdate = buildFlexPayMetadataUpdate({
    channel: checked.channel,
    amountCustomer: checked.amountCustomer,
    providerReference: checked.providerReference,
  });

  if (isSuccess) {
    try {
      await (prisma as any).aiTokenOrder.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          ...metaUpdate,
        },
      });
    } catch {
      if (memoryOrders.has(order.id)) {
        memoryOrders.set(order.id, {
          ...memoryOrders.get(order.id),
          status: 'PAID',
          paidAt: new Date(),
          ...metaUpdate,
        });
      }
    }

    void notifyAiTokenPayment(order).catch((err) =>
      console.error('[AiTokenPayment] notify:', err),
    );
    void creditPaidAiTokenOrder(order).catch((err) =>
      console.error('[AiTokenPayment] wallet credit:', err),
    );

    return {
      found: true,
      paid: true,
      status: 'PAID',
      tokensCount: order.tokensCount,
      orderId: order.id,
      orderNumber,
      message: 'Paiement validé avec succès ! Jetons crédités.',
    };
  }

  if (isFailed) {
    try {
      await (prisma as any).aiTokenOrder.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          ...metaUpdate,
        },
      });
    } catch {
      if (memoryOrders.has(order.id)) {
        memoryOrders.set(order.id, {
          ...memoryOrders.get(order.id),
          status: 'FAILED',
          ...metaUpdate,
        });
      }
    }

    return {
      found: true,
      paid: false,
      status: 'FAILED',
      tokensCount: order.tokensCount,
      orderId: order.id,
      orderNumber,
      message: 'Le paiement a échoué ou a été refusé par l’opérateur.',
    };
  }

  return {
    found: true,
    paid: false,
    status: 'PENDING',
    tokensCount: order.tokensCount,
    orderId: order.id,
    orderNumber,
    message: 'En attente de validation sur votre téléphone...',
  };
}

/**
 * Récupère le total des jetons payés et validés attachés à un identifiant d'appareil (device).
 */
export async function getDeviceAiTokensSummary(deviceId: string): Promise<{
  deviceId: string;
  totalPaidTokens: number;
  paidOrdersCount: number;
  lastPaidOrderAt?: string | null;
}> {
  if (!deviceId || typeof deviceId !== 'string') {
    return {
      deviceId: '',
      totalPaidTokens: 0,
      paidOrdersCount: 0,
    };
  }

  let totalPaidTokens = 0;
  let paidOrdersCount = 0;
  let lastPaidOrderAt: Date | null = null;

  try {
    const orders = await (prisma as any).aiTokenOrder.findMany({
      where: {
        deviceId,
        status: 'PAID',
      },
      select: {
        tokensCount: true,
        paidAt: true,
      },
    });

    for (const ord of orders) {
      totalPaidTokens += ord.tokensCount || 0;
      paidOrdersCount += 1;
      if (ord.paidAt && (!lastPaidOrderAt || ord.paidAt > lastPaidOrderAt)) {
        lastPaidOrderAt = ord.paidAt;
      }
    }
  } catch (err) {
    console.warn('[AiTokenPayment] getDeviceAiTokensSummary fallback to memory:', err);
    for (const order of memoryOrders.values()) {
      if (order.deviceId === deviceId && order.status === 'PAID') {
        totalPaidTokens += order.tokensCount || 0;
        paidOrdersCount += 1;
      }
    }
  }

  return {
    deviceId,
    totalPaidTokens,
    paidOrdersCount,
    lastPaidOrderAt: lastPaidOrderAt ? lastPaidOrderAt.toISOString() : null,
  };
}

