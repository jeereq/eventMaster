import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVAILABLE_INVITATION_MODELS,
  AVAILABLE_PRICE_RESEARCH_MODELS,
  AVAILABLE_ROOM_PLAN_MODELS,
  isOpenAiStudioModel,
  sanitizeAiStudioModels,
} from './aiStudioModels.ts';

describe('isOpenAiStudioModel', () => {
  it('reconnaît les modèles OpenAI proposés', () => {
    assert.equal(isOpenAiStudioModel('gpt-6-astra'), true);
    assert.equal(isOpenAiStudioModel('gpt-5.6-luna'), true);
    assert.equal(isOpenAiStudioModel('gpt-image-2'), true);
    assert.equal(isOpenAiStudioModel('gpt-4o'), true);
    assert.equal(isOpenAiStudioModel('gemini-3-pro-image'), false);
    assert.equal(isOpenAiStudioModel(''), false);
  });
});

describe('sanitizeAiStudioModels', () => {
  it('accepte OpenAI comme moteur principal invitations et salles', () => {
    const next = sanitizeAiStudioModels({
      invitationModel: 'gpt-6-astra',
      roomPlanModel: 'gpt-6-astra',
    });
    assert.equal(next.invitationModel, 'gpt-6-astra');
    assert.equal(next.roomPlanModel, 'gpt-6-astra');
  });

  it('garde le modèle de recherche de prix choisi, sinon Gemini 3.1 Pro', () => {
    assert.equal(sanitizeAiStudioModels({ priceResearchModel: 'gpt-5.6-luna' }).priceResearchModel, 'gpt-5.6-luna');
    assert.equal(sanitizeAiStudioModels({ priceResearchModel: 'gemini-3-flash' }).priceResearchModel, 'gemini-3-flash');
    assert.equal(sanitizeAiStudioModels({ priceResearchModel: 'gemini-3-pro-image' }).priceResearchModel, 'gemini-3.1-pro-preview', 'modèle image refusé');
    assert.equal(sanitizeAiStudioModels({}).priceResearchModel, 'gemini-3.1-pro-preview');
    assert.ok(AVAILABLE_PRICE_RESEARCH_MODELS.some((model) => model.provider === 'openai'));
  });

  it('liste OpenAI dans les catalogues admin', () => {
    assert.ok(AVAILABLE_INVITATION_MODELS.some((model) => model.id === 'gpt-6-astra'));
    assert.ok(AVAILABLE_INVITATION_MODELS.some((model) => model.id === 'gpt-5.6-luna'));
    assert.ok(AVAILABLE_ROOM_PLAN_MODELS.some((model) => model.id === 'gpt-6-astra'));
    assert.ok(AVAILABLE_ROOM_PLAN_MODELS.some((model) => model.id === 'gpt-4o'));
  });
});
