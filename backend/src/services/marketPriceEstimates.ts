import { prisma } from '../db';
import {
  type PriceSource,
  resolveMarketPrice,
  summarizeObservations,
  type MarketObservation,
  type MarketPriceStat,
  type MarketReferenceRow,
} from './marketPriceStats.ts';

/** Prix réels pris en compte : réservations des 18 derniers mois, devis envoyés compris. */
const OBSERVATION_WINDOW_DAYS = 548;
const OBSERVATION_LIMIT = 3000;
const CACHE_TTL_MS = 10 * 60 * 1000;

type Snapshot = {
  loadedAt: number;
  observations: MarketObservation[];
  references: MarketReferenceRow[];
};

let cache: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

/** À appeler après une recherche ou une action admin, pour que le simulateur voie tout de suite le nouveau prix. */
export function invalidateMarketPriceCache(): void {
  cache = null;
}

async function loadObservations(): Promise<MarketObservation[]> {
  const since = new Date(Date.now() - OBSERVATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [bookings, quotes] = await Promise.all([
    prisma.marketplaceBooking.findMany({
      where: {
        status: { in: ['ACCEPTED', 'CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: since },
        amountFc: { gt: 0 },
        beveragePriceId: null,
        beverageLines: { none: {} },
      },
      select: {
        inquiryId: true,
        amountFc: true,
        guestCount: true,
        listing: { select: { city: true } },
        offering: { select: { city: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: OBSERVATION_LIMIT,
    }),
    prisma.marketplaceInquiry.findMany({
      where: {
        status: 'QUOTED',
        createdAt: { gte: since },
        quotedAmountFc: { gt: 0 },
        beveragePriceId: null,
        beverageLines: { none: {} },
      },
      select: {
        id: true,
        quotedAmountFc: true,
        guestCount: true,
        listing: { select: { city: true } },
        offering: { select: { city: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: OBSERVATION_LIMIT,
    }),
  ]);

  const observations: MarketObservation[] = [];
  const bookedInquiries = new Set<string>();
  for (const row of bookings) {
    if (row.inquiryId) bookedInquiries.add(row.inquiryId);
    const slot = row.listing ? 'venue' : row.offering?.category;
    if (!slot) continue;
    observations.push({
      slot,
      city: row.listing?.city || row.offering?.city || null,
      amountFc: row.amountFc,
      guestCount: row.guestCount,
    });
  }
  for (const row of quotes) {
    // Un devis devenu réservation est déjà compté une fois, au montant réservé.
    if (bookedInquiries.has(row.id) || !row.quotedAmountFc) continue;
    const slot = row.listing ? 'venue' : row.offering?.category;
    if (!slot) continue;
    observations.push({
      slot,
      city: row.listing?.city || row.offering?.city || null,
      amountFc: row.quotedAmountFc,
      guestCount: row.guestCount,
    });
  }
  return observations;
}

async function loadReferences(): Promise<MarketReferenceRow[]> {
  return prisma.marketPriceReference.findMany({
    where: { status: 'APPROVED' },
    select: { slot: true, city: true, unit: true, lowFc: true, typicalFc: true, highFc: true, reviewedAt: true, sources: true, source: true, reviewedById: true, rationale: true, model: true, searchQueries: true },
    orderBy: { reviewedAt: 'desc' },
    take: 500,
  });
}

async function snapshot(): Promise<Snapshot> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache;
  if (!inflight) {
    inflight = Promise.all([loadObservations(), loadReferences()])
      .then(([observations, references]) => {
        cache = { loadedAt: Date.now(), observations, references };
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export type MarketPriceBook = {
  get: (slot: string) => MarketPriceStat | null;
};

const EMPTY_BOOK: MarketPriceBook = { get: () => null };

/**
 * Carnet des prix du marché pour une ville. En cas d’erreur de lecture, le simulateur continue
 * sans estimation plutôt que d’échouer.
 */
export async function loadMarketPriceBook(city: string, priceSource: PriceSource = 'all'): Promise<MarketPriceBook> {
  try {
    const data = await snapshot();
    const memo = new Map<string, MarketPriceStat | null>();
    return {
      get(slot: string) {
        if (!memo.has(slot)) memo.set(slot, resolveMarketPrice(slot, city, data.observations, data.references, undefined, priceSource));
        return memo.get(slot) ?? null;
      },
    };
  } catch (error) {
    console.warn('[marketPrices] lecture impossible :', (error as Error)?.message);
    return EMPTY_BOOK;
  }
}

/** Résumé des prix réels pour l’écran admin : statistiques de la ville (ou toutes villes) et nombre brut de prix. */
export async function observedMarketPriceSummary(
  city: string,
  slots: string[],
): Promise<Array<{ slot: string; rawCount: number; stat: MarketPriceStat | null }>> {
  const data = await snapshot();
  const wanted = city.trim().toLowerCase();
  return slots.map((slot) => ({
    slot,
    rawCount: data.observations.filter((row) => row.slot === slot && (!wanted || String(row.city || '').toLowerCase() === wanted)).length,
    stat: summarizeObservations(data.observations, slot, city),
  }));
}
