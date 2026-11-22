import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { generateQrPngBuffer } from './qrCode.ts';

function decode(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return result?.data ?? null;
}

const URLS = [
  'https://eventmaster.app/rsvp/clx0abc123',
  'https://eventmaster.app/rsvp/cmb7x2k9q0001lh08u3z1abcd?t=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJnIjoiY21iN3gyazlxMDAwMWxoMDh1M3oxYWJjZCJ9.sig_abcdefghijklmnop',
];

describe('QR code avec logo central', () => {
  for (const url of URLS) {
    for (const size of [80, 200, 300, 600]) {
      it(`reste lisible (taille ${size}, ${url.length} caractères)`, async () => {
        const buffer = await generateQrPngBuffer(url, { size });
        assert.equal(decode(buffer), url);
      });
    }
  }

  it('reste lisible avec une couleur de marque personnalisée', async () => {
    const buffer = await generateQrPngBuffer(URLS[0], { size: 300, color: '#1e3a8a' });
    assert.equal(decode(buffer), URLS[0]);
  });

  it('incruste bien un médaillon au centre (pixels du logo différents des modules)', async () => {
    const buffer = await generateQrPngBuffer(URLS[0], { size: 300 });
    const png = PNG.sync.read(buffer);
    const colors = new Set<string>();
    const c = Math.floor(png.width / 2);
    const r = Math.floor(png.width * 0.08);
    for (let y = c - r; y < c + r; y++) {
      for (let x = c - r; x < c + r; x++) {
        const i = (y * png.width + x) * 4;
        colors.add(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`);
      }
    }
    // Le centre contient le dégradé vert/menthe du logo, pas seulement 2 couleurs de modules.
    assert.ok(colors.size > 10, `couleurs trouvées au centre : ${colors.size}`);
  });
});
