import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import { maskPayoutPhone } from './eventPayoutAccount';
import { notifyPlatformStaff, notifyTenantOperators } from './platformNotificationService';

/**
 * Notifications des reversements d'événements :
 * - les responsables de l'organisation (gérant + managers) sont informés de chaque étape ;
 * - les super admins sont informés de ce qui demande une action (échec, numéro manquant, trop-versé)
 *   et du récapitulatif du reversement automatique de minuit.
 */

const ORG_HREF = (eventId: string) => `/dashboard/events/${eventId}?tab=ticketing`;
const ADMIN_HREF = '/dashboard/admin/payouts?tab=events';

function fc(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
}

type TransferLike = {
  id: string;
  eventId: string;
  tenantId: string;
  eventTitle: string;
  amountFc: number;
  phone: string;
  lastMessage?: string | null;
};

function logError(scope: string) {
  return (err: unknown) => console.error(`[EventPayoutNotify] ${scope}:`, err);
}

/** Versement FlexPay envoyé (en attente de confirmation). */
export async function notifyEventPayoutSent(transfer: TransferLike, opts: { automatic: boolean }) {
  await notifyTenantOperators(transfer.tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_SENT,
    title: `Reversement en cours — ${transfer.eventTitle}`,
    message:
      `${opts.automatic ? 'Le reversement automatique' : 'Un reversement'} de ${fc(transfer.amountFc)} ` +
      `pour « ${transfer.eventTitle} » a été envoyé vers ${maskPayoutPhone(transfer.phone)}. ` +
      'Vous serez prévenu dès que l’opérateur confirme.',
    metadata: {
      eventId: transfer.eventId,
      transferId: transfer.id,
      amountFc: transfer.amountFc,
      automatic: opts.automatic,
      href: ORG_HREF(transfer.eventId),
    },
  }).catch(logError('sent'));
}

/** Versement confirmé par FlexPay. */
export async function notifyEventPayoutPaid(
  transfer: TransferLike,
  opts: { fullyPaid: boolean; remainingFc: number },
) {
  await notifyTenantOperators(transfer.tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_PAID,
    title: `Reversement reçu — ${transfer.eventTitle}`,
    message:
      `${fc(transfer.amountFc)} ont été versés sur ${maskPayoutPhone(transfer.phone)} pour « ${transfer.eventTitle} ». ` +
      (opts.fullyPaid
        ? 'Tout le montant net collecté à ce jour vous a été reversé.'
        : `Il reste ${fc(opts.remainingFc)} à vous reverser.`),
    metadata: {
      eventId: transfer.eventId,
      transferId: transfer.id,
      amountFc: transfer.amountFc,
      remainingFc: opts.remainingFc,
      href: ORG_HREF(transfer.eventId),
    },
  }).catch(logError('paid'));
}

/** Versement refusé par FlexPay (ou abandonné). */
export async function notifyEventPayoutFailed(transfer: TransferLike, opts: { automatic: boolean }) {
  const reason = transfer.lastMessage ? ` Motif : ${transfer.lastMessage}` : '';
  await Promise.all([
    notifyTenantOperators(transfer.tenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_FAILED,
      title: `Reversement non abouti — ${transfer.eventTitle}`,
      message:
        `Le reversement de ${fc(transfer.amountFc)} vers ${maskPayoutPhone(transfer.phone)} pour « ${transfer.eventTitle} » n’a pas abouti. ` +
        'Vérifiez que le numéro Mobile Money de reversement de l’événement est correct ; l’équipe EventMaster est prévenue.',
      metadata: { eventId: transfer.eventId, transferId: transfer.id, href: ORG_HREF(transfer.eventId) },
    }),
    notifyPlatformStaff({
      type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_FAILED,
      title: `Reversement échoué — ${transfer.eventTitle}`,
      message:
        `${opts.automatic ? 'Reversement automatique' : 'Reversement'} de ${fc(transfer.amountFc)} vers ${transfer.phone} refusé.${reason} ` +
        'Le reversement automatique ne réessaiera pas cet événement : relancez-le ou marquez-le à la main.',
      metadata: { eventId: transfer.eventId, transferId: transfer.id, href: ADMIN_HREF },
    }),
  ]).catch(logError('failed'));
}

/** Numéro de reversement manquant : le reversement automatique ne peut pas partir. */
export async function notifyEventPayoutActionRequired(params: {
  eventId: string;
  eventTitle: string;
  tenantId: string;
  remainingFc: number;
}) {
  await Promise.all([
    notifyTenantOperators(params.tenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_ACTION_REQUIRED,
      title: `Numéro de reversement manquant — ${params.eventTitle}`,
      message:
        `${fc(params.remainingFc)} sont prêts à vous être reversés pour « ${params.eventTitle} », ` +
        'mais aucun numéro Mobile Money de reversement n’est renseigné. Ajoutez-le dans les réglages de l’événement (onglet Billetterie & accès).',
      metadata: { eventId: params.eventId, remainingFc: params.remainingFc, href: ORG_HREF(params.eventId) },
    }),
  ]).catch(logError('action-required'));
}

/** Changement du numéro de reversement : alerte de sécurité aux responsables de l'organisation. */
export async function notifyEventPayoutAccountChanged(params: {
  eventId: string;
  eventTitle: string;
  tenantId: string;
  previousPhone: string;
  newPhone: string;
  changedByUserId: string;
}) {
  await notifyTenantOperators(params.tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_ACCOUNT_CHANGED,
    title: `Numéro de reversement modifié — ${params.eventTitle}`,
    message:
      `Le numéro Mobile Money de reversement de « ${params.eventTitle} » est passé de ${maskPayoutPhone(params.previousPhone)} ` +
      `à ${maskPayoutPhone(params.newPhone)}. Si vous n’êtes pas à l’origine de ce changement, corrigez-le et contactez le support.`,
    metadata: {
      eventId: params.eventId,
      changedByUserId: params.changedByUserId,
      href: ORG_HREF(params.eventId),
    },
  }).catch(logError('account-changed'));
}

/** Reversement marqué à la main par un super admin (hors FlexPay). */
export async function notifyEventPayoutSettledManually(params: {
  eventId: string;
  eventTitle: string;
  tenantId: string;
  status: 'PAID' | 'PARTIAL' | 'DUE';
  settledAmountFc?: number;
  paymentMethod?: string;
}) {
  if (params.status === 'DUE') return;
  const amount = typeof params.settledAmountFc === 'number' ? ` (${fc(params.settledAmountFc)} au total)` : '';
  await notifyTenantOperators(params.tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_PAID,
    title: `Reversement enregistré — ${params.eventTitle}`,
    message:
      `EventMaster a enregistré un reversement ${params.status === 'PAID' ? 'complet' : 'partiel'}${amount} pour « ${params.eventTitle} »` +
      `${params.paymentMethod ? `, par ${params.paymentMethod}` : ''}.`,
    metadata: { eventId: params.eventId, href: ORG_HREF(params.eventId) },
  }).catch(logError('manual'));
}

/**
 * Trop-versé : après un reversement, des paiements ont été annulés/remboursés et le net
 * de l'événement est passé sous ce qui a déjà été reversé.
 */
export async function notifyEventPayoutOverpaid(params: {
  eventId: string;
  eventTitle: string;
  tenantId: string;
  overpaidFc: number;
}) {
  await Promise.all([
    notifyTenantOperators(params.tenantId, {
      type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_OVERPAID,
      title: `Trop-versé à régulariser — ${params.eventTitle}`,
      message:
        `Des paiements de « ${params.eventTitle} » ont été annulés ou remboursés après le reversement : ` +
        `${fc(params.overpaidFc)} vous ont été versés en trop. Ce montant sera déduit des prochains encaissements de l’événement ; ` +
        'les remboursements aux participants restent à votre charge, conformément à la politique de remboursement.',
      metadata: { eventId: params.eventId, overpaidFc: params.overpaidFc, href: ORG_HREF(params.eventId) },
    }),
    notifyPlatformStaff({
      type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_OVERPAID,
      title: `Trop-versé — ${params.eventTitle}`,
      message: `${fc(params.overpaidFc)} versés en trop à l’organisation (paiements annulés après reversement). À régulariser.`,
      metadata: { eventId: params.eventId, overpaidFc: params.overpaidFc, href: ADMIN_HREF },
    }),
  ]).catch(logError('overpaid'));
}

/** Récapitulatif du passage automatique de minuit (super admins uniquement). */
export async function notifyAutoPayoutRunSummary(summary: {
  runDate: string;
  sentCount: number;
  sentAmountFc: number;
  failedCount: number;
  missingPhoneCount: number;
  uncertainCount: number;
}) {
  const total =
    summary.sentCount + summary.failedCount + summary.missingPhoneCount + summary.uncertainCount;
  if (total === 0) return;
  const parts = [
    `${summary.sentCount} reversement(s) envoyé(s) pour ${fc(summary.sentAmountFc)}`,
    summary.failedCount ? `${summary.failedCount} refusé(s)` : null,
    summary.uncertainCount ? `${summary.uncertainCount} à vérifier (réponse FlexPay incertaine)` : null,
    summary.missingPhoneCount ? `${summary.missingPhoneCount} bloqué(s) faute de numéro de reversement` : null,
  ].filter(Boolean);
  await notifyPlatformStaff({
    type: PLATFORM_NOTIFICATION_TYPE.EVENT_AUTO_PAYOUT_SUMMARY,
    title: `Reversements automatiques du ${summary.runDate}`,
    message: `${parts.join(' · ')}.`,
    metadata: { ...summary, href: ADMIN_HREF },
  }).catch(logError('summary'));
}
