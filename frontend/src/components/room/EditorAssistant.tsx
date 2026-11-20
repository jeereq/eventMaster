'use client';

/**
 * Assistant de l'éditeur : on lui dit ce que l'on veut faire (« ajouter une porte »), il lance
 * un guide pas à pas qui éclaire chaque bouton à toucher, dans l'ordre. « Toutes les actions »
 * donne la liste complète des guides, rangée par thème. Tout est local : aucun jeton IA consommé.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookOpen, Lock, MessageCircle, Play, Search, Send, X } from '@/components/icons';
import { cn } from '@/lib/cn';
import type { RoomEditorCapabilities } from '@/lib/roomEditorAccess';
import {
  EDITOR_GUIDE_ACTIONS,
  EDITOR_GUIDE_SUGGESTIONS,
  answerEditorGuide,
  editorGuideAction,
  editorGuideCatalog,
  editorGuideLock,
  type EditorGuideAction,
} from '@/lib/roomEditorGuide';
import { GUIDE_UI_ATTR } from '@/lib/editorGuideDom';
import EditorGuideRunner from './EditorGuideRunner';

type ChatEntry =
  | { id: number; from: 'user'; text: string }
  | { id: number; from: 'bot'; kind: 'welcome' }
  | { id: number; from: 'bot'; kind: 'match'; actionId: string; otherIds: string[]; started: boolean }
  | { id: number; from: 'bot'; kind: 'unknown'; suggestionIds: string[] }
  | { id: number; from: 'bot'; kind: 'after'; actionId: string; finished: boolean };

type NewEntry = ChatEntry extends infer E ? (E extends ChatEntry ? Omit<E, 'id'> : never) : never;

const TOTAL = EDITOR_GUIDE_ACTIONS.length;

function stepsLabel(a: EditorGuideAction) {
  return `${a.steps.length} étape${a.steps.length > 1 ? 's' : ''}`;
}

function GuideChips({ ids, onStart, caps, label }: { ids: string[]; onStart: (id: string) => void; caps: RoomEditorCapabilities | null; label: string }) {
  const actions = ids.map((id) => editorGuideAction(id)).filter((a): a is EditorGuideAction => Boolean(a));
  if (!actions.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onStart(a.id)}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-left text-xs font-semibold text-foreground hover:bg-surface-muted"
          >
            {editorGuideLock(a, caps) ? <Lock className="h-3 w-3 shrink-0 text-muted" aria-label="Hors forfait" /> : <Play className="h-3 w-3 shrink-0 text-primary" aria-hidden />}
            {a.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function GuideCard({ action, caps, started, onStart }: { action: EditorGuideAction; caps: RoomEditorCapabilities | null; started: boolean; onStart: (id: string) => void }) {
  const lock = editorGuideLock(action, caps);
  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground">
        {started ? 'Guide lancé : ' : 'Je vous guide : '}
        <strong>{action.title}</strong>
      </p>
      {lock ? (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {lock.planLabel ? `Réservé au forfait ${lock.planLabel}.` : 'Non inclus dans votre forfait.'}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => onStart(action.id)}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary-solid px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-solid-hover"
      >
        <Play className="h-3.5 w-3.5" aria-hidden /> {started ? 'Relancer' : 'Me guider'} · {stepsLabel(action)}
      </button>
    </div>
  );
}

function Catalog({ caps, onStart }: { caps: RoomEditorCapabilities | null; onStart: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const sections = useMemo(() => editorGuideCatalog(query), [query]);
  const shown = sections.reduce((n, s) => n + s.actions.length, 0);
  return (
    <div className="space-y-2.5">
      <label className="relative block">
        <span className="sr-only">Filtrer les actions</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer : table, mur, lumière…"
          className="min-h-10 w-full rounded-[var(--radius-button)] border border-border bg-surface pl-8 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          type="search"
        />
      </label>
      <p className="text-xs text-muted">
        {query ? `${shown} action${shown > 1 ? 's' : ''} sur ${TOTAL}.` : `${TOTAL} actions, chacune avec son guide pas à pas.`} Touchez une action pour être guidé.
      </p>
      <div className="space-y-1">
        {sections.map((s) => (
          <details key={`${s.category}-${query ? 'q' : ''}`} open={Boolean(query)} className="group rounded-[var(--radius-button)] border border-border bg-surface">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold text-foreground">
              <span>{s.label}</span>
              <span className="text-xs font-normal tabular-nums text-muted">{s.actions.length}</span>
            </summary>
            <ul className="border-t border-border px-1.5 py-1">
              {s.actions.map((a) => {
                const locked = Boolean(editorGuideLock(a, caps));
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onStart(a.id)}
                      className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-sm text-foreground hover:bg-surface-muted"
                    >
                      {locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Hors forfait" /> : <Play className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
                      <span className="min-w-0 flex-1">{a.title}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted" title={stepsLabel(a)}>{a.steps.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

export default function EditorAssistant({
  open,
  onClose,
  caps = null,
  upgradeHref = '/tarifs',
  selection = [],
}: {
  open: boolean;
  onClose: () => void;
  caps?: RoomEditorCapabilities | null;
  upgradeHref?: string;
  /** Sélection courante de l'éditeur (« table », « fixture:door »…), suivie par les guides. */
  selection?: readonly string[];
}) {
  const titleId = useId();
  const [entries, setEntries] = useState<ChatEntry[]>([{ id: 0, from: 'bot', kind: 'welcome' }]);
  const [draft, setDraft] = useState('');
  const [view, setView] = useState<'chat' | 'all'>('chat');
  const [running, setRunning] = useState<string | null>(null);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || running) return;
    if (view === 'chat') inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, running, view, onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (el && view === 'chat') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries, view, running]);

  const push = useCallback((...items: NewEntry[]) => {
    setEntries((prev) => [...prev, ...items.map((it) => ({ ...it, id: nextId.current++ }) as ChatEntry)]);
  }, []);

  const start = useCallback((id: string) => {
    if (!editorGuideAction(id)) return;
    setRunning(id);
  }, []);

  const startFromList = useCallback(
    (id: string) => {
      const a = editorGuideAction(id);
      if (!a) return;
      push({ from: 'user', text: a.title }, { from: 'bot', kind: 'match', actionId: id, otherIds: a.related ?? [], started: true });
      setView('chat');
      start(id);
    },
    [push, start],
  );

  const ask = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q) return;
      setDraft('');
      const a = answerEditorGuide(q);
      if (a.kind === 'overview') {
        push({ from: 'user', text: q });
        setView('all');
        return;
      }
      if (a.kind === 'unknown') {
        push({ from: 'user', text: q }, { from: 'bot', kind: 'unknown', suggestionIds: a.suggestions.map((s) => s.id) });
        return;
      }
      push({ from: 'user', text: q }, { from: 'bot', kind: 'match', actionId: a.best.id, otherIds: a.others.map((o) => o.id), started: a.confident });
      if (a.confident) start(a.best.id);
    },
    [push, start],
  );

  const exitGuide = useCallback(
    (reason: 'quit' | 'done' | 'more') => {
      const id = running;
      setRunning(null);
      if (!id) return;
      push({ from: 'bot', kind: 'after', actionId: id, finished: reason !== 'quit' });
      if (reason === 'done') onClose();
    },
    [running, push, onClose],
  );

  // Outil de vérification (développement) : lance un guide par son identifiant.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __emGuide?: unknown };
    w.__emGuide = { start, ids: () => EDITOR_GUIDE_ACTIONS.map((a) => a.id) };
    return () => {
      delete w.__emGuide;
    };
  }, [start]);

  const runningAction = running ? editorGuideAction(running) : null;

  if (typeof document === 'undefined') return null;

  return (
    <>
      {runningAction ? (
        <EditorGuideRunner
          key={runningAction.id}
          action={runningAction}
          selection={selection}
          lock={editorGuideLock(runningAction, caps)}
          upgradeHref={upgradeHref}
          onExit={exitGuide}
        />
      ) : null}
      {open && !runningAction
        ? createPortal(
            <div
              {...{ [GUIDE_UI_ATTR]: '' }}
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              className="fixed inset-x-2 bottom-2 z-[11950] flex max-h-[min(82vh,40rem)] flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[24rem]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-muted/60 px-3 py-2">
                {view === 'all' ? (
                  <button
                    type="button"
                    onClick={() => setView('chat')}
                    className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-button)] px-1.5 text-sm font-bold text-foreground hover:bg-surface"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden /> <span id={titleId}>Toutes les actions</span>
                  </button>
                ) : (
                  <p id={titleId} className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <MessageCircle className="h-4 w-4 text-primary" aria-hidden /> Assistant de l’éditeur
                  </p>
                )}
                <div className="flex items-center gap-1">
                  {view === 'chat' ? (
                    <button
                      type="button"
                      onClick={() => setView('all')}
                      className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-button)] px-2 text-xs font-semibold text-foreground hover:bg-surface"
                      title="Liste complète des actions de l’éditeur"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden /> Toutes les actions ({TOTAL})
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-muted hover:bg-surface hover:text-foreground"
                    aria-label="Fermer l’assistant"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              {view === 'all' ? (
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  <Catalog caps={caps} onStart={startFromList} />
                </div>
              ) : (
                <>
                  <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite">
                    {entries.map((e) =>
                      e.from === 'user' ? (
                        <div key={e.id} className="flex justify-end">
                          <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary-solid px-3 py-2 text-sm text-primary-foreground">{e.text}</p>
                        </div>
                      ) : (
                        <div key={e.id} className="max-w-[95%] rounded-2xl rounded-bl-sm border border-border bg-surface-muted/40 px-3 py-2.5">
                          {e.kind === 'welcome' ? (
                            <div className="space-y-2.5">
                              <p className="text-sm text-foreground">
                                Dites-moi ce que vous voulez faire : je vous montre où cliquer, étape par étape, directement dans l’éditeur.
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {EDITOR_GUIDE_SUGGESTIONS.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => ask(s)}
                                    className="min-h-8 rounded-full border border-border bg-surface px-2.5 text-left text-xs font-semibold text-foreground hover:bg-surface-muted"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setView('all')}
                                className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                <BookOpen className="h-3.5 w-3.5" aria-hidden /> Voir les {TOTAL} actions possibles
                              </button>
                            </div>
                          ) : e.kind === 'match' ? (
                            (() => {
                              const action = editorGuideAction(e.actionId);
                              if (!action) return null;
                              return (
                                <div className="space-y-3">
                                  <GuideCard action={action} caps={caps} started={e.started} onStart={start} />
                                  <GuideChips ids={e.otherIds} onStart={startFromList} caps={caps} label="Autres guides" />
                                </div>
                              );
                            })()
                          ) : e.kind === 'after' ? (
                            (() => {
                              const action = editorGuideAction(e.actionId);
                              if (!action) return null;
                              return (
                                <div className="space-y-2.5">
                                  <p className="text-sm text-foreground">
                                    {e.finished ? `« ${action.title} » : terminé. Que voulez-vous faire ensuite ?` : `Guide « ${action.title} » interrompu.`}
                                  </p>
                                  {!e.finished ? (
                                    <button
                                      type="button"
                                      onClick={() => start(action.id)}
                                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
                                    >
                                      <Play className="h-3 w-3" aria-hidden /> Reprendre depuis le début
                                    </button>
                                  ) : null}
                                  <GuideChips ids={action.related ?? []} onStart={startFromList} caps={caps} label="Pour aller plus loin" />
                                </div>
                              );
                            })()
                          ) : (
                            <div className="space-y-2.5">
                              <p className="text-sm text-foreground">
                                Je n’ai pas trouvé d’action qui corresponde exactement. Essayez avec un mot de l’éditeur (table, mur, porte, piste, lumière…), ou choisissez :
                              </p>
                              <GuideChips ids={e.suggestionIds} onStart={startFromList} caps={caps} label="Peut-être" />
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>

                  <form
                    className="flex items-center gap-2 border-t border-border p-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      ask(draft);
                    }}
                  >
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Ex. : ajouter une fenêtre"
                      className="min-h-11 flex-1 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="Ce que vous voulez faire"
                      enterKeyHint="send"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className={cn('inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground', 'disabled:opacity-40')}
                      aria-label="Envoyer"
                    >
                      <Send className="h-4 w-4" aria-hidden />
                    </button>
                  </form>
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
