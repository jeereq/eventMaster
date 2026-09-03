"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeSimulationRun = serializeSimulationRun;
exports.saveAiSimulationRun = saveAiSimulationRun;
exports.listAiSimulationRuns = listAiSimulationRuns;
exports.claimDeviceSimulations = claimDeviceSimulations;
const db_1 = require("../db");
function serializeSimulationRun(run) {
    return {
        id: run.id,
        userId: run.userId,
        deviceId: run.deviceId,
        source: run.source,
        prompt: run.prompt,
        eventType: run.eventType,
        city: run.city,
        commune: run.commune,
        guestCount: run.guestCount,
        budgetMaxFc: run.budgetMaxFc,
        eventDate: run.eventDate,
        result: run.result,
        createdAt: run.createdAt.toISOString(),
    };
}
async function saveAiSimulationRun(input) {
    const deviceId = input.deviceId?.trim() || null;
    const userId = input.userId?.trim() || null;
    if (!deviceId && !userId)
        return null;
    const run = await db_1.prisma.aiSimulationRun.create({
        data: {
            userId,
            deviceId,
            source: input.source,
            prompt: input.prompt?.trim() || null,
            eventType: input.eventType || null,
            city: input.city || null,
            commune: input.commune || null,
            guestCount: input.guestCount && input.guestCount > 0 ? Math.round(input.guestCount) : null,
            budgetMaxFc: input.budgetMaxFc && input.budgetMaxFc > 0 ? Math.round(input.budgetMaxFc) : null,
            eventDate: input.eventDate || null,
            result: input.result,
        },
    });
    return serializeSimulationRun(run);
}
async function listAiSimulationRuns(opts) {
    const userId = opts.userId?.trim() || null;
    const deviceId = opts.deviceId?.trim() || null;
    if (!userId && !deviceId)
        return [];
    const take = Math.min(Math.max(opts.limit ?? 12, 1), 40);
    const where = userId && deviceId
        ? { OR: [{ userId }, { deviceId }] }
        : userId
            ? { userId }
            : { deviceId };
    const rows = await db_1.prisma.aiSimulationRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
    });
    return rows.map(serializeSimulationRun);
}
async function claimDeviceSimulations(userId, deviceId) {
    const cleanDevice = deviceId.trim();
    if (!cleanDevice || !userId)
        return { claimed: 0 };
    const result = await db_1.prisma.aiSimulationRun.updateMany({
        where: { deviceId: cleanDevice, userId: null },
        data: { userId },
    });
    return { claimed: result.count };
}
