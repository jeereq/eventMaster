import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BAR_STYLE_DESIGN, resolveBarDesign } from './roomBarDesign.ts';

describe('resolveBarDesign', () => {
  it('donne à chaque type de bar son propre habillage', () => {
    assert.deepEqual(resolveBarDesign('wine'), BAR_STYLE_DESIGN.wine);
    assert.equal(resolveBarDesign('wine').back, 'wineWall');
    assert.equal(resolveBarDesign('beer').back, 'kegs');
    assert.notDeepEqual(resolveBarDesign('cocktail'), resolveBarDesign('whiskey'));
    assert.deepEqual(resolveBarDesign(undefined), BAR_STYLE_DESIGN.cocktail);
  });

  it('applique les choix de l’utilisateur partie par partie', () => {
    const d = resolveBarDesign('coffee', { barTop: 'zinc', barStool: 'none' });
    assert.equal(d.top, 'zinc');
    assert.equal(d.stool, 'none');
    assert.equal(d.front, BAR_STYLE_DESIGN.coffee.front);
  });

  it('ignore les valeurs inconnues', () => {
    const d = resolveBarDesign('tea', { barFront: 'gold', barMetal: 42, barBack: 'toString' });
    assert.deepEqual(d, BAR_STYLE_DESIGN.tea);
  });
});
