'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, MessageSquareQuote, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Badge, Button, EmptyState, Input, Pagination } from '@/components/ui';
import { cn } from '@/lib/cn';
import { segmentedItem, SEGMENTED_TRACK } from '@/components/ui/segmented';
import { ReviewStars } from '@/components/marketplace/ReviewStars';

interface AdminReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  vendorReply: string | null;
  isHidden: boolean;
  createdAt: string;
  vendorName: string;
  subject: string;
}

const VISIBILITY = [
  { id: 'all', label: 'Tous' },
  { id: 'visible', label: 'Publiés' },
  { id: 'hidden', label: 'Masqués' },
] as const;

/** Modération des avis clients : un avis masqué sort des fiches et des moyennes. */
export default function AdminMarketplaceReviews() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{ items: AdminReviewRow[]; total: number; hiddenCount: number } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const pageSize = 20;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize), visibility });
    if (q) params.set('q', q);
    api
      .get(`/admin/catalog/reviews?${params}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les avis.');
      });
    return () => {
      cancelled = true;
    };
  }, [page, q, visibility, reload]);

  const toggle = async (row: AdminReviewRow) => {
    setBusyId(row.id);
    setNotice('');
    try {
      const res = await api.patch(`/admin/catalog/reviews/${row.id}/visibility`, { hidden: !row.isHidden });
      setNotice(res.message || '');
      setReload((n) => n + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <Input
            label="Rechercher"
            placeholder="Commentaire, auteur, prestataire…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>
        <div className={cn('inline-flex', SEGMENTED_TRACK)} role="radiogroup" aria-label="Visibilité">
          {VISIBILITY.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={visibility === item.id}
              className={segmentedItem(visibility === item.id, 'px-3 py-1.5 text-xs')}
              onClick={() => {
                setVisibility(item.id);
                setPage(1);
              }}
            >
              {item.label}
              {item.id === 'hidden' && data ? ` (${data.hiddenCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      {!data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState icon={<Star className="w-5 h-5" />} title="Aucun avis" description="Les avis des clients apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {data.items.map((row) => (
            <li
              key={row.id}
              className={cn(
                'rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-2',
                row.isHidden && 'opacity-70',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ReviewStars rating={row.rating} />
                    <span className="text-sm font-semibold text-foreground">{row.authorName}</span>
                    {row.isHidden ? <Badge variant="warning">Masqué</Badge> : null}
                  </div>
                  <p className="text-xs text-muted">
                    {row.vendorName} · {row.subject} · {new Date(row.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={row.isHidden ? 'secondary' : 'danger'}
                  loading={busyId === row.id}
                  leftIcon={row.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  onClick={() => void toggle(row)}
                >
                  {row.isHidden ? 'Réafficher' : 'Masquer'}
                </Button>
              </div>
              {row.comment ? <p className="text-sm text-foreground/85 whitespace-pre-line">{row.comment}</p> : null}
              {row.vendorReply ? (
                <p className="flex gap-1.5 text-xs text-muted">
                  <MessageSquareQuote className="w-3.5 h-3.5 shrink-0 mt-px text-primary" aria-hidden />
                  <span className="whitespace-pre-line">{row.vendorReply}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {data && data.total > pageSize ? (
        <Pagination page={page} pageSize={pageSize} total={data.total} onPageChange={setPage} itemLabel="avis" />
      ) : null}
    </div>
  );
}
