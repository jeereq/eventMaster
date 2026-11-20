import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLUMN_STYLE_PRESETS,
  DEFAULT_COLUMN_HEIGHT_M,
  columnColorApplies,
  columnPresetPatch,
  isTexturedColumnMaterial,
  matchColumnStylePreset,
  resolveColumnHeightM,
} from './roomColumnStyles.ts';

test('une colonne sans réglage garde sa hauteur historique', () => {
  assert.equal(resolveColumnHeightM({}), DEFAULT_COLUMN_HEIGHT_M);
});

test('la hauteur choisie est bornée', () => {
  assert.equal(resolveColumnHeightM({ columnHeightM: 4.2 }), 4.2);
  assert.equal(resolveColumnHeightM({ columnHeightM: 0.1 }), 0.8);
  assert.equal(resolveColumnHeightM({ columnHeightM: 40 }), 12);
});

test('« jusqu’au plafond » suit la hauteur des murs', () => {
  assert.equal(resolveColumnHeightM({ columnToCeiling: true, columnHeightM: 2 }, 5.5), 5.5);
  // Sans hauteur de plafond connue, on retombe sur la hauteur choisie.
  assert.equal(resolveColumnHeightM({ columnToCeiling: true, columnHeightM: 2 }), 2);
});

test('les anciennes colonnes gardent leur pierre non teintée', () => {
  assert.equal(columnColorApplies({ color: '#78716c' }), false);
  assert.equal(columnColorApplies({ color: '#78716c', columnMaterial: 'stone' }), true);
  assert.equal(columnColorApplies({ columnMaterial: 'painted' }), false);
});

test('peinte et métal ne sont pas des matières texturées', () => {
  assert.equal(isTexturedColumnMaterial('painted'), false);
  assert.equal(isTexturedColumnMaterial('metal'), false);
  assert.equal(isTexturedColumnMaterial('marble'), true);
  assert.equal(isTexturedColumnMaterial(undefined), true);
});

test('chaque style rapide est reconnu une fois appliqué', () => {
  for (const preset of COLUMN_STYLE_PRESETS) {
    const applied = { columnHeightM: 3, ...columnPresetPatch(preset) };
    assert.equal(matchColumnStylePreset(applied)?.id, preset.id);
  }
});

test('passer d’un style doré à un style sans dorure efface la teinte des moulures', () => {
  const gold = COLUMN_STYLE_PRESETS.find((p) => p.fields.columnTrimColor)!;
  const plain = COLUMN_STYLE_PRESETS.find((p) => !p.fields.columnTrimColor)!;
  const next = { ...columnPresetPatch(gold), ...columnPresetPatch(plain) };
  assert.equal(next.columnTrimColor, undefined);
  assert.equal(matchColumnStylePreset(next)?.id, plain.id);
});
