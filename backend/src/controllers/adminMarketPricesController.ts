import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { auditReq } from '../services/adminAuditService';
import { invalidateMarketPriceCache, observedMarketPriceSummary } from '../services/marketPriceEstimates';
import { MARKET_SLOTS, marketSlotLabel, parseMarketSlots, parseResearchChannel, researchChannelLabel, researchMarketPrices } from '../services/marketPriceResearchService';
import { normalizeAllowedCity } from '../utils/rdcCities';

function sendError(res: Response, error: unknown, fallback: string) {
  const status = (error as { status?: number })?.status || 500;
  const message = status >= 500 && status !== 502 && status !== 503 ? fallback : (error as Error)?.message || fallback;
  if (status >= 500) console.error('[adminMarketPrices]', error);
  res.status(status).json({ error: message });
}

function parseCity(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'ALL') return '';
  const city = normalizeAllowedCity(raw);
  return city || null;
}

function parseAmount(value: unknown): number | null {
  const amount = Math.round(Number(value));
  return Number.isFinite(amount) && amount > 0 && amount <= 5_000_000_000 ? amount : null;
}

/** GET /admin/market-prices?city=Kinshasa : propositions, références validées et prix réels de la plateforme. */
export async function listMarketPrices(req: AuthenticatedRequest, res: Response) {
  try {
    const city = parseCity(req.query.city);
    if (city === null) return res.status(400).json({ error: 'Ville inconnue.' });
    const [rows, observed] = await Promise.all([
      prisma.marketPriceReference.findMany({
        where: { status: { in: ['PROPOSED', 'APPROVED'] }, ...(city ? { city: { in: [city, ''] } } : {}) },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 300,
      }),
      observedMarketPriceSummary(city, MARKET_SLOTS),
    ]);
    res.json({
      city,
      slots: MARKET_SLOTS.map((slot) => ({ slot, label: marketSlotLabel(slot) })),
      proposals: rows.filter((row) => row.status === 'PROPOSED'),
      approved: rows.filter((row) => row.status === 'APPROVED'),
      observed: observed.filter((row) => row.rawCount > 0),
    });
  } catch (error) {
    sendError(res, error, 'Impossible de charger les prix du marché.');
  }
}

/** POST /admin/market-prices/research { city, slots, guestHint } : recherche web par l’IA. */
export async function researchMarketPricesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const city = parseCity(req.body?.city);
    if (city === null) return res.status(400).json({ error: 'Ville inconnue.' });
    const slots = parseMarketSlots(req.body?.slots);
    const channel = parseResearchChannel(req.body?.channel);
    const result = await researchMarketPrices({
      channel,
      city,
      slots,
      guestHint: Number(req.body?.guestHint) || undefined,
      actorId: req.user!.id,
    });
    await auditReq(req, {
      action: 'MARKET_PRICES_RESEARCH',
      targetType: 'market_price',
      summary: `Recherche ${researchChannelLabel(channel)} de prix (${city || 'toutes villes'}) : ${result.proposals.length} prix publié(s)`,
      metadata: { city, slots, channel, notFound: result.notFound, model: result.model },
    });
    res.json(result);
  } catch (error) {
    sendError(res, error, 'La recherche de prix a échoué.');
  }
}

/** PATCH /admin/market-prices/:id : corriger un prix (proposé ou publié). Un prix publié corrigé devient « validé par EventMaster ». */
export async function updateMarketPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const row = await prisma.marketPriceReference.findUnique({ where: { id: String(req.params.id) } });
    if (!row || (row.status !== 'PROPOSED' && row.status !== 'APPROVED')) return res.status(404).json({ error: 'Prix introuvable.' });
    const low = parseAmount(req.body?.lowFc) ?? row.lowFc;
    const typical = parseAmount(req.body?.typicalFc) ?? row.typicalFc;
    const high = parseAmount(req.body?.highFc) ?? row.highFc;
    const [lowFc, typicalFc, highFc] = [low, typical, high].sort((a, b) => a - b);
    const unit = req.body?.unit === 'PERSON' || req.body?.unit === 'EVENT' ? req.body.unit : row.unit;
    const updated = await prisma.marketPriceReference.update({
      where: { id: row.id },
      data: {
        lowFc,
        typicalFc,
        highFc,
        unit,
        ...(row.status === 'APPROVED' ? { reviewedAt: new Date(), reviewedById: req.user!.id } : {}),
      },
    });
    if (row.status === 'APPROVED') invalidateMarketPriceCache();
    res.json({ reference: updated });
  } catch (error) {
    sendError(res, error, 'Impossible de modifier la proposition.');
  }
}

/** POST /admin/market-prices/:id/approve : marque un prix comme relu par EventMaster ; il remplace l’ancien pour la même ligne, la même ville et le même canal. */
export async function approveMarketPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const row = await prisma.marketPriceReference.findUnique({ where: { id: String(req.params.id) } });
    if (!row || (row.status !== 'PROPOSED' && row.status !== 'APPROVED')) return res.status(404).json({ error: 'Prix introuvable.' });
    const now = new Date();
    const [, approved] = await prisma.$transaction([
      prisma.marketPriceReference.updateMany({
        where: { slot: row.slot, city: row.city, source: row.source, status: 'APPROVED', id: { not: row.id } },
        data: { status: 'REPLACED' },
      }),
      prisma.marketPriceReference.update({
        where: { id: row.id },
        data: { status: 'APPROVED', reviewedAt: now, reviewedById: req.user!.id },
      }),
    ]);
    invalidateMarketPriceCache();
    await auditReq(req, {
      action: 'MARKET_PRICE_APPROVE',
      targetType: 'market_price',
      targetId: row.id,
      summary: `Prix du marché validé : ${marketSlotLabel(row.slot)} (${row.city || 'toutes villes'}), ${row.typicalFc.toLocaleString('fr-FR')} FC`,
      metadata: { slot: row.slot, city: row.city, unit: row.unit, lowFc: row.lowFc, typicalFc: row.typicalFc, highFc: row.highFc },
    });
    res.json({ reference: approved });
  } catch (error) {
    sendError(res, error, 'Impossible de valider la proposition.');
  }
}

/** POST /admin/market-prices/:id/reject : écarter une proposition, ou retirer une référence validée. */
export async function rejectMarketPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const row = await prisma.marketPriceReference.findUnique({ where: { id: String(req.params.id) } });
    if (!row || (row.status !== 'PROPOSED' && row.status !== 'APPROVED')) {
      return res.status(404).json({ error: 'Prix introuvable.' });
    }
    const updated = await prisma.marketPriceReference.update({
      where: { id: row.id },
      data: { status: 'REJECTED', reviewedAt: new Date(), reviewedById: req.user!.id },
    });
    if (row.status === 'APPROVED') invalidateMarketPriceCache();
    await auditReq(req, {
      action: row.status === 'APPROVED' ? 'MARKET_PRICE_WITHDRAW' : 'MARKET_PRICE_REJECT',
      targetType: 'market_price',
      targetId: row.id,
      summary: `${row.status === 'APPROVED' ? 'Référence retirée' : 'Proposition écartée'} : ${marketSlotLabel(row.slot)} (${row.city || 'toutes villes'})`,
    });
    res.json({ reference: updated });
  } catch (error) {
    sendError(res, error, 'Impossible d’écarter ce prix.');
  }
}
