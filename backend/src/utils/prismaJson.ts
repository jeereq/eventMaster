import { Prisma } from '@prisma/client';

/** Convertit une valeur en JSON compatible Prisma (Json / InputJsonValue). */
export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
