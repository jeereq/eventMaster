'use client';

import React, { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

/**
 * Raccourci clavier affiché touche par touche. `Mod` vaut ⌘ sur Mac / iPhone / iPad
 * et Ctrl ailleurs. Rendu serveur : version Ctrl (corrigée à l'hydratation sur Apple).
 *
 * Exemples : <Kbd keys={['Mod', 'D']} />, <Kbd keys={['Escape']} />, <Kbd keys={['V']} />
 */
export type KbdKey = 'Mod' | 'Shift' | 'Alt' | 'Escape' | 'Delete' | 'Enter' | (string & {});

const noopSubscribe = () => () => {};

function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function useIsApplePlatform(): boolean {
  return useSyncExternalStore(noopSubscribe, isApplePlatform, () => false);
}

function keyLabel(key: KbdKey, apple: boolean): string {
  switch (key) {
    case 'Mod':
      return apple ? '⌘' : 'Ctrl';
    case 'Shift':
      return apple ? '⇧' : 'Maj';
    case 'Alt':
      return apple ? '⌥' : 'Alt';
    case 'Escape':
      return 'Échap';
    case 'Delete':
      return 'Suppr';
    case 'Enter':
      return 'Entrée';
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

/** Valeur pour `aria-keyshortcuts` (noms de touches standard, Mod = Control ou Meta). */
export function ariaKeyShortcuts(keys: KbdKey[]): string {
  const base = keys.map((k) => {
    if (k === 'Mod') return 'Control';
    if (k === 'Shift') return 'Shift';
    if (k === 'Alt') return 'Alt';
    return k.length === 1 ? k.toUpperCase() : k;
  });
  const combo = base.join('+');
  return keys.includes('Mod') ? `${combo} ${combo.replace('Control', 'Meta')}` : combo;
}

export default function Kbd({ keys, className }: { keys: KbdKey[]; className?: string }) {
  const apple = useIsApplePlatform();
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <React.Fragment key={`${key}-${index}`}>
          {index > 0 && !apple ? <span aria-hidden className="opacity-60">+</span> : null}
          <kbd className="inline-flex min-w-5 h-5 items-center justify-center rounded border border-current/25 px-1 font-sans text-xs leading-none">
            {keyLabel(key, apple)}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}
