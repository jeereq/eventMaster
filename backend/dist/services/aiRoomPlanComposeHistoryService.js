"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeRoomPlanComposeRun = exports.persistableRoomPlanImageUrl = void 0;
exports.saveAiRoomPlanComposeRun = saveAiRoomPlanComposeRun;
exports.listAiRoomPlanComposeRuns = listAiRoomPlanComposeRuns;
exports.getAiRoomPlanComposeRun = getAiRoomPlanComposeRun;
exports.claimDeviceRoomPlanComposeRuns = claimDeviceRoomPlanComposeRuns;
const db_1 = require("../db");
const aiRoomPlanComposeHistoryUtils_1 = require("./aiRoomPlanComposeHistoryUtils");
Object.defineProperty(exports, "persistableRoomPlanImageUrl", { enumerable: true, get: function () { return aiRoomPlanComposeHistoryUtils_1.persistableRoomPlanImageUrl; } });
Object.defineProperty(exports, "serializeRoomPlanComposeRun", { enumerable: true, get: function () { return aiRoomPlanComposeHistoryUtils_1.serializeRoomPlanComposeRun; } });
async function saveAiRoomPlanComposeRun(input) {
    const deviceId = input.deviceId?.trim() || null;
    const userId = input.userId?.trim() || null;
    if (!deviceId && !userId)
        return null;
    const run = await db_1.prisma.aiRoomPlanComposeRun.create({
        data: {
            userId,
            deviceId,
            source: input.source,
            prompt: input.prompt?.trim()?.slice(0, 2000) || null,
            imageUrl: (0, aiRoomPlanComposeHistoryUtils_1.persistableRoomPlanImageUrl)(input.imageUrl),
            roomType: input.roomType?.trim()?.slice(0, 40) || null,
            widthM: Number.isFinite(input.widthM) ? input.widthM : null,
            heightM: Number.isFinite(input.heightM) ? input.heightM : null,
            draft: input.draft,
        },
    });
    return (0, aiRoomPlanComposeHistoryUtils_1.serializeRoomPlanComposeRun)(run);
}
async function listAiRoomPlanComposeRuns(opts) {
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
    const rows = await db_1.prisma.aiRoomPlanComposeRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
    });
    return rows.map(aiRoomPlanComposeHistoryUtils_1.serializeRoomPlanComposeRun);
}
async function getAiRoomPlanComposeRun(opts) {
    const id = opts.id?.trim();
    if (!id)
        return null;
    const userId = opts.userId?.trim() || null;
    const deviceId = opts.deviceId?.trim() || null;
    const run = await db_1.prisma.aiRoomPlanComposeRun.findUnique({ where: { id } });
    if (!run)
        return null;
    const allowed = (userId && run.userId === userId) ||
        (deviceId && run.deviceId === deviceId) ||
        (userId && !run.userId && deviceId && run.deviceId === deviceId);
    if (!allowed)
        return null;
    return (0, aiRoomPlanComposeHistoryUtils_1.serializeRoomPlanComposeRun)(run);
}
async function claimDeviceRoomPlanComposeRuns(userId, deviceId) {
    const cleanDevice = deviceId.trim();
    if (!cleanDevice || !userId)
        return { claimed: 0 };
    const result = await db_1.prisma.aiRoomPlanComposeRun.updateMany({
        where: { deviceId: cleanDevice, userId: null },
        data: { userId },
    });
    return { claimed: result.count };
}
