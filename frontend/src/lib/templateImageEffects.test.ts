import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATE_IMAGE_SHAPES,
  hasTemplateImageEffects,
  templateImageFadeStyle,
  templateImageLayerStyles,
  templateImageOverlayStyle,
  templateImageShapeStyle,
} from './templateImageEffects.ts';
import { TEMPLATE_ILLUSTRATIONS, illustrationDataUri, illustrationSvg } from './templateIllustrations.ts';

describe('effets d’image', () => {
  it('garde le rendu historique sans effet', () => {
    assert.equal(hasTemplateImageEffects({}), false);
    assert.equal(hasTemplateImageEffects({ imageShape: 'none', imageFade: 'none', imageZoom: 1, imageFocusX: 50 }), false);
    assert.equal(hasTemplateImageEffects({ imageShape: 'heart' }), true);
    assert.equal(hasTemplateImageEffects({ imageOverlayColor: '#000' }), true);
  });

  it('chaque forme produit une découpe', () => {
    for (const s of TEMPLATE_IMAGE_SHAPES) {
      const style = templateImageShapeStyle(s.id);
      if (s.id === 'none') assert.deepEqual(style, {});
      else assert.ok(style.clipPath || style.maskImage, s.id);
    }
    assert.equal(templateImageShapeStyle('circle').aspectRatio, '1 / 1');
  });

  it('fondu : masque vers la transparence', () => {
    assert.match(String(templateImageFadeStyle('bottom', 30).maskImage), /to bottom, #000 70%, transparent 100%/);
    assert.deepEqual(templateImageFadeStyle('none', 30), {});
  });

  it('voile dégradé : couleur vers transparent par défaut', () => {
    const o = templateImageOverlayStyle({ imageOverlayColor: '#112233', imageOverlayOpacity: 50 });
    assert.ok(o);
    assert.equal(o.background, 'linear-gradient(to bottom, transparent 0%, #112233 100%)');
    assert.equal(o.opacity, 0.5);
    assert.equal(templateImageOverlayStyle({ imageOverlayColor: '#112233', imageOverlayOpacity: 0 }), null);
  });

  it('cadrage : zoom et point focal', () => {
    const l = templateImageLayerStyles({ imageZoom: 2, imageFocusX: 20, imageFocusY: 80, imageAspect: '4/5', imageFlipX: true });
    assert.equal(l.img.transform, 'scale(2) scaleX(-1)');
    assert.equal(l.img.objectPosition, '20% 80%');
    assert.equal(l.frame.aspectRatio, '4 / 5');
    assert.equal(l.img.height, '100%');
  });
});

describe('illustrations', () => {
  it('chaque illustration produit un SVG valide, uni ou en dégradé', () => {
    for (const i of TEMPLATE_ILLUSTRATIONS) {
      const svg = illustrationSvg(i.id, '#123456');
      assert.ok(svg && svg.startsWith('<svg') && svg.includes('#123456') && !svg.includes('NaN'), i.id);
      const grad = illustrationSvg(i.id, '#123456', '#abcdef');
      assert.ok(grad && grad.includes('linearGradient') && grad.includes('url(#g)'), i.id);
    }
    assert.equal(new Set(TEMPLATE_ILLUSTRATIONS.map((i) => i.id)).size, TEMPLATE_ILLUSTRATIONS.length);
  });

  it('refuse une couleur non hexadécimale', () => {
    const svg = illustrationSvg('heart', '"/><script>');
    assert.ok(svg && !svg.includes('<script>'));
    assert.equal(illustrationDataUri('inconnue'), null);
  });
});
