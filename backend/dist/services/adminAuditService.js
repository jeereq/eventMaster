"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestClientIp = requestClientIp;
exports.logAdminAction = logAdminAction;
exports.auditReq = auditReq;
exports.serializeAuditLog = serializeAuditLog;
const db_1 = require("../db");
function requestClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0]?.trim() || null;
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
        return forwarded[0].split(',')[0]?.trim() || null;
    }
    return req.ip || req.socket?.remoteAddress || null;
}
async function logAdminAction(params) {
    try {
        const actor = await db_1.prisma.user.findUnique({
            where: { id: params.actorId },
            select: { email: true },
        });
        await db_1.prisma.adminAuditLog.create({
            data: {
                actorId: params.actorId,
                actorEmail: actor?.email || 'inconnu',
                actorRole: params.actorRole,
                action: params.action,
                targetType: params.targetType,
                targetId: params.targetId ?? null,
                tenantId: params.tenantId ?? null,
                summary: params.summary,
                metadata: params.metadata
                    ? JSON.parse(JSON.stringify(params.metadata))
                    : undefined,
                ip: params.ip ?? null,
            },
        });
    }
    catch (error) {
        console.error('[AdminAudit] Impossible d’enregistrer l’action:', error);
    }
}
async function auditReq(req, payload) {
    if (!req.user?.id)
        return;
    await logAdminAction({
        actorId: req.user.id,
        actorRole: req.user.role,
        ip: requestClientIp(req),
        ...payload,
    });
}
function serializeAuditLog(log) {
    return {
        id: log.id,
        actorId: log.actorId,
        actorEmail: log.actorEmail,
        actorRole: log.actorRole,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        tenantId: log.tenantId,
        summary: log.summary,
        metadata: log.metadata,
        ip: log.ip,
        createdAt: log.createdAt,
    };
}
