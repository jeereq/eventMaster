import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  customElementFootprintM,
  hasTransparency,
  opaqueBounds,
  outlineArea,
  removeBackground,
  sanitizeCustomElement,
  traceOutline,
  type RgbaImage,
} from './roomCustomElements.ts';

/** Image w×h de fond `bg`, avec les pixels où `inside(x, y)` peints en `fg`. */
function makeImage(w: number, h: number, inside: (x: number, y: number) => boolean, fg = [180, 40, 40], bg = [245, 245, 245]): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const c = inside(x, y) ? fg : bg;
      const i = (y * w + x) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

describe('removeBackground', () => {
  it('rend le fond uni transparent et garde l’objet', () => {
    const img = makeImage(60, 40, (x, y) => x >= 20 && x < 40 && y >= 10 && y < 30);
    assert.equal(hasTransparency(img), false);
    removeBackground(img, 20);
    assert.equal(img.data[3], 0);
    assert.equal(img.data[(20 * 60 + 30) * 4 + 3], 255);
    assert.equal(hasTransparency(img), true);
    assert.deepEqual(opaqueBounds(img), { x: 20, y: 10, w: 20, h: 20 });
  });

  it('ne perce pas un objet de la même couleur que le fond s’il est entouré', () => {
    // Anneau rouge avec un centre blanc : le centre n’est pas relié au bord, il reste opaque.
    const img = makeImage(50, 50, (x, y) => {
      const d = Math.hypot(x - 25, y - 25);
      return d < 18 && d > 8;
    });
    removeBackground(img, 20);
    assert.equal(img.data[(25 * 50 + 25) * 4 + 3], 255);
  });
});

describe('traceOutline', () => {
  it('suit le contour d’un rectangle', () => {
    const img = makeImage(100, 50, (x, y) => x >= 25 && x < 75 && y >= 10 && y < 40);
    removeBackground(img);
    const outline = traceOutline(img, { grid: 100 });
    assert.ok(outline);
    const xs = outline.filter((_, i) => i % 2 === 0);
    const ys = outline.filter((_, i) => i % 2 === 1);
    assert.ok(Math.abs(Math.min(...xs) - 0.25) < 0.03);
    assert.ok(Math.abs(Math.max(...xs) - 0.75) < 0.03);
    assert.ok(Math.abs(Math.min(...ys) - 0.2) < 0.05);
    assert.ok(Math.abs(Math.max(...ys) - 0.8) < 0.05);
    // Un rectangle se simplifie en peu de sommets.
    assert.ok(outline.length / 2 <= 8, `trop de sommets : ${outline.length / 2}`);
    assert.ok(Math.abs(Math.abs(outlineArea(outline)) - 0.5 * 0.6) < 0.05);
  });

  it('garde la plus grande forme et ignore les poussières', () => {
    const img = makeImage(80, 80, (x, y) => Math.hypot(x - 40, y - 40) < 25 || (x === 3 && y === 3));
    removeBackground(img);
    // La poussière touche le bord : on la remet opaque pour simuler un résidu de détourage.
    img.data[(3 * 80 + 3) * 4 + 3] = 255;
    const outline = traceOutline(img, { grid: 80 });
    assert.ok(outline);
    const area = Math.abs(outlineArea(outline));
    assert.ok(Math.abs(area - Math.PI * (25 / 80) ** 2) < 0.03, `aire ${area}`);
  });

  it('renvoie null pour une image vide', () => {
    const img = makeImage(20, 20, () => false);
    removeBackground(img);
    assert.equal(traceOutline(img), null);
  });
});

describe('sanitizeCustomElement', () => {
  it('borne les dimensions et rejette les URL invalides', () => {
    assert.equal(sanitizeCustomElement({ mode: 'cutout', imageUrl: 'javascript:alert(1)' }), null);
    assert.equal(sanitizeCustomElement({ mode: 'video', imageUrl: 'https://x/a.png' }), null);
    const def = sanitizeCustomElement({
      mode: 'cutout',
      imageUrl: 'https://res.cloudinary.com/demo/a.png',
      widthM: 999,
      heightM: -3,
      aspect: 2,
      outline: [0, 0, 1, 0, 1, 2, 'x'],
    });
    assert.ok(def);
    assert.equal(def.widthM, 40);
    assert.equal(def.heightM, 0.05);
    assert.equal(def.outline, undefined);
    assert.equal(def.name, 'Élément importé');
  });

  it('donne une empreinte ronde aux volumes cylindriques', () => {
    assert.deepEqual(customElementFootprintM({ mode: 'cylinder', widthM: 0.8, depthM: 0.2 }), { w: 0.8, d: 0.8 });
  });
});
