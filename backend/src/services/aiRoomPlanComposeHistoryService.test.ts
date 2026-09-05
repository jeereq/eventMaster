import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  persistableRoomPlanImageUrl,
  serializeRoomPlanComposeRun,
} from './aiRoomPlanComposeHistoryUtils.ts';

describe('persistableRoomPlanImageUrl', () => {
  it('garde seulement les URL http(s)', () => {
    assert.equal(persistableRoomPlanImageUrl('https://cdn.example/plan.jpg'), 'https://cdn.example/plan.jpg');
    assert.equal(persistableRoomPlanImageUrl('http://cdn.example/plan.jpg'), 'http://cdn.example/plan.jpg');
    assert.equal(persistableRoomPlanImageUrl('data:image/png;base64,abc'), null);
    assert.equal(persistableRoomPlanImageUrl('   '), null);
    assert.equal(persistableRoomPlanImageUrl(null), null);
  });
});

describe('serializeRoomPlanComposeRun', () => {
  it('expose le nombre d’éléments et une date ISO', () => {
    const serialized = serializeRoomPlanComposeRun({
      id: 'run-1',
      userId: 'user-1',
      deviceId: 'dev-1',
      source: 'landing',
      prompt: 'Mariage 120 convives',
      imageUrl: 'data:image/jpeg;base64,xx',
      roomType: 'BANQUET',
      widthM: 20,
      heightM: 16,
      draft: { items: [{ kind: 'table' }, { kind: 'row' }], warnings: [] },
      createdAt: new Date('2026-09-05T10:00:00.000Z'),
    });

    assert.equal(serialized.itemCount, 2);
    assert.equal(serialized.imageUrl, null);
    assert.equal(serialized.createdAt, '2026-09-05T10:00:00.000Z');
    assert.equal(serialized.prompt, 'Mariage 120 convives');
  });
});
