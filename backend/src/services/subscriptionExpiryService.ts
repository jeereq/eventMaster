import { prisma } from '../db';
import { getTenantOwner, sendLicenseExpiryWarning } from './invoiceService';
import { resolveRenewalTerms } from './tenantBillingService';
import { notifyTenantOperators, notifyPlatformStaff } from './platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import { sendRealEmail } from './notificationService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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
        plan: { not: 'FREE' },
        licenseExpiresAt: { not: null },
        OR: [{ licenseActive: true }, { licenseActive: false }],
      },
      select: {
        id: true,
        name: true,
        plan: true,
        billingCycle: true,
        licenseActive: true,
        licenseExpiresAt: true,
        licenseExpiryWarningFor: true,
      },
    });

    for (const tenant of tenants) {
      const expiresAt = tenant.licenseExpiresAt!;
      const remaining = daysUntil(expiresAt, now);
      const renewal = resolveRenewalTerms(tenant.plan, tenant.billingCycle);

      // J-7 : avertir une seule fois par date d'expiration
      if (
        remaining === 7 &&
        tenant.licenseActive &&
        !isSameExpiryDate(tenant.licenseExpiryWarningFor, expiresAt)
      ) {
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

      // Jour J ou déjà dépassé : désactiver + notifier (pas de facture PAID sans paiement)
      if (remaining <= 0 && tenant.licenseActive) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { licenseActive: false },
        });

        const renewHref = `${FRONTEND_URL}/dashboard/billing`;
        const expiryLabel = expiresAt.toLocaleDateString('fr-FR');
        const amountHint = renewal.finalAmount.toLocaleString('fr-FR');

        void notifyTenantOperators(tenant.id, {
          type: PLATFORM_NOTIFICATION_TYPE.LICENSE_EXPIRING,
          title: `Licence expirée — ${tenant.name}`,
          message: `Votre forfait ${tenant.plan} a expiré le ${expiryLabel}. Renouvelez depuis Facturation (≈ ${amountHint} FC).`,
          metadata: {
            tenantId: tenant.id,
            plan: tenant.plan,
            href: renewHref,
          },
          channels: ['IN_APP', 'PUSH', 'WHATSAPP'],
        });

        void notifyPlatformStaff({
          type: PLATFORM_NOTIFICATION_TYPE.LICENSE_EXPIRING,
          title: `Licence expirée — ${tenant.name}`,
          message: `Forfait ${tenant.plan} expiré le ${expiryLabel}. En attente de renouvellement.`,
          metadata: { tenantId: tenant.id, plan: tenant.plan, href: renewHref },
          includeCommercials: true,
        });

        const owner = await getTenantOwner(tenant.id);
        if (owner?.email) {
          void sendRealEmail(
            owner.email,
            'EventMaster — Votre abonnement a expiré',
            [
              `L'abonnement de « ${tenant.name} » (${tenant.plan}) a expiré le ${expiryLabel}.`,
              `Montant estimé du renouvellement : ${amountHint} FC.`,
              '',
              `Renouvelez ici : ${renewHref}`,
            ].join('\n'),
            `<p>L'abonnement de <strong>${tenant.name}</strong> (<strong>${tenant.plan}</strong>) a expiré le <strong>${expiryLabel}</strong>.</p>
<p>Montant estimé : <strong>${amountHint} FC</strong>.</p>
<p><a href="${renewHref}">Renouveler mon forfait</a></p>`,
          ).catch((err) => console.warn('[Subscription Expiry] email:', err));
        }

        console.log(`[Subscription Expiry] Licence désactivée pour ${tenant.name} (expirée ${expiryLabel})`);
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

  setInterval(() => {
    processSubscriptionExpiryTasks();
  }, 6 * 60 * 60 * 1000);
}
