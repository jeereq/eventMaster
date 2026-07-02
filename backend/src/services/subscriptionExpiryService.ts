import { prisma } from '../db';
import { createAndSendInvoice, getTenantOwnerEmail, sendLicenseExpiryWarning } from './invoiceService';
import { recordCommercialCommission } from './commercialService';

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
        licenseExpiresAt: true,
        licenseExpiryWarningFor: true,
      },
    });

    for (const tenant of tenants) {
      const expiresAt = tenant.licenseExpiresAt!;
      const remaining = daysUntil(expiresAt, now);

      // J-7 : avertir le propriétaire une seule fois par date d'expiration
      if (remaining === 7 && !isSameExpiryDate(tenant.licenseExpiryWarningFor, expiresAt)) {
        const owner = await getTenantOwnerEmail(tenant.id);
        if (owner) {
          await sendLicenseExpiryWarning({
            tenantId: tenant.id,
            tenantName: tenant.name,
            plan: tenant.plan,
            expiresAt,
            ownerEmail: owner.email,
            ownerName: owner.name,
          });
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { licenseExpiryWarningFor: expiresAt },
          });
          console.log(`[Subscription Expiry] Rappel J-7 envoyé pour ${tenant.name}`);
        }
      }

      // Jour J : facture de renouvellement
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
          periodStart.setDate(periodStart.getDate() - 30);

          const invoice = await createAndSendInvoice({
            tenantId: tenant.id,
            plan: tenant.plan,
            type: 'RENEWAL',
            periodStart,
            periodEnd: expiresAt,
            durationDays: 30,
            includeManagers: true,
          });

          if (invoice) {
            await recordCommercialCommission({
              tenantId: tenant.id,
              plan: tenant.plan,
              source: 'LICENSE_RENEWAL',
              invoiceAmount: invoice.amount,
              platformInvoiceId: invoice.id,
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
