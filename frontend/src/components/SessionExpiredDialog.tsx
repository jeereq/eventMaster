'use client';

import React, { useEffect } from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';

export default function SessionExpiredDialog() {
  const { sessionExpired, logout } = useAuth();

  useEffect(() => {
    if (!sessionExpired) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
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
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl space-y-4">
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
        >
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
