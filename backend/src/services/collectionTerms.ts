import {
  PRIVACY_VERSION,
  REFUND_VERSION,
  TERMS_VERSION,
} from '../config/legalConfig.ts';

export interface CollectionTermsAcceptance {
  acceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
  refundVersion: string;
  acceptedByUserId?: string | null;
}

export function currentCollectionTermsVersions() {
  return {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    refundVersion: REFUND_VERSION,
  };
}

export function extractCollectionTermsAcceptance(eventPrep: unknown): CollectionTermsAcceptance | null {
  if (!eventPrep || typeof eventPrep !== 'object') return null;
  const raw = (eventPrep as Record<string, unknown>).collectionTerms;
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (
    typeof record.acceptedAt !== 'string' ||
    typeof record.termsVersion !== 'string' ||
    typeof record.privacyVersion !== 'string' ||
    typeof record.refundVersion !== 'string'
  ) {
    return null;
  }
  return {
    acceptedAt: record.acceptedAt,
    termsVersion: record.termsVersion,
    privacyVersion: record.privacyVersion,
    refundVersion: record.refundVersion,
    acceptedByUserId: typeof record.acceptedByUserId === 'string' ? record.acceptedByUserId : null,
  };
}

export function hasValidCollectionTermsAcceptance(eventPrep: unknown): boolean {
  const stored = extractCollectionTermsAcceptance(eventPrep);
  if (!stored) return false;
  const current = currentCollectionTermsVersions();
  return (
    stored.termsVersion === current.termsVersion &&
    stored.privacyVersion === current.privacyVersion &&
    stored.refundVersion === current.refundVersion
  );
}

export function isActivatingPaidCollection(params: {
  wasTicketingEnabled: boolean;
  willTicketingEnabled: boolean;
  wasDonationsEnabled: boolean;
  willDonationsEnabled: boolean;
}): boolean {
  return (
    (!params.wasTicketingEnabled && params.willTicketingEnabled) ||
    (!params.wasDonationsEnabled && params.willDonationsEnabled)
  );
}

export function requiresCollectionTermsAcceptance(params: {
  wasTicketingEnabled: boolean;
  willTicketingEnabled: boolean;
  wasDonationsEnabled: boolean;
  willDonationsEnabled: boolean;
  eventPrep: unknown;
  acceptCollectionTerms: boolean;
}): boolean {
  const collectionActive = params.willTicketingEnabled || params.willDonationsEnabled;
  if (!collectionActive) return false;
  if (hasValidCollectionTermsAcceptance(params.eventPrep) || params.acceptCollectionTerms) {
    return false;
  }
  return (
    isActivatingPaidCollection(params) ||
    params.willTicketingEnabled ||
    params.willDonationsEnabled
  );
}

export function buildCollectionTermsAcceptance(userId?: string | null): CollectionTermsAcceptance {
  return {
    acceptedAt: new Date().toISOString(),
    ...currentCollectionTermsVersions(),
    acceptedByUserId: userId || null,
  };
}
