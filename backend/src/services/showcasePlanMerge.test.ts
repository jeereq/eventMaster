import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLaterBuiltinShowcasePlans, sanitizeShowcaseDismissedIds } from './showcasePlanMerge.ts';

const defaults = [
  { id: 'a', order: 1 },
  { id: 'b', order: 2 },
  { id: 'new', order: 3 },
];

describe('mergeLaterBuiltinShowcasePlans', () => {
  it('ajoute à la fin un plan intégré récent absent d’une vitrine personnalisée', () => {
    const merged = mergeLaterBuiltinShowcasePlans([{ id: 'a', order: 4 }], defaults, [], ['new']);
    assert.deepEqual(merged.map((p) => [p.id, p.order]), [['a', 4], ['new', 5]]);
  });

  it('ne réintroduit pas un plan retiré par un administrateur', () => {
    const merged = mergeLaterBuiltinShowcasePlans([{ id: 'a', order: 1 }], defaults, ['new'], ['new']);
    assert.deepEqual(merged.map((p) => p.id), ['a']);
  });

  it('ne restaure pas les anciens plans par défaut supprimés', () => {
    const merged = mergeLaterBuiltinShowcasePlans([{ id: 'a', order: 1 }], defaults, [], ['new']);
    assert.ok(!merged.some((p) => p.id === 'b'));
  });

  it('ne duplique pas un plan déjà présent', () => {
    const plans = [{ id: 'new', order: 9 }];
    assert.deepEqual(mergeLaterBuiltinShowcasePlans(plans, defaults, [], ['new']), plans);
  });
});

describe('sanitizeShowcaseDismissedIds', () => {
  it('garde des identifiants texte uniques', () => {
    assert.deepEqual(sanitizeShowcaseDismissedIds(['x', ' x ', 3, '', 'y']), ['x', 'y']);
    assert.deepEqual(sanitizeShowcaseDismissedIds('x'), []);
  });
});
