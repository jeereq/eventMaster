import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scaleFontSize, snapAngle, templateElementWrapperStyle, templateTextShadowCss } from './templateElementStyle.ts';

describe('réglages communs des éléments', () => {
  it('ne pivote qu’en placement libre et ignore les valeurs neutres', () => {
    assert.deepEqual(templateElementWrapperStyle({}, true), {});
    assert.deepEqual(templateElementWrapperStyle({ rotation: 15 }, false), {});
    assert.equal(templateElementWrapperStyle({ rotation: 15 }, true).transform, 'rotate(15deg)');
    assert.equal(templateElementWrapperStyle({ opacity: 100 }, true).opacity, undefined);
    assert.equal(templateElementWrapperStyle({ opacity: 40 }, false).opacity, 0.4);
  });

  it('ombre du texte : préréglages et couleur sûre', () => {
    assert.equal(templateTextShadowCss('none'), undefined);
    assert.match(String(templateTextShadowCss('soft')), /rgba\(0,0,0,0\.35\)/);
    assert.match(String(templateTextShadowCss('glow', '#ff0000')), /rgba\(255,0,0/);
    assert.ok(!String(templateTextShadowCss('outline', 'red;x:1')).includes(';'));
  });

  it('aimante la rotation sur 45°', () => {
    assert.equal(snapAngle(43), 45);
    assert.equal(snapAngle(30), 30);
    assert.equal(snapAngle(-178), 180);
    assert.equal(snapAngle(200), -160);
  });

  it('met la police à l’échelle', () => {
    assert.equal(scaleFontSize('16px', 1.5), '24px');
    assert.equal(scaleFontSize('16px', 0.1), '6px');
    assert.equal(scaleFontSize('1.2rem', 2), '1.2rem');
  });
});
