import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStudioJob,
  getStudioJob,
  completeStudioJob,
  failStudioJob,
  serializeStudioJob,
} from './studioJobService.ts';

describe('studioJobService', () => {
  it('crée une tâche lisible par le même appareil', async () => {
    const job = createStudioJob({ kind: 'invitation', deviceId: 'dev-1', prompt: 'Mariage or ivoire' });
    assert.equal(job.status, 'queued');
    assert.ok(await getStudioJob(job.id, { deviceId: 'dev-1' }));
    assert.equal(await getStudioJob(job.id, { deviceId: 'autre' }), null);
  });

  it('termine et sérialise le résultat', async () => {
    const job = createStudioJob({ kind: 'room', deviceId: 'dev-2', userId: 'u1', prompt: 'Salle' });
    completeStudioJob(job.id, { result: { draft: { ok: true } }, historyId: 'h1' });
    const latest = await getStudioJob(job.id, { userId: 'u1' });
    assert.equal(latest?.status, 'done');
    const serialized = serializeStudioJob(latest!);
    assert.equal(serialized.historyId, 'h1');
    assert.deepEqual(serialized.result, { draft: { ok: true } });
  });

  it('enregistre une erreur', async () => {
    const job = createStudioJob({ kind: 'invitation', deviceId: 'dev-3' });
    failStudioJob(job.id, 'Saturé');
    assert.equal((await getStudioJob(job.id, { deviceId: 'dev-3' }))?.status, 'error');
  });
});
