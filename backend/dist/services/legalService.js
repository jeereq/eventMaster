"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuestLegalStatus = getGuestLegalStatus;
exports.recordGuestLegalAcceptance = recordGuestLegalAcceptance;
exports.getUserLegalStatus = getUserLegalStatus;
exports.recordUserLegalAcceptance = recordUserLegalAcceptance;
exports.findGuestsByIdentity = findGuestsByIdentity;
const db_1 = require("../db");
const legalConfig_1 = require("../config/legalConfig");
const guestIdentity_1 = require("../utils/guestIdentity");
function getCurrentVersion(documentType) {
    return documentType === 'TERMS' ? legalConfig_1.TERMS_VERSION : legalConfig_1.PRIVACY_VERSION;
}
function buildIdentityOrClauses(email, phone) {
    const clauses = [];
    if (email)
        clauses.push({ normalizedEmail: email });
    if (phone)
        clauses.push({ normalizedPhone: phone });
    return clauses;
}
async function getGuestLegalStatus(guestId) {
    const guest = await db_1.prisma.guest.findUnique({
        where: { id: guestId },
        select: { id: true, email: true, phone: true, preferences: true },
    });
    if (!guest)
        return null;
    const normalizedEmail = (0, guestIdentity_1.extractGuestEmail)(guest);
    const normalizedPhone = (0, guestIdentity_1.extractGuestPhone)(guest);
    const identityClauses = buildIdentityOrClauses(normalizedEmail, normalizedPhone);
    if (identityClauses.length === 0) {
        return {
            termsAccepted: false,
            privacyAccepted: false,
            termsVersion: legalConfig_1.TERMS_VERSION,
            privacyVersion: legalConfig_1.PRIVACY_VERSION,
            identityEmail: normalizedEmail,
            identityPhone: normalizedPhone,
        };
    }
    const acceptances = await db_1.prisma.legalAcceptance.findMany({
        where: {
            subjectType: 'GUEST',
            OR: identityClauses,
        },
        orderBy: { acceptedAt: 'desc' },
    });
    const hasAccepted = (documentType) => acceptances.some((item) => item.documentType === documentType &&
        item.documentVersion === getCurrentVersion(documentType));
    return {
        termsAccepted: hasAccepted('TERMS'),
        privacyAccepted: hasAccepted('PRIVACY'),
        termsVersion: legalConfig_1.TERMS_VERSION,
        privacyVersion: legalConfig_1.PRIVACY_VERSION,
        identityEmail: normalizedEmail,
        identityPhone: normalizedPhone,
    };
}
async function recordGuestLegalAcceptance(params) {
    const guest = await db_1.prisma.guest.findUnique({
        where: { id: params.guestId },
        select: { id: true, email: true, phone: true, preferences: true },
    });
    if (!guest)
        return null;
    if (!params.acceptTerms || !params.acceptPrivacy) {
        throw new Error('TERMS_AND_PRIVACY_REQUIRED');
    }
    const normalizedEmail = (0, guestIdentity_1.extractGuestEmail)(guest);
    const normalizedPhone = (0, guestIdentity_1.extractGuestPhone)(guest);
    const now = new Date();
    const records = [
        {
            subjectType: 'GUEST',
            guestId: guest.id,
            normalizedEmail,
            normalizedPhone,
            documentType: 'TERMS',
            documentVersion: legalConfig_1.TERMS_VERSION,
            ipAddress: params.ipAddress || null,
            userAgent: params.userAgent || null,
            acceptedAt: now,
        },
        {
            subjectType: 'GUEST',
            guestId: guest.id,
            normalizedEmail,
            normalizedPhone,
            documentType: 'PRIVACY',
            documentVersion: legalConfig_1.PRIVACY_VERSION,
            ipAddress: params.ipAddress || null,
            userAgent: params.userAgent || null,
            acceptedAt: now,
        },
    ];
    await db_1.prisma.legalAcceptance.createMany({ data: records });
    return getGuestLegalStatus(params.guestId);
}
async function getUserLegalStatus(userId) {
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            phone: true,
            termsAcceptedAt: true,
            privacyAcceptedAt: true,
            termsVersion: true,
            privacyVersion: true,
        },
    });
    if (!user)
        return null;
    const termsAccepted = !!user.termsAcceptedAt && user.termsVersion === legalConfig_1.TERMS_VERSION;
    const privacyAccepted = !!user.privacyAcceptedAt && user.privacyVersion === legalConfig_1.PRIVACY_VERSION;
    return {
        termsAccepted,
        privacyAccepted,
        termsVersion: legalConfig_1.TERMS_VERSION,
        privacyVersion: legalConfig_1.PRIVACY_VERSION,
        requiresAcceptance: !(termsAccepted && privacyAccepted),
    };
}
async function recordUserLegalAcceptance(params) {
    if (!params.acceptTerms || !params.acceptPrivacy) {
        throw new Error('TERMS_AND_PRIVACY_REQUIRED');
    }
    const user = await db_1.prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true, email: true, phone: true },
    });
    if (!user)
        return null;
    const normalizedEmail = user.email.trim().toLowerCase();
    const normalizedPhone = (0, guestIdentity_1.normalizePhone)(user.phone);
    const now = new Date();
    await db_1.prisma.$transaction([
        db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                termsAcceptedAt: now,
                privacyAcceptedAt: now,
                termsVersion: legalConfig_1.TERMS_VERSION,
                privacyVersion: legalConfig_1.PRIVACY_VERSION,
            },
        }),
        db_1.prisma.legalAcceptance.createMany({
            data: [
                {
                    subjectType: 'USER',
                    userId: user.id,
                    normalizedEmail,
                    normalizedPhone,
                    documentType: 'TERMS',
                    documentVersion: legalConfig_1.TERMS_VERSION,
                    ipAddress: params.ipAddress || null,
                    userAgent: params.userAgent || null,
                    acceptedAt: now,
                },
                {
                    subjectType: 'USER',
                    userId: user.id,
                    normalizedEmail,
                    normalizedPhone,
                    documentType: 'PRIVACY',
                    documentVersion: legalConfig_1.PRIVACY_VERSION,
                    ipAddress: params.ipAddress || null,
                    userAgent: params.userAgent || null,
                    acceptedAt: now,
                },
            ],
        }),
    ]);
    return getUserLegalStatus(params.userId);
}
async function findGuestsByIdentity(guest) {
    const normalizedEmail = (0, guestIdentity_1.extractGuestEmail)(guest);
    const normalizedPhone = (0, guestIdentity_1.extractGuestPhone)(guest);
    const orClauses = (0, guestIdentity_1.buildGuestIdentityOrClauses)(normalizedEmail, normalizedPhone);
    if (orClauses.length === 0) {
        return [];
    }
    const matched = await db_1.prisma.guest.findMany({
        where: { OR: orClauses },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    date: true,
                    location: true,
                    tenant: { select: { name: true } },
                },
            },
        },
    });
    const seen = new Set();
    const unique = matched.filter((record) => {
        if (seen.has(record.id))
            return false;
        seen.add(record.id);
        return true;
    });
    return unique;
}
