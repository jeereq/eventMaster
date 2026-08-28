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

/** Classes partagées pour overlays ad-hoc (même look que Modal). */
export const modalBackdropClass =
  'absolute inset-0 bg-black/60 animate-fade-in';

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
  const openedAtRef = useRef(0);

  const requestClose = useCallback(() => {
    // Le tap/clic qui ouvre la fenêtre retombe parfois sur le fond (iOS / Focus / carte).
    if (Date.now() - openedAtRef.current < 450) return;
    onClose();
  }, [onClose]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    },
    [requestClose],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
    if (dismissible) {
      document.addEventListener('keydown', handleEscape);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, handleEscape, dismissible]);

  if (!open || !mounted) return null;

  const showHeader = !hideHeader && (title || description || dismissible);

  return createPortal(
    <div className={cn('fixed inset-0 z-[11000]', containerClassName)}>
      {dismissible ? (
        <button
          type="button"
          aria-label="Fermer"
          className={cn(modalBackdropClass, 'z-0')}
          onClick={requestClose}
        />
      ) : (
        <div className={cn(modalBackdropClass, 'z-0')} aria-hidden />
      )}
      <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(modalPanelClass, 'pointer-events-auto', sizeMap[size], className)}
        >
          {showHeader && (
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border shrink-0">
              <div className="min-w-0">
                {title && (
                  <h2 id="modal-title" className="text-lg font-bold text-foreground tracking-tight">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-muted mt-1">{description}</p>
                )}
              </div>
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-[var(--radius-button)] text-muted hover:text-foreground hover:bg-surface-muted transition shrink-0"
                  aria-label="Fermer la fenêtre"
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
