import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';
import { assertPlanFeature } from '../services/planFeaturesService';

function isCustomTemplateContent(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  return (
    c.customDesign === true ||
    (Array.isArray(c.layers) && c.layers.length > 0) ||
    (Array.isArray(c.elements) && c.elements.length > 0)
  );
}

function getMockupImportFlags(content: unknown): { importedFromMockup: boolean; importedWithOcr: boolean } {
  if (!content || typeof content !== 'object') {
    return { importedFromMockup: false, importedWithOcr: false };
  }
  const global = (content as Record<string, unknown>).global;
  if (!global || typeof global !== 'object') {
    return { importedFromMockup: false, importedWithOcr: false };
  }
  const g = global as Record<string, unknown>;
  return {
    importedFromMockup: g.importedFromMockup === true,
    importedWithOcr: g.importedWithOcr === true,
  };
}

async function assertTemplateContentForPlan(tenantId: string, content: unknown): Promise<void> {
  const mockupFlags = getMockupImportFlags(content);
  if (mockupFlags.importedFromMockup || isCustomTemplateContent(content)) {
    await assertPlanFeature(tenantId, 'customTemplates');
  }
  if (mockupFlags.importedWithOcr) {
    await assertPlanFeature(tenantId, 'mockupOcr');
  }
}

// Get all templates (for the tenant, or all templates if Super Admin)
export async function getTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const tenantId = req.user?.tenantId;
    
    if (!isSuperAdmin && !tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const templates = await prisma.template.findMany({
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
  } catch (error: any) {
    console.error('Erreur lors de la récupération des templates:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des templates' });
  }
}

// Create a template (global or private)
export async function createTemplate(req: AuthenticatedRequest, res: Response) {
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
      const tenant = await prisma.tenant.findUnique({
        where: { id: finalTenantId },
        include: { _count: { select: { templates: true } } },
      });

      if (tenant) {
        const limits = getPlanLimits(tenant.plan);
        if (tenant._count.templates >= limits.maxTemplates) {
          return res.status(403).json({
            error: `Quota de modèles atteint pour le plan ${tenant.plan} (Max ${limits.maxTemplates >= 9999 ? 'illimité' : limits.maxTemplates}). Veuillez passer à un forfait supérieur.`,
          });
        }
        try {
          await assertTemplateContentForPlan(finalTenantId, content);
        } catch (err: any) {
          return res.status(err.statusCode || 403).json({ error: err.message });
        }
      }
    }

    const template = await prisma.template.create({
      data: {
        tenantId: finalTenantId,
        name,
        content: content || {},
      },
    });

    return res.status(201).json(template);
  } catch (error: any) {
    console.error('Erreur lors de la création du template:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du template' });
  }
}

// Get single template
export async function getTemplateById(req: AuthenticatedRequest, res: Response) {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const tenantId = req.user?.tenantId;
    const id = req.params.id as string;

    if (!isSuperAdmin && !tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const template = await prisma.template.findFirst({
      where: isSuperAdmin ? { id } : { id, tenantId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    return res.json(template);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du template:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du template' });
  }
}

// Update a template
export async function updateTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const tenantId = req.user?.tenantId;
    const id = req.params.id as string;
    const { name, content, targetTenantId } = req.body;

    if (!isSuperAdmin && !tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const existingTemplate = await prisma.template.findFirst({
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
      } catch (err: any) {
        return res.status(err.statusCode || 403).json({ error: err.message });
      }
    }

    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingTemplate.name,
        content: content !== undefined ? content : (existingTemplate.content as any),
        tenantId: isSuperAdmin && targetTenantId !== undefined ? (targetTenantId || null) : undefined,
      },
    });

    return res.json(updatedTemplate);
  } catch (error: any) {
    console.error('Erreur lors de la modification du template:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification du template' });
  }
}

// Delete a template
export async function deleteTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const tenantId = req.user?.tenantId;
    const id = req.params.id as string;

    if (!isSuperAdmin && !tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const existingTemplate = await prisma.template.findFirst({
      where: isSuperAdmin ? { id } : { id, tenantId },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template non trouvé ou non autorisé' });
    }

    await prisma.template.delete({
      where: { id },
    });

    return res.json({ message: 'Template supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du template:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du template' });
  }
}
