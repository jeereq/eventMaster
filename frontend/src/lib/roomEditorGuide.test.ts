import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EDITOR_GUIDE_ACTIONS,
  EDITOR_GUIDE_CATEGORY_ORDER,
  answerEditorGuide,
  editorGuideCatalog,
  editorGuideLock,
  guideSelectionMatches,
  guideStepDone,
  guideStepTargets,
  isOverviewQuestion,
  normalizeGuideText,
} from './roomEditorGuide.ts';
import { roomEditorCapabilities } from './roomEditorAccess.ts';

const LOCATOR = /^(tour|btn|field|label|css|text):.+/;

function guideFor(q: string): string {
  const a = answerEditorGuide(q);
  return a.kind === 'match' ? a.best.id : a.kind;
}

test('chaque action a un identifiant unique, des étapes et des liens valides', () => {
  const ids = new Set<string>();
  for (const a of EDITOR_GUIDE_ACTIONS) {
    assert.ok(!ids.has(a.id), `doublon ${a.id}`);
    ids.add(a.id);
    assert.ok(EDITOR_GUIDE_CATEGORY_ORDER.includes(a.category), a.id);
    assert.ok(a.steps.length > 0, `aucune étape : ${a.id}`);
    assert.ok(a.result.length > 8, `résultat manquant : ${a.id}`);
    assert.ok(a.keywords.length > 0, `mots-clés manquants : ${a.id}`);
  }
  for (const a of EDITOR_GUIDE_ACTIONS) for (const r of a.related ?? []) assert.ok(ids.has(r), `${a.id} → ${r}`);
});

test('la liste est exhaustive : plus de 150 actions, tous les thèmes couverts', () => {
  assert.ok(EDITOR_GUIDE_ACTIONS.length >= 150, String(EDITOR_GUIDE_ACTIONS.length));
  const total = editorGuideCatalog().reduce((n, s) => n + s.actions.length, 0);
  assert.equal(total, EDITOR_GUIDE_ACTIONS.length);
  for (const c of EDITOR_GUIDE_CATEGORY_ORDER) assert.ok(EDITOR_GUIDE_ACTIONS.some((a) => a.category === c), c);
});

test('chaque étape est précise : consigne, repères bien formés, geste attendu cohérent', () => {
  for (const a of EDITOR_GUIDE_ACTIONS) {
    for (const [i, step] of a.steps.entries()) {
      const where = `${a.id} #${i + 1}`;
      assert.ok(step.say.length >= 12, `consigne trop courte : ${where}`);
      assert.match(step.say, /[.!?)…»]$/, `consigne sans ponctuation finale : ${where}`);
      for (const loc of [...guideStepTargets(step), ...(step.via ?? [])]) {
        for (const part of loc.split(' >> ')) assert.match(part, LOCATOR, `repère invalide « ${part} » : ${where}`);
      }
      const done = guideStepDone(step);
      if (done === 'click' || done === 'change') assert.ok(guideStepTargets(step).length > 0, `geste sans cible : ${where}`);
      if (done === 'key') assert.ok(step.key, `raccourci manquant : ${where}`);
    }
    // Un guide montre au moins un élément réel de l'interface.
    assert.ok(a.steps.some((s) => guideStepTargets(s).length > 0), `aucune cible : ${a.id}`);
  }
});

test('les meubles de maison et les éléments de jardin ont chacun leur guide', () => {
  assert.ok(EDITOR_GUIDE_ACTIONS.some((a) => a.id === 'home-bed'));
  assert.ok(EDITOR_GUIDE_ACTIONS.some((a) => a.id === 'landscape-pool'));
});

test('les questions de liste ouvrent la liste complète', () => {
  for (const q of ['Que puis-je faire ?', 'Quelles sont toutes les actions possibles', 'donne moi la liste', 'aide']) {
    assert.ok(isOverviewQuestion(q), q);
    assert.equal(answerEditorGuide(q).kind, 'overview');
  }
});

test('questions courantes → bon guide', () => {
  const cases: Array<[string, string]> = [
    ['Comment ajouter une porte dans un mur ?', 'add-door'],
    ['Ajouter une fenêtre', 'add-window'],
    ['changer la taille d’une table', 'table-size'],
    ['Je veux voir la salle remplie', 'guests-sim'],
    ['mettre des moulures sur les murs', 'wall-trim'],
    ['ajouter une piste de danse', 'dance-floor'],
    ['Vérifier les passages', 'spacing'],
    ['ajouter un étage', 'add-story'],
    ['combien de chaises commander', 'bom'],
    ['changer le sol en marbre', 'floor'],
    ['écrire un graffiti', 'graffiti'],
    ['Comment annuler ?', 'undo'],
    ['piste de danse avec monogramme', 'dance-floor-fx'],
    ['mettre des chaises en rangées', 'add-row'],
    ['dupliquer une table', 'duplicate'],
    ['ajouter une piscine', 'landscape-pool'],
    ['ajouter un lit', 'home-bed'],
    ['exporter une image', 'export-png'],
    ['pivoter un élément', 'rotate'],
  ];
  for (const [q, id] of cases) assert.equal(guideFor(q), id, q);
});

test('une demande nette lance le guide directement', () => {
  const a = answerEditorGuide('ajouter une fenêtre');
  assert.ok(a.kind === 'match' && a.confident);
});

test('question incomprise : suggestions plutôt qu’un mauvais guide', () => {
  const a = answerEditorGuide('xyzzy plop');
  assert.equal(a.kind, 'unknown');
  assert.ok(a.kind === 'unknown' && a.suggestions.length > 0);
});

test('filtrer la liste complète', () => {
  const sections = editorGuideCatalog('fenêtre');
  assert.ok(sections.some((s) => s.actions.some((a) => a.id === 'add-window')));
  assert.ok(!sections.some((s) => s.actions.some((a) => a.id === 'add-table')));
});

test('sélection attendue', () => {
  assert.ok(guideSelectionMatches('none', []));
  assert.ok(!guideSelectionMatches('none', ['table']));
  assert.ok(guideSelectionMatches('many', ['table', 'chair']));
  assert.ok(guideSelectionMatches('fixture', ['fixture:bar']));
  assert.ok(guideSelectionMatches('fixture:door', ['fixture:entrance']));
  assert.ok(!guideSelectionMatches('table', ['row']));
});

test('normalisation : accents, apostrophes et majuscules', () => {
  assert.equal(normalizeGuideText('Fenêtre d’Entrée'), 'fenetre d entree');
});

test('guides réservés signalés selon le forfait', () => {
  const ai = EDITOR_GUIDE_ACTIONS.find((a) => a.id === 'ai-studio')!;
  assert.ok(editorGuideLock(ai, roomEditorCapabilities('basic', true)));
  assert.equal(editorGuideLock(ai, roomEditorCapabilities('complete', true)), null);
});
