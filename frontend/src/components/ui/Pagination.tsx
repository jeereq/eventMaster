'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import useIsMobile from '@/hooks/useIsMobile';

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
  /** Sur mobile (scroll infini) : cumule les pages 1…N au lieu d’afficher seulement N. */
  accumulate = false,
): T[] {
  const safePage = Math.max(1, page);
  const size = Math.max(1, pageSize);
  if (accumulate) {
    return items.slice(0, safePage * size);
  }
  const start = (safePage - 1) * size;
  return items.slice(start, start + size);
}

/** Découpe client : page classique sur desktop, cumul (infinite scroll) sur mobile. */
export function usePaginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const isMobile = useIsMobile();
  return useMemo(
    () => paginateItems(items, page, pageSize, isMobile),
    [items, page, pageSize, isMobile],
  );
}

export function totalPagesFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

export const PAGE_SIZE_OPTIONS = [6, 8, 12, 20, 50, 100];

export function usePageSize(storageKey: string, defaultSize = 12): [number, (next: number) => void] {
  const [pageSize, setPageSize] = useState(defaultSize);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`em-page-size:${storageKey}`);
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) {
        setPageSize(Math.min(100, Math.max(1, Math.floor(n))));
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const update = useCallback((next: number) => {
    const value = Math.min(100, Math.max(1, Math.floor(next)));
    setPageSize(value);
    try {
      localStorage.setItem(`em-page-size:${storageKey}`, String(value));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  return [pageSize, update];
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Libellé du type d’éléments, ex. « organisations » */
  itemLabel?: string;
  className?: string;
  /** Nombre max de boutons de page visibles (fenêtre centrée) — desktop uniquement */
  maxButtons?: number;
  /**
   * `auto` (défaut) : infinite loader sous md, pages au-delà.
   * `infinite` / `pages` : force le mode.
   */
  mode?: 'auto' | 'infinite' | 'pages';
  /** Affiché pendant un chargement serveur (infinite) */
  loading?: boolean;
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
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel,
  className,
  maxButtons = 7,
  mode = 'auto',
  loading = false,
}: PaginationProps) {
  const isMobile = useIsMobile();
  const infinite = mode === 'infinite' || (mode === 'auto' && isMobile);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const totalPages = totalPagesFor(total, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const hasMore = total > 0 && safePage < totalPages;

  useEffect(() => {
    loadingMoreRef.current = false;
  }, [page, total, pageSize]);

  useEffect(() => {
    if (!infinite || !hasMore || loading || total <= 0) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((entry) => entry.isIntersecting);
        if (!hit || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        onPageChange(safePage + 1);
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [infinite, hasMore, loading, onPageChange, safePage, total, pageSize]);

  if (total <= 0) return null;

  const shownCount = Math.min(safePage * pageSize, total);
  const from = infinite ? 1 : (safePage - 1) * pageSize + 1;
  const to = infinite ? shownCount : Math.min(safePage * pageSize, total);
  const pages = pageWindow(safePage, totalPages, maxButtons);
  const singlePage = totalPages <= 1;
  const sizeOptions = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  if (infinite) {
    return (
      <nav
        aria-label="Chargement de la liste"
        className={cn('mt-4 flex flex-col items-center gap-3 px-1 py-2', className)}
      >
        <p className="text-xs font-medium text-foreground/80 text-center">
          {from}–{to} sur {total}
          {itemLabel ? ` ${itemLabel}` : ''}
        </p>
        {hasMore ? (
          <>
            <div
              ref={sentinelRef}
              className="flex min-h-12 w-full items-center justify-center"
              aria-hidden
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary opacity-80" />
            </div>
            <button
              type="button"
              onClick={() => {
                if (loadingMoreRef.current || loading) return;
                loadingMoreRef.current = true;
                onPageChange(safePage + 1);
              }}
              disabled={loading}
              className="min-h-11 px-4 rounded-[var(--radius-button)] border border-border bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50 transition"
            >
              Voir plus
            </button>
          </>
        ) : (
          <p className="text-xs text-muted">Fin de la liste</p>
        )}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3',
        'mt-4 rounded-[var(--radius-button)] border border-border bg-surface-muted/60 px-3 py-2.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
        <span className="text-xs font-medium text-foreground/80">
          {from}–{to} sur {total}
          {itemLabel ? ` ${itemLabel}` : ''}
          {singlePage ? ' · 1 page' : ` · ${totalPages} pages`}
        </span>
        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="sr-only sm:not-sr-only">Par page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-8 rounded-[var(--radius-button)] border border-border bg-surface px-2 text-xs font-semibold text-foreground"
              aria-label="Nombre d’éléments par page"
            >
              {sizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="p-2 border border-border rounded-[var(--radius-button)] bg-surface text-muted hover:bg-surface-muted disabled:opacity-40 transition"
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            disabled={singlePage}
            className={cn(
              'min-w-8 px-2.5 py-1.5 rounded-[var(--radius-button)] text-xs font-semibold transition',
              safePage === p
                ? 'bg-primary-solid text-primary-foreground shadow-sm'
                : 'border border-border bg-surface text-muted hover:bg-surface-muted',
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
          className="p-2 border border-border rounded-[var(--radius-button)] bg-surface text-muted hover:bg-surface-muted disabled:opacity-40 transition"
          aria-label="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
