import { prisma } from '../db';

export async function upsertPushDeviceToken(userId: string, token: string, platform: string) {
  const normalizedPlatform = platform.toLowerCase();
  return prisma.pushDeviceToken.upsert({
    where: { token },
    create: { userId, token, platform: normalizedPlatform },
    update: { userId, platform: normalizedPlatform },
  });
}

export async function removePushDeviceToken(userId: string, token: string) {
  const result = await prisma.pushDeviceToken.deleteMany({
    where: { userId, token },
  });
  return result.count;
}

export async function getPushTokensForUser(userId: string): Promise<string[]> {
  const rows = await prisma.pushDeviceToken.findMany({
    where: { userId },
    select: { token: true },
  });
  return rows.map((r) => r.token);
}

export async function removeInvalidPushTokens(tokens: string[]) {
  if (tokens.length === 0) return;
  await prisma.pushDeviceToken.deleteMany({
    where: { token: { in: tokens } },
  });
}
