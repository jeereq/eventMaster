'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Layout, Pencil, RefreshCw, Star, Trash2 } from '@/components/icons';
import { Alert, Button, ConfirmDialog } from '@/components/ui';
import LayoutThumbnailCapture from '@/components/room/LayoutThumbnailCapture';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import { uploadDataUrlImage } from '@/lib/cloudinaryUpload';
import { moveId } from '@/lib/layoutOrder';
import { formatLayoutFacts } from '@/lib/venueLayouts';
import {
  MAIN_LAYOUT_ID,
  venueLayoutsApi,
  type MainLayoutSummary,
  type MakeMainResult,
  type RoomLayoutRecord,
} from '@/lib/venueLayoutsApi';

const MAX_NAME_LENGTH = 80;

type PendingAction = { kind: 'main' | 'delete' | 'refresh'; layout: RoomLayoutRecord } | null;

/** Disposition ouverte dans l'éditeur : la principale ou une disposition enregistrée. */
export interface LayoutEditTarget {
  id: string;
  name: string;
}

interface Props {
  roomId: string;
  /** Plan en cours d'édition (y compris les modifications non enregistrées). */
  currentBlueprint: RoomLayoutBlueprint;
  /** Disposition actuellement ouverte dans l'éditeur (`main` pour la principale). */
  editingLayoutId: string;
  /** Ouvre une disposition dans l'éditeur pour la modifier. */
  onEditLayout: (target: LayoutEditTarget) => Promise<void> | void;
  /** Termine les sauvegardes en cours avant de changer la disposition principale. */
  onBeforeMainChange: () => Promise<void>;
  /** La disposition principale vient de changer (nouveau plan de salle). */
  onMainChanged: (result: MakeMainResult, chosenLayoutId: string) => void;
  /** Le nom de la principale a changé : nouvelle version de la salle côté serveur. */
  onMainRenamed: (name: string, roomUpdatedAt: string) => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function RoomLayoutsPanel({
  roomId,
  currentBlueprint,
  editingLayoutId,
  onEditLayout,
  onBeforeMainChange,
  onMainChanged,
  onMainRenamed,
}: Props) {
  const [layouts, setLayouts] = useState<RoomLayoutRecord[]>([]);
  const [main, setMain] = useState<MainLayoutSummary | null>(null);
  const [maxLayouts, setMaxLayouts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [captureJob, setCaptureJob] = useState<{ layoutId: string; blueprint: RoomLayoutBlueprint } | null>(null);
  const [thumbnailNotice, setThumbnailNotice] = useState<string | null>(null);

  const quotaReached = maxLayouts > 0 && layouts.length >= maxLayouts;

  useEffect(() => {
    let cancelled = false;
    venueLayoutsApi
      .list(roomId)
      .then((res) => {
        if (cancelled) return;
        setLayouts(res.layouts);
        setMain(res.main);
        setMaxLayouts(res.maxLayouts);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Impossible de charger les dispositions.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const replaceLayout = useCallback((next: RoomLayoutRecord) => {
    setLayouts((prev) => prev.map((layout) => (layout.id === next.id ? next : layout)));
  }, []);

  const handleCaptured = useCallback(
    async (dataUrl: string) => {
      const job = captureJob;
      setCaptureJob(null);
      if (!job) return;
      try {
        const uploaded = await uploadDataUrlImage(dataUrl);
        const updated = await venueLayoutsApi.update(roomId, job.layoutId, { thumbnailUrl: uploaded.url });
        replaceLayout(updated);
      } catch {
        setThumbnailNotice('La vignette n’a pas pu être enregistrée. La disposition, elle, est bien sauvegardée.');
      }
    },
    [captureJob, replaceLayout, roomId],
  );

  const handleCaptureFailed = useCallback(() => {
    setCaptureJob(null);
    setThumbnailNotice('La vignette n’a pas pu être générée. La disposition, elle, est bien sauvegardée.');
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name || creating || quotaReached) return;
    setCreating(true);
    setError(null);
    setThumbnailNotice(null);
    try {
      const created = await venueLayoutsApi.create(roomId, { name, blueprint: currentBlueprint });
      setLayouts((prev) => [...prev, created]);
      setNewName('');
      setCaptureJob({ layoutId: created.id, blueprint: currentBlueprint });
    } catch (err) {
      setError(errorMessage(err, 'Impossible d’enregistrer la disposition.'));
    } finally {
      setCreating(false);
    }
  };

  const runOn = async (layout: { id: string }, action: () => Promise<void>, fallback: string) => {
    setBusyId(layout.id);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const commitRename = async (layout: { id: string; name: string }) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === layout.name) return;
    if (layout.id === MAIN_LAYOUT_ID) {
      await runOn(layout, async () => {
        const updated = await venueLayoutsApi.renameMain(roomId, name);
        setMain(updated);
        onMainRenamed(updated.name, updated.roomUpdatedAt);
      }, 'Impossible de renommer la disposition.');
      return;
    }
    await runOn(layout, async () => replaceLayout(await venueLayoutsApi.update(roomId, layout.id, { name })), 'Impossible de renommer la disposition.');
  };

  const openInEditor = (target: LayoutEditTarget) =>
    runOn(target, async () => {
      await onEditLayout(target);
    }, 'Impossible d’ouvrir la disposition.');

  const togglePublic = (layout: RoomLayoutRecord) =>
    runOn(
      layout,
      async () => replaceLayout(await venueLayoutsApi.update(roomId, layout.id, { isPublic: !layout.isPublic })),
      'Impossible de modifier la visibilité.',
    );

  const duplicate = (layout: RoomLayoutRecord) =>
    runOn(
      layout,
      async () => {
        const copy = await venueLayoutsApi.duplicate(roomId, layout.id);
        setLayouts((prev) => [...prev, copy]);
      },
      'Impossible de dupliquer la disposition.',
    );

  const move = (layout: RoomLayoutRecord, delta: -1 | 1) => {
    const ids = layouts.map((item) => item.id);
    const next = moveId(ids, layout.id, delta);
    if (!next) return;
    const previous = layouts;
    const byId = new Map(layouts.map((item) => [item.id, item]));
    setLayouts(next.map((id) => byId.get(id)!));
    void runOn(
      layout,
      async () => {
        try {
          await venueLayoutsApi.reorder(roomId, next);
        } catch (err) {
          setLayouts(previous);
          throw err;
        }
      },
      'Impossible de réordonner les dispositions.',
    );
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, layout } = pending;
    if (kind === 'main') {
      setPending(null);
      setThumbnailNotice(null);
      await runOn(
        layout,
        async () => {
          await onBeforeMainChange();
          const result = await venueLayoutsApi.makeMain(roomId, layout.id);
          setMain(result.main);
          const replaced = result.replaced;
          if (replaced) {
            replaceLayout(replaced);
            // La vignette de la ligne montre maintenant l'ancien plan principal.
            const full = await venueLayoutsApi.get(roomId, replaced.id);
            setCaptureJob({ layoutId: replaced.id, blueprint: full.blueprint });
          } else {
            setLayouts((prev) => prev.filter((item) => item.id !== layout.id));
          }
          onMainChanged(result, layout.id);
        },
        'Impossible de changer la disposition principale.',
      );
      return;
    }
    if (kind === 'delete') {
      setPending(null);
      await runOn(
        layout,
        async () => {
          await venueLayoutsApi.remove(roomId, layout.id);
          setLayouts((prev) => prev.filter((item) => item.id !== layout.id));
        },
        'Impossible de supprimer la disposition.',
      );
      return;
    }
    setPending(null);
    setThumbnailNotice(null);
    await runOn(
      layout,
      async () => {
        const updated = await venueLayoutsApi.update(roomId, layout.id, { blueprint: currentBlueprint });
        replaceLayout(updated);
        setCaptureJob({ layoutId: layout.id, blueprint: currentBlueprint });
      },
      'Impossible de mettre à jour la disposition.',
    );
  };

  const pendingCopy = useMemo(() => {
    if (!pending) return null;
    const name = `« ${pending.layout.name} »`;
    if (pending.kind === 'main') {
      const current = main?.hasBlueprint ? `« ${main.name} »` : null;
      return {
        title: 'Choisir comme disposition principale ?',
        description: current
          ? `${name} deviendra le plan de la salle : celui proposé par défaut pour vos événements et affiché en premier sur la fiche publique. ${current} reste dans la liste, à sa place.`
          : `${name} deviendra le plan de la salle : celui proposé par défaut pour vos événements et affiché en premier sur la fiche publique.`,
        confirmLabel: 'Choisir comme principale',
        tone: 'default' as const,
      };
    }
    if (pending.kind === 'refresh') {
      return {
        title: 'Mettre à jour cette disposition ?',
        description: `${name} sera remplacée par le plan actuellement affiché dans l’éditeur.`,
        confirmLabel: 'Remplacer',
        tone: 'default' as const,
      };
    }
    return {
      title: 'Supprimer cette disposition ?',
      description: `${name} sera définitivement supprimée. Le plan principal de la salle n’est pas touché.`,
      confirmLabel: 'Supprimer',
      tone: 'danger' as const,
    };
  }, [main, pending]);

  return (
    <section className="space-y-5" aria-labelledby="room-layouts-title">
      <div>
        <h3 id="room-layouts-title" className="text-base font-semibold text-foreground">
          Dispositions de la salle
        </h3>
        <p className="mt-1 text-sm text-muted">
          Enregistrez plusieurs agencements (conférence, banquet, cocktail…). Les visiteurs les parcourent en 3D sur la
          fiche publique. La disposition principale est le plan de la salle, proposé par défaut pour vos événements.
          Choisissez « Modifier » sur n’importe quelle disposition pour l’ouvrir dans l’éditeur.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {thumbnailNotice ? <Alert variant="warning">{thumbnailNotice}</Alert> : null}

      <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="new-layout-name" className="mb-1 block text-sm font-medium text-foreground">
            Enregistrer le plan actuel comme disposition
          </label>
          <input
            id="new-layout-name"
            type="text"
            value={newName}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex. Banquet, Conférence en théâtre"
            disabled={quotaReached || creating}
            className="min-h-[44px] w-full rounded-[var(--radius-input,0.5rem)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
          />
        </div>
        <Button type="submit" loading={creating} disabled={!newName.trim() || quotaReached}>
          Enregistrer
        </Button>
      </form>

      <p className="text-xs text-muted" aria-live="polite">
        {loading ? 'Chargement…' : `${layouts.length} / ${maxLayouts} dispositions enregistrées`}
        {quotaReached ? ' — limite atteinte pour votre forfait. Supprimez-en une ou passez à un forfait supérieur.' : ''}
      </p>

      {!loading && layouts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
          Aucune disposition enregistrée. Le plan principal de la salle est toujours proposé aux visiteurs.
        </p>
      ) : null}

      <ul className="space-y-3">
        {main ? (
          <li className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 sm:flex-row sm:items-center">
            <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
              <Star className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              {renamingId === MAIN_LAYOUT_ID ? (
                <input
                  autoFocus
                  type="text"
                  aria-label="Nom de la disposition principale"
                  value={renameValue}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void commitRename(main)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename(main);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 text-sm"
                />
              ) : (
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="truncate">{main.name}</span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">Principale</span>
                  {editingLayoutId === MAIN_LAYOUT_ID ? (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted">Ouverte dans l’éditeur</span>
                  ) : null}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted">
                {[formatLayoutFacts(main).capacityLabel, formatLayoutFacts(main).areaLabel].filter(Boolean).join(' · ') || 'Capacité non calculée'}
                {' · Plan de la salle, toujours visible sur la fiche publique'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Actions pour ${main.name}`}>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === MAIN_LAYOUT_ID}
                onClick={() => {
                  setRenamingId(MAIN_LAYOUT_ID);
                  setRenameValue(main.name);
                }}
                aria-label="Renommer"
                title="Renommer"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant={editingLayoutId === MAIN_LAYOUT_ID ? 'primary' : 'secondary'}
                disabled={busyId === MAIN_LAYOUT_ID}
                onClick={() => void openInEditor({ id: MAIN_LAYOUT_ID, name: main.name })}
              >
                <Layout className="h-4 w-4" aria-hidden />
                Modifier
              </Button>
            </div>
          </li>
        ) : null}
        {layouts.map((layout, index) => {
          const facts = formatLayoutFacts(layout);
          const busy = busyId === layout.id;
          const renaming = renamingId === layout.id;
          return (
            <li key={layout.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
              <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                {layout.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={layout.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                {renaming ? (
                  <input
                    autoFocus
                    type="text"
                    aria-label="Nom de la disposition"
                    value={renameValue}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void commitRename(layout)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitRename(layout);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 text-sm"
                  />
                ) : (
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="truncate">{layout.name}</span>
                    {editingLayoutId === layout.id ? (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted">Ouverte dans l’éditeur</span>
                    ) : null}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted">
                  {[facts.capacityLabel, facts.areaLabel].filter(Boolean).join(' · ') || 'Capacité non calculée'}
                  {' · '}
                  {layout.isPublic ? 'Visible sur la fiche publique' : 'Masquée au public'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Actions pour ${layout.name}`}>
                <Button size="sm" variant="ghost" disabled={busy || index === 0} onClick={() => move(layout, -1)} aria-label="Monter" title="Monter">
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button size="sm" variant="ghost" disabled={busy || index === layouts.length - 1} onClick={() => move(layout, 1)} aria-label="Descendre" title="Descendre">
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setRenamingId(layout.id);
                    setRenameValue(layout.name);
                  }}
                  aria-label="Renommer"
                  title="Renommer"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void togglePublic(layout)}
                  aria-label={layout.isPublic ? 'Masquer au public' : 'Publier sur la fiche'}
                  title={layout.isPublic ? 'Masquer au public' : 'Publier sur la fiche'}
                >
                  {layout.isPublic ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending({ kind: 'main', layout })} aria-label="Choisir comme disposition principale" title="Choisir comme disposition principale">
                  <Star className="h-4 w-4" aria-hidden />
                </Button>
                {editingLayoutId !== layout.id ? (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending({ kind: 'refresh', layout })} aria-label="Remplacer par le plan ouvert dans l’éditeur" title="Remplacer par le plan ouvert dans l’éditeur">
                    <RefreshCw className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" disabled={busy || quotaReached} onClick={() => void duplicate(layout)} aria-label="Dupliquer" title={quotaReached ? 'Limite atteinte' : 'Dupliquer'}>
                  <Copy className="h-4 w-4" aria-hidden />
                </Button>
                <Button size="sm" variant="ghost" disabled={busy || editingLayoutId === layout.id} onClick={() => setPending({ kind: 'delete', layout })} aria-label="Supprimer" title={editingLayoutId === layout.id ? 'Ouverte dans l’éditeur' : 'Supprimer'}>
                  <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant={editingLayoutId === layout.id ? 'primary' : 'secondary'}
                  disabled={busy}
                  onClick={() => void openInEditor({ id: layout.id, name: layout.name })}
                >
                  <Layout className="h-4 w-4" aria-hidden />
                  Modifier
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {pendingCopy ? (
        <ConfirmDialog
          open
          onClose={() => setPending(null)}
          onConfirm={() => void confirmPending()}
          title={pendingCopy.title}
          description={pendingCopy.description}
          confirmLabel={pendingCopy.confirmLabel}
          cancelLabel="Annuler"
          tone={pendingCopy.tone}
        />
      ) : null}

      {captureJob ? (
        <LayoutThumbnailCapture
          key={captureJob.layoutId}
          blueprint={captureJob.blueprint}
          onCaptured={(url) => void handleCaptured(url)}
          onFailed={handleCaptureFailed}
        />
      ) : null}
    </section>
  );
}
