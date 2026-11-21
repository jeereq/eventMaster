import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { screenImageWindow, screenRatioAspect } from './roomScreenImage.ts';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

describe('image d’un écran', () => {
  it('montre toute l’image quand les formats sont identiques', () => {
    const win = screenImageWindow({ width: 1600, height: 900 }, undefined, 16 / 9);
    near(win.repeatX, 1);
    near(win.repeatY, 1);
    near(win.offsetX, 0);
    near(win.offsetY, 0);
  });
  it('rogne le haut et le bas d’une photo carrée sur un écran large, sans la déformer', () => {
    const win = screenImageWindow({ width: 1000, height: 1000 }, undefined, 2);
    near(win.repeatX, 1);
    near(win.repeatY, 0.5);
    near(win.offsetY, 0.25);
  });
  it('rogne les côtés d’une image très large sur un écran 16:9', () => {
    const win = screenImageWindow({ width: 3200, height: 900 }, undefined, 16 / 9);
    near(win.repeatX, 0.5);
    near(win.offsetX, 0.25);
    near(win.repeatY, 1);
  });
  it('part du recadrage choisi (y compté depuis le haut)', () => {
    const win = screenImageWindow({ width: 1000, height: 1000 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, 1);
    near(win.offsetX, 0.5);
    near(win.repeatX, 0.5);
    near(win.offsetY, 0.5);
    near(win.repeatY, 0.5);
  });
  it('lit le ratio des écrans', () => {
    near(screenRatioAspect('21:9'), 21 / 9);
    near(screenRatioAspect(undefined, 2.39), 2.39);
  });
});
