"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplates = getTemplates;
exports.createTemplate = createTemplate;
exports.getTemplateById = getTemplateById;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
const db_1 = require("../db");
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
        const { name, content, targetTenantId } = req.body;
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
            if (tenant && tenant.plan === 'FREE' && tenant._count.templates >= 2) {
                return res.status(403).json({ error: 'Quota de modèles atteint pour le plan GRATUIT (Max 2 modèles). Veuillez passer au plan PREMIUM.' });
            }
        }
        const template = await db_1.prisma.template.create({
            data: {
                tenantId: finalTenantId,
                name,
                content: content || {},
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
        const { name, content, targetTenantId } = req.body;
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const existingTemplate = await db_1.prisma.template.findFirst({
            where: isSuperAdmin ? { id } : { id, tenantId },
        });
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template non trouvé ou non autorisé' });
        }
        const updatedTemplate = await db_1.prisma.template.update({
            where: { id },
            data: {
                name: name !== undefined ? name : existingTemplate.name,
                content: content !== undefined ? content : existingTemplate.content,
                tenantId: isSuperAdmin && targetTenantId !== undefined ? (targetTenantId || null) : undefined,
            },
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
