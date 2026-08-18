'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Pin, RefreshCw, Store, Bookmark } from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import FavoriteHeart from '@/components/FavoriteHeart';
import { Button } from '@/components/ui';
import type { PlanItem, PlanMissingSlot, PlanPackage } from '@/lib/eventPlan';

function PackItemRow({
  item,
  leftoverFc,
  isFavorite,
  onToggleFavorite,
  onReplace,
  onKeep,
}: {
  item: PlanItem;
  leftoverFc: number;
  isFavorite: (kind: 'venue' | 'service', slug: string) => boolean;
  onToggleFavorite: (kind: 'venue' | 'service', slug: string) => void;
  onReplace: (next: PlanItem) => void;
  onKeep?: (item: PlanItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const room = leftoverFc + item.estimatedFc;
  const alternatives = (item.alternatives || []).filter((alt) => alt.estimatedFc <= room);

  return (
    <li className="rounded-xl border border-border p-2 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-muted shrink-0">
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted">
              <Store className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            {item.kind === 'venue' ? 'Salle' : item.categoryLabel || 'Prestataire'}
            {item.favorite ? ' · favori' : ''}
            {item.match === 'exact' ? ' · adapté' : ''}
          </p>
          <Link href={item.href} className="text-sm font-semibold text-foreground hover:text-primary truncate block">
            {item.title}
          </Link>
          <p className="text-[11px] text-muted truncate">
            {item.orgName}{item.location ? ` · ${item.location}` : ''}
            {item.kind === 'venue' && item.capacity ? ` · ${item.capacity} places` : ''}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <FavoriteHeart
            active={isFavorite(item.kind, item.slug)}
            onToggle={() => onToggleFavorite(item.kind, item.slug)}
          />
          <span className="text-[11px] font-semibold">{formatFc(item.estimatedFc)}</span>
        </div>
      </div>
      {alternatives.length > 0 || onKeep ? (
        <div className="flex flex-wrap items-center gap-3">
          {onKeep ? (
            <button
              type="button"
              onClick={() => onKeep(item)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-foreground"
            >
              <Pin className="w-3 h-3" />
              Garder et relancer
            </button>
          ) : null}
          {alternatives.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
            >
              <RefreshCw className="w-3 h-3" />
              {open ? 'Fermer' : 'Remplacer'}
            </button>
          ) : null}
        </div>
      ) : null}
      {open && alternatives.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {alternatives.map((alt) => (
            <li key={alt.slug}>
              <button
                type="button"
                onClick={() => {
                  onReplace(alt);
                  setOpen(false);
                }}
                className="w-full text-left rounded-lg border border-border px-2 py-1.5 hover:border-primary/40 hover:bg-surface-muted"
              >
                <span className="block text-xs font-semibold text-foreground truncate">{alt.title}</span>
                <span className="block text-[11px] text-muted">
                  {formatFc(alt.estimatedFc)}
                  {alt.favorite ? ' · favori' : ''}
                  {alt.estimatedFc < item.estimatedFc ? ' · moins cher' : alt.estimatedFc > item.estimatedFc ? ' · plus cher' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function EventPlanPacks({
  packages,
  budgetFc,
  spendableFc,
  isFavorite,
  onToggleFavorite,
  onReplace,
  onSave,
  onKeep,
  onWidenSlot,
}: {
  packages: PlanPackage[];
  budgetFc: number;
  spendableFc?: number;
  isFavorite: (kind: 'venue' | 'service', slug: string) => boolean;
  onToggleFavorite: (kind: 'venue' | 'service', slug: string) => void;
  onReplace: (packId: string, currentSlug: string, next: PlanItem) => void;
  onSave?: (pack: PlanPackage) => void;
  onKeep?: (item: PlanItem) => void;
  onWidenSlot?: (slot: PlanMissingSlot) => void;
}) {
  const envelope = spendableFc || budgetFc;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {packages.map((pack) => {
        const usedRatio = envelope > 0 ? Math.min(100, Math.round((pack.totalFc / envelope) * 100)) : 0;
        const rows = pack.venue ? [pack.venue, ...pack.services] : pack.services;
        const allocation = pack.allocation?.length
          ? pack.allocation
          : rows.map((item) => ({
            key: item.slug,
            label: item.kind === 'venue' ? 'Salle' : item.categoryLabel || 'Presta',
            amountFc: item.estimatedFc,
          }));
        const allocTotal = allocation.reduce((sum, item) => sum + item.amountFc, 0) || 1;
        return (
          <article key={pack.id} className="bg-surface border border-border rounded-[var(--radius-card)] p-4 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{pack.label}</h3>
                  {pack.blurb ? <p className="text-xs text-muted mt-1 leading-relaxed">{pack.blurb}</p> : null}
                </div>
                {pack.complete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                    <Check className="w-3 h-3" /> Complet
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
                    Incomplet
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground mt-2">{formatFc(pack.totalFc)}</p>
              <div className="mt-2 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', pack.overBudget ? 'bg-rose-500' : 'bg-primary')}
                  style={{ width: `${usedRatio}%` }}
                />
              </div>
              <p className={cn('text-xs mt-1', pack.overBudget ? 'text-rose-600' : 'text-muted')}>
                {pack.overBudget
                  ? `Au-dessus du budget de ${formatFc(budgetFc)}`
                  : `${usedRatio} % de l’enveloppe · reste ${formatFc(pack.leftoverFc)}`}
              </p>
              {allocation.length > 1 ? (
                <div className="mt-2 space-y-1">
                  <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted">
                    {allocation.map((item, index) => (
                      <div
                        key={item.key}
                        className={cn(
                          'h-full',
                          index % 3 === 0 ? 'bg-primary' : index % 3 === 1 ? 'bg-primary/60' : 'bg-primary/30',
                        )}
                        style={{ width: `${Math.max(4, (item.amountFc / allocTotal) * 100)}%` }}
                        title={`${item.label} · ${formatFc(item.amountFc)}`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted leading-relaxed">
                    {allocation.map((item) => `${item.label} ${Math.round((item.amountFc / allocTotal) * 100)} %`).join(' · ')}
                  </p>
                </div>
              ) : null}
            </div>

            {pack.notes?.length ? (
              <ul className="space-y-1">
                {pack.notes.map((note) => (
                  <li key={note} className="text-[11px] text-muted leading-relaxed">
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}

            {pack.missing?.length ? (
              <ul className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20 p-2.5">
                {pack.missing.map((slot) => (
                  <li key={`${pack.id}-${slot.slot}`} className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                    <span className="font-semibold">{slot.label} · </span>
                    {slot.reason}
                    {onWidenSlot ? (
                      <button
                        type="button"
                        className="ml-1 font-semibold underline underline-offset-2"
                        onClick={() => onWidenSlot(slot)}
                      >
                        Élargir ce poste
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <ul className="space-y-2">
              {rows.map((item) => (
                <PackItemRow
                  key={`${item.kind}:${item.slug}`}
                  item={item}
                  leftoverFc={pack.leftoverFc}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                  onReplace={(next) => onReplace(pack.id, item.slug, next)}
                  onKeep={onKeep}
                />
              ))}
            </ul>
            {onSave ? (
              <Button size="sm" variant="secondary" onClick={() => onSave(pack)} leftIcon={<Bookmark className="w-3.5 h-3.5" />}>
                Sauvegarder ce pack
              </Button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
