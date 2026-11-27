'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Images affichées par défaut sur les écrans quand aucune image n'a été choisie :
 * dessinées une fois sur un canvas, sans fichier externe ni droit d'auteur.
 *
 * - `landscape` : plan large d'un paysage au crépuscule (cinéma, projection) ;
 * - `stage` : visuel de scène (halos colorés, faisceaux, reflets) pour les murs LED ;
 * - `signage` : affiche d'accueil verticale (totems).
 */
export type ScreenPicture = 'landscape' | 'stage' | 'signage';

export function drawLandscapeFrame(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#1e2a52');
  sky.addColorStop(0.45, '#7a4a7a');
  sky.addColorStop(0.68, '#f08a4b');
  sky.addColorStop(0.8, '#ffd08a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Soleil bas avec halo
  const sx = width * 0.62;
  const sy = height * 0.7;
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, height * 0.55);
  halo.addColorStop(0, 'rgba(255,240,200,0.95)');
  halo.addColorStop(0.12, 'rgba(255,214,150,0.75)');
  halo.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  // Crêtes successives (perspective atmosphérique)
  const ridges: Array<[string, number, number, number]> = [
    ['#5a3b5e', 0.66, 0.06, 3],
    ['#3b2847', 0.74, 0.08, 5],
    ['#211830', 0.84, 0.07, 7],
    ['#0e0a16', 0.93, 0.05, 11],
  ];
  ridges.forEach(([color, base, amp, freq], k) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 4) {
      const t = x / width;
      const y =
        height * base -
        height * amp * (0.6 * Math.sin(t * freq + k * 1.7) + 0.4 * Math.sin(t * freq * 2.3 + k));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });

  return c;
}

/** Visuel de scène : fond nuit, halos magenta / cyan, faisceaux et reflets au sol. */
function drawStageFrame(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0b1030');
  bg.addColorStop(0.55, '#26104a');
  bg.addColorStop(1, '#071a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  };
  glow(width * 0.25, height * 0.35, height * 0.9, 'rgba(236,72,153,0.75)');
  glow(width * 0.78, height * 0.4, height * 0.85, 'rgba(34,211,238,0.6)');
  glow(width * 0.5, height * 1.05, height * 0.7, 'rgba(250,204,21,0.45)');

  // Faisceaux de lumière depuis le haut
  ctx.globalCompositeOperation = 'lighter';
  const beams = 7;
  for (let i = 0; i < beams; i += 1) {
    const x = (width * (i + 0.5)) / beams;
    const spread = width * 0.06;
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, i % 2 ? 'rgba(167,139,250,0.35)' : 'rgba(125,211,252,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 4, 0);
    ctx.lineTo(x + 4, 0);
    ctx.lineTo(x + spread + (i - beams / 2) * width * 0.02, height);
    ctx.lineTo(x - spread + (i - beams / 2) * width * 0.02, height);
    ctx.closePath();
    ctx.fill();
  }
  // Bokeh
  for (let i = 0; i < 40; i += 1) {
    const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const y = ((Math.sin(i * 78.233) * 12345.678) % 1 + 1) % 1;
    const r = height * (0.01 + (i % 5) * 0.006);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.35)' : i % 3 === 1 ? 'rgba(244,114,182,0.3)' : 'rgba(103,232,249,0.3)';
    ctx.beginPath();
    ctx.arc(x * width, y * height * 0.8, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // Bandeau central (titre stylisé)
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  const bw = width * 0.34;
  const bh = Math.max(4, height * 0.05);
  ctx.fillRect((width - bw) / 2, height * 0.46, bw, bh);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect((width - bw * 0.6) / 2, height * 0.46 + bh * 1.8, bw * 0.6, bh * 0.5);
  return c;
}

/** Affiche verticale d'accueil : dégradé, cercle lumineux et blocs de texte stylisés. */
function drawSignageFrame(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#1e1b4b');
  bg.addColorStop(0.6, '#7c2d92');
  bg.addColorStop(1, '#f97316');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const g = ctx.createRadialGradient(width / 2, height * 0.36, 0, width / 2, height * 0.36, width * 0.6);
  g.addColorStop(0, 'rgba(255,237,213,0.95)');
  g.addColorStop(0.35, 'rgba(253,186,116,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(width * 0.14, height * 0.66, width * 0.72, height * 0.035);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(width * 0.24, height * 0.725, width * 0.52, height * 0.02);
  ctx.fillRect(width * 0.3, height * 0.76, width * 0.4, height * 0.02);
  // Flèche d'orientation
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height * 0.93);
  ctx.lineTo(width * 0.42, height * 0.86);
  ctx.lineTo(width * 0.58, height * 0.86);
  ctx.closePath();
  ctx.fill();
  return c;
}

/** Texture de l'image par défaut, au format de la dalle (rapport largeur / hauteur). */
export function useDefaultScreenPicture(kind: ScreenPicture, aspect: number): THREE.Texture | null {
  const key = Math.round(aspect * 100) / 100;
  const tex = useMemo(() => {
    const base = 1024;
    const width = key >= 1 ? base : Math.max(64, Math.round(base * key));
    const height = key >= 1 ? Math.max(64, Math.round(base / key)) : base;
    const canvas =
      kind === 'stage' ? drawStageFrame(width, height)
        : kind === 'signage' ? drawSignageFrame(width, height)
          : drawLandscapeFrame(width, height);
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [kind, key]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}
