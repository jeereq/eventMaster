import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { templateMatchesCategory } from './roomTemplateCategories.ts';

describe('templateMatchesCategory', () => {
  it('range l’appartement témoin dans Résidences, pas dans Banquets', () => {
    assert.equal(templateMatchesCategory('appartement-temoin-maquette', 'residence'), true);
    assert.equal(templateMatchesCategory('appartement-temoin-maquette', 'banquet'), false);
  });

  it('garde les règles existantes', () => {
    assert.equal(templateMatchesCategory('banquet-honor', 'banquet'), true);
    assert.equal(templateMatchesCategory('cocktail', 'banquet'), true);
    assert.equal(templateMatchesCategory('cocktail', 'restaurant'), true);
    assert.equal(templateMatchesCategory('conference-standard', 'conference'), true);
    assert.equal(templateMatchesCategory('conference-standard', 'banquet'), false);
    assert.equal(templateMatchesCategory('chairs-theater', 'conference'), true);
    assert.equal(templateMatchesCategory('empty-rectangle', 'empty'), true);
    assert.equal(templateMatchesCategory('pizzeria-x', 'banquet'), false);
  });

  it('un loft résidentiel apparaît aussi dans Résidences', () => {
    assert.equal(templateMatchesCategory('loft-organique-residentiel', 'restaurant'), true);
    assert.equal(templateMatchesCategory('loft-organique-residentiel', 'residence'), true);
  });

  it('Tous montre tout', () => {
    assert.equal(templateMatchesCategory('n-importe-quoi', 'all'), true);
  });
});
