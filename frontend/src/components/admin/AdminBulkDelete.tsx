'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Trash2, X } from '@/components/icons';
import { api } from '@/lib/api';
import { Button, ConfirmDialog } from '@/components/ui';

/** Types acceptés par `POST /admin/bulk-delete`. */
export type AdminBulkDeleteType = 'tenant' | 'user' | 'template' | 'event' | 'guest';

/** Plafond serveur par requête (voir backend `ADMIN_BULK_DELETE_MAX`). */
export const ADMIN_BULK_DELETE_MAX = 100;

const NOUNS: Record<AdminBulkDeleteType, { one: string; many: string; consequence: string }> = {
  tenant: {
    one: 'organisation',
    many: 'organisations',
    consequence:
      'Leurs membres, événements, invités, salles, modèles et factures seront supprimés définitivement.',
  },
  user: {
    one: 'utilisateur',
    many: 'utilisateurs',
    consequence: 'Leurs comptes seront fermés. Les tâches qu’ils ont créées seront confiées à un autre membre.',
  },
  template: {
    one: 'modèle',
    many: 'modèles',
    consequence: 'Les invitations déjà envoyées restent consultables, sans lien vers le modèle.',
  },
  event: {
    one: 'événement',
    many: 'événements',
    consequence: 'Leurs invités, invitations, billets, plans de table et publications seront supprimés.',
  },
  guest: {
    one: 'invité',
    many: 'invités',
    consequence: 'Leurs invitations, réponses et places au plan de table seront supprimées.',
  },
};

export function bulkNoun(type: AdminBulkDeleteType, count: number) {
  return count > 1 ? NOUNS[type].many : NOUNS[type].one;
}

/** Sélection multiple d'une liste paginée : les cases restent cochées en changeant de page. */
export function useBulkSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setMany = useCallback((ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);
  const remove = useCallback((ids: string[]) => setMany(ids, false), [setMany]);

  return { selected, count: selected.size, toggle, setMany, clear, remove, has: (id: string) => selected.has(id) };
}

export type BulkSelection = ReturnType<typeof useBulkSelection>;

/** Props de case à cocher pour `ProjectCard`. */
export function cardSelection(selection: BulkSelection, id: string, label: string) {
  return {
    checked: selection.has(id),
    onToggle: () => selection.toggle(id),
    label: `Sélectionner ${label}`,
  };
}

/**
 * Barre « Tout sélectionner / Supprimer la sélection » + confirmation, pour un type de donnée.
 * `visibleIds` : éléments affichés sur la page courante (cible de « Tout sélectionner »).
 */
export function AdminBulkDeleteBar({
  type,
  selection,
  visibleIds,
  onDeleted,
  onError,
  onNotice,
  className,
}: {
  type: AdminBulkDeleteType;
  selection: BulkSelection;
  visibleIds: string[];
  onDeleted: (deletedIds: string[]) => void | Promise<void>;
  onError?: (message: string) => void;
  onNotice?: (message: string) => void;
  className?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const allVisibleSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => selection.has(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleIds, selection.selected],
  );

  const count = selection.count;
  const tooMany = count > ADMIN_BULK_DELETE_MAX;

  const run = async () => {
    setBusy(true);
    try {
      const ids = [...selection.selected];
      const res = await api.post('/admin/bulk-delete', { type, ids });
      const deletedIds: string[] = Array.isArray(res?.deletedIds) ? res.deletedIds : [];
      const failed: { id: string; error: string }[] = Array.isArray(res?.failed) ? res.failed : [];
      selection.remove(deletedIds);
      setConfirmOpen(false);
      await onDeleted(deletedIds);
      if (failed.length > 0) {
        onError?.(`${res?.message || ''} ${failed[0].error}`.trim());
      } else {
        const n = deletedIds.length;
        onNotice?.(`${n} ${bulkNoun(type, n)} supprimé${type === 'template' || type === 'user' || type === 'event' || type === 'guest' ? '' : 'e'}${n > 1 ? 's' : ''}.`);
      }
    } catch (err: unknown) {
      setConfirmOpen(false);
      onError?.(err instanceof Error ? err.message : 'Suppression groupée impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (visibleIds.length === 0 && count === 0) return null;

  return (
    <>
      <div
        className={
          className ??
          'flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-muted/60 px-3 py-1.5'
        }
      >
        <label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={() => selection.setMany(visibleIds, !allVisibleSelected)}
            className="h-5 w-5 rounded border-border accent-primary cursor-pointer"
            aria-label={`Tout sélectionner sur cette page (${NOUNS[type].many})`}
          />
          Tout sélectionner
        </label>
        {count > 0 ? (
          <>
            <span className="text-xs text-muted tabular-nums" aria-live="polite">
              {count} {bulkNoun(type, count)} sélectionné{count > 1 ? 's' : ''}
              {tooMany ? ` (maximum ${ADMIN_BULK_DELETE_MAX} à la fois)` : ''}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={selection.clear}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                Désélectionner
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={tooMany}
                onClick={() => setConfirmOpen(true)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Supprimer ({count})
              </Button>
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        title={`Supprimer ${count} ${bulkNoun(type, count)} ?`}
        description={`${NOUNS[type].consequence} Cette action est définitive.`}
        confirmLabel={`Supprimer ${count} ${bulkNoun(type, count)}`}
        tone="danger"
        loading={busy}
        onConfirm={run}
      />
    </>
  );
}
