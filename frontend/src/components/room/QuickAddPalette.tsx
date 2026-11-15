'use client';

/**
 * Palette « Ajouter » de l’éditeur de salle (Ctrl+K ou /) : on tape quelques lettres,
 * flèches pour choisir, Entrée pour poser l’élément au centre de la salle.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { filterQuickAdd, type QuickAddEntry } from '@/lib/quickAddSearch';

export type QuickAddAction = QuickAddEntry & { run: () => void };

export default function QuickAddPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: QuickAddAction[];
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const results = useMemo(() => filterQuickAdd(actions, query), [actions, query]);

  // Remise à zéro à la fermeture : la palette se rouvre toujours vide.
  const close = () => {
    setQuery('');
    setActive(0);
    onClose();
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (action: QuickAddAction | undefined) => {
    if (!action) return;
    close();
    action.run();
  };

  return (
    <Modal open={open} onClose={close} title="Ajouter un élément" description="Tapez un nom : table, bar à vins, piano, porte, palmier…" size="md">
      <div className="space-y-2">
        <label className="flex items-center gap-2 min-h-11 px-3 rounded-[var(--radius-button)] border border-border bg-surface focus-within:ring-2 focus-within:ring-primary/40">
          <Search className="w-4 h-4 shrink-0 text-muted" aria-hidden />
          <span className="sr-only">Rechercher un élément à ajouter</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                choose(results[active]);
              }
            }}
            role="combobox"
            aria-expanded
            aria-controls="quick-add-results"
            aria-activedescendant={results[active] ? `quick-add-${results[active].id}` : undefined}
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            placeholder="Rechercher…"
          />
        </label>
        {results.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted">Aucun élément ne correspond à « {query} ».</p>
        ) : (
          <ul id="quick-add-results" ref={listRef} role="listbox" aria-label="Éléments à ajouter" className="max-h-[min(22rem,55vh)] overflow-y-auto -mx-1 px-1 space-y-0.5">
            {results.map((action, i) => (
              <li
                key={action.id}
                id={`quick-add-${action.id}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(action)}
                className={cn(
                  'flex items-center justify-between gap-3 min-h-11 px-3 rounded-[var(--radius-button)] cursor-pointer text-sm',
                  i === active ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-surface-muted',
                )}
              >
                <span className="truncate font-medium">{action.label}</span>
                <span className="flex items-center gap-2 shrink-0 text-xs text-muted">
                  {action.group}
                  {i === active ? <CornerDownLeft className="w-3.5 h-3.5" aria-hidden /> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="px-1 text-xs text-muted">↑ ↓ pour choisir · Entrée pour ajouter · Échap pour fermer</p>
      </div>
    </Modal>
  );
}
