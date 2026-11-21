import { prisma } from '../db';
import { sendRealSms, type SmsSendResult } from './notificationService';
import {
  GUEST_SMS_CAP_ERROR,
  GUEST_SMS_FREE_PLAN_ERROR,
  MAX_SMS_PER_GUEST,
  normalizeSmsPhoneKey,
  planAllowsGuestSms,
  smsResultConsumesCredit,
} from './guestSmsCapPolicy';

export { GUEST_SMS_CAP_ERROR, GUEST_SMS_FREE_PLAN_ERROR, MAX_SMS_PER_GUEST };

/**
 * Envoie un SMS à un invité si son organisation y a droit (pas sur l'essai gratuit) et si le plafond
 * de 3 SMS par numéro et par événement n'est pas atteint. Le compteur est lié au numéro, pas à la
 * fiche invité : supprimer puis recréer l'invité ne le remet pas à zéro. Le crédit est réservé de
 * façon atomique avant l'envoi et rendu si l'envoi échoue, est simulé ou dédupliqué.
 */
export async function sendGuestSms(
  guest: { id: string; eventId: string },
  phone: string,
  text: string,
): Promise<SmsSendResult> {
  const event = await prisma.event.findUnique({
    where: { id: guest.eventId },
    select: { tenant: { select: { plan: true } } },
  });
  if (!planAllowsGuestSms(event?.tenant?.plan)) {
    return { success: false, simulated: false, provider: 'plan', error: GUEST_SMS_FREE_PLAN_ERROR };
  }

  const key = { eventId: guest.eventId, phone: normalizeSmsPhoneKey(phone) };
  await prisma.guestSmsUsage.upsert({
    where: { eventId_phone: key },
    create: { ...key, count: 0 },
    update: {},
  });
  const reserved = await prisma.guestSmsUsage.updateMany({
    where: { ...key, count: { lt: MAX_SMS_PER_GUEST } },
    data: { count: { increment: 1 } },
  });
  if (reserved.count === 0) {
    return { success: false, simulated: false, provider: 'cap', error: GUEST_SMS_CAP_ERROR };
  }

  let result: SmsSendResult;
  try {
    result = await sendRealSms(phone, text);
  } catch (error) {
    await refund(key);
    throw error;
  }
  if (!smsResultConsumesCredit(result)) await refund(key);
  return result;
}

async function refund(key: { eventId: string; phone: string }): Promise<void> {
  await prisma.guestSmsUsage
    .updateMany({ where: { ...key, count: { gt: 0 } }, data: { count: { decrement: 1 } } })
    .catch((error) => console.warn('[guestSmsCap] remboursement du crédit SMS impossible:', (error as Error)?.message));
}
