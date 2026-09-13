import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIVACY_VERSION,
  REFUND_VERSION,
  TERMS_VERSION,
} from '../config/legalConfig.ts';
import {
  buildCollectionTermsAcceptance,
  extractCollectionTermsAcceptance,
  hasValidCollectionTermsAcceptance,
  isActivatingPaidCollection,
  requiresCollectionTermsAcceptance,
} from './collectionTerms.ts';

describe('collectionTerms', () => {
  it('détecte l’activation de la billetterie ou des dons', () => {
    assert.equal(
      isActivatingPaidCollection({
        wasTicketingEnabled: false,
        willTicketingEnabled: true,
        wasDonationsEnabled: false,
        willDonationsEnabled: false,
      }),
      true,
    );
    assert.equal(
      isActivatingPaidCollection({
        wasTicketingEnabled: true,
        willTicketingEnabled: true,
        wasDonationsEnabled: false,
        willDonationsEnabled: true,
      }),
      true,
    );
    assert.equal(
      isActivatingPaidCollection({
        wasTicketingEnabled: true,
        willTicketingEnabled: true,
        wasDonationsEnabled: true,
        willDonationsEnabled: true,
      }),
      false,
    );
  });

  it('exige l’acceptation des conditions en vigueur à l’activation', () => {
    assert.equal(
      requiresCollectionTermsAcceptance({
        wasTicketingEnabled: false,
        willTicketingEnabled: true,
        wasDonationsEnabled: false,
        willDonationsEnabled: false,
        eventPrep: {},
        acceptCollectionTerms: false,
      }),
      true,
    );
    assert.equal(
      requiresCollectionTermsAcceptance({
        wasTicketingEnabled: false,
        willTicketingEnabled: true,
        wasDonationsEnabled: false,
        willDonationsEnabled: false,
        eventPrep: {},
        acceptCollectionTerms: true,
      }),
      false,
    );
  });

  it('reconnaît une acceptation déjà enregistrée à la version courante', () => {
    const eventPrep = {
      collectionTerms: {
        acceptedAt: '2026-09-14T00:00:00.000Z',
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        refundVersion: REFUND_VERSION,
      },
    };
    assert.equal(hasValidCollectionTermsAcceptance(eventPrep), true);
    assert.equal(
      requiresCollectionTermsAcceptance({
        wasTicketingEnabled: true,
        willTicketingEnabled: true,
        wasDonationsEnabled: false,
        willDonationsEnabled: false,
        eventPrep,
        acceptCollectionTerms: false,
      }),
      false,
    );
  });

  it('rejette une acceptation d’une version obsolète', () => {
    const eventPrep = {
      collectionTerms: {
        acceptedAt: '2026-09-01T00:00:00.000Z',
        termsVersion: '1.5',
        privacyVersion: '1.5',
        refundVersion: '1.0',
      },
    };
    assert.equal(hasValidCollectionTermsAcceptance(eventPrep), false);
    assert.ok(extractCollectionTermsAcceptance(eventPrep));
    const built = buildCollectionTermsAcceptance('user-1');
    assert.equal(built.termsVersion, TERMS_VERSION);
    assert.equal(built.acceptedByUserId, 'user-1');
  });
});
