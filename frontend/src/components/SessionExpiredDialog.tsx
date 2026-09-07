'use client';

import React, { useEffect, useRef } from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';

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
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export default function SessionExpiredDialog() {
  const { sessionExpired, logout } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!sessionExpired) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferred = panel.querySelector<HTMLElement>('[data-session-initial-focus]');
      (preferred || focusableIn(panel)[0] || panel).focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusableIn(panel);
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [sessionExpired]);

  if (!sessionExpired) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-stage/70 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl space-y-4 outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h2 id="session-expired-title" className="text-lg font-semibold text-foreground tracking-tight">
              Session expirée
            </h2>
            <p id="session-expired-desc" className="text-sm text-muted leading-relaxed">
              Votre connexion n’est plus valide. Déconnectez-vous, puis reconnectez-vous pour continuer.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={logout}
          leftIcon={<LogOut className="w-4 h-4" />}
          className="w-full"
          data-session-initial-focus
        >
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
