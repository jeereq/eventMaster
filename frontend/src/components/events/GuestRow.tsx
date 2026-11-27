'use client';

import React from 'react';
import UserAvatar from '@/components/UserAvatar';
import { CategoryTag } from '@/components/analytics/CategoryTag';
import { cn } from '@/lib/cn';

/**
 * Un invité de la liste : qui, quel groupe, quelle réponse.
 * L’e-mail reste dans la fiche (et dans la recherche), pas dans la liste.
 */
export default function GuestRow({
  name,
  category,
  status,
  note,
  selected,
  layout,
  onSelect,
  onOpen,
  menu,
}: {
  name: string;
  category: string;
  status: React.ReactNode;
  note?: React.ReactNode;
  selected: boolean;
  layout: 'list' | 'grid';
  onSelect: (checked: boolean) => void;
  onOpen: () => void;
  menu: React.ReactNode;
}) {
  const grid = layout === 'grid';
  const checkbox = (
    <label className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => onSelect(event.target.checked)}
        aria-label={`Sélectionner ${name}`}
        className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
      />
    </label>
  );

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1 px-1.5 py-2 sm:gap-2 sm:px-3',
        grid && 'flex-col rounded-[20px] bg-surface p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_rgba(16,24,40,0.18)]',
        selected && (grid ? 'ring-2 ring-primary/40' : 'bg-primary/5'),
      )}
    >
      {grid ? (
        <div className="flex w-full items-center justify-between">
          {checkbox}
          {menu}
        </div>
      ) : (
        checkbox
      )}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          grid && 'w-full flex-col gap-2 text-center',
        )}
      >
        <UserAvatar name={name} size="lg" />
        <span className={cn('min-w-0 flex-1', grid && 'w-full')}>
          <span className="block truncate text-[15px] font-semibold text-foreground">{name}</span>
          {note ? <span className="block truncate text-[13px] text-muted">{note}</span> : null}
          {/* Sur petit écran, le groupe et la réponse passent sous le nom. */}
          <span className={cn('mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden', grid && 'justify-center')}>
            <CategoryTag label={category} className="ml-1.5" />
            {status}
          </span>
        </span>
        <span className={cn('hidden shrink-0 items-center gap-4 sm:flex', grid ? 'justify-center' : 'min-w-[15rem] justify-between')}>
          <CategoryTag label={category} className="ml-1.5" />
          {status}
        </span>
      </button>
      {grid ? null : menu}
    </div>
  );
}
