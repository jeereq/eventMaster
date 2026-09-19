import { prisma } from '../db';
import {
  NOTIFICATION_PREF_FAMILIES,
  familyForType,
  isNotificationPrefFamily,
  type NotificationChannel,
  type NotificationPrefFamily,
} from '../config/platformNotificationTypes';
import { userWhatsAppNumber } from '../utils/notificationTemplates';

export type ChannelPreference = {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
  sms: boolean;
};

export type NotificationPreferencesPayload = {
  hasPhone: boolean;
  families: Record<NotificationPrefFamily, ChannelPreference>;
};

export function defaultChannelPreference(hasPhone: boolean): ChannelPreference {
  return {
    email: true,
    whatsapp: hasPhone,
    push: true,
    sms: false,
  };
}

function mergePreference(row: Partial<ChannelPreference> | undefined, hasPhone: boolean): ChannelPreference {
  const defaults = defaultChannelPreference(hasPhone);
  if (!row) return defaults;
  return {
    email: typeof row.email === 'boolean' ? row.email : defaults.email,
    whatsapp: hasPhone ? (typeof row.whatsapp === 'boolean' ? row.whatsapp : false) : false,
    push: typeof row.push === 'boolean' ? row.push : defaults.push,
    sms: hasPhone ? (typeof row.sms === 'boolean' ? row.sms : false) : false,
  };
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferencesPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, phoneCountryCode: true },
  });
  const hasPhone = Boolean(userWhatsAppNumber(user ?? {}));
  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
  });
  const byFamily = new Map(rows.map((row) => [row.family, row]));

  const families = {} as Record<NotificationPrefFamily, ChannelPreference>;
  for (const family of NOTIFICATION_PREF_FAMILIES) {
    const row = byFamily.get(family);
    families[family] = mergePreference(row, hasPhone);
  }
  return { hasPhone, families };
}

export async function saveNotificationPreferences(
  userId: string,
  input: Partial<Record<NotificationPrefFamily, Partial<ChannelPreference>>>,
): Promise<NotificationPreferencesPayload> {
  const updates = Object.entries(input).filter(([family]) => isNotificationPrefFamily(family));
  await Promise.all(
    updates.map(([family, value]) => {
      const next = value || {};
      return prisma.notificationPreference.upsert({
        where: { userId_family: { userId, family } },
        create: {
          userId,
          family,
          email: next.email ?? true,
          whatsapp: next.whatsapp ?? false,
          push: next.push ?? true,
          sms: next.sms ?? false,
        },
        update: {
          ...(typeof next.email === 'boolean' ? { email: next.email } : {}),
          ...(typeof next.whatsapp === 'boolean' ? { whatsapp: next.whatsapp } : {}),
          ...(typeof next.push === 'boolean' ? { push: next.push } : {}),
          ...(typeof next.sms === 'boolean' ? { sms: next.sms } : {}),
        },
      });
    }),
  );
  return getNotificationPreferences(userId);
}

export async function resolveChannelPreference(userId: string, type: string): Promise<ChannelPreference> {
  const family = familyForType(type);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, phoneCountryCode: true },
  });
  const hasPhone = Boolean(userWhatsAppNumber(user ?? {}));
  if (family === 'account') {
    return defaultChannelPreference(hasPhone);
  }
  const row = await prisma.notificationPreference.findUnique({
    where: { userId_family: { userId, family } },
  });
  return mergePreference(row ?? undefined, hasPhone);
}

export function allowedChannels(
  pref: ChannelPreference,
  override?: NotificationChannel[],
): Set<NotificationChannel> {
  const enabled: NotificationChannel[] = ['IN_APP'];
  if (pref.email) enabled.push('EMAIL');
  if (pref.whatsapp) enabled.push('WHATSAPP');
  if (pref.push) enabled.push('PUSH');
  if (pref.sms) enabled.push('SMS');
  const allowed = new Set<NotificationChannel>(enabled);
  if (!override?.length) return allowed;
  return new Set(override.filter((channel) => allowed.has(channel) || channel === 'IN_APP'));
}
