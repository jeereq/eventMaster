'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  containerClassName?: string;
  dismissible?: boolean;
  /** Masquer le header (titre/fermer) pour un contenu custom */
  hideHeader?: boolean;
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[100vw] sm:max-w-[min(98vw,90rem)]',
};

let openModalCount = 0;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return el.getClientRects().length > 0;
  });
}

/** Classes partagées pour overlays ad-hoc (même look que Modal). */
export const modalBackdropClass =
  'absolute inset-0 bg-black/40 animate-fade-in';

export const modalPanelClass =
  'relative w-full bg-surface border border-border shadow-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col animate-slide-up sm:animate-fade-in';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  containerClassName,
  dismissible = true,
  hideHeader = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [stackDepth, setStackDepth] = useState(1);
  const openedAtRef = useRef(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    // Le tap/clic qui ouvre la fenêtre retombe parfois sur le fond (iOS / Focus / carte).
    if (Date.now() - openedAtRef.current < 450) return;
    onCloseRef.current();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    openModalCount += 1;
    setStackDepth(openModalCount);
    openedAtRef.current = Date.now();
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (dismissible && e.key === 'Escape') {
        requestClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = focusableIn(panelRef.current);
      if (nodes.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = panelRef.current.contains(active);
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const alreadyInside = panel.contains(document.activeElement);
      if (alreadyInside) return;
      const preferred = panel.querySelector<HTMLElement>('[data-modal-initial-focus]');
      const firstField = focusableIn(panel).find((el) => {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
        return el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'hidden';
      });
      const closeBtn = panel.querySelector<HTMLElement>('[data-modal-close]');
      (preferred || firstField || closeBtn || panel).focus();
    }, 0);
    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, mounted, dismissible, requestClose]);

  if (!open || !mounted) return null;

  const showHeader = !hideHeader && (title || description || dismissible);

  return createPortal(
    <div className={cn('fixed inset-0', containerClassName)} style={{ zIndex: 11000 + stackDepth }}>
      {dismissible ? (
        <button
          type="button"
          aria-label="Fermer"
          className={cn(modalBackdropClass, 'z-0', stackDepth > 1 && 'bg-black/15')}
          onClick={requestClose}
        />
      ) : (
        <div className={cn(modalBackdropClass, 'z-0', stackDepth > 1 && 'bg-black/15')} aria-hidden />
      )}
      <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-desc' : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(modalPanelClass, 'pointer-events-auto outline-none', sizeMap[size], className)}
        >
          {showHeader && (
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border shrink-0">
              <div className="min-w-0">
                {title && (
                  <h2 id="modal-title" className="text-lg font-bold text-foreground tracking-tight break-words">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-desc" className="text-sm text-muted mt-1 break-words">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-[var(--radius-button)] text-muted hover:text-foreground hover:bg-surface-muted transition shrink-0"
                  aria-label="Fermer la fenêtre"
                  data-modal-close
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          <div className="overflow-y-auto overscroll-contain flex-1 p-5 sm:p-6 touch-pan-y">{children}</div>
          {footer && (
            <div className="border-t border-border p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5 shrink-0 flex flex-wrap gap-2 justify-end bg-surface-muted/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
