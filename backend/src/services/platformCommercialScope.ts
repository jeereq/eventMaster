import { prisma } from '../db';

export function isPlatformCommercial(role?: string): boolean {
  return role === 'COMMERCIAL';
}

export function commercialReferredTenantFilter(commercialUserId: string) {
  return { referredByCommercialId: commercialUserId };
}

export async function assertCommercialOwnsTenant(
  commercialUserId: string,
  tenantId: string,
): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { referredByCommercialId: true },
  });
  return tenant?.referredByCommercialId === commercialUserId;
}

export async function assertCommercialOwnsInvoice(
  commercialUserId: string,
  invoiceId: string,
): Promise<boolean> {
  const invoice = await prisma.platformInvoice.findUnique({
    where: { id: invoiceId },
    select: { tenant: { select: { referredByCommercialId: true } } },
  });
  return invoice?.tenant?.referredByCommercialId === commercialUserId;
}
