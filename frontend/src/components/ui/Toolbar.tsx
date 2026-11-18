'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Barre d'outils accessible : un seul arrêt de tabulation, puis les flèches (Début / Fin)
 * passent d'un bouton à l'autre. Les boutons concernés portent `data-toolbar-item`
 * (posé automatiquement par IconButton) ; les menus ouverts depuis la barre n'en font pas partie.
 */
export default function Toolbar({
  label,
  orientation = 'horizontal',
  className,
  children,
  tourId,
}: {
  label: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children: React.ReactNode;
  /** Cible de la visite guidée (`data-tour`). */
  tourId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const items = () =>
    Array.from(ref.current?.querySelectorAll<HTMLElement>('[data-toolbar-item]') ?? []).filter(
      (el) => !el.hasAttribute('disabled') && el.closest('[role="toolbar"]') === ref.current,
    );

  // Roving tabindex : garde exactement un bouton atteignable par Tab, même quand la barre change.
  useEffect(() => {
    const list = items();
    if (list.length === 0) return;
    const current = list.find((el) => el.getAttribute('tabindex') === '0') ?? list[0];
    list.forEach((el) => el.setAttribute('tabindex', el === current ? '0' : '-1'));
  });

  const focusItem = (target: HTMLElement, list: HTMLElement[]) => {
    list.forEach((el) => el.setAttribute('tabindex', el === target ? '0' : '-1'));
    target.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(event.target as HTMLElement);
    if (index === -1) return;
    const next = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const prev = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    let target: HTMLElement | undefined;
    if (event.key === next) target = list[(index + 1) % list.length];
    else if (event.key === prev) target = list[(index - 1 + list.length) % list.length];
    else if (event.key === 'Home') target = list[0];
    else if (event.key === 'End') target = list[list.length - 1];
    if (!target) return;
    event.preventDefault();
    // Les flèches ne doivent pas aussi déplacer les objets du plan.
    event.stopPropagation();
    focusItem(target, list);
  };

  const onFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    const list = items();
    const el = event.target as HTMLElement;
    if (list.includes(el)) list.forEach((item) => item.setAttribute('tabindex', item === el ? '0' : '-1'));
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className={cn(className)}
      data-tour={tourId}
    >
      {children}
    </div>
  );
}
