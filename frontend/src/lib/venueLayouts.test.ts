import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAIN_LAYOUT_ID,
  formatLayoutFacts,
  hasLayoutChoice,
  normalizeLayouts,
  resolveInitialLayoutId,
  type VenueLayoutSummary,
} from './venueLayouts.ts';

const layout = (id: string, extra: Partial<VenueLayoutSummary> = {}): VenueLayoutSummary => ({
  id,
  name: id,
  capacityMax: null,
  areaM2: null,
  thumbnailUrl: null,
  ...extra,
});

describe('formatLayoutFacts', () => {
  it('formate la capacité et la surface', () => {
    const facts = formatLayoutFacts({ capacityMax: 120, areaM2: 299.6 });
    assert.match(facts.capacityLabel ?? '', /^Max\. 120$/);
    assert.match(facts.areaLabel ?? '', /^300\s?m²$/);
  });

  it('omet les valeurs absentes ou nulles', () => {
    assert.deepEqual(formatLayoutFacts({ capacityMax: null, areaM2: null }), { capacityLabel: null, areaLabel: null });
    assert.deepEqual(formatLayoutFacts({ capacityMax: 0, areaM2: 0 }), { capacityLabel: null, areaLabel: null });
  });
});

describe('resolveInitialLayoutId', () => {
  const layouts = [layout(MAIN_LAYOUT_ID), layout('a'), layout('b')];

  it('garde la disposition demandée si elle existe', () => {
    assert.equal(resolveInitialLayoutId(layouts, 'b'), 'b');
  });

  it('retombe sur la principale sinon', () => {
    assert.equal(resolveInitialLayoutId(layouts, 'inconnue'), MAIN_LAYOUT_ID);
    assert.equal(resolveInitialLayoutId(layouts, null), MAIN_LAYOUT_ID);
  });

  it('prend la première disposition si la principale manque', () => {
    assert.equal(resolveInitialLayoutId([layout('a')], undefined), 'a');
    assert.equal(resolveInitialLayoutId([], undefined), MAIN_LAYOUT_ID);
  });
});

describe('hasLayoutChoice', () => {
  it('exige au moins deux dispositions', () => {
    assert.equal(hasLayoutChoice(undefined), false);
    assert.equal(hasLayoutChoice([layout(MAIN_LAYOUT_ID)]), false);
    assert.equal(hasLayoutChoice([layout(MAIN_LAYOUT_ID), layout('a')]), true);
  });
});

describe('normalizeLayouts', () => {
  it('ignore les entrées mal formées', () => {
    const result = normalizeLayouts([
      { id: 'a', name: 'Mariage', capacityMax: 80, areaM2: 200, thumbnailUrl: 'https://x/y.jpg' },
      { id: '', name: 'Sans id' },
      { id: 'b' },
      null,
      'texte',
    ]);
    assert.deepEqual(result, [
      { id: 'a', name: 'Mariage', capacityMax: 80, areaM2: 200, thumbnailUrl: 'https://x/y.jpg' },
    ]);
  });

  it('renvoie une liste vide pour une valeur non tableau', () => {
    assert.deepEqual(normalizeLayouts(undefined), []);
    assert.deepEqual(normalizeLayouts({}), []);
  });
});
