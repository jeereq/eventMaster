import { TenantAccountKind } from '@prisma/client';
import { prisma } from '../db';
import { parseBranding } from './brandingUtils';

export function parseAccountKind(raw: unknown, fallback: TenantAccountKind = 'ORGANIZER'): TenantAccountKind {
  if (raw === 'VENDOR' || raw === 'BOTH' || raw === 'ORGANIZER' || raw === 'CLIENT') {
    return raw;
  }
  return fallback;
}

export function formatTenantResponse(tenant: {
  id: string;
  name: string;
  plan: string;
  licenseActive: boolean;
  licenseExpiresAt: Date | null;
  managerId: string | null;
  branding?: unknown;
  accountKind?: string | null;
}) {
  const branding = parseBranding(tenant.branding);
  return {
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    licenseActive: tenant.licenseActive,
    licenseExpiresAt: tenant.licenseExpiresAt,
    managerId: tenant.managerId,
    branding: branding || undefined,
    accountKind: tenant.accountKind || 'ORGANIZER',
  };
}

export async function getTenantForUser(tenantId: string | null | undefined) {
  if (!tenantId) return null;
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

export async function isTenantManager(userId: string, tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, managerId: userId },
  });
  return Boolean(tenant);
}

export async function verifyTenantMember(userId: string, tenantId: string | null | undefined): Promise<boolean> {
  if (!tenantId) return false;
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, role: 'USER' },
  });
  return Boolean(user);
}

export async function verifyEventBelongsToTenant(eventId: string, tenantId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, tenantId },
  });
}
