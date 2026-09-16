'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { accentFromId } from '@/components/ui/ProjectCard';

export type MarketplaceDealFact = {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
};

function DealFacts({
  facts,
  compact,
}: {
  facts: MarketplaceDealFact[];
  compact?: boolean;
}) {
  if (facts.length === 0) return null;

  if (compact) {
    return (
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-snug">
        {facts.map((fact) => (
          <li key={fact.label} className="min-w-0 max-w-full">
            <span className="text-muted">{fact.label} </span>
            {fact.onClick ? (
              <button
                type="button"
                onClick={fact.onClick}
                className="min-h-11 font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {fact.value}
              </button>
            ) : (
              <span className="font-semibold text-foreground">{fact.value}</span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-2">
      {facts.map((fact) => {
        const body = (
          <>
            <dt className="text-xs text-muted">{fact.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground break-words [overflow-wrap:anywhere]">
              {fact.value}
            </dd>
          </>
        );
        if (fact.onClick) {
          return (
            <button
              key={fact.label}
              type="button"
              onClick={fact.onClick}
              className="min-h-11 min-w-0 rounded-xl bg-surface-muted/80 px-2.5 py-2 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {body}
            </button>
          );
        }
        return (
          <div key={fact.label} className="min-w-0 rounded-xl bg-surface-muted/80 px-2.5 py-2">
            {body}
          </div>
        );
      })}
    </dl>
  );
}

function hasVisibleActions(node?: React.ReactNode) {
  return React.Children.toArray(node).some((child) => child != null && child !== '');
}

function DealActionBar({
  primary,
  secondary,
}: {
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  const showPrimary = hasVisibleActions(primary);
  const showSecondary = hasVisibleActions(secondary);
  if (!showPrimary && !showSecondary) return null;
  return (
    <div className="flex flex-col gap-2">
      {showPrimary ? (
        <div className="flex flex-col min-[420px]:flex-row flex-wrap gap-2 [&>*]:min-w-0 [&>*]:w-full min-[420px]:[&>*]:flex-1 [&_button]:w-full [&_a]:w-full">
          {primary}
        </div>
      ) : null}
      {showSecondary ? (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>*]:min-w-0 [&_button]:w-full [&_a]:w-full sm:[&>*]:w-auto sm:[&_button]:w-auto sm:[&_a]:w-auto">
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

export function MarketplaceDealCard({
  id,
  title,
  subtitle,
  timestamp,
  icon,
  status,
  facts = [],
  value,
  valueMeta,
  highlight = false,
  layout = 'grid',
  children,
  primaryActions,
  secondaryActions,
}: {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  timestamp?: React.ReactNode;
  icon?: React.ReactNode;
  status?: React.ReactNode;
  facts?: MarketplaceDealFact[];
  value?: React.ReactNode;
  valueMeta?: React.ReactNode;
  highlight?: boolean;
  layout?: 'grid' | 'list';
  children?: React.ReactNode;
  primaryActions?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}) {
  const stripe = accentFromId(id);
  const isList = layout === 'list';

  return (
    <article
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)]',
        'flex min-w-0 overflow-hidden transition duration-200',
        'hover:border-primary/35',
        highlight && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        isList ? 'flex-col lg:flex-row lg:items-stretch' : 'flex-col',
      )}
    >
      <div className={cn('flex min-w-0 flex-1 flex-col gap-3 p-3.5 sm:p-4', isList && 'lg:py-3.5')}>
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white [&>svg]:h-5 [&>svg]:w-5"
            style={{ backgroundColor: stripe }}
            aria-hidden
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground leading-snug break-words [overflow-wrap:anywhere]">
                {title}
              </h3>
              {status ? <div className="shrink-0">{status}</div> : null}
            </div>
            {subtitle ? (
              <p className="text-xs text-muted leading-snug break-words [overflow-wrap:anywhere]">{subtitle}</p>
            ) : null}
            {timestamp ? <p className="text-[11px] text-muted">{timestamp}</p> : null}
          </div>
          {isList && (value != null || valueMeta) ? (
            <div className="hidden sm:flex shrink-0 flex-col items-end text-right">
              {value != null ? (
                <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
              ) : null}
              {valueMeta ? <p className="mt-0.5 text-[11px] text-muted">{valueMeta}</p> : null}
            </div>
          ) : null}
        </header>

        <DealFacts facts={facts} compact={isList} />

        {children ? <div className="min-w-0 space-y-2">{children}</div> : null}

        {!isList ? (
          <div className="mt-auto pt-0.5">
            <DealActionBar primary={primaryActions} secondary={secondaryActions} />
          </div>
        ) : null}
      </div>

      {isList ? (
        <div className="border-t border-border px-3.5 py-3 sm:px-4 lg:w-[15rem] lg:shrink-0 lg:border-t-0 lg:border-l lg:py-3.5">
          <DealActionBar primary={primaryActions} secondary={secondaryActions} />
        </div>
      ) : null}
    </article>
  );
}

export function DealQuoteBlock({
  amountFc,
  depositFc,
  notes,
}: {
  amountFc: string;
  depositFc: string;
  notes?: string | null;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 space-y-2">
      <div className="flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-end min-[380px]:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-emerald-900 dark:text-emerald-200">Devis proposé</p>
          <p className="text-base font-semibold tabular-nums text-emerald-950 dark:text-emerald-100 break-words">
            {amountFc}
          </p>
        </div>
        <div className="min-w-0 min-[380px]:text-right">
          <p className="text-[11px] text-emerald-900 dark:text-emerald-200">Acompte 30 %</p>
          <p className="text-sm font-semibold tabular-nums text-emerald-950 dark:text-emerald-100 break-words">
            {depositFc}
          </p>
        </div>
      </div>
      {notes ? (
        <p className="text-xs text-foreground/90 whitespace-pre-line border-t border-emerald-500/15 pt-2 break-words">
          {notes}
        </p>
      ) : null}
    </div>
  );
}

export function DealDeclineBlock({
  title,
  reason,
  notes,
}: {
  title: string;
  reason?: string | null;
  notes?: string | null;
}) {
  return (
    <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 space-y-1.5 text-rose-900 dark:text-rose-100">
      <p className="text-sm font-semibold">{title}</p>
      {reason ? (
        <p className="text-xs break-words">
          <span className="font-medium">Motif :</span> {reason}
        </p>
      ) : null}
      {notes ? (
        <p className="text-xs text-rose-800/90 dark:text-rose-200/90 whitespace-pre-line border-t border-rose-500/15 pt-1.5 break-words">
          {notes}
        </p>
      ) : null}
    </div>
  );
}
