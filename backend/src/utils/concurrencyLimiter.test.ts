import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConcurrencyLimitError, createConcurrencyLimiter } from './concurrencyLimiter.ts';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('limiteur de concurrence', () => {
  it('exécute au plus N tâches à la fois et refuse au-delà de la file', async () => {
    const limiter = createConcurrencyLimiter(1, 1);
    const first = deferred();
    const order: string[] = [];

    const a = limiter.run(async () => {
      order.push('a');
      await first.promise;
    });
    const b = limiter.run(async () => {
      order.push('b');
    });
    await assert.rejects(limiter.run(async () => undefined), ConcurrencyLimitError);

    assert.deepEqual(order, ['a']);
    assert.deepEqual(limiter.stats(), { running: 1, queued: 1 });
    first.resolve();
    await Promise.all([a, b]);
    assert.deepEqual(order, ['a', 'b']);
    assert.deepEqual(limiter.stats(), { running: 0, queued: 0 });
  });

  it('libère la place même si la tâche échoue', async () => {
    const limiter = createConcurrencyLimiter(1, 0);
    await assert.rejects(limiter.run(async () => {
      throw new Error('boom');
    }));
    assert.equal(await limiter.run(async () => 42), 42);
  });
});
