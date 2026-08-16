'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPagesFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Libellé du type d’éléments, ex. « organisations » */
  itemLabel?: string;
  className?: string;
  /** Nombre max de boutons de page visibles (fenêtre centrée) */
  maxButtons?: number;
}

function pageWindow(current: number, totalPages: number, maxButtons: number): number[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  let end = start + maxButtons - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxButtons + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel,
  className,
  maxButtons = 7,
}: PaginationProps) {
  if (total <= pageSize) return null;

  const totalPages = totalPagesFor(total, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const pages = pageWindow(safePage, totalPages, maxButtons);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4',
        className,
      )}
    >
      <span className="text-xs text-muted">
        {from}–{to} sur {total}
        {itemLabel ? ` ${itemLabel}` : ''}
      </span>
      <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="p-2 border border-border rounded-[var(--radius-button)] text-muted hover:bg-surface-muted disabled:opacity-40 transition"
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              'min-w-8 px-2.5 py-1.5 rounded-[var(--radius-button)] text-xs font-medium transition',
              safePage === p
                ? 'bg-foreground text-background'
                : 'border border-border text-muted hover:bg-surface-muted',
            )}
            aria-current={safePage === p ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          className="p-2 border border-border rounded-[var(--radius-button)] text-muted hover:bg-surface-muted disabled:opacity-40 transition"
          aria-label="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
