"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplates = getTemplates;
exports.createTemplate = createTemplate;
exports.getTemplateById = getTemplateById;
exports.updateTemplate = updateTemplate;
exports.duplicateTemplate = duplicateTemplate;
exports.deleteTemplate = deleteTemplate;
exports.composeTemplateWithAi = composeTemplateWithAi;
exports.publicComposeTemplateWithAi = publicComposeTemplateWithAi;
exports.listPublicAiTemplateComposes = listPublicAiTemplateComposes;
exports.listAiTemplateComposes = listAiTemplateComposes;
exports.getPublicAiTemplateCompose = getPublicAiTemplateCompose;
exports.claimPublicAiTemplateComposes = claimPublicAiTemplateComposes;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const planFeaturesService_1 = require("../services/planFeaturesService");
const mandatoryRsvpFields_1 = require("../utils/mandatoryRsvpFields");
const invitationTemplateAiService_1 = require("../services/invitationTemplateAiService");
const aiSimulationWalletService_1 = require("../services/aiSimulationWalletService");
const aiTemplateComposeHistoryService_1 = require("../services/aiTemplateComposeHistoryService");
const cloudinaryService_1 = require("../services/cloudinaryService");
const cloudinaryConfig_1 = require("../config/cloudinaryConfig");
async function persistTemplateCompose(opts) {
    try {
        const saved = await (0, aiTemplateComposeHistoryService_1.saveAiTemplateComposeRun)(opts);
        return saved?.id || null;
    }
    catch (err) {
        console.error('[AiTemplateCompose] persist:', err);
        return null;
    }
}
function isCustomTemplateContent(content) {
    if (!content || typeof content !== 'object')
        return false;
    const c = content;
    return (c.customDesign === true ||
        (Array.isArray(c.layers) && c.layers.length > 0) ||
        (Array.isArray(c.elements) && c.elements.length > 0));
}
function getMockupImportFlags(content) {
    if (!content || typeof content !== 'object') {
        return { importedFromMockup: false, importedWithOcr: false };
    }
    const global = content.global;
    if (!global || typeof global !== 'object') {
        return { importedFromMockup: false, importedWithOcr: false };
    }
    const g = global;
    return {
        importedFromMockup: g.importedFromMockup === true,
        importedWithOcr: g.importedWithOcr === true,
    };
}
async function assertTemplateContentForPlan(tenantId, content) {
    const mockupFlags = getMockupImportFlags(content);
    if (mockupFlags.importedFromMockup || isCustomTemplateContent(content)) {
        await (0, planFeaturesService_1.assertPlanFeature)(tenantId, 'customTemplates');
    }
    if (mockupFlags.importedWithOcr) {
        await (0, planFeaturesService_1.assertPlanFeature)(tenantId, 'mockupOcr');
    }
}
// Get all templates (for the tenant, or all templates if Super Admin)
async function getTemplates(req, res) {
    try {
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
        const tenantId = req.user?.tenantId;
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const templates = await db_1.prisma.template.findMany({
            where: isSuperAdmin
                ? {}
                : {
                    OR: [{ tenantId }, { tenantId: null }],
                },
            include: {
                tenant: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [{ tenantId: 'asc' }, { createdAt: 'desc' }],
        });
        const annotated = templates.map((t) => {
            const isGlobal = t.tenantId === null;
            const isOwned = Boolean(tenantId && t.tenantId === tenantId);
            return {
                ...t,
                content: (0, mandatoryRsvpFields_1.ensureMandatoryRsvpFieldsOnContent)(t.content),
                isGlobal,
                isOwned,
                canEdit: isSuperAdmin || isOwned,
                canDelete: isSuperAdmin || isOwned,
                canDuplicate: isSuperAdmin || isGlobal || isOwned,
            };
        });
        return res.json(annotated);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des templates:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des templates' });
    }
}
// Create a template (global or private)
async function createTemplate(req, res) {
    try {
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
        const tenantId = req.user?.tenantId;
        const { name, content, targetTenantId, showOnLanding } = req.body;
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!name || !content) {
            return res.status(400).json({ error: 'Les champs name et content sont requis' });
        }
        const finalTenantId = isSuperAdmin ? (targetTenantId || null) : tenantId;
        // Check Plan / Quotas only for non-super-admins
        if (!isSuperAdmin && finalTenantId) {
            const tenant = await db_1.prisma.tenant.findUnique({
                where: { id: finalTenantId },
                include: { _count: { select: { templates: true } } },
            });
            if (tenant) {
                const limits = (0, plansConfig_1.getPlanLimitsForTenant)(tenant.plan, tenant.accountKind);
                if (tenant._count.templates >= limits.maxTemplates) {
                    return res.status(403).json({
                        error: `Quota de modèles atteint pour le plan ${tenant.plan} (Max ${limits.maxTemplates >= 9999 ? 'illimité' : limits.maxTemplates}). Veuillez passer à un forfait supérieur.`,
                    });
                }
                try {
                    await assertTemplateContentForPlan(finalTenantId, content);
                }
                catch (err) {
                    return res.status(err.statusCode || 403).json({ error: err.message });
                }
            }
        }
        const template = await db_1.prisma.template.create({
            data: {
                tenantId: finalTenantId,
                name,
                content: (0, mandatoryRsvpFields_1.ensureMandatoryRsvpFieldsOnContent)(content || {}),
                showOnLanding: isSuperAdmin && !finalTenantId ? Boolean(showOnLanding) : false,
            },
        });
        return res.status(201).json(template);
    }
    catch (error) {
        console.error('Erreur lors de la création du template:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du template' });
    }
}
// Get single template
async function getTemplateById(req, res) {
    try {
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
        const tenantId = req.user?.tenantId;
        const id = req.params.id;
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const template = await db_1.prisma.template.findFirst({
            where: isSuperAdmin
                ? { id }
                : {
                    id,
                    OR: [{ tenantId }, { tenantId: null }],
                },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template non trouvé' });
        }
        const isGlobal = template.tenantId === null;
        const isOwned = Boolean(tenantId && template.tenantId === tenantId);
        return res.json({
            ...template,
            content: (0, mandatoryRsvpFields_1.ensureMandatoryRsvpFieldsOnContent)(template.content),
            isGlobal,
            isOwned,
            canEdit: isSuperAdmin || isOwned,
            canDelete: isSuperAdmin || isOwned,
            canDuplicate: isSuperAdmin || isGlobal || isOwned,
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération du template:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération du template' });
    }
}
// Update a template
async function updateTemplate(req, res) {
    try {
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
        const tenantId = req.user?.tenantId;
        const id = req.params.id;
        const { name, content, targetTenantId, showOnLanding } = req.body;
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const existingTemplate = await db_1.prisma.template.findFirst({
            where: isSuperAdmin ? { id } : { id, tenantId },
        });
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template non trouvé ou non autorisé' });
        }
        const effectiveTenantId = isSuperAdmin
            ? (targetTenantId !== undefined ? targetTenantId : existingTemplate.tenantId)
            : tenantId;
        if (!isSuperAdmin && effectiveTenantId && content !== undefined) {
            try {
                await assertTemplateContentForPlan(effectiveTenantId, content);
            }
            catch (err) {
                return res.status(err.statusCode || 403).json({ error: err.message });
            }
        }
        const updateData = {
            name: name !== undefined ? name : existingTemplate.name,
            content: content !== undefined
                ? (0, mandatoryRsvpFields_1.ensureMandatoryRsvpFieldsOnContent)(content)
                : (0, mandatoryRsvpFields_1.ensureMandatoryRsvpFieldsOnContent)(existingTemplate.content),
        };
        if (isSuperAdmin && targetTenantId !== undefined) {
            updateData.tenantId = targetTenantId || null;
        }
        if (isSuperAdmin) {
            const resolvedTenantId = targetTenantId !== undefined ? (targetTenantId || null) : existingTemplate.tenantId;
            if (resolvedTenantId) {
                updateData.showOnLanding = false;
            }
            else if (showOnLanding !== undefined) {
                updateData.showOnLanding = Boolean(showOnLanding);
            }
        }
        const updatedTemplate = await db_1.prisma.template.update({
            where: { id },
            data: updateData,
        });
        return res.json(updatedTemplate);
    }
    catch (error) {
        console.error('Erreur lors de la modification du template:', error);
        return res.status(500).json({ error: 'Erreur lors de la modification du template' });
    }
}
// Duplicate a template (catalog → organisation, or copy within org)
async function duplicateTemplate(req, res) {
    try {
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
        const tenantId = req.user?.tenantId;
        const id = req.params.id;
        const { name, targetTenantId } = req.body ?? {};
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const source = await db_1.prisma.template.findFirst({
            where: isSuperAdmin
                ? { id }
                : {
                    id,
                    OR: [{ tenantId: null }, { tenantId }],
                },
        });
        if (!source) {
            return res.status(404).json({ error: 'Modèle source introuvable' });
        }
        const isCatalogSource = source.tenantId === null;
        const isOwnSource = Boolean(tenantId && source.tenantId === tenantId);
        if (!isSuperAdmin && !isCatalogSource && !isOwnSource) {
            return res.status(403).json({ error: 'Vous ne pouvez pas dupliquer ce modèle.' });
        }
        const finalTenantId = isSuperAdmin
            ? (targetTenantId !== undefined ? targetTenantId || null : tenantId || null)
            : tenantId;
        if (!finalTenantId) {
            return res.status(400).json({
                error: 'Sélectionnez une organisation cible pour la duplication.',
            });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: finalTenantId },
            include: { _count: { select: { templates: true } } },
        });
        if (!tenant) {
            return res.status(404).json({ error: 'Organisation introuvable' });
        }
        const limits = (0, plansConfig_1.getPlanLimitsForTenant)(tenant.plan, tenant.accountKind);
        if (tenant._count.templates >= limits.maxTemplates) {
            return res.status(403).json({
                error: `Quota de modèles atteint pour le plan ${tenant.plan} (max ${limits.maxTemplates >= 9999 ? 'illimité' : limits.maxTemplates}). Passez à un forfait supérieur.`,
            });
        }
        // Duplication depuis la bibliothèque globale : pas de contrôle customTemplates
        if (!isCatalogSource && !isSuperAdmin && finalTenantId) {
            try {
                await assertTemplateContentForPlan(finalTenantId, source.content);
            }
            catch (err) {
                return res.status(err.statusCode || 403).json({ error: err.message });
            }
        }
        const copyName = typeof name === 'string' && name.trim()
            ? name.trim()
            : isCatalogSource
                ? source.name
                : `${source.name} (Copie)`;
        const template = await db_1.prisma.template.create({
            data: {
                tenantId: finalTenantId,
                name: copyName,
                content: (0, mandatoryRsvpFields_1.ensureMandatoryRsvpFieldsOnContent)(source.content),
                showOnLanding: false,
            },
        });
        return res.status(201).json({
            message: isCatalogSource
                ? 'Modèle ajouté à votre organisation.'
                : 'Modèle dupliqué avec succès.',
            template: {
                ...template,
                isGlobal: false,
                isOwned: true,
                canEdit: true,
                canDelete: true,
                canDuplicate: true,
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la duplication du template:', error);
        return res.status(500).json({ error: 'Erreur lors de la duplication du modèle.' });
    }
}
// Delete a template
async function deleteTemplate(req, res) {
    try {
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
        const tenantId = req.user?.tenantId;
        const id = req.params.id;
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const existingTemplate = await db_1.prisma.template.findFirst({
            where: isSuperAdmin ? { id } : { id, tenantId },
        });
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template non trouvé ou non autorisé' });
        }
        await db_1.prisma.template.delete({
            where: { id },
        });
        return res.json({ message: 'Template supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression du template:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du template' });
    }
}
/** POST /templates/ai/compose — images + prompt → structure éditable + fond généré */
async function composeTemplateWithAi(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
        const tenantId = req.user.tenantId || null;
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!isSuperAdmin && tenantId) {
            await (0, planFeaturesService_1.assertPlanFeature)(tenantId, 'customTemplates');
        }
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
        if (!deviceId) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer un jeton IA.' });
        }
        const prompt = typeof body.prompt === 'string' ? body.prompt : '';
        const generateBackground = body.generateBackground !== false;
        const imageUrls = await resolveComposeImageUrls(body, isSuperAdmin ? null : tenantId);
        await (0, aiSimulationWalletService_1.requireAiSimulationCredit)(deviceId, req.user.id);
        const result = await (0, invitationTemplateAiService_1.composeInvitationTemplateAi)({
            userId: req.user.id,
            tenantId: isSuperAdmin ? null : tenantId,
            prompt,
            imageUrls,
            generateBackground,
        });
        const allowance = await (0, aiSimulationWalletService_1.consumeAiSimulationCredit)(deviceId, req.user.id);
        const historyId = await persistTemplateCompose({
            userId: req.user.id,
            deviceId,
            source: 'studio',
            prompt,
            referenceUrls: imageUrls,
            content: result.content,
            stage: result.stage,
        });
        return res.json({
            content: result.content,
            stage: result.stage,
            historyId,
            remaining: allowance.totalRemaining,
            allowance,
        });
    }
    catch (error) {
        if (error instanceof planFeaturesService_1.PlanFeatureError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        const err = error;
        if (err?.status) {
            return res.status(err.status).json({ error: err.message || 'Erreur IA' });
        }
        console.error('composeTemplateWithAi:', error);
        return res.status(500).json({ error: 'Impossible de générer le modèle avec l’IA.' });
    }
}
/**
 * POST /public/templates/ai/compose — même pipeline, accessible landing /modeles
 * (jetons device, sans exiger customTemplates ; l’édition en studio reste gated).
 */
async function publicComposeTemplateWithAi(req, res) {
    try {
        const user = req.user;
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
        if (!deviceId) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer un jeton IA.' });
        }
        const prompt = typeof body.prompt === 'string' ? body.prompt : '';
        const generateBackground = body.generateBackground !== false;
        const imageUrls = await resolveComposeImageUrls(body, user?.tenantId || null);
        const rateKey = user?.id || req.ip || deviceId;
        await (0, aiSimulationWalletService_1.requireAiSimulationCredit)(deviceId, user?.id || null);
        const result = await (0, invitationTemplateAiService_1.composeInvitationTemplateAi)({
            userId: rateKey,
            tenantId: user?.tenantId || null,
            prompt,
            imageUrls,
            generateBackground,
        });
        const allowance = await (0, aiSimulationWalletService_1.consumeAiSimulationCredit)(deviceId, user?.id || null);
        const historyId = await persistTemplateCompose({
            userId: user?.id || null,
            deviceId,
            source: user?.id ? 'studio' : 'landing',
            prompt,
            referenceUrls: imageUrls,
            content: result.content,
            stage: result.stage,
        });
        return res.json({
            content: result.content,
            stage: result.stage,
            historyId,
            remaining: allowance.totalRemaining,
            allowance,
        });
    }
    catch (error) {
        const err = error;
        if (err?.status) {
            return res.status(err.status).json({ error: err.message || 'Erreur IA' });
        }
        console.error('publicComposeTemplateWithAi:', error);
        return res.status(500).json({ error: 'Impossible de générer le modèle avec l’IA.' });
    }
}
/** GET /public/templates/ai/history?deviceId= — historique générations invitation */
async function listPublicAiTemplateComposes(req, res) {
    try {
        const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
        const userId = req.user?.id || null;
        const items = await (0, aiTemplateComposeHistoryService_1.listAiTemplateComposeRuns)({ userId, deviceId, limit: 20 });
        return res.json({ items });
    }
    catch (error) {
        console.error('listPublicAiTemplateComposes:', error);
        return res.status(500).json({ error: 'Impossible de charger l’historique des générations.' });
    }
}
/** GET /templates/ai/history — studio authentifié */
async function listAiTemplateComposes(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
        const items = await (0, aiTemplateComposeHistoryService_1.listAiTemplateComposeRuns)({
            userId: req.user.id,
            deviceId,
            limit: 20,
        });
        return res.json({ items });
    }
    catch (error) {
        console.error('listAiTemplateComposes:', error);
        return res.status(500).json({ error: 'Impossible de charger l’historique des générations.' });
    }
}
/** GET /public/templates/ai/history/:id */
async function getPublicAiTemplateCompose(req, res) {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
        const userId = req.user?.id || null;
        const item = await (0, aiTemplateComposeHistoryService_1.getAiTemplateComposeRun)({ id, userId, deviceId });
        if (!item)
            return res.status(404).json({ error: 'Génération introuvable.' });
        return res.json({ item });
    }
    catch (error) {
        console.error('getPublicAiTemplateCompose:', error);
        return res.status(500).json({ error: 'Impossible de charger cette génération.' });
    }
}
/** POST /public/templates/ai/history/claim — rattache l’historique device au compte */
async function claimPublicAiTemplateComposes(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId : '';
        const result = await (0, aiTemplateComposeHistoryService_1.claimDeviceTemplateComposeRuns)(req.user.id, deviceId);
        const items = await (0, aiTemplateComposeHistoryService_1.listAiTemplateComposeRuns)({
            userId: req.user.id,
            deviceId,
            limit: 20,
        });
        return res.json({ ...result, items });
    }
    catch (error) {
        console.error('claimPublicAiTemplateComposes:', error);
        return res.status(500).json({ error: 'Impossible de rattacher l’historique à votre compte.' });
    }
}
async function resolveComposeImageUrls(body, tenantId) {
    const urls = Array.isArray(body.imageUrls)
        ? body.imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
        : [];
    const dataUrls = Array.isArray(body.imageDataUrls)
        ? body.imageDataUrls.filter((u) => typeof u === 'string' && u.startsWith('data:image/'))
        : [];
    const resolved = [];
    for (const url of urls.slice(0, 4)) {
        const trimmed = url.trim();
        if (/^https?:\/\//i.test(trimmed)) {
            resolved.push(trimmed);
        }
        else if (trimmed.startsWith('data:image/')) {
            const uploaded = await (0, cloudinaryService_1.uploadDataUrl)(trimmed, (0, cloudinaryConfig_1.getTemplateUploadFolder)(tenantId));
            resolved.push(uploaded.url);
        }
    }
    for (const dataUrl of dataUrls) {
        if (resolved.length >= 4)
            break;
        const uploaded = await (0, cloudinaryService_1.uploadDataUrl)(dataUrl, (0, cloudinaryConfig_1.getTemplateUploadFolder)(tenantId));
        resolved.push(uploaded.url);
    }
    return resolved.slice(0, 4);
}
