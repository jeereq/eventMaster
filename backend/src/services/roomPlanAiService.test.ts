import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRoomPlanImageUrl,
  parseHexColor,
  parseRoomPlanVisionDraft,
  ROOM_PLAN_VISION_ITEM_MAX,
} from './roomPlanAiService.ts';

describe('normalizeRoomPlanImageUrl', () => {
  it('accepte une URL https', () => {
    assert.equal(
      normalizeRoomPlanImageUrl('https://res.cloudinary.com/demo/plan.jpg'),
      'https://res.cloudinary.com/demo/plan.jpg',
    );
  });

  it('refuse une URL non https', () => {
    assert.throws(() => normalizeRoomPlanImageUrl('http://evil.example/plan.jpg'), { status: 400 });
  });
});

describe('parseRoomPlanVisionDraft', () => {
  it('ne garde que les objets visibles reconnus et plafonne les sièges', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'top',
      canvas: { widthM: 18, heightM: 24 },
      outline: { shape: 'rectangle', x: 6, y: 6, w: 88, h: 88 },
      items: [
        { kind: 'table', x: 32, y: 40, shape: 'round', seats: 80 },
        { kind: 'spaceship', x: 10, y: 10 },
        { kind: 'row', x: 50, y: 70, seats: 12 },
        { kind: 'stage', x: 50, y: 8, w: 28, h: 10 },
      ],
      walls: [{ start: { x: 8, y: 8 }, end: { x: 92, y: 8 }, doors: [0.5], windows: [0.25] }],
      confidence: 0.8,
      warnings: [],
    }, { widthM: 20, heightM: 15 });

    assert.equal(draft.items.length, 3);
    assert.equal(draft.items[0]?.kind, 'table');
    assert.equal(draft.items[0]?.seats, 16);
    assert.equal(draft.items[1]?.kind, 'row');
    assert.equal(draft.walls.length, 1);
    assert.equal(draft.walls[0]?.doors[0], 0.5);
    assert.equal(draft.canvas.widthM, 18);
  });

  it('avertit si rien n’est visible et ignore un amphithéâtre inventé via kind inconnu', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'perspective',
      items: [{ kind: 'amphitheater', x: 50, y: 50, seats: 200 }],
    }, { widthM: 20, heightM: 16 });

    assert.equal(draft.items.length, 0);
    assert.ok(draft.warnings.some((w) => w.includes('Aucun objet')));
    assert.ok(draft.warnings.some((w) => w.includes('perspective')));
    assert.equal(draft.canvas.widthM, 20);
  });

  it('conserve couleurs, matières et bbox haut-gauche', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'top',
      appearance: {
        imageRole: 'plan',
        floorType: 'parquet',
        floorColor: '#c4a06a',
        wallTexture: 'brick',
        wallColor: 'cream',
        tableSurface: 'linen',
        tableColor: '#fff',
      },
      items: [{
        kind: 'table',
        x: 12,
        y: 20,
        w: 10,
        h: 10,
        color: '#8b1c1c',
        surface: 'linen',
        chairStyle: 'chiavari',
        seatMaterial: 'velvet',
        anchor: 'box',
      }, {
        kind: 'aisle',
        x: 46,
        y: 14,
        w: 8,
        h: 70,
        color: '#991b1b',
        aisleStyle: 'royalRed',
      }],
    }, { widthM: 20, heightM: 16 });

    assert.equal(draft.appearance.imageRole, 'plan');
    assert.equal(draft.appearance.floorType, 'parquet');
    assert.equal(draft.appearance.floorColor, '#c4a06a');
    assert.equal(draft.appearance.wallTexture, 'brick');
    assert.equal(draft.appearance.wallColor, '#f5f0e8');
    assert.equal(draft.appearance.tableColor, '#ffffff');
    assert.equal(draft.items[0]?.color, '#8b1c1c');
    assert.equal(draft.items[0]?.surface, 'linen');
    assert.equal(draft.items[0]?.chairStyle, 'chiavari');
    assert.equal(draft.items[0]?.anchor, 'box');
    assert.equal(draft.items[1]?.aisleStyle, 'royalRed');
  });

  it('traite une photo comme imageRole photo par défaut', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'perspective',
      items: [],
    }, { widthM: 18, heightM: 14 });
    assert.equal(draft.appearance.imageRole, 'photo');
  });

  it('plafonne le nombre d’objets', () => {
    const items = Array.from({ length: ROOM_PLAN_VISION_ITEM_MAX + 5 }, (_, i) => ({
      kind: 'table',
      x: i,
      y: i,
    }));
    const draft = parseRoomPlanVisionDraft({ items }, { widthM: 20, heightM: 15 });
    assert.equal(draft.items.length, ROOM_PLAN_VISION_ITEM_MAX);
    assert.ok(draft.warnings.some((w) => w.includes(String(ROOM_PLAN_VISION_ITEM_MAX))));
  });
});

describe('parseHexColor', () => {
  it('normalise hex court, long et noms courants', () => {
    assert.equal(parseHexColor('#fff'), '#ffffff');
    assert.equal(parseHexColor('c4a06a'), '#c4a06a');
    assert.equal(parseHexColor('gold'), '#c4a06a');
    assert.equal(parseHexColor('not-a-color'), undefined);
  });
});
