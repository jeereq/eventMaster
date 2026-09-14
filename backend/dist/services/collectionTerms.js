"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentCollectionTermsVersions = currentCollectionTermsVersions;
exports.extractCollectionTermsAcceptance = extractCollectionTermsAcceptance;
exports.hasValidCollectionTermsAcceptance = hasValidCollectionTermsAcceptance;
exports.isActivatingPaidCollection = isActivatingPaidCollection;
exports.requiresCollectionTermsAcceptance = requiresCollectionTermsAcceptance;
exports.buildCollectionTermsAcceptance = buildCollectionTermsAcceptance;
const legalConfig_ts_1 = require("../config/legalConfig.js");
function currentCollectionTermsVersions() {
    return {
        termsVersion: legalConfig_ts_1.TERMS_VERSION,
        privacyVersion: legalConfig_ts_1.PRIVACY_VERSION,
        refundVersion: legalConfig_ts_1.REFUND_VERSION,
    };
}
function extractCollectionTermsAcceptance(eventPrep) {
    if (!eventPrep || typeof eventPrep !== 'object')
        return null;
    const raw = eventPrep.collectionTerms;
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    if (typeof record.acceptedAt !== 'string' ||
        typeof record.termsVersion !== 'string' ||
        typeof record.privacyVersion !== 'string' ||
        typeof record.refundVersion !== 'string') {
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
function hasValidCollectionTermsAcceptance(eventPrep) {
    const stored = extractCollectionTermsAcceptance(eventPrep);
    if (!stored)
        return false;
    const current = currentCollectionTermsVersions();
    return (stored.termsVersion === current.termsVersion &&
        stored.privacyVersion === current.privacyVersion &&
        stored.refundVersion === current.refundVersion);
}
function isActivatingPaidCollection(params) {
    return ((!params.wasTicketingEnabled && params.willTicketingEnabled) ||
        (!params.wasDonationsEnabled && params.willDonationsEnabled));
}
function requiresCollectionTermsAcceptance(params) {
    const collectionActive = params.willTicketingEnabled || params.willDonationsEnabled;
    if (!collectionActive)
        return false;
    if (hasValidCollectionTermsAcceptance(params.eventPrep) || params.acceptCollectionTerms) {
        return false;
    }
    return (isActivatingPaidCollection(params) ||
        params.willTicketingEnabled ||
        params.willDonationsEnabled);
}
function buildCollectionTermsAcceptance(userId) {
    return {
        acceptedAt: new Date().toISOString(),
        ...currentCollectionTermsVersions(),
        acceptedByUserId: userId || null,
    };
}
