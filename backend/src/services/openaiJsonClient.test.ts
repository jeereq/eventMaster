import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openAiLocksSampling } from './openaiJsonClient.ts';

describe('openAiLocksSampling', () => {
  it('bloque la température custom sur gpt-5, luna et astra', () => {
    assert.equal(openAiLocksSampling('gpt-5.6-luna'), true);
    assert.equal(openAiLocksSampling('gpt-6-astra'), true);
    assert.equal(openAiLocksSampling('gpt-5'), true);
    assert.equal(openAiLocksSampling('o3-mini'), true);
  });

  it('laisse gpt-4o régler la température', () => {
    assert.equal(openAiLocksSampling('gpt-4o'), false);
    assert.equal(openAiLocksSampling('gpt-4o-mini'), false);
  });
});
