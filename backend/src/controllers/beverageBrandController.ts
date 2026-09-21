import { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import {
  archiveBeverageBrand,
  createBeverageBrand,
  isUnknownBrandConstraint,
  listBeverageBrands,
  listVendorBeverageCatalog,
  replaceVendorBeveragePrices,
  updateBeverageBrand,
} from '../services/beverageBrandService';

function sendError(res: Response, error: unknown, fallback: string) {
  if (isUnknownBrandConstraint(error)) {
    return res.status(409).json({ error: 'Cette marque existe déjà dans cette famille.' });
  }
  const message = error instanceof Error ? error.message : fallback;
  const status = /introuvable/i.test(message) ? 404 : 400;
  return res.status(status).json({ error: message || fallback });
}

export async function getBeverageBrands(_req: AuthenticatedRequest, res: Response) {
  try {
    const brands = await listBeverageBrands();
    return res.json({ brands });
  } catch (error) {
    return sendError(res, error, 'Impossible de charger les marques.');
  }
}

export async function getAdminBeverageBrands(_req: AuthenticatedRequest, res: Response) {
  try {
    const brands = await listBeverageBrands({ includeInactive: true });
    return res.json({ brands });
  } catch (error) {
    return sendError(res, error, 'Impossible de charger les marques.');
  }
}

export async function postAdminBeverageBrand(req: AuthenticatedRequest, res: Response) {
  try {
    const brand = await createBeverageBrand(req.body);
    return res.status(201).json({ brand });
  } catch (error) {
    return sendError(res, error, 'Impossible d’enregistrer la marque.');
  }
}

export async function putAdminBeverageBrand(req: AuthenticatedRequest, res: Response) {
  try {
    const brand = await updateBeverageBrand(String(req.params.id), req.body);
    return res.json({ brand });
  } catch (error) {
    return sendError(res, error, 'Impossible de modifier la marque.');
  }
}

export async function deleteAdminBeverageBrand(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await archiveBeverageBrand(String(req.params.id));
    return res.json(result);
  } catch (error) {
    return sendError(res, error, 'Impossible de retirer la marque.');
  }
}

async function assertVendorManager(req: AuthenticatedRequest, res: Response) {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    res.status(403).json({ error: 'Organisation requise pour tarifer les marques.' });
    return null;
  }
  const access = await resolveOrgAccess(userId, tenantId);
  if (!access.canManageRooms) {
    res.status(403).json({ error: 'Seuls les responsables de l’organisation peuvent définir ces prix.' });
    return null;
  }
  return tenantId;
}

export async function getMyBeverageCatalog(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = await assertVendorManager(req, res);
    if (!tenantId) return;
    const brands = await listVendorBeverageCatalog(tenantId);
    return res.json({ brands });
  } catch (error) {
    return sendError(res, error, 'Impossible de charger vos tarifs.');
  }
}

export async function putMyBeveragePrices(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = await assertVendorManager(req, res);
    if (!tenantId) return;
    const brands = await replaceVendorBeveragePrices(tenantId, req.body);
    return res.json({ brands });
  } catch (error) {
    return sendError(res, error, 'Impossible d’enregistrer les prix.');
  }
}
