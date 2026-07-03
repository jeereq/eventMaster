"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplates = getTemplates;
exports.createTemplate = createTemplate;
exports.getTemplateById = getTemplateById;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const planFeaturesService_1 = require("../services/planFeaturesService");
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
            where: isSuperAdmin ? {} : { tenantId },
            include: {
                tenant: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(templates);
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
                const limits = (0, plansConfig_1.getPlanLimits)(tenant.plan);
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
                content: content || {},
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
            where: isSuperAdmin ? { id } : { id, tenantId },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template non trouvé' });
        }
        return res.json(template);
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
            content: content !== undefined ? content : existingTemplate.content,
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
