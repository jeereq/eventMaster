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
          title="Aucun pack enregistré"
          description="Sauvegardez une proposition après simulation, ou composez un pack à partir de vos favoris."
          action={
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              Composer depuis les favoris
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packs.map((pack) => (
            <article key={pack.id} className="bg-surface border border-border rounded-[var(--radius-card)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {eventTypeLabel(pack.eventType as ListingEventTypeId)}
                    {pack.styleLabel ? ` · ${pack.styleLabel}` : ''}
                  </p>
                  <h3 className="text-sm font-semibold text-foreground">{pack.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void onDelete(pack.id)}
                  className="text-muted hover:text-rose-600 p-1"
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
              <ul className="space-y-1.5">
                {pack.items.map((item) => (
                  <li key={`${item.kind}:${item.slug}`} className="flex items-center gap-2 text-xs">
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-surface-muted shrink-0">
                      {item.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <Link href={item.href} className="min-w-0 flex-1 truncate font-medium hover:text-primary">
                      {item.title}
                    </Link>
                    <span className="text-muted shrink-0">{formatFc(item.estimatedFc)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Créer un pack parfait"
        description="Choisissez une salle et des prestataires parmi vos favoris."
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
            <p className="text-sm text-muted">Ajoutez d’abord des salles ou prestataires en favoris.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {favorites.map((row) => {
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
                          {row.kind === 'venue' ? 'Salle' : row.categoryLabel || 'Prestataire'}
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
