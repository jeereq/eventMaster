import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { serializeTemplateComposeRun } from './aiTemplateComposeHistoryUtils.ts';

describe('serializeTemplateComposeRun', () => {
  it('extrait fidèlement les 2 propositions (variantes A/B) depuis stage.variants', () => {
    const serialized = serializeTemplateComposeRun({
      id: 'run-1',
      userId: 'user-1',
      deviceId: 'device-1',
      source: 'studio',
      prompt: 'Gala Prestige 2026',
      referenceUrls: ['https://cdn.example.com/ref1.jpg'],
      previewImageUrl: 'https://cdn.example.com/propA.jpg',
      content: {
        global: {
          title: 'Gala 2026',
          bgImageUrl: 'https://cdn.example.com/propA.jpg',
        },
      },
      stage: {
        variants: [
          'https://cdn.example.com/propA.jpg',
          'https://cdn.example.com/propB.jpg',
        ],
      },
      createdAt: new Date('2026-09-11T02:00:00.000Z'),
    });

    assert.equal(serialized.id, 'run-1');
    assert.deepEqual(serialized.variants, [
      'https://cdn.example.com/propA.jpg',
      'https://cdn.example.com/propB.jpg',
    ]);
    assert.equal(serialized.variants.length, 2);
  });

  it('extrait les 2 variantes depuis global.variants ou global.aiVariants si stage est absent', () => {
    const serialized = serializeTemplateComposeRun({
      id: 'run-2',
      userId: null,
      deviceId: 'device-2',
      source: 'landing',
      prompt: 'Mariage Royal',
      referenceUrls: [],
      previewImageUrl: 'https://cdn.example.com/var1.jpg',
      content: {
        global: {
          variants: [
            'https://cdn.example.com/var1.jpg',
            'https://cdn.example.com/var2.jpg',
          ],
        },
      },
      stage: null,
      createdAt: new Date('2026-09-11T02:30:00.000Z'),
    });

    assert.deepEqual(serialized.variants, [
      'https://cdn.example.com/var1.jpg',
      'https://cdn.example.com/var2.jpg',
    ]);
  });

  it('replie sur previewImageUrl si aucune variante multiple n’est présente', () => {
    const serialized = serializeTemplateComposeRun({
      id: 'run-3',
      userId: 'user-3',
      deviceId: 'device-3',
      source: 'studio',
      prompt: 'Anniversaire',
      referenceUrls: [],
      previewImageUrl: 'https://cdn.example.com/single.jpg',
      content: { global: {} },
      stage: null,
      createdAt: new Date('2026-09-11T03:00:00.000Z'),
    });

    assert.deepEqual(serialized.variants, ['https://cdn.example.com/single.jpg']);
  });
});
