"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicStudioJob = getPublicStudioJob;
exports.listPublicStudioJobs = listPublicStudioJobs;
const studioJobService_1 = require("../services/studioJobService");
function jobAccess(req) {
    const userId = req.user?.id || null;
    const deviceId = typeof req.query.deviceId === 'string'
        ? req.query.deviceId.trim()
        : typeof req.body?.deviceId === 'string'
            ? String(req.body.deviceId).trim()
            : '';
    return { userId, deviceId: deviceId || null };
}
async function getPublicStudioJob(req, res) {
    const access = jobAccess(req);
    if (!access.userId && !access.deviceId) {
        return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
    }
    const job = await (0, studioJobService_1.getStudioJob)(String(req.params.jobId || ''), access);
    if (!job)
        return res.status(404).json({ error: 'Tâche introuvable.' });
    return res.json((0, studioJobService_1.serializeStudioJob)(job));
}
async function listPublicStudioJobs(req, res) {
    const access = jobAccess(req);
    if (!access.userId && !access.deviceId) {
        return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
    }
    const items = await (0, studioJobService_1.listStudioJobs)(access);
    return res.json({ items: items.map(studioJobService_1.serializeStudioJob) });
}
