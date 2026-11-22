'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Globe, Users } from '@/components/icons';
import { cn } from '@/lib/cn';
import type { PlanMarketEstimate } from '@/lib/eventPlan';

/** Signale une ligne chiffrée hors marketplace, avec ses sources et le contrôle du coût. */
export default function MarketEstimateBadge({ estimate }: { estimate: PlanMarketEstimate }) {
  const [open, setOpen] = useState(false);
  const web = estimate.source === 'reference';
  const facebook = web && estimate.channel === 'facebook';
  const check = estimate.check;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            facebook
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
              : web
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                : 'border-border bg-surface-muted text-muted',
          )}
        >
          {web ? <Globe className="w-3 h-3" aria-hidden /> : <Users className="w-3 h-3" aria-hidden />}
          {facebook ? 'Prix trouvé sur Facebook' : web ? 'Prix trouvé sur internet' : 'Prix réels plateforme'}
        </span>
        {check ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              check.ok
                ? 'border-primary/25 bg-primary/10 text-primary'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
            )}
          >
            {check.ok ? <CheckCircle2 className="w-3 h-3" aria-hidden /> : <AlertTriangle className="w-3 h-3" aria-hidden />}
            {check.ok ? 'Coût vérifié' : 'À revérifier'}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="min-h-8 px-1 text-[11px] font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
        >
          {open ? 'Masquer le détail' : facebook ? 'Voir les pages Facebook' : web ? 'Voir les sources' : 'Voir le détail'}
        </button>
      </div>
      {open ? (
        <div className="rounded-[var(--radius-button)] border border-border/70 bg-surface-muted/60 p-2.5 space-y-2 text-xs">
          {check?.messages.length ? (
            <ul className="space-y-0.5">
              {check.messages.map((message) => (
                <li key={message} className="text-foreground">{message}</li>
              ))}
            </ul>
          ) : null}
          {web ? (
            estimate.sources?.length ? (
              <ul className="space-y-1">
                {estimate.sources.map((source) => (
                  <li key={source.url} className="min-w-0">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden />
                      <span className="truncate">{source.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null
          ) : (
            <p className="text-muted">
              Médiane de {estimate.sampleCount || 0} réservations ou devis réels sur EventMaster{estimate.city ? ` à ${estimate.city}` : ''}.
            </p>
          )}
          <p className="text-muted">Estimation indicative : demandez un devis à un prestataire pour le prix exact.</p>
        </div>
      ) : null}
    </div>
  );
}
