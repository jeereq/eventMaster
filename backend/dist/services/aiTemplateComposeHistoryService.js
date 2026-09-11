"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeTemplateComposeRun = void 0;
exports.saveAiTemplateComposeRun = saveAiTemplateComposeRun;
exports.listAiTemplateComposeRuns = listAiTemplateComposeRuns;
exports.getAiTemplateComposeRun = getAiTemplateComposeRun;
exports.claimDeviceTemplateComposeRuns = claimDeviceTemplateComposeRuns;
const db_1 = require("../db");
const aiTemplateComposeHistoryUtils_1 = require("./aiTemplateComposeHistoryUtils");
Object.defineProperty(exports, "serializeTemplateComposeRun", { enumerable: true, get: function () { return aiTemplateComposeHistoryUtils_1.serializeTemplateComposeRun; } });
function extractPreviewUrl(content) {
    const global = content?.global;
    if (!global || typeof global !== 'object')
        return null;
    const url = global.bgImageUrl;
    return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null;
}
async function saveAiTemplateComposeRun(input) {
    const deviceId = input.deviceId?.trim() || null;
    const userId = input.userId?.trim() || null;
    if (!deviceId && !userId)
        return null;
    const referenceUrls = (input.referenceUrls || [])
        .filter((u) => typeof u === 'string' && u.trim())
        .map((u) => u.trim())
        .slice(0, 4);
    const run = await db_1.prisma.aiTemplateComposeRun.create({
        data: {
            userId,
            deviceId,
            source: input.source,
            prompt: input.prompt?.trim()?.slice(0, 2000) || null,
            referenceUrls,
            previewImageUrl: extractPreviewUrl(input.content),
            content: input.content,
            stage: (input.stage || null),
        },
    });
    return (0, aiTemplateComposeHistoryUtils_1.serializeTemplateComposeRun)(run);
}
async function listAiTemplateComposeRuns(opts) {
    const userId = opts.userId?.trim() || null;
    const deviceId = opts.deviceId?.trim() || null;
    if (!userId && !deviceId)
        return [];
    const take = Math.min(Math.max(opts.limit ?? 20, 1), 40);
    const where = userId && deviceId
        ? { OR: [{ userId }, { deviceId }] }
        : userId
            ? { userId }
            : { deviceId };
    const rows = await db_1.prisma.aiTemplateComposeRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
    });
    return rows.map(aiTemplateComposeHistoryUtils_1.serializeTemplateComposeRun);
}
async function getAiTemplateComposeRun(opts) {
    const id = opts.id?.trim();
    if (!id)
        return null;
    const userId = opts.userId?.trim() || null;
    const deviceId = opts.deviceId?.trim() || null;
    const run = await db_1.prisma.aiTemplateComposeRun.findUnique({ where: { id } });
    if (!run)
        return null;
    const allowed = (userId && run.userId === userId) ||
        (deviceId && run.deviceId === deviceId) ||
        (userId && !run.userId && deviceId && run.deviceId === deviceId);
    if (!allowed)
        return null;
    return (0, aiTemplateComposeHistoryUtils_1.serializeTemplateComposeRun)(run);
}
async function claimDeviceTemplateComposeRuns(userId, deviceId) {
    const cleanDevice = deviceId.trim();
    if (!cleanDevice || !userId)
        return { claimed: 0 };
    const result = await db_1.prisma.aiTemplateComposeRun.updateMany({
        where: { deviceId: cleanDevice, userId: null },
        data: { userId },
    });
    return { claimed: result.count };
}
