import { prisma } from '../db';

export type TenantNotificationRecipientMode =
  | 'OWNER_ONLY'
  | 'OWNER_AND_MANAGERS'
  | 'CUSTOM';

export type TenantNotificationSettings = {
  ticketsEnabled: boolean;
  donationsEnabled: boolean;
  recipientMode: TenantNotificationRecipientMode;
  customUserIds: string[];
  includeEventStaff: boolean;
  notifyOnPaymentFailed: boolean;
};

export const DEFAULT_TENANT_NOTIFICATION_SETTINGS: TenantNotificationSettings = {
  ticketsEnabled: true,
  donationsEnabled: true,
  recipientMode: 'OWNER_AND_MANAGERS',
  customUserIds: [],
  includeEventStaff: true,
  notifyOnPaymentFailed: true,
};

function sanitizeSettings(raw: unknown): TenantNotificationSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_TENANT_NOTIFICATION_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;

  const validModes: TenantNotificationRecipientMode[] = ['OWNER_ONLY', 'OWNER_AND_MANAGERS', 'CUSTOM'];
  const recipientMode: TenantNotificationRecipientMode =
    typeof obj.recipientMode === 'string' && validModes.includes(obj.recipientMode as TenantNotificationRecipientMode)
      ? (obj.recipientMode as TenantNotificationRecipientMode)
      : DEFAULT_TENANT_NOTIFICATION_SETTINGS.recipientMode;

  const customUserIds = Array.isArray(obj.customUserIds)
    ? obj.customUserIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    : [];

  return {
    ticketsEnabled: typeof obj.ticketsEnabled === 'boolean' ? obj.ticketsEnabled : true,
    donationsEnabled: typeof obj.donationsEnabled === 'boolean' ? obj.donationsEnabled : true,
    recipientMode,
    customUserIds,
    includeEventStaff: typeof obj.includeEventStaff === 'boolean' ? obj.includeEventStaff : true,
    notifyOnPaymentFailed: typeof obj.notifyOnPaymentFailed === 'boolean' ? obj.notifyOnPaymentFailed : true,
  };
}

/**
 * Récupère les paramètres de notification de l'organisation.
 */
export async function getTenantNotificationSettings(tenantId: string): Promise<TenantNotificationSettings> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { notificationSettings: true },
  });
  return sanitizeSettings(tenant?.notificationSettings);
}

/**
 * Met à jour les paramètres de notification configurés par le propriétaire.
 */
export async function updateTenantNotificationSettings(
  tenantId: string,
  input: Partial<TenantNotificationSettings>,
): Promise<TenantNotificationSettings> {
  const current = await getTenantNotificationSettings(tenantId);

  let validatedCustomUserIds = current.customUserIds;
  if (Array.isArray(input.customUserIds)) {
    // Sécurité : s'assurer que les utilisateurs sélectionnés appartiennent bien à cette organisation
    const cleanIds = input.customUserIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()));
    if (cleanIds.length > 0) {
      const validOrgUsers = await prisma.user.findMany({
        where: { tenantId, id: { in: cleanIds } },
        select: { id: true },
      });
      validatedCustomUserIds = validOrgUsers.map((u) => u.id);
    } else {
      validatedCustomUserIds = [];
    }
  }

  const validModes: TenantNotificationRecipientMode[] = ['OWNER_ONLY', 'OWNER_AND_MANAGERS', 'CUSTOM'];
  const nextMode =
    input.recipientMode && validModes.includes(input.recipientMode)
      ? input.recipientMode
      : current.recipientMode;

  const merged: TenantNotificationSettings = {
    ticketsEnabled: typeof input.ticketsEnabled === 'boolean' ? input.ticketsEnabled : current.ticketsEnabled,
    donationsEnabled: typeof input.donationsEnabled === 'boolean' ? input.donationsEnabled : current.donationsEnabled,
    recipientMode: nextMode,
    customUserIds: validatedCustomUserIds,
    includeEventStaff: typeof input.includeEventStaff === 'boolean' ? input.includeEventStaff : current.includeEventStaff,
    notifyOnPaymentFailed:
      typeof input.notifyOnPaymentFailed === 'boolean' ? input.notifyOnPaymentFailed : current.notifyOnPaymentFailed,
  };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      notificationSettings: merged as any,
    },
  });

  return merged;
}

/**
 * Résout la liste des identifiants d'utilisateurs à notifier selon la configuration du propriétaire.
 */
export async function resolveNotificationRecipients(params: {
  tenantId: string;
  eventId?: string | null;
  isDonation: boolean;
  isFailed?: boolean;
}): Promise<{ shouldNotify: boolean; recipientUserIds: string[] }> {
  const { tenantId, eventId, isDonation, isFailed } = params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      managerId: true,
      notificationSettings: true,
      users: {
        select: { id: true, orgRole: true },
      },
    },
  });

  if (!tenant) {
    return { shouldNotify: false, recipientUserIds: [] };
  }

  const settings = sanitizeSettings(tenant.notificationSettings);

  // 1. Vérification si la notification est activée
  if (isDonation && !settings.donationsEnabled) {
    return { shouldNotify: false, recipientUserIds: [] };
  }
  if (!isDonation && !settings.ticketsEnabled) {
    return { shouldNotify: false, recipientUserIds: [] };
  }
  if (isFailed && !settings.notifyOnPaymentFailed) {
    return { shouldNotify: false, recipientUserIds: [] };
  }

  // 2. Détermination des destinataires de base
  const recipientIds = new Set<string>();

  // Le propriétaire est toujours inclus dans les destinataires autorisés
  if (tenant.managerId) {
    recipientIds.add(tenant.managerId);
  }

  if (settings.recipientMode === 'OWNER_AND_MANAGERS') {
    tenant.users
      .filter((u) => u.orgRole === 'MANAGER')
      .forEach((u) => recipientIds.add(u.id));
  } else if (settings.recipientMode === 'CUSTOM') {
    const orgUserIds = new Set(tenant.users.map((u) => u.id));
    settings.customUserIds
      .filter((id) => orgUserIds.has(id))
      .forEach((id) => recipientIds.add(id));
  }

  // 3. Membres assignés à l'événement spécifique (EventStaff)
  if (settings.includeEventStaff && eventId) {
    try {
      const staffRows = await prisma.eventStaff.findMany({
        where: { eventId },
        select: { userId: true },
      });
      staffRows.forEach((s) => recipientIds.add(s.userId));
    } catch (err) {
      console.error('[tenantNotificationSettings] fetch event staff failed:', err);
    }
  }

  return {
    shouldNotify: true,
    recipientUserIds: Array.from(recipientIds),
  };
}
