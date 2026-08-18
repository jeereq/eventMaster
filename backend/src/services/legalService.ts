import { prisma } from '../db';
import { PRIVACY_VERSION, TERMS_VERSION } from '../config/legalConfig';
import {
  buildGuestIdentityOrClauses,
  extractGuestEmail,
  extractGuestPhone,
  normalizePhone,
} from '../utils/guestIdentity';

type DocumentType = 'TERMS' | 'PRIVACY';

function getCurrentVersion(documentType: DocumentType): string {
  return documentType === 'TERMS' ? TERMS_VERSION : PRIVACY_VERSION;
}

function buildIdentityOrClauses(email: string | null, phone: string | null) {
  const clauses: Array<Record<string, unknown>> = [];
  if (email) clauses.push({ normalizedEmail: email });
  if (phone) clauses.push({ normalizedPhone: phone });
  return clauses;
}

export async function getGuestLegalStatus(guestId: string) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { id: true, email: true, phone: true, preferences: true },
  });

  if (!guest) return null;

  const normalizedEmail = extractGuestEmail(guest);
  const normalizedPhone = extractGuestPhone(guest);
  const identityClauses = buildIdentityOrClauses(normalizedEmail, normalizedPhone);

  if (identityClauses.length === 0) {
    return {
      termsAccepted: false,
      privacyAccepted: false,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      identityEmail: normalizedEmail,
      identityPhone: normalizedPhone,
    };
  }

  const acceptances = await prisma.legalAcceptance.findMany({
    where: {
      subjectType: 'GUEST',
      OR: identityClauses,
    },
    orderBy: { acceptedAt: 'desc' },
  });

  const hasAccepted = (documentType: DocumentType) =>
    acceptances.some(
      (item) =>
        item.documentType === documentType &&
        item.documentVersion === getCurrentVersion(documentType),
    );

  return {
    termsAccepted: hasAccepted('TERMS'),
    privacyAccepted: hasAccepted('PRIVACY'),
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    identityEmail: normalizedEmail,
    identityPhone: normalizedPhone,
  };
}

export async function recordGuestLegalAcceptance(params: {
  guestId: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const guest = await prisma.guest.findUnique({
    where: { id: params.guestId },
    select: { id: true, email: true, phone: true, preferences: true },
  });

  if (!guest) return null;

  if (!params.acceptTerms || !params.acceptPrivacy) {
    throw new Error('TERMS_AND_PRIVACY_REQUIRED');
  }

  const normalizedEmail = extractGuestEmail(guest);
  const normalizedPhone = extractGuestPhone(guest);
  const now = new Date();
  const records = [
    {
      subjectType: 'GUEST',
      guestId: guest.id,
      normalizedEmail,
      normalizedPhone,
      documentType: 'TERMS',
      documentVersion: TERMS_VERSION,
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
      documentVersion: PRIVACY_VERSION,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      acceptedAt: now,
    },
  ];

  await prisma.legalAcceptance.createMany({ data: records });

  return getGuestLegalStatus(params.guestId);
}

export async function getUserLegalStatus(userId: string) {
  const user = await prisma.user.findUnique({
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

  if (!user) return null;

  const termsAccepted =
    !!user.termsAcceptedAt && user.termsVersion === TERMS_VERSION;
  const privacyAccepted =
    !!user.privacyAcceptedAt && user.privacyVersion === PRIVACY_VERSION;

  return {
    termsAccepted,
    privacyAccepted,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    isFirstAcceptance: !user.termsAcceptedAt && !user.privacyAcceptedAt,
    requiresAcceptance: !(termsAccepted && privacyAccepted),
  };
}

export async function recordUserLegalAcceptance(params: {
  userId: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  if (!params.acceptTerms || !params.acceptPrivacy) {
    throw new Error('TERMS_AND_PRIVACY_REQUIRED');
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, phone: true },
  });

  if (!user) return null;

  const normalizedEmail = user.email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(user.phone);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      },
    }),
    prisma.legalAcceptance.createMany({
      data: [
        {
          subjectType: 'USER',
          userId: user.id,
          normalizedEmail,
          normalizedPhone,
          documentType: 'TERMS',
          documentVersion: TERMS_VERSION,
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
          documentVersion: PRIVACY_VERSION,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          acceptedAt: now,
        },
      ],
    }),
  ]);

  return getUserLegalStatus(params.userId);
}

export async function findGuestsByIdentity(guest: {
  email: string;
  phone?: string | null;
  preferences?: unknown;
}) {
  const normalizedEmail = extractGuestEmail(guest);
  const normalizedPhone = extractGuestPhone(guest);
  const orClauses = buildGuestIdentityOrClauses(normalizedEmail, normalizedPhone);

  if (orClauses.length === 0) {
    return [];
  }

  const matched = await prisma.guest.findMany({
    where: { OR: orClauses as any },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          location: true,
          tenant: { select: { name: true, branding: true } },
        },
      },
    },
  });

  const seen = new Set<string>();
  const unique = matched.filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });

  return unique;
}
