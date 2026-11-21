import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { countTenantGuestsForQuota } from './tenantPeriodService';
import { pendingHoldCutoff, ticketQuotaAllows, ticketsRemainingWithHolds } from './ticketQuotaHoldPolicy';

export class TicketHoldError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const NOT_DONATION: Prisma.TicketOrderWhereInput = {
  OR: [{ pricingZoneId: null }, { pricingZoneId: { not: 'donation' } }],
};

/**
 * Crée la commande de billets sous un verrou par organisation : le quota d'invités et le stock
 * de billets sont vérifiés en comptant les commandes encore en attente de paiement, puis la
 * commande est créée dans la même transaction. Deux achats simultanés ne peuvent donc plus
 * dépasser le quota, et une commande payée a toujours sa place.
 */
export async function createTicketOrderWithHold(input: {
  tenantId: string;
  event: { id: string; ticketsTotal: number | null; ticketsSold: number };
  quantity: number;
  maxGuests: number;
  data: Prisma.TicketOrderUncheckedCreateInput;
}) {
  const cutoff = pendingHoldCutoff();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ticket-hold:${input.tenantId}`}))`;

    const [held, heldForEvent, freshEvent] = await Promise.all([
      tx.ticketOrder.aggregate({
        _sum: { quantity: true },
        where: { status: 'PENDING', createdAt: { gte: cutoff }, event: { tenantId: input.tenantId }, ...NOT_DONATION },
      }),
      tx.ticketOrder.aggregate({
        _sum: { quantity: true },
        where: { status: 'PENDING', createdAt: { gte: cutoff }, eventId: input.event.id, ...NOT_DONATION },
      }),
      tx.event.findUnique({ where: { id: input.event.id }, select: { ticketsTotal: true, ticketsSold: true } }),
    ]);

    const remaining = ticketsRemainingWithHolds(freshEvent ?? input.event, heldForEvent._sum.quantity ?? 0);
    if (remaining != null && remaining < input.quantity) {
      throw new TicketHoldError(
        remaining === 0
          ? 'Complet (des places sont en cours de paiement, réessayez dans quelques minutes).'
          : `Il ne reste que ${remaining} place${remaining > 1 ? 's' : ''}.`,
        400,
      );
    }

    const { periodGuests } = await countTenantGuestsForQuota(input.tenantId);
    if (
      !ticketQuotaAllows({
        periodGuests,
        heldByPendingOrders: held._sum.quantity ?? 0,
        quantity: input.quantity,
        maxGuests: input.maxGuests,
      })
    ) {
      throw new TicketHoldError(
        'Plus de places du côté de l’organisateur (quota d’invités atteint pour la période en cours).',
        403,
      );
    }

    return tx.ticketOrder.create({ data: input.data });
  });
}
