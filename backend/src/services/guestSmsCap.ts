import { prisma } from '../db';
import { sendRealSms, type SmsSendResult } from './notificationService';
import { GUEST_SMS_CAP_ERROR, MAX_SMS_PER_GUEST, smsResultConsumesCredit } from './guestSmsCapPolicy';

export { GUEST_SMS_CAP_ERROR, MAX_SMS_PER_GUEST };

/**
 * Envoie un SMS à un invité si son plafond n'est pas atteint.
 * Le crédit est réservé de façon atomique avant l'envoi (pas de dépassement en cas d'envois parallèles).
 */
export async function sendGuestSms(guestId: string, phone: string, text: string): Promise<SmsSendResult> {
  const reserved = await prisma.guest.updateMany({
    where: { id: guestId, smsSentCount: { lt: MAX_SMS_PER_GUEST } },
    data: { smsSentCount: { increment: 1 } },
  });
  if (reserved.count === 0) {
    return { success: false, simulated: false, provider: 'cap', error: GUEST_SMS_CAP_ERROR };
  }

  let result: SmsSendResult;
  try {
    result = await sendRealSms(phone, text);
  } catch (error) {
    await refund(guestId);
    throw error;
  }
  if (!smsResultConsumesCredit(result)) await refund(guestId);
  return result;
}

async function refund(guestId: string): Promise<void> {
  await prisma.guest
    .updateMany({ where: { id: guestId, smsSentCount: { gt: 0 } }, data: { smsSentCount: { decrement: 1 } } })
    .catch((error) => console.warn('[guestSmsCap] remboursement du crédit SMS impossible:', (error as Error)?.message));
}
