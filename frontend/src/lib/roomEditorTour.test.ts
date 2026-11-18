import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { roomEditorCapabilities } from './roomEditorAccess.ts';
import { buildEditorTour, editorTourSummary } from './roomEditorTour.ts';

describe('buildEditorTour', () => {
  it('garde toutes les étapes et marque celles hors forfait', () => {
    const basic = buildEditorTour(roomEditorCapabilities('basic'));
    const complete = buildEditorTour(roomEditorCapabilities('complete'));
    assert.equal(basic.length, complete.length);
    assert.ok(complete.every((s) => !s.locked));
    const rows = basic.find((s) => s.id === 'rows');
    assert.equal(rows?.locked, true);
    assert.equal(rows?.planLabel, 'Business');
    assert.match(rows?.lockMessage ?? '', /Business/);
    assert.equal(basic.find((s) => s.id === 'canvas')?.locked, false);
  });

  it('indique le bon forfait pour chaque fonction', () => {
    const business = buildEditorTour(roomEditorCapabilities('standard'));
    assert.equal(business.find((s) => s.id === 'rows')?.locked, false);
    assert.equal(business.find((s) => s.id === 'decor')?.planLabel, 'Premium');
    assert.equal(business.find((s) => s.id === 'zones')?.planLabel, 'Premium');
  });

  it('sans l’option décors, le décor est verrouillé sans forfait à proposer', () => {
    const premiumNoDecor = buildEditorTour(roomEditorCapabilities('advanced', false));
    const decor = premiumNoDecor.find((s) => s.id === 'decor');
    assert.equal(decor?.locked, true);
    assert.equal(decor?.planLabel, null);
  });
});

describe('editorTourSummary', () => {
  it('résume le forfait et le suivant', () => {
    const s = editorTourSummary(roomEditorCapabilities('basic'));
    assert.equal(s.title, 'Forfait Essentiel');
    assert.equal(s.nextPlan, 'Business');
    assert.ok(s.included[0].includes('8 tables'));
    assert.equal(editorTourSummary(roomEditorCapabilities('complete')).nextPlan, null);
  });
});
