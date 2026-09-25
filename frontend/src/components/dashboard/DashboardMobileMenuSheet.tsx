'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Menu mobile dashboard : bottom sheet (même pattern que SiteMobileBottomBar « Plus »),
 * à la place du tiroir latéral.
 */
export default function DashboardMobileMenuSheet({
  open,
  onClose,
  title = 'Menu',
  subtitle = 'Navigation et compte',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.body.dataset.emTour !== '1') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="md:hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[55] transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (document.body.dataset.emTour === '1') return;
          onClose();
        }}
        aria-hidden
      />

      <div
        id="dashboard-mobile-menu-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[60] max-h-[min(82vh,calc(100dvh-var(--em-dash-bottom-nav)-0.5rem))]',
          'overflow-y-auto overscroll-contain rounded-t-3xl',
          'bg-background dark:bg-stage-elevated border-t border-border/80 dark:border-border-subtle/30',
          'shadow-[0_-16px_48px_rgba(0,0,0,0.35)]',
          'px-4 sm:px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]',
          'animate-in slide-in-from-bottom duration-250 ease-out space-y-3',
        )}
      >
        <div className="w-10 h-1 rounded-full bg-border-subtle dark:bg-border/60 mx-auto" />

        <div className="flex items-center justify-between pb-2 border-b border-border/60 dark:border-border-subtle/30">
          <div className="min-w-0">
            <h3 className="em-dash-title text-lg font-semibold text-foreground truncate">{title}</h3>
            <p className="text-xs text-muted truncate">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (document.body.dataset.emTour === '1') return;
              onClose();
            }}
            className="p-2 min-h-11 min-w-11 rounded-full text-muted hover:text-foreground hover:bg-surface-muted transition flex items-center justify-center cursor-pointer active:scale-95 touch-manipulation"
            aria-label="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
