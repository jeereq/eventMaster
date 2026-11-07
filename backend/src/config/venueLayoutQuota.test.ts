import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL,
  isLayoutQuotaReached,
  maxSavedLayoutsForLevel,
} from './venueLayoutQuota.ts';

describe('quota de dispositions par salle', () => {
  it('augmente avec le niveau de l’éditeur', () => {
    const { basic, standard, advanced, complete } = MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL;
    assert.ok(basic < standard && standard < advanced && advanced < complete);
  });

  it('retombe sur le niveau de base si le niveau est inconnu ou absent', () => {
    assert.equal(maxSavedLayoutsForLevel('inconnu'), MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL.basic);
    assert.equal(maxSavedLayoutsForLevel(null), MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL.basic);
    assert.equal(maxSavedLayoutsForLevel(undefined), MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL.basic);
  });

  it('refuse une nouvelle disposition une fois le maximum atteint', () => {
    const max = maxSavedLayoutsForLevel('standard');
    assert.equal(isLayoutQuotaReached('standard', max - 1), false);
    assert.equal(isLayoutQuotaReached('standard', max), true);
    assert.equal(isLayoutQuotaReached('standard', max + 5), true);
  });
});
