import { prisma } from '../db';
import { verifyCommercialFlexPayPayout } from './commercialFlexPayPayoutService';
import { findEventPayoutTransfer, verifyEventFlexPayPayout } from './eventFlexPayPayoutService';

/**
 * Notification Payout FlexPay (callback). Son contenu sert uniquement à retrouver notre
 * versement : le statut retenu vient toujours de l'API « Check transaction », interrogée
 * avec le numéro FlexPay que nous avons enregistré à l'envoi.
 *
 * Renvoie null si aucun versement ne correspond.
 */
export async function processFlexPayPayoutNotification(opts: {
  reference?: string | null;
  orderNumber?: string | null;
}) {
  const eventTransfer = await findEventPayoutTransfer(opts);
  if (eventTransfer) {
    const result = await verifyEventFlexPayPayout(eventTransfer.id);
    return { kind: 'event_payout' as const, transferId: eventTransfer.id, status: result.status ?? 'PENDING' };
  }

  const or = [
    opts.orderNumber ? { flexPayOrderNumber: opts.orderNumber } : null,
    opts.reference ? { flexPayReference: opts.reference } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  const commercialTransfer = or.length
    ? await prisma.commercialPayoutTransfer.findFirst({ where: { OR: or } })
    : null;
  if (commercialTransfer) {
    const result = await verifyCommercialFlexPayPayout(commercialTransfer.id);
    const status = 'status' in result ? result.status : 'PENDING';
    return { kind: 'payout' as const, transferId: commercialTransfer.id, status };
  }

  return null;
}
