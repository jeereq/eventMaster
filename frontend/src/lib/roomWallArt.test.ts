import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampWallArt, createWallArt, graffitiAspect, sanitizeGraffitiText, wallArtHeightM } from './roomWallArt.ts';

test('une image est créée centrée, à hauteur d’œil, dans un cadre galerie', () => {
  const art = createWallArt('image', { imageUrl: 'https://x/y.jpg', aspect: 1.5, wallLengthM: 8, wallHeightM: 3 });
  assert.equal(art.kind, 'image');
  assert.equal(art.t, 0.5);
  assert.equal(art.frame, 'gallery');
  assert.ok(art.yM > 1.2 && art.yM < 1.8);
  assert.ok(Math.abs(wallArtHeightM(art) - art.widthM / 1.5) < 1e-9);
});

test('un graffiti garde un texte propre et un format adapté à sa longueur', () => {
  assert.equal(sanitizeGraffitiText('   '), 'LOVE');
  assert.equal(sanitizeGraffitiText('  Joyeux   anniversaire  '), 'Joyeux anniversaire');
  assert.ok(graffitiAspect('MARIAGE') > graffitiAspect('OUI'));
  const art = createWallArt('graffiti', { text: 'Fête', wallLengthM: 10, wallHeightM: 3 });
  assert.equal(art.text, 'Fête');
  assert.equal(art.graffitiStyle, 'bubble');
});

test('un élément reste sur le mur : largeur, bords et hauteur', () => {
  const tooWide = clampWallArt({ id: 'a', kind: 'image', t: 0.5, yM: 1.5, widthM: 20, aspect: 2 }, 6, 3);
  assert.ok(tooWide.widthM <= 6 * 0.98 + 1e-9);
  const atEdge = clampWallArt({ id: 'b', kind: 'image', t: 0, yM: 1.5, widthM: 2, aspect: 2 }, 6, 3);
  assert.ok(atEdge.t >= 1 / 6 - 1e-9);
  const tooHigh = clampWallArt({ id: 'c', kind: 'image', t: 0.5, yM: 5, widthM: 1, aspect: 1 }, 6, 3);
  assert.ok(tooHigh.yM + wallArtHeightM(tooHigh) / 2 <= 3);
  const tallForWall = clampWallArt({ id: 'd', kind: 'image', t: 0.5, yM: 1.5, widthM: 3, aspect: 0.5 }, 6, 2.5);
  assert.ok(wallArtHeightM(tallForWall) <= 2.5);
});
