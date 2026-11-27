'use client';

import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Étiquette de catégorie d'invité façon papier déchiré : une forme en papier aux bords
 * irréguliers, posée derrière le début du mot.
 * Famille → cœur, Amis → étoile, autres catégories → rond.
 * Les bords sont générés à partir du nom : la même catégorie a toujours la même découpe.
 */

type Shape = 'heart' | 'star' | 'dot';

const SHAPES: Array<{ match: RegExp; shape: Shape; tint: string }> = [
  { match: /famil/i, shape: 'heart', tint: 'var(--chart-6)' },
  { match: /^\s*(ami(e|s|es)?|friends?)\s*$/i, shape: 'star', tint: 'var(--chart-2)' },
];
const OTHER_TINTS = ['var(--chart-5)', 'var(--chart-4)', 'var(--chart-1)', 'var(--chart-3)'];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Suite pseudo-aléatoire déterministe dans [-1, 1]. */
function jitter(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

const toPath = (pts: Array<[number, number]>) =>
  `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;

/** Forme découpée (repère 24 × 24) avec un contour légèrement irrégulier. */
function tornShape(shape: Shape, seed: number, scale = 1, amp = 0.7) {
  const r = jitter(seed);
  const pts: Array<[number, number]> = [];
  const n = 56;
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    let x: number;
    let y: number;
    if (shape === 'heart') {
      x = 16 * Math.sin(t) ** 3;
      y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      x = 12 + x * 0.68;
      y = 11.5 + y * 0.68;
    } else if (shape === 'star') {
      const k = Math.floor((i / n) * 10);
      const radius = k % 2 === 0 ? 10.5 : 4.6;
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const next = ((k + 1) / 10) * Math.PI * 2 - Math.PI / 2;
      const nextR = (k + 1) % 2 === 0 ? 10.5 : 4.6;
      const f = (i / n) * 10 - k;
      x = 12 + (Math.cos(a) * radius) * (1 - f) + Math.cos(next) * nextR * f;
      y = 12.5 + (Math.sin(a) * radius) * (1 - f) + Math.sin(next) * nextR * f;
    } else {
      x = 12 + Math.cos(t) * 9.5;
      y = 12 + Math.sin(t) * 9.5;
    }
    pts.push([12 + (x - 12) * scale + r() * amp, 12 + (y - 12) * scale + r() * amp]);
  }
  return toPath(pts);
}

export function CategoryTag({ label, className }: { label: string; className?: string }) {
  const seed = hash(label.toLowerCase());
  const known = SHAPES.find((s) => s.match.test(label));
  const shape: Shape = known?.shape ?? 'dot';
  const tint = known?.tint ?? OTHER_TINTS[seed % OTHER_TINTS.length];
  const tilt = ((seed % 5) - 2) * 0.6; // entre -1,2° et +1,2°

  return (
    <span
      className={cn('relative inline-flex items-center whitespace-nowrap py-1.5 pl-3.5 pr-1 text-[13px] font-medium', className)}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute -left-1.5 top-1/2 h-8 w-8 overflow-visible drop-shadow-[0_1px_1px_rgba(16,24,40,0.14)]"
        style={{ transform: `translateY(-50%) rotate(${tilt * 6}deg)` }}
      >
        {/* Liseré de fibre blanche : le bord du papier arraché. */}
        <path d={tornShape(shape, seed + 3, 1.12, 1.1)} fill="color-mix(in srgb, #ffffff 16%, var(--surface))" />
        <path d={tornShape(shape, seed + 7)} fill={`color-mix(in srgb, ${tint} 34%, var(--surface))`} />
      </svg>
      <span className="relative" style={{ color: `color-mix(in srgb, ${tint} 50%, var(--foreground))` }}>
        {label}
      </span>
    </span>
  );
}
