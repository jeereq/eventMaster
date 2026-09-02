import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { parsePhotoUrls, coverFromMedia, priceUnitLabel, serviceCategoryLabel, isServiceRentalCategory } from '../utils/publicVenue';
import { buildEventPlanProposals } from '../services/eventPlannerService';
import { parseEventPlanInput, serializeBriefPayload } from '../services/eventPlanBrief';
import { simulateEventPlanAi } from '../services/eventPlanAiService';
import {
  saveAiSimulationRun,
  listAiSimulationRuns,
  claimDeviceSimulations,
  type AiSimulationSource,
} from '../services/aiSimulationHistoryService';
import {
  initiateAiTokenPayment,
  verifyAndFinalizeAiTokenOrder,
  getDeviceAiTokensSummary,
  type AiTokenPaymentMethod,
} from '../services/aiTokenFlexPayService';
import {
  claimAiSimulationWallet,
  consumeAiSimulationCredit,
  getAiSimulationWalletAllowance,
  requireAiSimulationCredit,
} from '../services/aiSimulationWalletService';

function parseKind(value: unknown): 'venue' | 'service' | null {
  return value === 'venue' || value === 'service' ? value : null;
}

function parseSlug(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function listFavorites(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const rows = await prisma.listingFavorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const venueSlugs = rows.filter((row) => row.kind === 'venue').map((row) => row.slug);
    const serviceSlugs = rows.filter((row) => row.kind === 'service').map((row) => row.slug);

    const [venues, services] = await Promise.all([
      venueSlugs.length
        ? prisma.venueListing.findMany({
            where: { slug: { in: venueSlugs }, isPublic: true },
            include: {
              room: { select: { name: true, capacity: true } },
              tenant: { select: { name: true, vendorProfile: { select: { displayName: true } } } },
            },
          })
        : Promise.resolve([]),
      serviceSlugs.length
        ? prisma.serviceOffering.findMany({
            where: { slug: { in: serviceSlugs }, isPublic: true },
            include: {
              vendorProfile: { select: { displayName: true } },
              tenant: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const venueBySlug = new Map(venues.map((row) => [row.slug, row]));
    const serviceBySlug = new Map(services.map((row) => [row.slug, row]));

    const items = rows.flatMap((row): Array<{
      kind: 'venue' | 'service';
      slug: string;
      title: string;
      orgName: string;
      location: string;
      coverUrl: string | null;
      priceFromFc: number | null;
      priceUnitLabel: string;
      categoryLabel?: string;
      capacity?: number | null;
      category?: string;
      href: string;
      createdAt: Date;
    }> => {
      if (row.kind === 'venue') {
        const listing = venueBySlug.get(row.slug);
        if (!listing) return [];
        const photos = parsePhotoUrls(listing.photos);
        return [{
          kind: 'venue' as const,
          slug: listing.slug,
          title: listing.headline || listing.room.name,
          orgName: listing.tenant.vendorProfile?.displayName || listing.tenant.name,
          location: [listing.neighborhood, listing.commune, listing.city].filter(Boolean).join(', '),
          coverUrl: coverFromMedia(photos),
          priceFromFc: listing.priceFromFc,
          priceUnitLabel: priceUnitLabel(listing.priceUnit),
          capacity: listing.room.capacity,
          href: `/dashboard/catalogue/salles/${listing.slug}`,
          createdAt: row.createdAt,
        }];
      }
      const offering = serviceBySlug.get(row.slug);
      if (!offering) return [];
      const photos = parsePhotoUrls(offering.photos);
      return [{
        kind: 'service' as const,
        slug: offering.slug,
        title: offering.title,
        orgName: offering.vendorProfile.displayName || offering.tenant.name,
        categoryLabel: serviceCategoryLabel(offering.category),
        category: offering.category,
        location: [offering.neighborhood, offering.commune, offering.city].filter(Boolean).join(', '),
        coverUrl: coverFromMedia(photos),
        priceFromFc: offering.priceFromFc,
        priceUnitLabel: priceUnitLabel(offering.priceUnit),
        href: isServiceRentalCategory(offering.category)
          ? `/dashboard/catalogue/locations/${offering.slug}`
          : `/dashboard/catalogue/prestataires/${offering.slug}`,
        capacity: null,
        createdAt: row.createdAt,
      }];
    });

    return res.json({
      favorites: rows.map((row) => ({ kind: row.kind, slug: row.slug, createdAt: row.createdAt })),
      items,
    });
  } catch (error) {
    console.error('listFavorites:', error);
    return res.status(500).json({ error: 'Impossible de charger les favoris.' });
  }
}

export async function addFavorite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const kind = parseKind(req.body?.kind);
    const slug = parseSlug(req.body?.slug);
    if (!kind || !slug) {
      return res.status(400).json({ error: 'Salle ou prestataire invalide.' });
    }

    const exists = kind === 'venue'
      ? await prisma.venueListing.findFirst({ where: { slug, isPublic: true }, select: { slug: true } })
      : await prisma.serviceOffering.findFirst({ where: { slug, isPublic: true }, select: { slug: true } });
    if (!exists) return res.status(404).json({ error: 'Fiche introuvable ou non publiée.' });

    const favorite = await prisma.listingFavorite.upsert({
      where: { userId_kind_slug: { userId: req.user.id, kind, slug } },
      update: {},
      create: { userId: req.user.id, kind, slug },
    });
    return res.json({ ok: true, favorite: { kind: favorite.kind, slug: favorite.slug } });
  } catch (error) {
    console.error('addFavorite:', error);
    return res.status(500).json({ error: 'Impossible d’ajouter aux favoris.' });
  }
}

export async function removeFavorite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const kind = parseKind(req.params.kind);
    const slug = parseSlug(req.params.slug);
    if (!kind || !slug) {
      return res.status(400).json({ error: 'Salle ou prestataire invalide.' });
    }
    await prisma.listingFavorite.deleteMany({
      where: { userId: req.user.id, kind, slug },
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error('removeFavorite:', error);
    return res.status(500).json({ error: 'Impossible de retirer le favori.' });
  }
}

export async function planEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const favorites = await prisma.listingFavorite.findMany({
      where: { userId: req.user.id },
      select: { kind: true, slug: true },
    });
    const result = await buildEventPlanProposals({
      ...(req.body && typeof req.body === 'object' ? req.body : {}),
      favoriteSlugs: favorites,
    });
    return res.json(result);
  } catch (error: any) {
    if (error?.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error('planEvent:', error);
    return res.status(500).json({ error: 'Impossible de préparer la proposition.' });
  }
}

function briefFromBody(body: Record<string, unknown>) {
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : null;
  const prompt = typeof body.prompt === 'string' ? body.prompt : null;
  const eventType = typeof body.eventType === 'string' ? body.eventType : null;
  const city = typeof body.city === 'string' ? body.city : null;
  const commune = typeof body.commune === 'string' ? body.commune : null;
  const guestCount = Number(body.guestCount);
  const budgetMaxFc = Number(body.budgetMaxFc);
  const eventDate = typeof body.eventDate === 'string' ? body.eventDate : null;
  return {
    deviceId,
    prompt,
    eventType,
    city,
    commune,
    guestCount: Number.isFinite(guestCount) ? guestCount : null,
    budgetMaxFc: Number.isFinite(budgetMaxFc) ? budgetMaxFc : null,
    eventDate,
  };
}

async function persistSimulation(
  req: Request,
  result: Awaited<ReturnType<typeof simulateEventPlanAi>>,
  source: AiSimulationSource,
) {
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const brief = briefFromBody(body);
  try {
    const saved = await saveAiSimulationRun({
      userId: (req as AuthenticatedRequest).user?.id || null,
      source,
      result,
      ...brief,
    });
    return saved?.id || null;
  } catch (err) {
    console.error('[AiSimulation] persist:', err);
    return null;
  }
}

async function runEventPlanAi(
  req: Request,
  source: AiSimulationSource,
  rateLimitKey: string,
) {
  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
  if (!deviceId) {
    const error: Error & { status?: number } = new Error('Identifiant d’appareil manquant pour la simulation.');
    error.status = 400;
    throw error;
  }
  const userId = (req as AuthenticatedRequest).user?.id || null;
  await requireAiSimulationCredit(deviceId, userId);
  const result = await simulateEventPlanAi(rateLimitKey, body);
  const allowance = await consumeAiSimulationCredit(deviceId, userId);
  const historyId = await persistSimulation(req, result, source);
  return { ...result, historyId, remaining: allowance.totalRemaining, allowance };
}

export async function planEventAi(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const payload = await runEventPlanAi(req, 'dashboard', req.user.id);
    return res.json(payload);
  } catch (error: any) {
    if (error?.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('planEventAi:', error);
    return res.status(500).json({ error: 'Impossible de lancer la simulation IA.' });
  }
}

export async function publicPlanEventAi(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user?.id || null;
    const callerId = userId || req.ip || 'public-guest';
    const payload = await runEventPlanAi(req, userId ? 'dashboard' : 'landing', callerId);
    res.json(payload);
  } catch (error: any) {
    if (error?.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('publicPlanEventAi:', error);
    res.status(500).json({ error: 'Impossible de lancer la simulation IA.' });
  }
}

export async function listPublicAiSimulations(req: Request, res: Response): Promise<void> {
  try {
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
    const userId = (req as AuthenticatedRequest).user?.id || null;
    const items = await listAiSimulationRuns({ userId, deviceId, limit: 20 });
    res.json({ items });
  } catch (error: any) {
    console.error('listPublicAiSimulations:', error);
    res.status(500).json({ error: 'Impossible de charger l’historique des simulations.' });
  }
}

export async function claimPublicAiSimulations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }
    const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId : '';
    const result = await claimDeviceSimulations(req.user.id, deviceId);
    let allowance = null;
    if (deviceId.trim()) {
      try {
        allowance = await claimAiSimulationWallet(req.user.id, deviceId.trim());
      } catch (err) {
        console.error('[AiSimulation] claim wallet:', err);
      }
    }
    const items = await listAiSimulationRuns({ userId: req.user.id, deviceId, limit: 20 });
    res.json({ ...result, items, allowance });
  } catch (error: any) {
    console.error('claimPublicAiSimulations:', error);
    res.status(500).json({ error: 'Impossible de rattacher l’historique à votre compte.' });
  }
}

export async function checkoutAiTokens(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
    const paymentMethod = String(rawBody.paymentMethod || 'mobile').toLowerCase() === 'card' ? 'card' : 'mobile';
    const phone = typeof rawBody.phone === 'string' ? rawBody.phone.trim() : '';
    const operator = typeof rawBody.operator === 'string' ? rawBody.operator.trim() : undefined;
    const tokensCount = Number(rawBody.tokensCount) || 15;
    const amountFc = Number(rawBody.amountFc) || 2500;
    const deviceId = typeof rawBody.deviceId === 'string' ? rawBody.deviceId.trim() : null;
    const userId = (req as any).user?.id || null;

    const result = await initiateAiTokenPayment({
      userId,
      deviceId,
      paymentMethod: paymentMethod as AiTokenPaymentMethod,
      phone,
      operator,
      tokensCount,
      amountFc,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('checkoutAiTokens:', error);
    res.status(400).json({ error: error?.message || 'Impossible de traiter le paiement des jetons IA.' });
  }
}

export async function getAiTokensDeviceBalance(req: Request, res: Response): Promise<void> {
  try {
    const deviceId = String(req.params.deviceId || req.query.deviceId || '').trim();
    if (!deviceId) {
      res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
      return;
    }

    const summary = await getDeviceAiTokensSummary(deviceId);
    const userId = (req as AuthenticatedRequest).user?.id || null;
    try {
      const allowance = await getAiSimulationWalletAllowance(deviceId, userId);
      res.status(200).json({ ...summary, ...allowance });
      return;
    } catch (err) {
      console.error('[AiSimulation] wallet balance:', err);
    }
    res.status(200).json(summary);
  } catch (error: any) {
    console.error('getAiTokensDeviceBalance:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la récupération du solde de l’appareil.' });
  }
}

export async function verifyAiTokensOrder(req: Request, res: Response): Promise<void> {
  try {
    const orderId = String(req.params.orderId || req.query.orderId || '');
    if (!orderId) {
      res.status(400).json({ error: 'Identifiant de commande manquant.' });
      return;
    }

    const result = await verifyAndFinalizeAiTokenOrder(orderId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('verifyAiTokensOrder:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la vérification de la commande.' });
  }
}

type SavedPackItem = {
  kind: 'venue' | 'service';
  slug: string;
  title: string;
  orgName: string;
  location: string;
  coverUrl: string | null;
  estimatedFc: number;
  categoryLabel?: string;
  href: string;
  capacity?: number | null;
};

function parsePackItems(value: unknown): SavedPackItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    const kind = item.kind === 'venue' ? 'venue' as const : item.kind === 'service' ? 'service' as const : null;
    const slug = typeof item.slug === 'string' ? item.slug.trim().toLowerCase() : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!kind || !slug || !title) return [];
    const estimatedFc = Number(item.estimatedFc);
    return [{
      kind,
      slug,
      title,
      orgName: typeof item.orgName === 'string' ? item.orgName : '',
      location: typeof item.location === 'string' ? item.location : '',
      coverUrl: typeof item.coverUrl === 'string' ? item.coverUrl : null,
      estimatedFc: Number.isFinite(estimatedFc) ? Math.max(0, Math.round(estimatedFc)) : 0,
      categoryLabel: typeof item.categoryLabel === 'string' ? item.categoryLabel : undefined,
      href: typeof item.href === 'string' && item.href.startsWith('/dashboard/catalogue/')
        ? item.href
        : (kind === 'venue' ? `/dashboard/catalogue/salles/${slug}` : `/dashboard/catalogue/prestataires/${slug}`),
      capacity: typeof item.capacity === 'number' ? item.capacity : null,
    }];
  }).slice(0, 20);
}

function serializeSavedPack(row: {
  id: string;
  name: string;
  eventType: string;
  budgetFc: number;
  city: string | null;
  guestCount: number | null;
  eventDate: Date | null;
  source: string;
  styleLabel: string | null;
  totalFc: number;
  leftoverFc: number;
  items: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const items = parsePackItems(row.items);
  return {
    id: row.id,
    name: row.name,
    eventType: row.eventType,
    budgetFc: row.budgetFc,
    city: row.city,
    guestCount: row.guestCount,
    eventDate: row.eventDate,
    source: row.source === 'custom' ? 'custom' : 'search',
    styleLabel: row.styleLabel,
    totalFc: row.totalFc,
    leftoverFc: row.leftoverFc,
    items,
    venue: items.find((item) => item.kind === 'venue') || null,
    services: items.filter((item) => item.kind === 'service'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listSavedPacks(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const rows = await prisma.savedEventPack.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return res.json({ packs: rows.map(serializeSavedPack) });
  } catch (error) {
    console.error('listSavedPacks:', error);
    return res.status(500).json({ error: 'Impossible de charger les packs.' });
  }
}

export async function createSavedPack(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
    const eventType = typeof req.body?.eventType === 'string' ? req.body.eventType.trim() : '';
    const budgetFc = Number(req.body?.budgetFc);
    const items = parsePackItems(req.body?.items);
    if (!name) return res.status(400).json({ error: 'Donnez un nom à ce pack.' });
    if (!eventType) return res.status(400).json({ error: 'Indiquez le type d’événement.' });
    if (!Number.isFinite(budgetFc) || budgetFc < 0) {
      return res.status(400).json({ error: 'Budget invalide.' });
    }
    if (!items.length) return res.status(400).json({ error: 'Ajoutez au moins une salle ou un prestataire.' });

    const venues = items.filter((item) => item.kind === 'venue');
    if (venues.length > 1) {
      return res.status(400).json({ error: 'Un pack ne peut contenir qu’une seule salle.' });
    }

    const totalFc = items.reduce((sum, item) => sum + item.estimatedFc, 0);
    const leftoverFc = Math.max(0, Math.round(budgetFc) - totalFc);
    const guestCount = Number(req.body?.guestCount);
    const city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
    const eventDate = typeof req.body?.eventDate === 'string' && req.body.eventDate
      ? new Date(req.body.eventDate)
      : null;

    const pack = await prisma.savedEventPack.create({
      data: {
        userId: req.user.id,
        name,
        eventType,
        budgetFc: Math.round(budgetFc),
        city: city || null,
        guestCount: Number.isFinite(guestCount) && guestCount > 0 ? Math.floor(guestCount) : null,
        eventDate: eventDate && !Number.isNaN(eventDate.getTime()) ? eventDate : null,
        source: req.body?.source === 'custom' ? 'custom' : 'search',
        styleLabel: typeof req.body?.styleLabel === 'string' ? req.body.styleLabel.trim().slice(0, 40) : null,
        totalFc,
        leftoverFc,
        items,
      },
    });
    return res.status(201).json({ pack: serializeSavedPack(pack) });
  } catch (error) {
    console.error('createSavedPack:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer le pack.' });
  }
}

export async function deleteSavedPack(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id) return res.status(400).json({ error: 'Pack introuvable.' });
    const result = await prisma.savedEventPack.deleteMany({
      where: { id, userId: req.user.id },
    });
    if (!result.count) return res.status(404).json({ error: 'Pack introuvable.' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('deleteSavedPack:', error);
    return res.status(500).json({ error: 'Impossible de supprimer le pack.' });
  }
}

function serializeSavedBrief(row: { id: string; name: string; payload: unknown; createdAt: Date; updatedAt: Date }) {
  return {
    id: row.id,
    name: row.name,
    payload: row.payload,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listSavedBriefs(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const rows = await prisma.savedEventBrief.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    return res.json({ briefs: rows.map(serializeSavedBrief) });
  } catch (error) {
    console.error('listSavedBriefs:', error);
    return res.status(500).json({ error: 'Impossible de charger les briefs.' });
  }
}

export async function createSavedBrief(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
    if (!name) return res.status(400).json({ error: 'Donnez un nom à ce brief.' });
    const parsed = parseEventPlanInput(req.body?.payload && typeof req.body.payload === 'object'
      ? req.body.payload
      : req.body || {});
    const count = await prisma.savedEventBrief.count({ where: { userId: req.user.id } });
    if (count >= 20) {
      return res.status(400).json({ error: 'Maximum 20 briefs enregistrés. Supprimez-en un pour en ajouter.' });
    }
    const brief = await prisma.savedEventBrief.create({
      data: {
        userId: req.user.id,
        name,
        payload: serializeBriefPayload(parsed),
      },
    });
    return res.status(201).json({ brief: serializeSavedBrief(brief) });
  } catch (error: any) {
    if (error?.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error('createSavedBrief:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer le brief.' });
  }
}

export async function deleteSavedBrief(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id) return res.status(400).json({ error: 'Brief introuvable.' });
    const result = await prisma.savedEventBrief.deleteMany({
      where: { id, userId: req.user.id },
    });
    if (!result.count) return res.status(404).json({ error: 'Brief introuvable.' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('deleteSavedBrief:', error);
    return res.status(500).json({ error: 'Impossible de supprimer le brief.' });
  }
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function getListingRelation(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const kind = parseKind(req.query.kind);
    const slug = parseSlug(req.query.slug);
    if (!tenantId || !kind || !slug) {
      return res.status(400).json({ error: 'Fiche invalide.' });
    }

    const listing = kind === 'venue'
      ? await prisma.venueListing.findFirst({ where: { slug }, select: { id: true, tenantId: true } })
      : await prisma.serviceOffering.findFirst({ where: { slug }, select: { id: true, tenantId: true } });
    if (!listing) return res.status(404).json({ error: 'Fiche introuvable.' });

    const viewerRole = listing.tenantId === tenantId ? 'vendor' : 'organizer';
    const listingFilter = kind === 'venue' ? { listingId: listing.id } : { offeringId: listing.id };

    const sender = viewerRole === 'organizer'
      ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      : null;
    const senderEmail = sender?.email?.trim().toLowerCase() || '';

    const [inquiry, booking] = await Promise.all([
      prisma.marketplaceInquiry.findFirst({
        where: viewerRole === 'vendor'
          ? listingFilter
          : {
              ...listingFilter,
              OR: [
                { fromTenantId: tenantId },
                ...(senderEmail ? [{ fromEmail: senderEmail }] : []),
              ],
            },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          eventDate: true,
          createdAt: true,
        },
      }),
      prisma.marketplaceBooking.findFirst({
        where: viewerRole === 'vendor'
          ? { ...listingFilter, vendorTenantId: tenantId }
          : { ...listingFilter, organizerTenantId: tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          eventDate: true,
          eventEndDate: true,
          depositMarkedAt: true,
          createdAt: true,
        },
      }),
    ]);

    return res.json({
      kind,
      slug,
      viewerRole,
      inquiry: inquiry
        ? {
            id: inquiry.id,
            status: inquiry.status,
            eventDate: inquiry.eventDate,
            createdAt: inquiry.createdAt,
          }
        : null,
      booking: booking
        ? {
            id: booking.id,
            status: booking.status,
            eventDate: booking.eventDate,
            eventEndDate: booking.eventEndDate,
            depositMarkedAt: booking.depositMarkedAt,
            createdAt: booking.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error('getListingRelation:', error);
    return res.status(500).json({ error: 'Impossible de charger le suivi devis / réservation.' });
  }
}

export async function listMyTickets(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true },
    });
    if (!user?.email) return res.status(401).json({ error: 'Utilisateur introuvable.' });
    const email = user.email.toLowerCase();

    await prisma.ticketOrder.updateMany({
      where: {
        userId: null,
        status: 'PAID',
        buyerEmail: { equals: email, mode: 'insensitive' },
      },
      data: { userId: user.id },
    });

    const orders = await prisma.ticketOrder.findMany({
      where: {
        status: 'PAID',
        OR: [
          { userId: user.id },
          { buyerEmail: { equals: email, mode: 'insensitive' } },
        ],
      },
      include: {
        event: { select: { title: true, slug: true, date: true, location: true, isPublic: true } },
        guests: { select: { id: true, email: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { paidAt: 'desc' },
      take: 100,
    });

    return res.json({
      tickets: orders.map((order) => {
        const primary =
          order.guests.find((g) => g.email.toLowerCase() === email) || order.guests[0];
        return {
          orderId: order.id,
          quantity: order.quantity,
          amountFc: order.amountFc,
          paidAt: order.paidAt,
          buyerName: order.buyerName,
          event: order.event,
          guestId: primary?.id || null,
          rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
          guests: order.guests.map((g) => ({
            id: g.id,
            email: g.email,
            rsvpUrl: `${FRONTEND_URL}/rsvp/${g.id}`,
          })),
          selectedSeats: order.selectedSeats,
          publicHref: order.event.slug && order.event.isPublic ? `/dashboard/catalogue/evenements/${order.event.slug}` : null,
        };
      }),
    });
  } catch (error) {
    console.error('listMyTickets:', error);
    return res.status(500).json({ error: 'Impossible de charger vos billets.' });
  }
}
