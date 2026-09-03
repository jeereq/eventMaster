"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFavorites = listFavorites;
exports.addFavorite = addFavorite;
exports.removeFavorite = removeFavorite;
exports.planEvent = planEvent;
exports.planEventAi = planEventAi;
exports.publicPlanEventAi = publicPlanEventAi;
exports.listPublicAiSimulations = listPublicAiSimulations;
exports.claimPublicAiSimulations = claimPublicAiSimulations;
exports.checkoutAiTokens = checkoutAiTokens;
exports.getAiTokensDeviceBalance = getAiTokensDeviceBalance;
exports.verifyAiTokensOrder = verifyAiTokensOrder;
exports.listSavedPacks = listSavedPacks;
exports.createSavedPack = createSavedPack;
exports.deleteSavedPack = deleteSavedPack;
exports.listSavedBriefs = listSavedBriefs;
exports.createSavedBrief = createSavedBrief;
exports.deleteSavedBrief = deleteSavedBrief;
exports.getListingRelation = getListingRelation;
exports.listMyTickets = listMyTickets;
const db_1 = require("../db");
const publicVenue_1 = require("../utils/publicVenue");
const eventPlannerService_1 = require("../services/eventPlannerService");
const eventPlanBrief_1 = require("../services/eventPlanBrief");
const eventPlanAiService_1 = require("../services/eventPlanAiService");
const aiSimulationHistoryService_1 = require("../services/aiSimulationHistoryService");
const aiTokenFlexPayService_1 = require("../services/aiTokenFlexPayService");
const aiSimulationWalletService_1 = require("../services/aiSimulationWalletService");
function parseKind(value) {
    return value === 'venue' || value === 'service' ? value : null;
}
function parseSlug(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
async function listFavorites(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const rows = await db_1.prisma.listingFavorite.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });
        const venueSlugs = rows.filter((row) => row.kind === 'venue').map((row) => row.slug);
        const serviceSlugs = rows.filter((row) => row.kind === 'service').map((row) => row.slug);
        const [venues, services] = await Promise.all([
            venueSlugs.length
                ? db_1.prisma.venueListing.findMany({
                    where: { slug: { in: venueSlugs }, isPublic: true },
                    include: {
                        room: { select: { name: true, capacity: true } },
                        tenant: { select: { name: true, vendorProfile: { select: { displayName: true } } } },
                    },
                })
                : Promise.resolve([]),
            serviceSlugs.length
                ? db_1.prisma.serviceOffering.findMany({
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
        const items = rows.flatMap((row) => {
            if (row.kind === 'venue') {
                const listing = venueBySlug.get(row.slug);
                if (!listing)
                    return [];
                const photos = (0, publicVenue_1.parsePhotoUrls)(listing.photos);
                return [{
                        kind: 'venue',
                        slug: listing.slug,
                        title: listing.headline || listing.room.name,
                        orgName: listing.tenant.vendorProfile?.displayName || listing.tenant.name,
                        location: [listing.neighborhood, listing.commune, listing.city].filter(Boolean).join(', '),
                        coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
                        priceFromFc: listing.priceFromFc,
                        priceUnitLabel: (0, publicVenue_1.priceUnitLabel)(listing.priceUnit),
                        capacity: listing.room.capacity,
                        href: `/dashboard/catalogue/salles/${listing.slug}`,
                        createdAt: row.createdAt,
                    }];
            }
            const offering = serviceBySlug.get(row.slug);
            if (!offering)
                return [];
            const photos = (0, publicVenue_1.parsePhotoUrls)(offering.photos);
            return [{
                    kind: 'service',
                    slug: offering.slug,
                    title: offering.title,
                    orgName: offering.vendorProfile.displayName || offering.tenant.name,
                    categoryLabel: (0, publicVenue_1.serviceCategoryLabel)(offering.category),
                    category: offering.category,
                    location: [offering.neighborhood, offering.commune, offering.city].filter(Boolean).join(', '),
                    coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
                    priceFromFc: offering.priceFromFc,
                    priceUnitLabel: (0, publicVenue_1.priceUnitLabel)(offering.priceUnit),
                    href: (0, publicVenue_1.isServiceRentalCategory)(offering.category)
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
    }
    catch (error) {
        console.error('listFavorites:', error);
        return res.status(500).json({ error: 'Impossible de charger les favoris.' });
    }
}
async function addFavorite(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const kind = parseKind(req.body?.kind);
        const slug = parseSlug(req.body?.slug);
        if (!kind || !slug) {
            return res.status(400).json({ error: 'Salle ou prestataire invalide.' });
        }
        const exists = kind === 'venue'
            ? await db_1.prisma.venueListing.findFirst({ where: { slug, isPublic: true }, select: { slug: true } })
            : await db_1.prisma.serviceOffering.findFirst({ where: { slug, isPublic: true }, select: { slug: true } });
        if (!exists)
            return res.status(404).json({ error: 'Fiche introuvable ou non publiée.' });
        const favorite = await db_1.prisma.listingFavorite.upsert({
            where: { userId_kind_slug: { userId: req.user.id, kind, slug } },
            update: {},
            create: { userId: req.user.id, kind, slug },
        });
        return res.json({ ok: true, favorite: { kind: favorite.kind, slug: favorite.slug } });
    }
    catch (error) {
        console.error('addFavorite:', error);
        return res.status(500).json({ error: 'Impossible d’ajouter aux favoris.' });
    }
}
async function removeFavorite(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const kind = parseKind(req.params.kind);
        const slug = parseSlug(req.params.slug);
        if (!kind || !slug) {
            return res.status(400).json({ error: 'Salle ou prestataire invalide.' });
        }
        await db_1.prisma.listingFavorite.deleteMany({
            where: { userId: req.user.id, kind, slug },
        });
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('removeFavorite:', error);
        return res.status(500).json({ error: 'Impossible de retirer le favori.' });
    }
}
async function planEvent(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const favorites = await db_1.prisma.listingFavorite.findMany({
            where: { userId: req.user.id },
            select: { kind: true, slug: true },
        });
        const result = await (0, eventPlannerService_1.buildEventPlanProposals)({
            ...(req.body && typeof req.body === 'object' ? req.body : {}),
            favoriteSlugs: favorites,
        });
        return res.json(result);
    }
    catch (error) {
        if (error?.status === 400) {
            return res.status(400).json({ error: error.message });
        }
        console.error('planEvent:', error);
        return res.status(500).json({ error: 'Impossible de préparer la proposition.' });
    }
}
function briefFromBody(body) {
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
async function persistSimulation(req, result, source) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const brief = briefFromBody(body);
    try {
        const saved = await (0, aiSimulationHistoryService_1.saveAiSimulationRun)({
            userId: req.user?.id || null,
            source,
            result,
            ...brief,
        });
        return saved?.id || null;
    }
    catch (err) {
        console.error('[AiSimulation] persist:', err);
        return null;
    }
}
async function runEventPlanAi(req, source, rateLimitKey) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    if (!deviceId) {
        const error = new Error('Identifiant d’appareil manquant pour la simulation.');
        error.status = 400;
        throw error;
    }
    const userId = req.user?.id || null;
    await (0, aiSimulationWalletService_1.requireAiSimulationCredit)(deviceId, userId);
    const result = await (0, eventPlanAiService_1.simulateEventPlanAi)(rateLimitKey, body);
    const allowance = await (0, aiSimulationWalletService_1.consumeAiSimulationCredit)(deviceId, userId);
    const historyId = await persistSimulation(req, result, source);
    return { ...result, historyId, remaining: allowance.totalRemaining, allowance };
}
async function planEventAi(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const payload = await runEventPlanAi(req, 'dashboard', req.user.id);
        return res.json(payload);
    }
    catch (error) {
        if (error?.status) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('planEventAi:', error);
        return res.status(500).json({ error: 'Impossible de lancer la simulation IA.' });
    }
}
async function publicPlanEventAi(req, res) {
    try {
        const userId = req.user?.id || null;
        const callerId = userId || req.ip || 'public-guest';
        const payload = await runEventPlanAi(req, userId ? 'dashboard' : 'landing', callerId);
        res.json(payload);
    }
    catch (error) {
        if (error?.status) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('publicPlanEventAi:', error);
        res.status(500).json({ error: 'Impossible de lancer la simulation IA.' });
    }
}
async function listPublicAiSimulations(req, res) {
    try {
        const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
        const userId = req.user?.id || null;
        const items = await (0, aiSimulationHistoryService_1.listAiSimulationRuns)({ userId, deviceId, limit: 20 });
        res.json({ items });
    }
    catch (error) {
        console.error('listPublicAiSimulations:', error);
        res.status(500).json({ error: 'Impossible de charger l’historique des simulations.' });
    }
}
async function claimPublicAiSimulations(req, res) {
    try {
        if (!req.user?.id) {
            res.status(401).json({ error: 'Non authentifié.' });
            return;
        }
        const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId : '';
        const result = await (0, aiSimulationHistoryService_1.claimDeviceSimulations)(req.user.id, deviceId);
        let allowance = null;
        if (deviceId.trim()) {
            try {
                allowance = await (0, aiSimulationWalletService_1.claimAiSimulationWallet)(req.user.id, deviceId.trim());
            }
            catch (err) {
                console.error('[AiSimulation] claim wallet:', err);
            }
        }
        const items = await (0, aiSimulationHistoryService_1.listAiSimulationRuns)({ userId: req.user.id, deviceId, limit: 20 });
        res.json({ ...result, items, allowance });
    }
    catch (error) {
        console.error('claimPublicAiSimulations:', error);
        res.status(500).json({ error: 'Impossible de rattacher l’historique à votre compte.' });
    }
}
async function checkoutAiTokens(req, res) {
    try {
        const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
        const paymentMethod = String(rawBody.paymentMethod || 'mobile').toLowerCase() === 'card' ? 'card' : 'mobile';
        const phone = typeof rawBody.phone === 'string' ? rawBody.phone.trim() : '';
        const operator = typeof rawBody.operator === 'string' ? rawBody.operator.trim() : undefined;
        const tokensCount = Number(rawBody.tokensCount) || 15;
        const amountFc = Number(rawBody.amountFc) || 2500;
        const deviceId = typeof rawBody.deviceId === 'string' ? rawBody.deviceId.trim() : null;
        const userId = req.user?.id || null;
        const result = await (0, aiTokenFlexPayService_1.initiateAiTokenPayment)({
            userId,
            deviceId,
            paymentMethod: paymentMethod,
            phone,
            operator,
            tokensCount,
            amountFc,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('checkoutAiTokens:', error);
        res.status(400).json({ error: error?.message || 'Impossible de traiter le paiement des jetons IA.' });
    }
}
async function getAiTokensDeviceBalance(req, res) {
    try {
        const deviceId = String(req.params.deviceId || req.query.deviceId || '').trim();
        if (!deviceId) {
            res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
            return;
        }
        const summary = await (0, aiTokenFlexPayService_1.getDeviceAiTokensSummary)(deviceId);
        const userId = req.user?.id || null;
        try {
            const allowance = await (0, aiSimulationWalletService_1.getAiSimulationWalletAllowance)(deviceId, userId);
            res.status(200).json({ ...summary, ...allowance });
            return;
        }
        catch (err) {
            console.error('[AiSimulation] wallet balance:', err);
        }
        res.status(200).json(summary);
    }
    catch (error) {
        console.error('getAiTokensDeviceBalance:', error);
        res.status(500).json({ error: error?.message || 'Erreur lors de la récupération du solde de l’appareil.' });
    }
}
async function verifyAiTokensOrder(req, res) {
    try {
        const orderId = String(req.params.orderId || req.query.orderId || '');
        if (!orderId) {
            res.status(400).json({ error: 'Identifiant de commande manquant.' });
            return;
        }
        const result = await (0, aiTokenFlexPayService_1.verifyAndFinalizeAiTokenOrder)(orderId);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('verifyAiTokensOrder:', error);
        res.status(500).json({ error: error?.message || 'Erreur lors de la vérification de la commande.' });
    }
}
function parsePackItems(value) {
    if (!Array.isArray(value))
        return [];
    return value.flatMap((row) => {
        if (!row || typeof row !== 'object')
            return [];
        const item = row;
        const kind = item.kind === 'venue' ? 'venue' : item.kind === 'service' ? 'service' : null;
        const slug = typeof item.slug === 'string' ? item.slug.trim().toLowerCase() : '';
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        if (!kind || !slug || !title)
            return [];
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
function serializeSavedPack(row) {
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
async function listSavedPacks(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const rows = await db_1.prisma.savedEventPack.findMany({
            where: { userId: req.user.id },
            orderBy: { updatedAt: 'desc' },
            take: 50,
        });
        return res.json({ packs: rows.map(serializeSavedPack) });
    }
    catch (error) {
        console.error('listSavedPacks:', error);
        return res.status(500).json({ error: 'Impossible de charger les packs.' });
    }
}
async function createSavedPack(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
        const eventType = typeof req.body?.eventType === 'string' ? req.body.eventType.trim() : '';
        const budgetFc = Number(req.body?.budgetFc);
        const items = parsePackItems(req.body?.items);
        if (!name)
            return res.status(400).json({ error: 'Donnez un nom à ce pack.' });
        if (!eventType)
            return res.status(400).json({ error: 'Indiquez le type d’événement.' });
        if (!Number.isFinite(budgetFc) || budgetFc < 0) {
            return res.status(400).json({ error: 'Budget invalide.' });
        }
        if (!items.length)
            return res.status(400).json({ error: 'Ajoutez au moins une salle ou un prestataire.' });
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
        const pack = await db_1.prisma.savedEventPack.create({
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
    }
    catch (error) {
        console.error('createSavedPack:', error);
        return res.status(500).json({ error: 'Impossible d’enregistrer le pack.' });
    }
}
async function deleteSavedPack(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        if (!id)
            return res.status(400).json({ error: 'Pack introuvable.' });
        const result = await db_1.prisma.savedEventPack.deleteMany({
            where: { id, userId: req.user.id },
        });
        if (!result.count)
            return res.status(404).json({ error: 'Pack introuvable.' });
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('deleteSavedPack:', error);
        return res.status(500).json({ error: 'Impossible de supprimer le pack.' });
    }
}
function serializeSavedBrief(row) {
    return {
        id: row.id,
        name: row.name,
        payload: row.payload,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
async function listSavedBriefs(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const rows = await db_1.prisma.savedEventBrief.findMany({
            where: { userId: req.user.id },
            orderBy: { updatedAt: 'desc' },
            take: 30,
        });
        return res.json({ briefs: rows.map(serializeSavedBrief) });
    }
    catch (error) {
        console.error('listSavedBriefs:', error);
        return res.status(500).json({ error: 'Impossible de charger les briefs.' });
    }
}
async function createSavedBrief(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
        if (!name)
            return res.status(400).json({ error: 'Donnez un nom à ce brief.' });
        const parsed = (0, eventPlanBrief_1.parseEventPlanInput)(req.body?.payload && typeof req.body.payload === 'object'
            ? req.body.payload
            : req.body || {});
        const count = await db_1.prisma.savedEventBrief.count({ where: { userId: req.user.id } });
        if (count >= 20) {
            return res.status(400).json({ error: 'Maximum 20 briefs enregistrés. Supprimez-en un pour en ajouter.' });
        }
        const brief = await db_1.prisma.savedEventBrief.create({
            data: {
                userId: req.user.id,
                name,
                payload: (0, eventPlanBrief_1.serializeBriefPayload)(parsed),
            },
        });
        return res.status(201).json({ brief: serializeSavedBrief(brief) });
    }
    catch (error) {
        if (error?.status === 400) {
            return res.status(400).json({ error: error.message });
        }
        console.error('createSavedBrief:', error);
        return res.status(500).json({ error: 'Impossible d’enregistrer le brief.' });
    }
}
async function deleteSavedBrief(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        if (!id)
            return res.status(400).json({ error: 'Brief introuvable.' });
        const result = await db_1.prisma.savedEventBrief.deleteMany({
            where: { id, userId: req.user.id },
        });
        if (!result.count)
            return res.status(404).json({ error: 'Brief introuvable.' });
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('deleteSavedBrief:', error);
        return res.status(500).json({ error: 'Impossible de supprimer le brief.' });
    }
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
async function getListingRelation(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const kind = parseKind(req.query.kind);
        const slug = parseSlug(req.query.slug);
        if (!tenantId || !kind || !slug) {
            return res.status(400).json({ error: 'Fiche invalide.' });
        }
        const listing = kind === 'venue'
            ? await db_1.prisma.venueListing.findFirst({ where: { slug }, select: { id: true, tenantId: true } })
            : await db_1.prisma.serviceOffering.findFirst({ where: { slug }, select: { id: true, tenantId: true } });
        if (!listing)
            return res.status(404).json({ error: 'Fiche introuvable.' });
        const viewerRole = listing.tenantId === tenantId ? 'vendor' : 'organizer';
        const listingFilter = kind === 'venue' ? { listingId: listing.id } : { offeringId: listing.id };
        const sender = viewerRole === 'organizer'
            ? await db_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
            : null;
        const senderEmail = sender?.email?.trim().toLowerCase() || '';
        const [inquiry, booking] = await Promise.all([
            db_1.prisma.marketplaceInquiry.findFirst({
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
            db_1.prisma.marketplaceBooking.findFirst({
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
    }
    catch (error) {
        console.error('getListingRelation:', error);
        return res.status(500).json({ error: 'Impossible de charger le suivi devis / réservation.' });
    }
}
async function listMyTickets(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true },
        });
        if (!user?.email)
            return res.status(401).json({ error: 'Utilisateur introuvable.' });
        const email = user.email.toLowerCase();
        await db_1.prisma.ticketOrder.updateMany({
            where: {
                userId: null,
                status: 'PAID',
                buyerEmail: { equals: email, mode: 'insensitive' },
            },
            data: { userId: user.id },
        });
        const orders = await db_1.prisma.ticketOrder.findMany({
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
                const primary = order.guests.find((g) => g.email.toLowerCase() === email) || order.guests[0];
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
    }
    catch (error) {
        console.error('listMyTickets:', error);
        return res.status(500).json({ error: 'Impossible de charger vos billets.' });
    }
}
