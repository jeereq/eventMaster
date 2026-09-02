'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Plus, Store, Trash2 } from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { Alert, Button, EmptyState, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { LISTING_EVENT_TYPES, eventTypeLabel, type ListingEventTypeId } from '@/lib/listingDetails';
import type { SavedEventPack, SavedPackItem } from '@/lib/eventPlan';
import type { FavoriteListing } from '@/lib/listingFavorites';
import { isServiceRentalCategory, sizedMediaUrl } from '@/lib/marketplace';

function favoriteToPackItem(row: FavoriteListing): SavedPackItem {
  return {
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    orgName: row.orgName,
    location: row.location,
    coverUrl: row.coverUrl,
    estimatedFc: row.priceFromFc ?? 0,
    categoryLabel: row.categoryLabel,
    href: row.href,
    capacity: row.capacity ?? null,
  };
}

export default function EventSavedPacks({
  packs,
  favorites,
  eventType,
  budgetFc,
  city,
  guestCount,
  onCreate,
  onDelete,
  onOpenListing,
}: {
  packs: SavedEventPack[];
  favorites: FavoriteListing[];
  eventType: ListingEventTypeId;
  budgetFc: number;
  city: string;
  guestCount: number;
  onCreate: (payload: {
    name: string;
    eventType: string;
    budgetFc: number;
    city?: string;
    guestCount?: number;
    source: 'custom';
    styleLabel: string;
    items: SavedPackItem[];
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenListing?: (item: { kind: 'venue' | 'service'; slug: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<ListingEventTypeId>(eventType);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedItems = useMemo(
    () => favorites.filter((row) => selected.has(`${row.kind}:${row.slug}`)).map(favoriteToPackItem),
    [favorites, selected],
  );
  const totalFc = selectedItems.reduce((sum, item) => sum + item.estimatedFc, 0);

  const toggle = (row: FavoriteListing) => {
    const key = `${row.kind}:${row.slug}`;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      if (row.kind === 'venue' && [...next].some((item) => item.startsWith('venue:'))) {
        setError('Un pack ne peut contenir qu’une seule salle.');
        return current;
      }
      setError('');
      next.add(key);
      return next;
    });
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onCreate({
        name: name.trim() || `Pack parfait · ${eventTypeLabel(type)}`,
        eventType: type,
        budgetFc,
        city: city || undefined,
        guestCount: guestCount || undefined,
        source: 'custom',
        styleLabel: 'Pack parfait',
        items: selectedItems,
      });
      setOpen(false);
      setName('');
      setSelected(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer le pack.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Mes packs</h2>
          <p className="text-xs text-muted mt-0.5">Composez un pack depuis vos favoris, ou retrouvez ceux sauvegardés après une recherche.</p>
        </div>
        <Button size="sm" onClick={() => { setType(eventType); setOpen(true); }} leftIcon={<Plus className="w-4 h-4" />}>
          Créer un pack parfait
        </Button>
      </div>

      {packs.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-5 h-5" />}
          title="Votre sélection est vide"
          description="Créez des listes de prestataires favoris pour organiser vos idées et comparer vos options."
          action={
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              Composer depuis les favoris
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {packs.map((pack) => (
            <article key={pack.id} className="bg-surface border border-border rounded-[var(--radius-card)] p-4 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{pack.name}</h3>
                  <p className="text-[11px] text-muted mt-1">
                    {eventTypeLabel(pack.eventType as ListingEventTypeId)}
                    {pack.styleLabel ? ` · ${pack.styleLabel}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDelete(pack.id)}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 text-muted hover:text-rose-600 rounded-lg"
                  aria-label="Supprimer le pack"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm font-semibold">{formatFc(pack.totalFc)}</p>
              <p className="text-[11px] text-muted">
                Budget {formatFc(pack.budgetFc)} · reste {formatFc(pack.leftoverFc)}
                {pack.guestCount ? ` · ${pack.guestCount} invités` : ''}
                {pack.city ? ` · ${pack.city}` : ''}
              </p>
              <ul className="flex flex-col gap-2.5">
                {pack.items.map((item) => {
                  const open = () => onOpenListing?.({ kind: item.kind, slug: item.slug });
                  const titleClass = 'min-w-0 flex-1 truncate font-medium text-left hover:text-primary';
                  return (
                  <li key={`${item.kind}:${item.slug}`} className="flex items-center gap-2 text-xs">
                    {onOpenListing ? (
                      <button
                        type="button"
                        onClick={open}
                        className="w-11 h-11 rounded-md overflow-hidden bg-surface-muted shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        aria-label={`Voir la fiche ${item.title}`}
                      >
                        {item.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sizedMediaUrl(item.coverUrl, 96)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    ) : (
                      <div className="w-11 h-11 rounded-md overflow-hidden bg-surface-muted shrink-0">
                        {item.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sizedMediaUrl(item.coverUrl, 96)}
                            alt={item.title || 'Visuel du pack'}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    )}
                    {onOpenListing ? (
                      <button type="button" onClick={open} className={titleClass}>
                        {item.title}
                      </button>
                    ) : (
                      <Link href={item.href} className={`${titleClass} block`}>
                        {item.title}
                      </Link>
                    )}
                    <span className="text-muted shrink-0">{formatFc(item.estimatedFc)}</span>
                  </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Créer un pack parfait"
        description="Choisissez une salle, des prestataires et des locations parmi vos favoris."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button loading={busy} disabled={!selectedItems.length} onClick={() => void submit()}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nom du pack" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Pack parfait · ${eventTypeLabel(type)}`} />
          <label className="space-y-1.5 block">
            <span className="block text-xs font-semibold text-muted">Type d’événement</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ListingEventTypeId)}
              className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
            >
              {LISTING_EVENT_TYPES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          {error ? <Alert variant="error">{error}</Alert> : null}
          {favorites.length === 0 ? (
            <p className="text-sm text-muted">Ajoutez d’abord des salles, prestataires ou locations en favoris.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {([
                ['Salles', favorites.filter((row) => row.kind === 'venue')],
                ['Prestataires', favorites.filter((row) => row.kind === 'service' && !isServiceRentalCategory(row.category))],
                ['Locations', favorites.filter((row) => row.kind === 'service' && isServiceRentalCategory(row.category))],
              ] as Array<[string, FavoriteListing[]]>).filter(([, rows]) => rows.length > 0).map(([label, rows]) => (
                  <div key={label} className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                    <ul className="space-y-2">
                      {rows.map((row) => {
                        const key = `${row.kind}:${row.slug}`;
                        const checked = selected.has(key);
                        return (
                          <li key={key}>
                            <button
                              type="button"
                              onClick={() => toggle(row)}
                              className={cn(
                                'w-full text-left flex items-center gap-3 rounded-xl border p-2.5',
                                checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                              )}
                            >
                              <span className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center text-[10px]',
                                checked ? 'bg-primary border-primary text-white' : 'border-border',
                              )}>
                                {checked ? '✓' : ''}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-wider text-muted">
                                  {row.kind === 'venue' ? 'Salle' : row.categoryLabel || (isServiceRentalCategory(row.category) ? 'Location' : 'Métier')}
                                </p>
                                <p className="text-sm font-semibold truncate">{row.title}</p>
                              </div>
                              <span className="text-xs text-muted shrink-0">
                                {row.priceFromFc != null ? formatFc(row.priceFromFc) : 'Sur devis'}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
              ))}
            </div>
          )}
          {selectedItems.length > 0 ? (
            <p className="text-xs text-muted">
              {selectedItems.length} fiche{selectedItems.length > 1 ? 's' : ''} · estimation {formatFc(totalFc)}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
