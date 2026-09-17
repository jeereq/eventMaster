import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVAILABLE_INVITATION_MODELS,
  AVAILABLE_ROOM_PLAN_MODELS,
  isOpenAiStudioModel,
  sanitizeAiStudioModels,
} from './aiStudioModels.ts';

describe('isOpenAiStudioModel', () => {
  it('reconnaît les modèles OpenAI proposés', () => {
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
      invitationModel: 'gpt-5.6-luna',
      roomPlanModel: 'gpt-4o',
    });
    assert.equal(next.invitationModel, 'gpt-5.6-luna');
    assert.equal(next.roomPlanModel, 'gpt-4o');
  });

  it('liste OpenAI dans les catalogues admin', () => {
    assert.ok(AVAILABLE_INVITATION_MODELS.some((model) => model.id === 'gpt-5.6-luna'));
    assert.ok(AVAILABLE_ROOM_PLAN_MODELS.some((model) => model.id === 'gpt-4o'));
  });
});
