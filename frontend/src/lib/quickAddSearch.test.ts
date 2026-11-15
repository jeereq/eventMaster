import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterQuickAdd, normalizeSearch } from './quickAddSearch.ts';

const entries = [
  { id: 'table', label: 'Table ronde', group: 'Mobilier' },
  { id: 'wine', label: 'Bar à vins', group: 'Bars', keywords: 'vin cave' },
  { id: 'cocktail', label: 'Bar cocktail', group: 'Bars' },
  { id: 'piano', label: 'Piano à queue', group: 'Instruments' },
  { id: 'scene', label: 'Scène', group: 'Décor', keywords: 'estrade' },
];

describe('quickAddSearch', () => {
  it('normalise accents, casse et apostrophes', () => {
    assert.equal(normalizeSearch('  Arbre d’Été  '), 'arbre d ete');
  });

  it('renvoie tout sans requête', () => {
    assert.equal(filterQuickAdd(entries, '').length, entries.length);
  });

  it('trouve par libellé sans accent, par groupe et par mot-clé', () => {
    assert.deepEqual(filterQuickAdd(entries, 'scene').map((e) => e.id), ['scene']);
    assert.deepEqual(filterQuickAdd(entries, 'bars').map((e) => e.id), ['wine', 'cocktail']);
    assert.deepEqual(filterQuickAdd(entries, 'estrade').map((e) => e.id), ['scene']);
  });

  it('exige tous les mots et classe le début de libellé en premier', () => {
    assert.deepEqual(filterQuickAdd(entries, 'bar vin').map((e) => e.id), ['wine']);
    assert.equal(filterQuickAdd(entries, 'pia')[0].id, 'piano');
    assert.deepEqual(filterQuickAdd(entries, 'cocktail').map((e) => e.id), ['cocktail']);
  });
});
