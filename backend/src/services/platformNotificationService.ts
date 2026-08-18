import { PlanType, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';
import { sendExpoPushToUser } from './expoPushService';
import { typesForFamily } from '../config/platformNotificationTypes';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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
        href: `${FRONTEND_URL}/dashboard/notifications`,
      },
    },
  }).then(async (notification) => {
    void sendExpoPushToUser(params.userId, {
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id,
        type: notification.type,
        ...(notification.metadata as Record<string, unknown> | null),
      },
    });
    return notification;
  });
}

export async function createPlatformNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const notification = await prisma.platformNotification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: (params.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
  void sendExpoPushToUser(params.userId, {
    title: notification.title,
    body: notification.message,
    data: {
      notificationId: notification.id,
      type: notification.type,
      ...(notification.metadata as Record<string, unknown> | null),
    },
  });
  return notification;
}

export async function hasNotificationForPeriod(params: {
  userId: string;
  type: string;
  period: string;
}) {
  const rows = await prisma.platformNotification.findMany({
    where: { userId: params.userId, type: params.type },
    select: { metadata: true },
    take: 40,
    orderBy: { createdAt: 'desc' },
  });
  return rows.some((row) => {
    const meta = row.metadata as { period?: string } | null;
    return meta?.period === params.period;
  });
}

export async function getUserNotifications(
  userId: string,
  opts?: { limit?: number; page?: number; unread?: boolean; type?: string; family?: string },
) {
  const limit = Math.min(Math.max(opts?.limit ?? 30, 1), 100);
  const page = Math.max(opts?.page ?? 1, 1);
  const familyTypes = typesForFamily(opts?.family);
  const where: Prisma.PlatformNotificationWhereInput = {
    userId,
    ...(opts?.unread ? { readAt: null } : {}),
    ...(opts?.type ? { type: opts.type } : {}),
    ...(familyTypes ? { type: { in: familyTypes } } : {}),
  };

  const [items, unreadCount, total] = await Promise.all([
    prisma.platformNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.platformNotification.count({ where: { userId, readAt: null } }),
    prisma.platformNotification.count({ where }),
  ]);

  return {
    items,
    unreadCount,
    total,
    page,
    pageSize: limit,
    hasMore: page * limit < total,
  };
}

export async function notifyUsers(
  userIds: Array<string | null | undefined>,
  params: { type: string; title: string; message: string; metadata?: Record<string, unknown> },
) {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  await Promise.all(unique.map((userId) => createPlatformNotification({ userId, ...params })));
}

export async function notifyPlatformStaff(params: {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  includeCommercials?: boolean;
}) {
  const users = await prisma.user.findMany({
    where: params.includeCommercials
      ? { OR: [{ role: 'SUPER_ADMIN' }, { role: 'COMMERCIAL', tenantId: null }] }
      : { role: 'SUPER_ADMIN' },
    select: { id: true },
  });
  await notifyUsers(
    users.map((u) => u.id),
    params,
  );
}

export async function notifyTenantOperators(
  tenantId: string,
  params: { type: string; title: string; message: string; metadata?: Record<string, unknown> },
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      managerId: true,
      users: {
        where: { orgRole: 'MANAGER' },
        select: { id: true },
      },
    },
  });
  if (!tenant) return;
  await notifyUsers([tenant.managerId, ...tenant.users.map((u) => u.id)], params);
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
