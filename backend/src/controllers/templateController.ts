import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getPlanLimitsForTenant } from '../config/plansConfig';
import { assertPlanFeature, PlanFeatureError } from '../services/planFeaturesService';
import { ensureMandatoryRsvpFieldsOnContent } from '../utils/mandatoryRsvpFields';
import { composeInvitationTemplateAi } from '../services/invitationTemplateAiService';
import {
  consumeAiSimulationCredit,
  requireAiSimulationCredit,
  isUnlimitedAiTokenUser,
  AI_INVITATION_COMPOSE_TOKEN_COST,
} from '../services/aiSimulationWalletService';
import {
  saveAiTemplateComposeRun,
  listAiTemplateComposeRuns,
  getAiTemplateComposeRun,
  claimDeviceTemplateComposeRuns,
  type AiTemplateComposeSource,
} from '../services/aiTemplateComposeHistoryService';
import { uploadDataUrl } from '../services/cloudinaryService';
import { getTemplateUploadFolder } from '../config/cloudinaryConfig';

async function persistTemplateCompose(
  opts: {
    userId?: string | null;
    deviceId?: string | null;
    source: AiTemplateComposeSource;
    prompt?: string | null;
    referenceUrls?: string[];
    content: { global?: Record<string, unknown>; elements?: unknown[] };
    stage?: Record<string, unknown> | null;
  },
) {
  try {
    const saved = await saveAiTemplateComposeRun(opts);
    return saved?.id || null;
  } catch (err) {
    console.error('[AiTemplateCompose] persist:', err);
    return null;
  }
}

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
        content: ensureMandatoryRsvpFieldsOnContent(t.content),
        isGlobal,
        isOwned,
        canEdit: isSuperAdmin || isOwned,
        canDelete: isSuperAdmin || isOwned,
        canDuplicate: isSuperAdmin || isGlobal || isOwned,
      };
    });

    return res.json(annotated);
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
      const tenant = await prisma.tenant.findUnique({
        where: { id: finalTenantId },
        include: { _count: { select: { templates: true } } },
      });

      if (tenant) {
        const limits = getPlanLimitsForTenant(tenant.plan, tenant.accountKind);
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
        content: ensureMandatoryRsvpFieldsOnContent(content || {}) as object,
        showOnLanding: isSuperAdmin && !finalTenantId ? Boolean(showOnLanding) : false,
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
      content: ensureMandatoryRsvpFieldsOnContent(template.content),
      isGlobal,
      isOwned,
      canEdit: isSuperAdmin || isOwned,
      canDelete: isSuperAdmin || isOwned,
      canDuplicate: isSuperAdmin || isGlobal || isOwned,
    });
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
    const { name, content, targetTenantId, showOnLanding } = req.body;

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

    const updateData: Record<string, unknown> = {
      name: name !== undefined ? name : existingTemplate.name,
      content: content !== undefined
        ? ensureMandatoryRsvpFieldsOnContent(content)
        : ensureMandatoryRsvpFieldsOnContent(existingTemplate.content),
    };

    if (isSuperAdmin && targetTenantId !== undefined) {
      updateData.tenantId = targetTenantId || null;
    }

    if (isSuperAdmin) {
      const resolvedTenantId =
        targetTenantId !== undefined ? (targetTenantId || null) : existingTemplate.tenantId;
      if (resolvedTenantId) {
        updateData.showOnLanding = false;
      } else if (showOnLanding !== undefined) {
        updateData.showOnLanding = Boolean(showOnLanding);
      }
    }

    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: updateData as any,
    });

    return res.json(updatedTemplate);
  } catch (error: any) {
    console.error('Erreur lors de la modification du template:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification du template' });
  }
}

// Duplicate a template (catalog → organisation, or copy within org)
export async function duplicateTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const tenantId = req.user?.tenantId;
    const id = req.params.id as string;
    const { name, targetTenantId } = req.body ?? {};

    if (!isSuperAdmin && !tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const source = await prisma.template.findFirst({
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

    const tenant = await prisma.tenant.findUnique({
      where: { id: finalTenantId },
      include: { _count: { select: { templates: true } } },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Organisation introuvable' });
    }

    const limits = getPlanLimitsForTenant(tenant.plan, tenant.accountKind);
    if (tenant._count.templates >= limits.maxTemplates) {
      return res.status(403).json({
        error: `Quota de modèles atteint pour le plan ${tenant.plan} (max ${limits.maxTemplates >= 9999 ? 'illimité' : limits.maxTemplates}). Passez à un forfait supérieur.`,
      });
    }

    // Duplication depuis la bibliothèque globale : pas de contrôle customTemplates
    if (!isCatalogSource && !isSuperAdmin && finalTenantId) {
      try {
        await assertTemplateContentForPlan(finalTenantId, source.content);
      } catch (err: any) {
        return res.status(err.statusCode || 403).json({ error: err.message });
      }
    }

    const copyName =
      typeof name === 'string' && name.trim()
        ? name.trim()
        : isCatalogSource
          ? source.name
          : `${source.name} (Copie)`;

    const template = await prisma.template.create({
      data: {
        tenantId: finalTenantId,
        name: copyName,
        content: ensureMandatoryRsvpFieldsOnContent(source.content) as object,
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
  } catch (error: any) {
    console.error('Erreur lors de la duplication du template:', error);
    return res.status(500).json({ error: 'Erreur lors de la duplication du modèle.' });
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

/** POST /templates/ai/compose — images + prompt → structure éditable + fond généré */
export async function composeTemplateWithAi(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const tenantId = req.user.tenantId || null;
    if (!isSuperAdmin && !tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }
    if (!isSuperAdmin && tenantId) {
      await assertPlanFeature(tenantId, 'customTemplates');
    }

    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    if (!deviceId) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer les jetons IA.' });
    }
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const generateBackground = body.generateBackground !== false;
    const embedText = body.embedText === true;
    const imageUrls = await resolveComposeImageUrls(body, isSuperAdmin ? null : tenantId);

    const unlimited = isUnlimitedAiTokenUser(req.user);
    await requireAiSimulationCredit(deviceId, req.user.id, AI_INVITATION_COMPOSE_TOKEN_COST, { unlimited });
    const result = await composeInvitationTemplateAi({
      userId: req.user.id,
      tenantId: isSuperAdmin ? null : tenantId,
      prompt,
      imageUrls,
      generateBackground,
      embedText,
      deviceId,
      authUserId: req.user.id,
    });
    const historyId = await persistTemplateCompose({
      userId: req.user.id,
      deviceId,
      source: 'studio',
      prompt,
      referenceUrls: imageUrls,
      content: result.content,
      stage: result.stage,
    });
    const allowance = await consumeAiSimulationCredit(deviceId, req.user.id, AI_INVITATION_COMPOSE_TOKEN_COST, {
      action: 'invitation_compose',
      source: unlimited && req.user.impersonatedBy ? 'support' : 'studio',
      relatedId: historyId,
      unlimited,
    });

    return res.json({
      content: result.content,
      stage: result.stage,
      historyId,
      remaining: allowance.totalRemaining,
      allowance,
    });
  } catch (error: unknown) {
    if (error instanceof PlanFeatureError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const err = error as { status?: number; message?: string };
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
export async function publicComposeTemplateWithAi(req: Request, res: Response) {
  try {
    const user = (req as AuthenticatedRequest).user;
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    if (!deviceId) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer les jetons IA.' });
    }
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const generateBackground = body.generateBackground !== false;
    const embedText = body.embedText === true;
    const imageUrls = await resolveComposeImageUrls(body, user?.tenantId || null);
    const rateKey = user?.id || req.ip || deviceId;

    const unlimited = isUnlimitedAiTokenUser(user);
    await requireAiSimulationCredit(deviceId, user?.id || null, AI_INVITATION_COMPOSE_TOKEN_COST, { unlimited });
    const result = await composeInvitationTemplateAi({
      userId: rateKey,
      tenantId: user?.tenantId || null,
      prompt,
      imageUrls,
      generateBackground,
      embedText,
      deviceId,
      authUserId: user?.id || null,
    });
    const historyId = await persistTemplateCompose({
      userId: user?.id || null,
      deviceId,
      source: user?.id ? 'studio' : 'landing',
      prompt,
      referenceUrls: imageUrls,
      content: result.content,
      stage: result.stage,
    });
    const allowance = await consumeAiSimulationCredit(deviceId, user?.id || null, AI_INVITATION_COMPOSE_TOKEN_COST, {
      action: 'invitation_compose',
      source: unlimited && user?.impersonatedBy ? 'support' : user?.id ? 'studio' : 'landing',
      relatedId: historyId,
      unlimited,
    });

    return res.json({
      content: result.content,
      stage: result.stage,
      historyId,
      remaining: allowance.totalRemaining,
      allowance,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err?.status) {
      return res.status(err.status).json({ error: err.message || 'Erreur IA' });
    }
    console.error('publicComposeTemplateWithAi:', error);
    return res.status(500).json({ error: 'Impossible de générer le modèle avec l’IA.' });
  }
}

/** GET /public/templates/ai/history?deviceId= — historique générations invitation */
export async function listPublicAiTemplateComposes(req: Request, res: Response) {
  try {
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
    const userId = (req as AuthenticatedRequest).user?.id || null;
    const items = await listAiTemplateComposeRuns({ userId, deviceId, limit: 20 });
    return res.json({ items });
  } catch (error: unknown) {
    console.error('listPublicAiTemplateComposes:', error);
    return res.status(500).json({ error: 'Impossible de charger l’historique des générations.' });
  }
}

/** GET /templates/ai/history — studio authentifié */
export async function listAiTemplateComposes(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
    const items = await listAiTemplateComposeRuns({
      userId: req.user.id,
      deviceId,
      limit: 20,
    });
    return res.json({ items });
  } catch (error: unknown) {
    console.error('listAiTemplateComposes:', error);
    return res.status(500).json({ error: 'Impossible de charger l’historique des générations.' });
  }
}

/** GET /public/templates/ai/history/:id */
export async function getPublicAiTemplateCompose(req: Request, res: Response) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
    const userId = (req as AuthenticatedRequest).user?.id || null;
    const item = await getAiTemplateComposeRun({ id, userId, deviceId });
    if (!item) return res.status(404).json({ error: 'Génération introuvable.' });
    return res.json({ item });
  } catch (error: unknown) {
    console.error('getPublicAiTemplateCompose:', error);
    return res.status(500).json({ error: 'Impossible de charger cette génération.' });
  }
}

/** POST /public/templates/ai/history/claim — rattache l’historique device au compte */
export async function claimPublicAiTemplateComposes(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }
    const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId : '';
    const result = await claimDeviceTemplateComposeRuns(req.user.id, deviceId);
    const items = await listAiTemplateComposeRuns({
      userId: req.user.id,
      deviceId,
      limit: 20,
    });
    return res.json({ ...result, items });
  } catch (error: unknown) {
    console.error('claimPublicAiTemplateComposes:', error);
    return res.status(500).json({ error: 'Impossible de rattacher l’historique à votre compte.' });
  }
}

async function resolveComposeImageUrls(
  body: Record<string, unknown>,
  tenantId: string | null,
): Promise<string[]> {
  const urls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];
  const dataUrls = Array.isArray(body.imageDataUrls)
    ? body.imageDataUrls.filter(
        (u): u is string => typeof u === 'string' && u.startsWith('data:image/'),
      )
    : [];

  const resolved: string[] = [];
  for (const url of urls.slice(0, 4)) {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      resolved.push(trimmed);
    } else if (trimmed.startsWith('data:image/')) {
      const uploaded = await uploadDataUrl(trimmed, getTemplateUploadFolder(tenantId));
      resolved.push(uploaded.url);
    }
  }
  for (const dataUrl of dataUrls) {
    if (resolved.length >= 4) break;
    const uploaded = await uploadDataUrl(dataUrl, getTemplateUploadFolder(tenantId));
    resolved.push(uploaded.url);
  }
  return resolved.slice(0, 4);
}
