import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideFlexPayCallbackOutcome } from './flexPayCallbackVerification.ts';

describe('callback FlexPay', () => {
  it('ne conclut rien sans vérification serveur', () => {
    assert.equal(decideFlexPayCallbackOutcome(null), 'unverified');
    assert.equal(decideFlexPayCallbackOutcome({ found: false, status: 'unknown' }), 'unverified');
  });

  it('suit uniquement le statut confirmé par FlexPay', () => {
    assert.equal(decideFlexPayCallbackOutcome({ found: true, status: 'success' }), 'paid');
    assert.equal(decideFlexPayCallbackOutcome({ found: true, status: 'failed' }), 'failed');
  });

  it('laisse une transaction en attente intacte', () => {
    assert.equal(decideFlexPayCallbackOutcome({ found: true, status: 'pending' }), 'unverified');
    assert.equal(decideFlexPayCallbackOutcome({ found: true, status: 'unknown' }), 'unverified');
  });
});
