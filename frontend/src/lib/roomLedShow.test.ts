import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLedShowAnimated, isLedShowOn, ledColorAt, resolveLedShow } from './roomLedShow.ts';

test('réglages LED illisibles : valeurs par défaut sûres', () => {
  const s = resolveLedShow({ mode: 'laser' as never, color: 'violet', speed: 99 });
  assert.equal(s.mode, 'off');
  assert.equal(s.color, '#8b5cf6');
  assert.equal(s.speed, 3);
  assert.equal(isLedShowOn(s), false);
});

test('couleur fixe : la couleur choisie à pleine intensité', () => {
  const s = resolveLedShow({ mode: 'static', color: '#ff0000' });
  const c = ledColorAt(s, 12, 3, 10);
  assert.deepEqual(c.rgb, [1, 0, 0]);
  assert.equal(c.intensity, 1);
  assert.equal(isLedShowAnimated(s), false);
});

test('arc-en-ciel : lampes voisines de teintes différentes, qui évoluent dans le temps', () => {
  const s = resolveLedShow({ mode: 'rainbow' });
  const a = ledColorAt(s, 0, 0, 8).rgb;
  const b = ledColorAt(s, 0, 4, 8).rgb;
  const a2 = ledColorAt(s, 3, 0, 8).rgb;
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(a, a2);
  assert.ok(isLedShowAnimated(s));
});

test('chenillard : une seule zone vive qui avance', () => {
  const s = resolveLedShow({ mode: 'chase', speed: 1 });
  const n = 20;
  const at0 = Array.from({ length: n }, (_, i) => ledColorAt(s, 0, i, n).intensity);
  const brightest = at0.indexOf(Math.max(...at0));
  assert.equal(brightest, 0);
  const at1 = Array.from({ length: n }, (_, i) => ledColorAt(s, 1, i, n).intensity);
  assert.notEqual(at1.indexOf(Math.max(...at1)), 0);
  for (const v of [...at0, ...at1]) assert.ok(v >= 0 && v <= 1);
});

test('pulsation, disco et scintillement restent dans les bornes', () => {
  for (const mode of ['pulse', 'disco', 'twinkle'] as const) {
    const s = resolveLedShow({ mode });
    for (let t = 0; t < 5; t += 0.37) {
      const c = ledColorAt(s, t, 2, 9);
      assert.ok(c.intensity >= 0 && c.intensity <= 1, `${mode} ${t}`);
      for (const ch of c.rgb) assert.ok(ch >= 0 && ch <= 1);
    }
  }
});
