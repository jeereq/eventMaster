import { PlanType, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';
import { familyForType, typesForFamily, type NotificationChannel } from '../config/platformNotificationTypes';
import { sendExpoPushToUser } from './expoPushService';
import { sendRealEmail, sendRealWhatsApp } from './notificationService';
import { allowedChannels, resolveChannelPreference } from './notificationPreferenceService';
import {
  FAMILY_LABEL_FR,
  formatOperatorWhatsApp,
  renderOperatorNotificationEmail,
  renderOperatorWhatsApp,
  resolveNotificationHref,
  userWhatsAppNumber,
} from '../utils/notificationTemplates';

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

export type NotifyEmailOverride = {
  subject?: string;
  text?: string;
  html?: string;
};

export type PlatformNotifyParams = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
  email?: NotifyEmailOverride;
  whatsapp?: string;
};

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

async function logDelivery(params: {
  notificationId: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'PUSH';
  status: 'SENT' | 'FAILED' | 'SIMULATED';
  providerId?: string;
  error?: string;
}) {
  try {
    await prisma.notificationDelivery.create({
      data: {
        notificationId: params.notificationId,
        channel: params.channel,
        status: params.status,
        providerId: params.providerId || null,
        error: params.error ? params.error.slice(0, 500) : null,
      },
    });
  } catch (err) {
    console.error('[platformNotification] journal livraison:', err);
  }
}

async function fanOutChannels(
  notification: { id: string; userId: string; type: string; title: string; message: string; metadata: Prisma.JsonValue },
  extras: Pick<PlatformNotifyParams, 'channels' | 'email' | 'whatsapp'>,
) {
  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { email: true, name: true, phone: true, phoneCountryCode: true },
  });
  if (!user) return;

  const pref = await resolveChannelPreference(notification.userId, notification.type);
  const channels = allowedChannels(pref, extras.channels);
  const metadata = (notification.metadata as Record<string, unknown> | null) ?? null;
  const href = resolveNotificationHref(metadata);

  if (channels.has('PUSH')) {
    try {
      const result = await sendExpoPushToUser(notification.userId, {
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...(metadata || {}),
        },
      });
      if (result.sent > 0) {
        await logDelivery({
          notificationId: notification.id,
          channel: 'PUSH',
          status: 'SENT',
          providerId: `${result.sent} device(s)`,
        });
      }
    } catch (err) {
      await logDelivery({
        notificationId: notification.id,
        channel: 'PUSH',
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (channels.has('EMAIL') && user.email) {
    const family = familyForType(notification.type);
    const rendered = renderOperatorNotificationEmail({
      title: notification.title,
      message: notification.message,
      href,
      familyLabel: FAMILY_LABEL_FR[family] || 'Compte',
    });
    const subject = extras.email?.subject || rendered.subject;
    const text = extras.email?.text || rendered.text;
    const html = extras.email?.html || rendered.html;
    const result = await sendRealEmail(user.email, subject, text, html);
    await logDelivery({
      notificationId: notification.id,
      channel: 'EMAIL',
      status: result.simulated ? 'SIMULATED' : result.success ? 'SENT' : 'FAILED',
      providerId: result.messageId,
      error: result.error,
    });
  }

  const waTo = userWhatsAppNumber(user);
  if (channels.has('WHATSAPP') && waTo) {
    const body = extras.whatsapp?.trim()
      ? formatOperatorWhatsApp(extras.whatsapp)
      : renderOperatorWhatsApp({
          title: notification.title,
          message: notification.message,
          href,
        });
    const result = await sendRealWhatsApp(waTo, body);
    await logDelivery({
      notificationId: notification.id,
      channel: 'WHATSAPP',
      status: result.simulated ? 'SIMULATED' : result.success ? 'SENT' : 'FAILED',
      providerId: result.messageSid,
      error: result.error,
    });
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

  return createPlatformNotification({
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
  });
}

export async function createPlatformNotification(params: {
  userId: string;
} & PlatformNotifyParams) {
  const notification = await prisma.platformNotification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: (params.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
  void fanOutChannels(notification, {
    channels: params.channels,
    email: params.email,
    whatsapp: params.whatsapp,
  }).catch((err) => {
    console.error('[platformNotification] fan-out:', err);
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
  opts?: { limit?: number; page?: number; unread?: boolean; type?: string; family?: string; eventId?: string },
) {
  const limit = Math.min(Math.max(opts?.limit ?? 30, 1), 100);
  const page = Math.max(opts?.page ?? 1, 1);
  const familyTypes = typesForFamily(opts?.family);
  const where: Prisma.PlatformNotificationWhereInput = {
    userId,
    ...(opts?.unread ? { readAt: null } : {}),
    ...(opts?.type ? { type: opts.type } : {}),
    ...(familyTypes ? { type: { in: familyTypes } } : {}),
    ...(opts?.eventId
      ? { metadata: { path: ['eventId'], equals: opts.eventId } }
      : {}),
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
  params: PlatformNotifyParams,
) {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  await Promise.all(unique.map((userId) => createPlatformNotification({ userId, ...params })));
}

export async function notifyPlatformStaff(params: PlatformNotifyParams & { includeCommercials?: boolean }) {
  const { includeCommercials, ...notifyParams } = params;
  const users = await prisma.user.findMany({
    where: includeCommercials
      ? { OR: [{ role: 'SUPER_ADMIN' }, { role: 'COMMERCIAL', tenantId: null }] }
      : { role: 'SUPER_ADMIN' },
    select: { id: true },
  });
  await notifyUsers(
    users.map((u) => u.id),
    notifyParams,
  );
}

export async function notifyTenantOperators(tenantId: string, params: PlatformNotifyParams) {
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
