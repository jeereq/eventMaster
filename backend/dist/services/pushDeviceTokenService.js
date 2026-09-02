"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertPushDeviceToken = upsertPushDeviceToken;
exports.removePushDeviceToken = removePushDeviceToken;
exports.getPushTokensForUser = getPushTokensForUser;
exports.removeInvalidPushTokens = removeInvalidPushTokens;
const db_1 = require("../db");
async function upsertPushDeviceToken(userId, token, platform) {
    const normalizedPlatform = platform.toLowerCase();
    return db_1.prisma.pushDeviceToken.upsert({
        where: { token },
        create: { userId, token, platform: normalizedPlatform },
        update: { userId, platform: normalizedPlatform },
    });
}
async function removePushDeviceToken(userId, token) {
    const result = await db_1.prisma.pushDeviceToken.deleteMany({
        where: { userId, token },
    });
    return result.count;
}
async function getPushTokensForUser(userId) {
    const rows = await db_1.prisma.pushDeviceToken.findMany({
        where: { userId },
        select: { token: true },
    });
    return rows.map((r) => r.token);
}
async function removeInvalidPushTokens(tokens) {
    if (tokens.length === 0)
        return;
    await db_1.prisma.pushDeviceToken.deleteMany({
        where: { token: { in: tokens } },
    });
}
