"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPrismaJson = toPrismaJson;
/** Convertit une valeur en JSON compatible Prisma (Json / InputJsonValue). */
function toPrismaJson(value) {
    return JSON.parse(JSON.stringify(value));
}
