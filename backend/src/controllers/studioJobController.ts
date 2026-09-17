import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getStudioJob, listStudioJobs, serializeStudioJob } from '../services/studioJobService';

function jobAccess(req: Request) {
  const userId = (req as AuthenticatedRequest).user?.id || null;
  const deviceId =
    typeof req.query.deviceId === 'string'
      ? req.query.deviceId.trim()
      : typeof req.body?.deviceId === 'string'
        ? String(req.body.deviceId).trim()
        : '';
  return { userId, deviceId: deviceId || null };
}

export async function getPublicStudioJob(req: Request, res: Response) {
  const access = jobAccess(req);
  if (!access.userId && !access.deviceId) {
    return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
  }
  const job = await getStudioJob(String(req.params.jobId || ''), access);
  if (!job) return res.status(404).json({ error: 'Tâche introuvable.' });
  return res.json(serializeStudioJob(job));
}

export async function listPublicStudioJobs(req: Request, res: Response) {
  const access = jobAccess(req);
  if (!access.userId && !access.deviceId) {
    return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
  }
  const items = await listStudioJobs(access);
  return res.json({ items: items.map(serializeStudioJob) });
}
