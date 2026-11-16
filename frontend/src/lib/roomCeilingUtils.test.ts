import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ceilingChandelierCount, resolveChandelierCount } from './roomCeilingUtils.ts';

test('les lustres automatiques suivent le nombre choisi', () => {
  assert.equal(ceilingChandelierCount({ showChandeliers: true, chandelierCount: 1 }, [], 3), 1);
  assert.equal(ceilingChandelierCount({ showChandeliers: true, chandelierCount: 2 }, [{ kind: 'table' }], 3), 2);
});

test('désactivés, aucun lustre automatique', () => {
  assert.equal(ceilingChandelierCount({ showChandeliers: false, chandelierCount: 3 }, [], 3), 0);
  assert.equal(ceilingChandelierCount({}, [], 3), 0);
});

test('un lustre posé sur le plan remplace les lustres automatiques', () => {
  assert.equal(ceilingChandelierCount({ showChandeliers: true, chandelierCount: 3 }, [{ kind: 'chandelier' }], 3), 0);
});

test('le nombre reste borné par la qualité de rendu', () => {
  assert.equal(resolveChandelierCount(5, 2), 2);
  assert.equal(resolveChandelierCount(undefined, 4), 3);
});
