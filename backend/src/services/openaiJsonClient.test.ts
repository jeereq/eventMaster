import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openAiLocksSampling, openAiSupportsCustomTemperature } from './openaiJsonClient.ts';

describe('openAiSupportsCustomTemperature', () => {
  it('autorise gpt-4o / gpt-4-turbo / gpt-3.5', () => {
    assert.equal(openAiSupportsCustomTemperature('gpt-4o'), true);
    assert.equal(openAiSupportsCustomTemperature('gpt-4o-mini'), true);
    assert.equal(openAiSupportsCustomTemperature('gpt-4-turbo'), true);
    assert.equal(openAiSupportsCustomTemperature('gpt-3.5-turbo'), true);
    assert.equal(openAiSupportsCustomTemperature('gpt-4'), true);
    assert.equal(openAiSupportsCustomTemperature('gpt-4-0613'), true);
  });

  it('bloque gpt-5, gpt-4.1, luna, astra et o-series', () => {
    assert.equal(openAiSupportsCustomTemperature('gpt-5.6-luna'), false);
    assert.equal(openAiSupportsCustomTemperature('gpt-6-astra'), false);
    assert.equal(openAiSupportsCustomTemperature('gpt-5'), false);
    assert.equal(openAiSupportsCustomTemperature('gpt-4.1'), false);
    assert.equal(openAiSupportsCustomTemperature('gpt-4.1-mini'), false);
    assert.equal(openAiSupportsCustomTemperature('o3-mini'), false);
  });

  it('openAiLocksSampling reste l’inverse', () => {
    assert.equal(openAiLocksSampling('gpt-5.6-luna'), true);
    assert.equal(openAiLocksSampling('gpt-4o'), false);
  });
});
