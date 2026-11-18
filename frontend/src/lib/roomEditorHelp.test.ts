import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EDITOR_HELP_CATEGORY_ORDER,
  EDITOR_HELP_TOPICS,
  answerEditorQuestion,
  editorHelpLock,
  editorHelpOverview,
  isOverviewQuestion,
  normalizeHelpText,
} from './roomEditorHelp.ts';
import { roomEditorCapabilities } from './roomEditorAccess.ts';

function topicFor(q: string): string | null {
  const a = answerEditorQuestion(q);
  return a.kind === 'topic' ? a.topic.id : a.kind;
}

test('les fiches ont des identifiants uniques et des liens valides', () => {
  const ids = new Set<string>();
  for (const t of EDITOR_HELP_TOPICS) {
    assert.ok(!ids.has(t.id), `doublon ${t.id}`);
    ids.add(t.id);
    assert.ok(t.answer.length > 40, `réponse trop courte : ${t.id}`);
    assert.ok(EDITOR_HELP_CATEGORY_ORDER.includes(t.category), t.id);
  }
  for (const t of EDITOR_HELP_TOPICS) for (const r of t.related ?? []) assert.ok(ids.has(r), `${t.id} → ${r}`);
});

test('le descriptif complet couvre toutes les fiches', () => {
  const total = editorHelpOverview().reduce((n, s) => n + s.topics.length, 0);
  assert.equal(total, EDITOR_HELP_TOPICS.length);
});

test('les questions de liste renvoient le descriptif complet', () => {
  for (const q of ['Que puis-je faire ?', 'Quelles sont toutes les actions possibles', 'donne moi le descriptif', 'aide']) {
    assert.ok(isOverviewQuestion(q), q);
    assert.equal(answerEditorQuestion(q).kind, 'overview');
  }
});

test('questions courantes → bonne fiche', () => {
  const cases: Array<[string, string]> = [
    ['Comment ajouter une porte ?', 'openings'],
    ['comment changer la taille d’une table', 'resize'],
    ['Je veux voir la salle remplie', 'crowd'],
    ['mettre des moulures sur les murs', 'wall-trim'],
    ['Vérifier les passages', 'spacing'],
    ['ajouter un étage', 'stories'],
    ['combien de chaises commander', 'bom'],
    ['changer le sol en marbre', 'floor'],
    ['mettre un graffiti dehors', 'wall-art'],
    ['Comment annuler ?', 'undo'],
    ['piste de danse avec initiales', 'dance-floor'],
    ['faire le plan avec l’IA depuis une photo', 'ai-studio'],
    ['comment mettre des chaises en rangées', 'rows'],
  ];
  for (const [q, id] of cases) assert.equal(topicFor(q), id, q);
});

test('question incomprise : suggestions plutôt qu’une mauvaise réponse', () => {
  const a = answerEditorQuestion('xyzzy plop');
  assert.equal(a.kind, 'unknown');
  assert.ok(a.kind === 'unknown' && a.suggestions.length > 0);
});

test('normalisation : accents, apostrophes et majuscules', () => {
  assert.equal(normalizeHelpText('Fenêtre d’Entrée'), 'fenetre d entree');
});

test('fiches réservées signalées selon le forfait', () => {
  const ai = EDITOR_HELP_TOPICS.find((t) => t.id === 'ai-studio')!;
  assert.ok(editorHelpLock(ai, roomEditorCapabilities('basic', true)));
  assert.equal(editorHelpLock(ai, roomEditorCapabilities('complete', true)), null);
});
