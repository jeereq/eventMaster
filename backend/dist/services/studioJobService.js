"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudioJob = createStudioJob;
exports.getStudioJob = getStudioJob;
exports.listStudioJobs = listStudioJobs;
exports.markStudioJobRunning = markStudioJobRunning;
exports.completeStudioJob = completeStudioJob;
exports.failStudioJob = failStudioJob;
exports.runStudioJob = runStudioJob;
exports.serializeStudioJob = serializeStudioJob;
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
const prismaJson_ts_1 = require("../utils/prismaJson.js");
const JOB_TTL_MS = 2 * 60 * 60 * 1000;
const STALE_RUNNING_MS = 15 * 60 * 1000;
const jobs = new Map();
function shouldPersistStudioJobs() {
    if (process.env.STUDIO_JOBS_MEMORY === '1')
        return false;
    if (process.env.NODE_ENV === 'test')
        return false;
    if (process.argv.includes('--test') || process.argv.some((arg) => arg.includes('.test.ts'))) {
        return false;
    }
    return true;
}
function pruneStudioJobs() {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of jobs) {
        if (job.updatedAt < cutoff)
            jobs.delete(id);
    }
}
function canReadJob(job, userId, deviceId) {
    if (userId && job.userId === userId)
        return true;
    if (deviceId && job.deviceId === deviceId)
        return true;
    return false;
}
function expireStaleRunningJob(job) {
    if (job.status !== 'running' && job.status !== 'queued')
        return job;
    if (Date.now() - job.updatedAt < STALE_RUNNING_MS)
        return job;
    job.status = 'error';
    job.error = 'Le serveur a redémarré pendant la génération. Relancez la création.';
    job.updatedAt = Date.now();
    persistStudioJob(job);
    return job;
}
function rowToJob(row) {
    return {
        id: row.id,
        kind: row.kind === 'room' ? 'room' : 'invitation',
        status: row.status === 'running' || row.status === 'done' || row.status === 'error'
            ? row.status
            : 'queued',
        userId: row.userId,
        deviceId: row.deviceId,
        prompt: row.prompt,
        error: row.error || undefined,
        historyId: row.historyId,
        result: row.result && typeof row.result === 'object' && !Array.isArray(row.result)
            ? row.result
            : undefined,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    };
}
async function persistStudioJob(job) {
    if (!shouldPersistStudioJobs())
        return;
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../db.js")));
        const data = {
            kind: job.kind,
            status: job.status,
            userId: job.userId,
            deviceId: job.deviceId,
            prompt: job.prompt,
            error: job.error || null,
            historyId: job.historyId || null,
            result: job.result ? (0, prismaJson_ts_1.toPrismaJson)(job.result) : client_1.Prisma.DbNull,
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
        };
        await prisma.studioJob.upsert({
            where: { id: job.id },
            create: { id: job.id, ...data },
            update: {
                status: data.status,
                error: data.error,
                historyId: data.historyId,
                result: data.result,
                updatedAt: data.updatedAt,
            },
        });
    }
    catch (error) {
        console.warn('[studioJob] persist skipped:', error?.message);
    }
}
async function loadPersistedStudioJob(id) {
    if (!shouldPersistStudioJobs())
        return null;
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../db.js")));
        const row = await prisma.studioJob.findUnique({ where: { id } });
        return row ? rowToJob(row) : null;
    }
    catch (error) {
        console.warn('[studioJob] load skipped:', error?.message);
        return null;
    }
}
async function loadPersistedStudioJobs(access) {
    if (!shouldPersistStudioJobs())
        return;
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../db.js")));
        const or = [];
        if (access.userId)
            or.push({ userId: access.userId });
        if (access.deviceId)
            or.push({ deviceId: access.deviceId });
        if (!or.length)
            return;
        const cutoff = new Date(Date.now() - JOB_TTL_MS);
        const rows = await prisma.studioJob.findMany({
            where: { OR: or, updatedAt: { gte: cutoff } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        for (const row of rows) {
            const incoming = rowToJob(row);
            const existing = jobs.get(incoming.id);
            if (!existing || incoming.updatedAt >= existing.updatedAt) {
                jobs.set(incoming.id, incoming);
            }
        }
        await prisma.studioJob.deleteMany({ where: { updatedAt: { lt: cutoff } } }).catch(() => undefined);
    }
    catch (error) {
        console.warn('[studioJob] list load skipped:', error?.message);
    }
}
function createStudioJob(input) {
    pruneStudioJobs();
    const now = Date.now();
    const job = {
        id: (0, node_crypto_1.randomUUID)(),
        kind: input.kind,
        status: 'queued',
        userId: input.userId?.trim() || null,
        deviceId: input.deviceId.trim(),
        prompt: (input.prompt || '').trim().slice(0, 200),
        createdAt: now,
        updatedAt: now,
    };
    jobs.set(job.id, job);
    void persistStudioJob(job);
    return job;
}
async function getStudioJob(id, access) {
    pruneStudioJobs();
    let job = jobs.get(id) || null;
    if (!job) {
        job = await loadPersistedStudioJob(id);
        if (job)
            jobs.set(job.id, job);
    }
    if (!job)
        return null;
    const latest = expireStaleRunningJob(job);
    if (access && !canReadJob(latest, access.userId, access.deviceId))
        return null;
    return latest;
}
async function listStudioJobs(access) {
    await loadPersistedStudioJobs(access);
    pruneStudioJobs();
    return [...jobs.values()]
        .map((job) => expireStaleRunningJob(job))
        .filter((job) => canReadJob(job, access.userId, access.deviceId))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20);
}
function markStudioJobRunning(id) {
    const job = jobs.get(id);
    if (!job)
        return;
    job.status = 'running';
    job.updatedAt = Date.now();
    void persistStudioJob(job);
}
function completeStudioJob(id, payload) {
    const job = jobs.get(id);
    if (!job)
        return;
    job.status = 'done';
    job.result = payload.result;
    job.historyId = payload.historyId || null;
    job.updatedAt = Date.now();
    void persistStudioJob(job);
}
function failStudioJob(id, message) {
    const job = jobs.get(id);
    if (!job)
        return;
    job.status = 'error';
    job.error = message.slice(0, 400);
    job.updatedAt = Date.now();
    void persistStudioJob(job);
}
function runStudioJob(id, work) {
    markStudioJobRunning(id);
    setImmediate(() => {
        work().catch((error) => {
            const message = error instanceof Error ? error.message : 'La génération a échoué.';
            failStudioJob(id, message);
        });
    });
}
function serializeStudioJob(job) {
    return {
        id: job.id,
        kind: job.kind,
        status: job.status,
        prompt: job.prompt,
        error: job.error || null,
        historyId: job.historyId || null,
        result: job.status === 'done' ? job.result || null : null,
        createdAt: new Date(job.createdAt).toISOString(),
        updatedAt: new Date(job.updatedAt).toISOString(),
    };
}
