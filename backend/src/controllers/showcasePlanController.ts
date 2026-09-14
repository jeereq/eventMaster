import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  loadPlatformSettings,
  savePlatformSettingsDurable,
  canManageShowcasePlans,
  type ShowcaseRoomPlanItem,
  DEFAULT_SHOWCASE_ROOM_PLANS,
} from '../services/platformSettingsService';

function getUserDisplayName(user?: { id?: string; role?: string }): string {
  if (!user) return 'Super Admin';
  const shortId = user.id ? ` (${user.id.slice(0, 8)})` : '';
  return user.role === 'SUPER_ADMIN' ? 'Super Admin' : `Commercial${shortId}`;
}

/**
 * GET /api/public/showcase-plans
 * Récupère les plans vitrine 2D/3D publics.
 * Si l'utilisateur est Super Admin ou Commercial habilité, renvoie la totalité des plans (y compris masqués) avec canManage: true.
 */
export async function getPublicShowcasePlans(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const canManage = canManageShowcasePlans(user);

    const settings = loadPlatformSettings();
    const allPlans: ShowcaseRoomPlanItem[] =
      Array.isArray(settings.showcaseRoomPlans) && settings.showcaseRoomPlans.length > 0
        ? settings.showcaseRoomPlans
        : DEFAULT_SHOWCASE_ROOM_PLANS;

    const sorted = [...allPlans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (canManage) {
      return res.json({
        plans: sorted,
        canManage: true,
      });
    }

    const publicOnly = sorted.filter((p) => p.isPublished !== false);
    return res.json({
      plans: publicOnly,
      canManage: false,
    });
  } catch (error: any) {
    console.error('[ShowcasePlan] Erreur récupération plans publics:', error);
    return res.status(500).json({ error: 'Impossible de charger les plans vitrine' });
  }
}

/**
 * GET /api/admin/showcase-plans
 * Récupère la totalité des plans vitrine pour l'administration.
 */
export async function getAdminShowcasePlans(req: AuthenticatedRequest, res: Response) {
  try {
    if (!canManageShowcasePlans(req.user)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges de gestion des plans vitrine requis.' });
    }

    const settings = loadPlatformSettings();
    const allPlans: ShowcaseRoomPlanItem[] =
      Array.isArray(settings.showcaseRoomPlans) && settings.showcaseRoomPlans.length > 0
        ? settings.showcaseRoomPlans
        : DEFAULT_SHOWCASE_ROOM_PLANS;

    const sorted = [...allPlans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return res.json({
      plans: sorted,
      canManage: true,
    });
  } catch (error: any) {
    console.error('[ShowcasePlan] Erreur récupération admin:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des modèles de salle' });
  }
}

/**
 * POST /api/admin/showcase-plans
 * Crée un nouveau plan 2D/3D dans la vitrine publique.
 */
export async function createShowcasePlan(req: AuthenticatedRequest, res: Response) {
  try {
    if (!canManageShowcasePlans(req.user)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges de gestion des plans vitrine requis.' });
    }

    const {
      name,
      label,
      category = 'other',
      description = '',
      outlineShape = 'rectangle',
      blueprint,
      presetId,
      isPublished = true,
      order,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du modèle est obligatoire.' });
    }

    const settings = loadPlatformSettings();
    const currentPlans: ShowcaseRoomPlanItem[] =
      Array.isArray(settings.showcaseRoomPlans) && settings.showcaseRoomPlans.length > 0
        ? [...settings.showcaseRoomPlans]
        : [...DEFAULT_SHOWCASE_ROOM_PLANS];

    const newId = `showcase-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextOrder = Number.isFinite(Number(order)) ? Number(order) : currentPlans.length + 1;
    const nowIso = new Date().toISOString();

    const newPlan: ShowcaseRoomPlanItem = {
      id: newId,
      name: name.trim(),
      label: (label && typeof label === 'string' ? label.trim() : name.trim()),
      category: String(category).trim() || 'other',
      description: String(description || '').trim(),
      outlineShape: String(outlineShape || 'rectangle'),
      blueprint: blueprint && typeof blueprint === 'object' ? blueprint : undefined,
      presetId: presetId ? String(presetId) : undefined,
      isPublished: Boolean(isPublished),
      order: nextOrder,
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: getUserDisplayName(req.user),
    };

    currentPlans.push(newPlan);

    await savePlatformSettingsDurable({ showcaseRoomPlans: currentPlans });

    return res.status(201).json({
      message: 'Modèle de salle ajouté à la vitrine avec succès.',
      plan: newPlan,
    });
  } catch (error: any) {
    console.error('[ShowcasePlan] Erreur création plan vitrine:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du modèle de salle' });
  }
}

/**
 * PUT /api/admin/showcase-plans/:id
 * Met à jour un modèle de salle vitrine existant (blueprint 2D/3D, libellé, visibilité, etc.).
 */
export async function updateShowcasePlan(req: AuthenticatedRequest, res: Response) {
  try {
    if (!canManageShowcasePlans(req.user)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges de gestion des plans vitrine requis.' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Identifiant du modèle manquant.' });
    }

    const settings = loadPlatformSettings();
    const currentPlans: ShowcaseRoomPlanItem[] =
      Array.isArray(settings.showcaseRoomPlans) && settings.showcaseRoomPlans.length > 0
        ? [...settings.showcaseRoomPlans]
        : [...DEFAULT_SHOWCASE_ROOM_PLANS];

    const index = currentPlans.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Modèle de salle introuvable.' });
    }

    const existing = currentPlans[index];
    const {
      name,
      label,
      category,
      description,
      outlineShape,
      blueprint,
      presetId,
      isPublished,
      order,
    } = req.body;

    const updatedPlan: ShowcaseRoomPlanItem = {
      ...existing,
      name: name !== undefined ? String(name).trim() : existing.name,
      label: label !== undefined ? String(label).trim() : existing.label,
      category: category !== undefined ? String(category).trim() : existing.category,
      description: description !== undefined ? String(description).trim() : existing.description,
      outlineShape: outlineShape !== undefined ? String(outlineShape) : existing.outlineShape,
      blueprint: blueprint !== undefined ? blueprint : existing.blueprint,
      presetId: presetId !== undefined ? (presetId ? String(presetId) : undefined) : existing.presetId,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : existing.isPublished,
      order: order !== undefined && Number.isFinite(Number(order)) ? Number(order) : existing.order,
      updatedAt: new Date().toISOString(),
      updatedBy: getUserDisplayName(req.user),
    };

    currentPlans[index] = updatedPlan;

    await savePlatformSettingsDurable({ showcaseRoomPlans: currentPlans });

    return res.json({
      message: 'Modèle de salle mis à jour avec succès.',
      plan: updatedPlan,
    });
  } catch (error: any) {
    console.error('[ShowcasePlan] Erreur mise à jour plan vitrine:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du modèle de salle' });
  }
}

/**
 * DELETE /api/admin/showcase-plans/:id
 * Supprime un plan de la vitrine.
 */
export async function deleteShowcasePlan(req: AuthenticatedRequest, res: Response) {
  try {
    if (!canManageShowcasePlans(req.user)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges de gestion des plans vitrine requis.' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Identifiant du modèle manquant.' });
    }

    const settings = loadPlatformSettings();
    const currentPlans: ShowcaseRoomPlanItem[] =
      Array.isArray(settings.showcaseRoomPlans) && settings.showcaseRoomPlans.length > 0
        ? [...settings.showcaseRoomPlans]
        : [...DEFAULT_SHOWCASE_ROOM_PLANS];

    const filtered = currentPlans.filter((p) => p.id !== id);
    if (filtered.length === currentPlans.length) {
      return res.status(404).json({ error: 'Modèle de salle introuvable.' });
    }

    await savePlatformSettingsDurable({ showcaseRoomPlans: filtered });

    return res.json({
      success: true,
      message: 'Modèle supprimé de la vitrine.',
    });
  } catch (error: any) {
    console.error('[ShowcasePlan] Erreur suppression plan vitrine:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du modèle' });
  }
}

/**
 * PUT /api/admin/showcase-plans/selection
 * Met à jour en masse la sélection et l'ordre des modèles affichés sur la vitrine.
 */
export async function updateShowcasePlansSelection(req: AuthenticatedRequest, res: Response) {
  try {
    if (!canManageShowcasePlans(req.user)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges de gestion des plans vitrine requis.' });
    }

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Le champ items doit être un tableau.' });
    }

    const settings = loadPlatformSettings();
    const currentPlans: ShowcaseRoomPlanItem[] =
      Array.isArray(settings.showcaseRoomPlans) && settings.showcaseRoomPlans.length > 0
        ? [...settings.showcaseRoomPlans]
        : [...DEFAULT_SHOWCASE_ROOM_PLANS];

    const updatesMap = new Map<string, { isPublished?: boolean; order?: number }>();
    for (const item of items) {
      if (item && item.id) {
        updatesMap.set(String(item.id), {
          isPublished: item.isPublished !== undefined ? Boolean(item.isPublished) : undefined,
          order: Number.isFinite(Number(item.order)) ? Number(item.order) : undefined,
        });
      }
    }

    const nowIso = new Date().toISOString();
    const userDisplay = getUserDisplayName(req.user);

    const updatedPlans = currentPlans.map((plan) => {
      const patch = updatesMap.get(plan.id);
      if (!patch) return plan;
      return {
        ...plan,
        isPublished: patch.isPublished !== undefined ? patch.isPublished : plan.isPublished,
        order: patch.order !== undefined ? patch.order : plan.order,
        updatedAt: nowIso,
        updatedBy: userDisplay,
      };
    });

    await savePlatformSettingsDurable({ showcaseRoomPlans: updatedPlans });

    return res.json({
      message: 'Sélection et ordre de la vitrine mis à jour avec succès.',
      plans: updatedPlans.sort((a, b) => a.order - b.order),
    });
  } catch (error: any) {
    console.error('[ShowcasePlan] Erreur mise à jour sélection:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la sélection' });
  }
}
