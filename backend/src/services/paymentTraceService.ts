import { prisma } from '../db';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import { notifyPlatformStaff, notifyUsers } from './platformNotificationService';
import { logAdminAction } from './adminAuditService';
import { sendRealEmail, sendRealWhatsApp } from './notificationService';
import { renderOperatorNotificationEmail, renderOperatorWhatsApp } from '../utils/notificationTemplates';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export type PaymentTraceKind = 'ai_tokens' | 'subscription' | 'ticket';

export type RecordPaymentSuccessInput = {
  kind: PaymentTraceKind;
  reference: string;
  amountFc: number;
  currency?: string;
  payerUserId?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  deviceId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

const KIND_LABEL: Record<PaymentTraceKind, string> = {
  ai_tokens: 'Jetons IA',
  subscription: 'Abonnement',
  ticket: 'Billet',
};

function formatAmount(amountFc: number, currency = 'CDF') {
  return `${Math.round(amountFc).toLocaleString('fr-FR')} ${currency === 'CDF' ? 'FC' : currency}`;
}

function isUniqueConstraint(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}

/**
 * Enregistre un paiement réussi une seule fois, notifie le Super Admin et le payeur,
 * et écrit une ligne d’audit. Idempotent via PaymentTrace.reference.
 */
export async function recordPaymentSuccess(input: RecordPaymentSuccessInput): Promise<{ created: boolean }> {
  const reference = `${input.kind}:${input.reference}`;
  const currency = input.currency || 'CDF';
  const amountLabel = formatAmount(input.amountFc, currency);
  const kindLabel = KIND_LABEL[input.kind];

  try {
    await prisma.paymentTrace.create({
      data: {
        kind: input.kind,
        reference,
        amountFc: input.amountFc,
        currency,
        payerUserId: input.payerUserId || null,
        payerEmail: input.payerEmail || null,
        payerPhone: input.payerPhone || null,
        deviceId: input.deviceId || null,
        summary: input.summary,
        metadata: (input.metadata || undefined) as object | undefined,
      },
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return { created: false };
    }
    console.error('[PaymentTrace] create:', error);
    return { created: false };
  }

  const titlePayer = 'Paiement confirmé';
  const titleStaff = `Paiement reçu — ${kindLabel}`;
  const hrefPayer = input.kind === 'ticket' ? `${FRONTEND_URL}/dashboard/tickets` : `${FRONTEND_URL}/dashboard`;
  const hrefStaff = `${FRONTEND_URL}/dashboard/audit`;

  await logAdminAction({
    actorId: input.payerUserId || 'system',
    actorRole: input.payerUserId ? 'USER' : 'SYSTEM',
    action: 'PAYMENT_RECEIVED',
    targetType: input.kind,
    targetId: input.reference,
    summary: input.summary,
    metadata: {
      amountFc: input.amountFc,
      currency,
      payerEmail: input.payerEmail || null,
      payerPhone: input.payerPhone || null,
      deviceId: input.deviceId || null,
      ...(input.metadata || {}),
    },
  });

  void notifyPlatformStaff({
    type: PLATFORM_NOTIFICATION_TYPE.PAYMENT_RECEIVED,
    title: titleStaff,
    message: `${input.summary} · ${amountLabel}`,
    metadata: {
      kind: input.kind,
      reference: input.reference,
      amountFc: input.amountFc,
      href: hrefStaff,
      payerUserId: input.payerUserId || null,
      payerEmail: input.payerEmail || null,
    },
  }).catch((err) => console.error('[PaymentTrace] notify staff:', err));

  if (input.payerUserId) {
    void notifyUsers([input.payerUserId], {
      type: PLATFORM_NOTIFICATION_TYPE.PAYMENT_RECEIVED,
      title: titlePayer,
      message: `${input.summary} · ${amountLabel}`,
      metadata: {
        kind: input.kind,
        reference: input.reference,
        amountFc: input.amountFc,
        href: hrefPayer,
      },
    }).catch((err) => console.error('[PaymentTrace] notify payer:', err));
  } else {
    const emailCopy = renderOperatorNotificationEmail({
      title: titlePayer,
      message: `${input.summary} · ${amountLabel}`,
      href: FRONTEND_URL,
      familyLabel: 'Paiement',
    });
    if (input.payerEmail) {
      void sendRealEmail(input.payerEmail, emailCopy.subject, emailCopy.text, emailCopy.html).catch((err) =>
        console.error('[PaymentTrace] email guest:', err),
      );
    }
    if (input.payerPhone) {
      void sendRealWhatsApp(
        input.payerPhone,
        renderOperatorWhatsApp({
          title: titlePayer,
          message: `${input.summary} · ${amountLabel}`,
          href: FRONTEND_URL,
        }),
      ).catch((err) => console.error('[PaymentTrace] whatsapp guest:', err));
    }
  }

  return { created: true };
}

export async function notifyAiTokenPayment(order: {
  id: string;
  userId?: string | null;
  deviceId?: string | null;
  tokensCount?: number | null;
  amountFc?: number | null;
  paymentMethod?: string | null;
  phone?: string | null;
}) {
  let payerEmail: string | null = null;
  let payerPhone = order.phone || null;
  if (order.userId) {
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true, phone: true, phoneCountryCode: true },
    });
    payerEmail = user?.email || null;
    if (!payerPhone && user?.phone) {
      const cc = user.phoneCountryCode?.replace(/[^\d]/g, '') || '';
      const digits = user.phone.replace(/[^\d]/g, '').replace(/^0/, '');
      payerPhone = user.phone.startsWith('+') ? user.phone : cc && digits ? `+${cc}${digits}` : user.phone;
    }
  }

  return recordPaymentSuccess({
    kind: 'ai_tokens',
    reference: order.id,
    amountFc: Number(order.amountFc) || 2000,
    payerUserId: order.userId,
    payerEmail,
    payerPhone,
    deviceId: order.deviceId,
    summary: `Recharge ${order.tokensCount || 20} simulations IA (${order.paymentMethod === 'card' ? 'carte' : 'Mobile Money'})`,
    metadata: {
      tokensCount: order.tokensCount || 20,
      paymentMethod: order.paymentMethod || null,
      orderId: order.id,
    },
  });
}

export async function notifySubscriptionPayment(params: {
  requestId: string;
  tenantId: string;
  amountFc: number;
  plan: string;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: {
      name: true,
      managerId: true,
      manager: { select: { email: true, phone: true, phoneCountryCode: true } },
    },
  });
  const manager = tenant?.manager;
  let payerPhone: string | null = null;
  if (manager?.phone) {
    const cc = manager.phoneCountryCode?.replace(/[^\d]/g, '') || '';
    const digits = manager.phone.replace(/[^\d]/g, '').replace(/^0/, '');
    payerPhone = manager.phone.startsWith('+') ? manager.phone : cc && digits ? `+${cc}${digits}` : manager.phone;
  }

  return recordPaymentSuccess({
    kind: 'subscription',
    reference: params.requestId,
    amountFc: params.amountFc,
    payerUserId: tenant?.managerId,
    payerEmail: manager?.email || null,
    payerPhone,
    summary: `Abonnement ${params.plan} — ${tenant?.name || 'Organisation'}`,
    metadata: {
      tenantId: params.tenantId,
      plan: params.plan,
      requestId: params.requestId,
    },
  });
}

export async function notifyTicketPayment(order: {
  id: string;
  userId?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  buyerName?: string | null;
  amountFc?: number | null;
  quantity?: number | null;
  eventTitle?: string | null;
}) {
  return recordPaymentSuccess({
    kind: 'ticket',
    reference: order.id,
    amountFc: Number(order.amountFc) || 0,
    payerUserId: order.userId,
    payerEmail: order.buyerEmail,
    payerPhone: order.buyerPhone,
    summary: `Billet${(order.quantity || 1) > 1 ? 's' : ''} « ${order.eventTitle || 'événement' } » × ${order.quantity || 1}`,
    metadata: {
      orderId: order.id,
      quantity: order.quantity || 1,
      buyerName: order.buyerName || null,
    },
  });
}
