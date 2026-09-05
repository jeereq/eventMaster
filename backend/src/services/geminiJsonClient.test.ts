import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getGeminiTextModel, parseGeminiJson } from './geminiJsonClient.ts';

describe('parseGeminiJson', () => {
  it('accepte un JSON nu ou entouré de fences', () => {
    assert.deepEqual(parseGeminiJson('{"ok":true}'), { ok: true });
    assert.deepEqual(parseGeminiJson('```json\n{"ok":true}\n```'), { ok: true });
  });
});

describe('getGeminiTextModel', () => {
  it('remplace les modèles retirés par gemini-3.1-pro-preview', () => {
    const previous = process.env.GEMINI_PLAN_MODEL;
    process.env.GEMINI_PLAN_MODEL = 'gemini-2.5-pro';
    try {
      assert.equal(getGeminiTextModel(), 'gemini-3.1-pro-preview');
    } finally {
      if (previous == null) delete process.env.GEMINI_PLAN_MODEL;
      else process.env.GEMINI_PLAN_MODEL = previous;
    }
  });
});
