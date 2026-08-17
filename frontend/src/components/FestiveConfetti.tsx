'use client';

import React, { useEffect, useMemo, useState } from 'react';

const COLORS = [
  'var(--festive-accent)',
  'var(--primary)',
  'var(--brand-accent)',
  '#f59e0b',
  '#10b981',
  '#f43f5e',
];

/**
 * Confetti one-shot (~1,5 s) — succès RSVP / moments émotionnels.
 */
export default function FestiveConfetti({
  active = true,
  count = 28,
  onceKey,
}: {
  active?: boolean;
  count?: number;
  /** Si fourni, n’affiche le confetti qu’une fois par onglet (sessionStorage). */
  onceKey?: string;
}) {
  const [show, setShow] = useState(() => {
    if (!active) return false;
    if (onceKey && typeof window !== 'undefined') {
      return sessionStorage.getItem(onceKey) !== '1';
    }
    return active;
  });

  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const left = ((i * 37) % 100) + (i % 5) * 0.4;
      const delay = (i % 8) * 0.05;
      const drift = ((i % 11) - 5) * 18;
      const color = COLORS[i % COLORS.length];
      const w = 5 + (i % 4);
      const h = 8 + (i % 5);
      return { left, delay, drift, color, w, h };
    });
  }, [count]);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    if (onceKey && typeof window !== 'undefined' && sessionStorage.getItem(onceKey) === '1') {
      setShow(false);
      return;
    }
    setShow(true);
    const t = window.setTimeout(() => {
      setShow(false);
      if (onceKey) sessionStorage.setItem(onceKey, '1');
    }, 1600);
    return () => window.clearTimeout(t);
  }, [active, onceKey]);

  if (!show) return null;

  return (
    <div className="em-confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}s`,
            ['--em-cx' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
