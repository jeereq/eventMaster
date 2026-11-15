import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  boxBlurWrap,
  makeSeamless,
  normalMapFromHeight,
  reliefFromRgba,
  roughnessFromRelief,
  tileRepeat,
} from './roomImportedTextureMath.ts';

/** Image test : dégradé horizontal (raccord gauche/droite très visible) + damier fin. */
function gradientImage(w: number, h: number) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const v = Math.round((x / (w - 1)) * 200) + (((x >> 2) + (y >> 2)) % 2 ? 40 : 0);
      px[i] = v;
      px[i + 1] = v;
      px[i + 2] = v;
      px[i + 3] = 255;
    }
  }
  return px;
}

const at = (px: Uint8ClampedArray, w: number, x: number, y: number) => px[(y * w + x) * 4];

describe('makeSeamless', () => {
  it('raccorde les bords gauche/droite d’un dégradé', () => {
    const w = 64;
    const h = 32;
    const src = gradientImage(w, h);
    const before = Math.abs(at(src, w, 0, 10) - at(src, w, w - 1, 10));
    const out = makeSeamless(src, w, h, 0.25);
    const after = Math.abs(at(out, w, 0, 10) - at(out, w, w - 1, 10));
    assert.ok(before > 150, `avant ${before}`);
    assert.ok(after < 50, `après ${after}`);
  });

  it('laisse le centre de l’image intact', () => {
    const w = 64;
    const src = gradientImage(w, w);
    const out = makeSeamless(src, w, w, 0.2);
    assert.equal(at(out, w, 32, 32), at(src, w, 32, 32));
  });
});

describe('relief et cartes dérivées', () => {
  it('le flou boucle sur les bords et conserve la moyenne', () => {
    const src = new Float32Array([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const out = boxBlurWrap(src, 3, 3, 1);
    for (const v of out) assert.ok(Math.abs(v - 1 / 9) < 1e-6);
  });

  it('un dégradé lisse ne crée presque pas de relief, un damier si', () => {
    const w = 64;
    const smoothOnly = new Uint8ClampedArray(w * w * 4);
    for (let i = 0; i < w * w; i += 1) {
      const v = Math.round(((i % w) / w) * 255);
      smoothOnly.set([v, v, v, 255], i * 4);
    }
    const reliefSmooth = reliefFromRgba(smoothOnly, w, w);
    const reliefChecker = reliefFromRgba(gradientImage(w, w), w, w);
    const energy = (r: Float32Array) => r.reduce((s, v) => s + Math.abs(v), 0) / r.length;
    // Au centre (loin du raccord du dégradé) le relief du dégradé seul est quasi nul.
    assert.ok(Math.abs(reliefSmooth[32 * w + 32]) < 0.25);
    assert.ok(energy(reliefChecker) > energy(reliefSmooth));
  });

  it('une surface plane donne une normale verticale (128, 128, 255)', () => {
    const flat = new Float32Array(16);
    const n = normalMapFromHeight(flat, 4, 4);
    assert.deepEqual([...n.slice(0, 4)], [128, 128, 255, 255]);
  });

  it('une pente vers la droite incline la normale vers la gauche', () => {
    const w = 8;
    const ramp = new Float32Array(w * w);
    for (let y = 0; y < w; y += 1) for (let x = 0; x < w; x += 1) ramp[y * w + x] = x / w;
    const n = normalMapFromHeight(ramp, w, w);
    const i = (4 * w + 4) * 4;
    assert.ok(n[i] < 128, `R = ${n[i]}`);
    assert.ok(Math.abs(n[i + 1] - 128) <= 1);
  });

  it('rugosité : creux mats, reliefs plus brillants', () => {
    const r = roughnessFromRelief(new Float32Array([-1, 1]), 2, 1, 0.4);
    assert.equal(r[0], 255);
    assert.equal(r[4], Math.round(0.6 * 255));
  });
});

describe('tileRepeat', () => {
  it('compte les répétitions d’un motif en mètres', () => {
    assert.equal(tileRepeat(12, 0.6), 20);
    assert.equal(tileRepeat(0, 1), 1);
    assert.equal(tileRepeat(0.1, 2), 0.25);
  });
});
