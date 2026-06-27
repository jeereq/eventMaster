import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';

// Get all templates for the tenant
export async function getTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const templates = await prisma.template.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(templates);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des templates:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des templates' });
  }
}

// Create a template
export async function createTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Les champs name et content sont requis' });
    }

    // Check Plan / Quotas (e.g. Free plan has max 2 custom templates, let's add a placeholder)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { templates: true } } },
    });

    if (tenant && tenant.plan === 'FREE' && tenant._count.templates >= 2) {
      return res.status(403).json({ error: 'Quota de modèles atteint pour le plan GRATUIT (Max 2 modèles). Veuillez passer au plan PREMIUM.' });
    }

    const template = await prisma.template.create({
      data: {
        tenantId,
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
    const tenantId = req.user?.tenantId;
    const id = req.params.id as string;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const template = await prisma.template.findFirst({
      where: { id, tenantId },
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
    const tenantId = req.user?.tenantId;
    const id = req.params.id as string;
    const { name, content } = req.body;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const existingTemplate = await prisma.template.findFirst({
      where: { id, tenantId },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template non trouvé ou non autorisé' });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingTemplate.name,
        content: content !== undefined ? content : (existingTemplate.content as any),
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
    const tenantId = req.user?.tenantId;
    const id = req.params.id as string;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const existingTemplate = await prisma.template.findFirst({
      where: { id, tenantId },
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
