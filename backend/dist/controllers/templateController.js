"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplates = getTemplates;
exports.createTemplate = createTemplate;
exports.getTemplateById = getTemplateById;
exports.updateTemplate = updateTemplate;
exports.duplicateTemplate = duplicateTemplate;
exports.deleteTemplate = deleteTemplate;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const planFeaturesService_1 = require("../services/planFeaturesService");
const mandatoryRsvpFields_1 = require("../utils/mandatoryRsvpFields");
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
