'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

export interface OverflowMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Compteur affiché à droite du libellé. */
  badge?: string | number;
  /** Trait de séparation au-dessus de l’entrée. */
  separatorBefore?: boolean;
}

const MENU_WIDTH = 208;
const GAP = 6;
const EDGE = 8;

/**
 * Menu déroulant léger (actions secondaires, onglets « Plus »).
 * Le panneau est affiché hors de la page (portail) pour ne jamais être coupé par une carte ou un
 * conteneur à défilement ; il se place sous le bouton, ou au-dessus s’il manque de place.
 * Se ferme au clic extérieur, à Échap, au défilement et après un choix.
 */
export default function OverflowMenu({
  trigger,
  triggerLabel,
  items,
  align = 'right',
  triggerClassName,
  menuWidth = MENU_WIDTH,
  header,
  placement = 'vertical',
  className,
}: {
  trigger: React.ReactNode;
  /** Nom accessible du bouton (obligatoire si `trigger` n'est qu'une icône). */
  triggerLabel?: string;
  items: OverflowMenuItem[];
  align?: 'left' | 'right';
  triggerClassName?: string;
  /** Largeur du panneau en pixels (208 par défaut). */
  menuWidth?: number;
  /** Bloc affiché en tête du panneau (ex. identité de l’utilisateur). */
  header?: React.ReactNode;
  /** `right` : le panneau s’ouvre à droite du bouton, aligné sur son bas. */
  placement?: 'vertical' | 'right';
  /** Classe du conteneur du bouton. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? items.length * 44 + 12;
    if (placement === 'right') {
      const left = Math.min(rect.right + GAP, window.innerWidth - menuWidth - EDGE);
      const top = Math.max(EDGE, Math.min(rect.bottom - menuHeight, window.innerHeight - menuHeight - EDGE));
      setPos({ top, left });
      return;
    }
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow >= menuHeight + GAP + EDGE || rect.top < menuHeight + GAP + EDGE
        ? rect.bottom + GAP
        : rect.top - menuHeight - GAP;
    const desired = align === 'right' ? rect.right - menuWidth : rect.left;
    const left = Math.min(Math.max(EDGE, desired), window.innerWidth - menuWidth - EDGE);
    setPos({ top, left });
  }, [open, align, items.length, menuWidth, placement]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => {
          setPos(null);
          setOpen((o) => !o);
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            style={{
              position: 'fixed',
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: menuWidth,
              visibility: pos ? 'visible' : 'hidden',
            }}
            className="z-[90] py-1.5 rounded-2xl border border-border bg-surface shadow-xl animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            {header ? <div className="px-3.5 pt-2 pb-3 mb-1.5 border-b border-border">{header}</div> : null}
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={item.id}>
                {item.separatorBefore ? <div aria-hidden className="my-1.5 h-px bg-border" /> : null}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'w-full min-h-11 px-3.5 flex items-center gap-2.5 text-left text-sm font-medium transition',
                    'focus-visible:outline-none focus-visible:bg-surface-muted disabled:opacity-50',
                    item.danger ? 'text-danger hover:bg-danger/10' : 'text-foreground hover:bg-surface-muted',
                  )}
                >
                  {Icon ? <Icon className="w-4 h-4 shrink-0" aria-hidden /> : null}
                  <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge !== '' ? (
                    <span className="text-xs font-semibold text-muted tabular-nums">{item.badge}</span>
                  ) : null}
                </button>
                </React.Fragment>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
