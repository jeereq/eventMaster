import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRoomElementDefinition } from './roomElementDefinition.ts';

describe('sanitizeRoomElementDefinition', () => {
  it('accepte une découpe valide et borne ses dimensions', () => {
    const def = sanitizeRoomElementDefinition({
      name: '  Photocall floral  ',
      mode: 'cutout',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/a.png',
      outline: [0, 0, 1, 0, 1.4, 1],
      widthM: 100,
      heightM: 2.1,
      depthM: 0.1,
      extra: 'ignoré',
    });
    assert.ok(def);
    assert.equal(def.name, 'Photocall floral');
    assert.equal(def.widthM, 40);
    assert.deepEqual(def.outline, [0, 0, 1, 0, 1, 1]);
    assert.equal('extra' in def, false);
  });

  it('refuse les URL non https et les vidéos sans fichier', () => {
    assert.equal(sanitizeRoomElementDefinition({ mode: 'panel', imageUrl: 'http://x/a.png' }), null);
    assert.equal(sanitizeRoomElementDefinition({ mode: 'panel', imageUrl: 'javascript:alert(1)' }), null);
    assert.equal(sanitizeRoomElementDefinition({ mode: 'video', imageUrl: 'https://x/a.png' }), null);
    assert.equal(sanitizeRoomElementDefinition({ mode: 'hologram', imageUrl: 'https://x/a.png' }), null);
  });

  it('ignore un contour mal formé', () => {
    const def = sanitizeRoomElementDefinition({ mode: 'cutout', imageUrl: 'https://x/a.png', outline: [0, 0, 1, 'x', 1, 1] });
    assert.ok(def);
    assert.equal(def.outline, undefined);
  });
});
