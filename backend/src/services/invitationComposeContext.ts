import { prisma } from '../db';
import { listAiTemplateComposeRuns } from './aiTemplateComposeHistoryService';
import {
  ACCOUNT_KIND_LABEL,
  clipContextText,
  emptyComposeContext,
  isPersistedUserId,
  uniquePriorPrompts,
  type InvitationComposeContext,
} from './invitationComposeContextUtils.ts';

export {
  formatContextForImage,
  formatContextForVision,
  hasUsableComposeContext,
  isPersistedUserId,
  type InvitationComposeContext,
} from './invitationComposeContextUtils.ts';

export async function loadInvitationComposeContext(input: {
  userId?: string | null;
  tenantId?: string | null;
  deviceId?: string | null;
  currentPrompt?: string;
}): Promise<InvitationComposeContext> {
  const userId = isPersistedUserId(input.userId) ? input.userId!.trim() : null;
  const tenantId = input.tenantId?.trim() || null;
  const deviceId = input.deviceId?.trim() || null;
  const currentPrompt = input.currentPrompt || '';

  if (!userId && !tenantId && !deviceId) return emptyComposeContext();

  try {
    const [userRow, events, history] = await Promise.all([
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
            select: {
              name: true,
              tenant: {
                select: {
                  name: true,
                  accountKind: true,
                  vendorProfile: { select: { displayName: true, city: true } },
                },
              },
            },
          })
        : tenantId
          ? prisma.tenant.findUnique({
              where: { id: tenantId },
              select: {
                name: true,
                accountKind: true,
                vendorProfile: { select: { displayName: true, city: true } },
              },
            }).then((tenant) => (tenant ? { name: null, tenant } : null))
          : Promise.resolve(null),
      tenantId
        ? prisma.event.findMany({
            where: { tenantId },
            orderBy: { date: 'desc' },
            take: 4,
            select: {
              title: true,
              eventKind: true,
              location: true,
              date: true,
              clientName: true,
            },
          })
        : Promise.resolve([]),
      listAiTemplateComposeRuns({ userId, deviceId, limit: 8 }),
    ]);

    const tenant = userRow && 'tenant' in userRow ? userRow.tenant : null;
    const vendor = tenant?.vendorProfile;

    return {
      organizerName: userRow && 'name' in userRow ? userRow.name?.trim() || null : null,
      organizationName: vendor?.displayName?.trim() || tenant?.name?.trim() || null,
      accountKind: tenant?.accountKind || null,
      accountKindLabel: tenant?.accountKind
        ? ACCOUNT_KIND_LABEL[tenant.accountKind] || tenant.accountKind
        : null,
      vendorCity: vendor?.city?.trim() || null,
      recentEvents: events.map((event) => ({
        title: clipContextText(event.title, 80),
        kind: event.eventKind || '',
        location: clipContextText(event.location || '', 60),
        date: event.date.toISOString().slice(0, 10),
        clientName: event.clientName ? clipContextText(event.clientName, 60) : null,
      })),
      recentPrompts: uniquePriorPrompts(
        history.map((run) => run.prompt || ''),
        currentPrompt,
      ),
    };
  } catch (error) {
    console.warn(
      '[invitationComposeContext] load failed:',
      (error as Error)?.message,
    );
    return emptyComposeContext();
  }
}
