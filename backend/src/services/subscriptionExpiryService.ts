import { prisma } from '../db';
import { createAndSendInvoice, getTenantOwner, sendLicenseExpiryWarning } from './invoiceService';
import { notifyCommercialsOnSubscriptionApproval, recordCommercialCommission } from './commercialService';
import { resolveRenewalTerms } from './tenantBillingService';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(expiry: Date, now: Date): number {
  const start = startOfDay(now);
  const end = startOfDay(expiry);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function isSameExpiryDate(a: Date | null | undefined, b: Date): boolean {
  if (!a) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export async function processSubscriptionExpiryTasks() {
  console.log('[Subscription Expiry] Vérification des expirations et renouvellements...');

  try {
    const now = new Date();
    const tenants = await prisma.tenant.findMany({
      where: {
        licenseActive: true,
        plan: { not: 'FREE' },
        licenseExpiresAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        plan: true,
        billingCycle: true,
        licenseExpiresAt: true,
        licenseExpiryWarningFor: true,
      },
    });

    for (const tenant of tenants) {
      const expiresAt = tenant.licenseExpiresAt!;
      const remaining = daysUntil(expiresAt, now);
      const renewal = resolveRenewalTerms(tenant.plan, tenant.billingCycle);

      // J-7 : avertir le propriétaire une seule fois par date d'expiration
      if (remaining === 7 && !isSameExpiryDate(tenant.licenseExpiryWarningFor, expiresAt)) {
        const owner = await getTenantOwner(tenant.id);
        if (owner) {
          await sendLicenseExpiryWarning({
            tenantId: tenant.id,
            tenantName: tenant.name,
            plan: tenant.plan,
            expiresAt,
            ownerEmail: owner.email,
            ownerName: owner.name,
            ownerPhone: owner.phone,
            durationDays: renewal.durationDays,
          });
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { licenseExpiryWarningFor: expiresAt },
          });
          console.log(`[Subscription Expiry] Rappel J-7 envoyé pour ${tenant.name}`);
        }
      }

      // Jour J : facture de renouvellement (même cycle que la période en cours)
      if (remaining === 0) {
        const existing = await prisma.platformInvoice.findFirst({
          where: {
            tenantId: tenant.id,
            type: 'RENEWAL',
            periodEnd: expiresAt,
          },
        });

        if (!existing) {
          const periodStart = new Date(expiresAt);
          periodStart.setDate(periodStart.getDate() - renewal.durationDays);

          const invoice = await createAndSendInvoice({
            tenantId: tenant.id,
            plan: tenant.plan,
            type: 'RENEWAL',
            periodStart,
            periodEnd: expiresAt,
            durationDays: renewal.durationDays,
            amount: renewal.finalAmount,
            baseAmount: renewal.baseAmount,
            discountPercent: renewal.discountPercent,
            discountAmount: renewal.discountAmount,
            includeManagers: true,
          });

          if (invoice) {
            const commissionRecords = await recordCommercialCommission({
              tenantId: tenant.id,
              plan: tenant.plan,
              source: 'LICENSE_RENEWAL',
              invoiceAmount: invoice.amount,
              platformInvoiceId: invoice.id,
            });
            const commissionsByUserId = Object.fromEntries(
              commissionRecords.map((r) => [r.commercialId, r.commissionAmount]),
            );
            await notifyCommercialsOnSubscriptionApproval({
              tenantId: tenant.id,
              tenantName: tenant.name,
              plan: tenant.plan,
              durationDays: renewal.durationDays,
              baseAmount: renewal.baseAmount,
              finalAmount: renewal.finalAmount,
              discountPercent: renewal.discountPercent,
              discountAmount: renewal.discountAmount,
              invoiceNumber: invoice.invoiceNumber,
              event: 'LICENSE_RENEWAL',
              commissionsByUserId,
            });
            console.log(`[Subscription Expiry] Facture renouvellement ${invoice.invoiceNumber} pour ${tenant.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Subscription Expiry] Erreur:', error);
  }
}

export function startSubscriptionExpiryWorker() {
  console.log('[Subscription Expiry] Initialisation du worker...');

  setTimeout(() => {
    processSubscriptionExpiryTasks();
  }, 15000);

  // Toutes les 6 heures
  setInterval(() => {
    processSubscriptionExpiryTasks();
  }, 6 * 60 * 60 * 1000);
}
