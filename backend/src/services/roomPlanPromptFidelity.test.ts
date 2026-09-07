import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRoomPlanEnglishSceneBrief,
  buildRoomPlanEnglishSceneBriefScaffold,
  parseRoomPlanEnglishSceneBriefFromJson,
  processRoomPlanBrief,
} from './roomPlanPromptFidelity.ts';

describe('processRoomPlanBrief', () => {
  it('produit une scène narrative anglaise avec la formule Gemini', () => {
    const processed = processRoomPlanBrief(
      'Mariage 120 convives, 12 tables rondes en quinconce, allée ivoire, table d’honneur au nord',
      { roomType: 'BANQUET', widthM: 20, heightM: 16 },
    );
    assert.match(processed.englishSceneBrief, /Compose/);
    assert.match(processed.englishSceneBrief, /\[Subject\]/);
    assert.match(processed.englishSceneBrief, /\[Action\]/);
    assert.match(processed.englishSceneBrief, /\[Style\]/);
    assert.match(processed.englishSceneBrief, /120 convives|quinconce|ivoire/i);
    assert.match(processed.englishSceneBrief, /20 m × 16 m/);
  });

  it('détecte une cérémonie jardin dans le sujet', () => {
    const scaffold = buildRoomPlanEnglishSceneBriefScaffold(
      'Cérémonie jardin, 8 rangées, allée nuptiale, podium couple',
      { roomType: 'BANQUET', widthM: 18, heightM: 24 },
    );
    assert.match(scaffold, /ceremony seating/i);
  });

  it('applique une reformulation Gemini anglaise', () => {
    const base = processRoomPlanBrief('Gala 80, piste et DJ', { roomType: 'BANQUET' });
    const next = applyRoomPlanEnglishSceneBrief(
      base,
      'Compose a gala floor plan. [Subject] Banquet with dance floor. [Action] Stage west, clusters of round tables. [Location/context] 20×16 m. [Composition] Clear east entrance. [Style] Walnut parquet.',
    );
    assert.match(next.englishSceneBrief, /Compose a gala floor plan/);
  });

  it('parse le JSON de reformulation', () => {
    assert.match(
      parseRoomPlanEnglishSceneBriefFromJson({
        englishSceneBrief: '  Lay out a conference hall.  ',
      }),
      /Lay out a conference hall/,
    );
    assert.equal(parseRoomPlanEnglishSceneBriefFromJson(null), '');
  });
});
