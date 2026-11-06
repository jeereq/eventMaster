import { prisma } from '../db';

/** Minuit (heure de Kinshasa, UTC+1) du jour en cours, en UTC. */
export function startOfKinshasaDay(now = new Date()): Date {
  const shifted = new Date(now.getTime() + 60 * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 60 * 60 * 1000);
}

/**
 * Passe en « Terminée » les réservations confirmées dont la dernière date est passée.
 * Sans `vendorTenantId`, traite toute la plateforme (worker) ; sinon, un seul prestataire.
 */
export async function completePastMarketplaceBookings(opts: { tenantId?: string; now?: Date } = {}): Promise<number> {
  const cutoff = startOfKinshasaDay(opts.now);
  const scope = opts.tenantId
    ? { OR: [{ vendorTenantId: opts.tenantId }, { organizerTenantId: opts.tenantId }] }
    : {};
  const result = await prisma.marketplaceBooking.updateMany({
    where: {
      ...scope,
      status: 'CONFIRMED',
      AND: [
        {
          OR: [
            { eventEndDate: { lt: cutoff } },
            { eventEndDate: null, eventDate: { lt: cutoff } },
          ],
        },
      ],
    },
    data: { status: 'COMPLETED' },
  });
  return result.count;
}

export function startMarketplaceBookingCompletionWorker() {
  const run = () => {
    completePastMarketplaceBookings()
      .then((count) => {
        if (count > 0) console.log(`[Marketplace] ${count} réservation(s) passée(s) en « Terminée ».`);
      })
      .catch((error) => console.error('[Marketplace] Clôture des réservations passées :', error));
  };
  setTimeout(run, 20_000);
  setInterval(run, 6 * 60 * 60 * 1000);
}
