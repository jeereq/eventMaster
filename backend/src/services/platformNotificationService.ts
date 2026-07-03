import { PlanType } from '@prisma/client';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';

function formatAmountFc(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FC`;
}

export type CommercialBillingEvent =
  | 'SUBSCRIPTION_APPROVAL'
  | 'ADMIN_ACTIVATION'
  | 'ADMIN_RENEWAL'
  | 'ADMIN_PLAN_CHANGE'
  | 'LICENSE_RENEWAL';

function titleForEvent(event: CommercialBillingEvent, tenantName: string): string {
  switch (event) {
    case 'ADMIN_RENEWAL':
    case 'LICENSE_RENEWAL':
      return `Renouvellement — ${tenantName}`;
    case 'ADMIN_PLAN_CHANGE':
      return `Changement de forfait — ${tenantName}`;
    case 'ADMIN_ACTIVATION':
    case 'SUBSCRIPTION_APPROVAL':
    default:
      return `Abonnement activé — ${tenantName}`;
  }
}

export async function createCommercialBillingNotification(params: {
  userId: string;
  tenantId: string;
  tenantName: string;
  plan: PlanType;
  event: CommercialBillingEvent;
  durationDays: number;
  baseAmount: number;
  finalAmount: number;
  discountPercent: number;
  discountAmount: number;
  invoiceNumber?: string;
  commissionAmount?: number;
}) {
  const planName = getPlanLimits(params.plan).name;
  const discountPart =
    params.discountAmount > 0
      ? ` Réduction ${params.discountPercent} % (− ${formatAmountFc(params.discountAmount)}).`
      : '';
  const commissionPart =
    params.commissionAmount !== undefined
      ? ` Votre commission estimée : ${formatAmountFc(params.commissionAmount)}.`
      : ' Votre commission sera calculée sur le montant facturé.';

  const message = [
    `Forfait ${planName} (${params.plan}) — ${params.durationDays} jours.`,
    `Montant facturé : ${formatAmountFc(params.finalAmount)} (catalogue ${formatAmountFc(params.baseAmount)}).${discountPart}`,
    params.invoiceNumber ? `Facture ${params.invoiceNumber}.` : '',
    commissionPart,
  ]
    .filter(Boolean)
    .join(' ');

  return prisma.platformNotification.create({
    data: {
      userId: params.userId,
      type: params.event,
      title: titleForEvent(params.event, params.tenantName),
      message,
      metadata: {
        tenantId: params.tenantId,
        tenantName: params.tenantName,
        plan: params.plan,
        finalAmount: params.finalAmount,
        baseAmount: params.baseAmount,
        discountPercent: params.discountPercent,
        discountAmount: params.discountAmount,
        invoiceNumber: params.invoiceNumber ?? null,
        commissionAmount: params.commissionAmount ?? null,
      },
    },
  });
}

export async function getUserNotifications(userId: string, limit = 30) {
  const [items, unreadCount] = await Promise.all([
    prisma.platformNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.platformNotification.count({
      where: { userId, readAt: null },
    }),
  ]);

  return { items, unreadCount };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.platformNotification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) return null;

  return prisma.platformNotification.update({
    where: { id: notificationId },
    data: { readAt: notification.readAt ?? new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.platformNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
