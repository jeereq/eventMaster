'use client';

/**
 * Assistant de l'éditeur : un chat qui répond aux questions sur les actions possibles
 * (« comment ajouter une porte ? », « que puis-je faire ? ») à partir de la base de fiches
 * de `roomEditorHelp`. Tout est local : réponse immédiate, aucun jeton IA consommé.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Crosshair, Lock, MessageCircleQuestion, Send, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { RoomEditorCapabilities } from '@/lib/roomEditorAccess';
import {
  EDITOR_HELP_SUGGESTIONS,
  answerEditorQuestion,
  editorHelpLock,
  editorHelpOverview,
  editorHelpTopic,
  type EditorHelpTopic,
} from '@/lib/roomEditorHelp';

type ChatEntry =
  | { id: number; from: 'user'; text: string }
  | { id: number; from: 'bot'; kind: 'welcome' }
  | { id: number; from: 'bot'; kind: 'topic'; topicId: string; relatedIds: string[] }
  | { id: number; from: 'bot'; kind: 'overview' }
  | { id: number; from: 'bot'; kind: 'unknown'; suggestionIds: string[] };

type NewEntry = ChatEntry extends infer E ? (E extends ChatEntry ? Omit<E, 'id'> : never) : never;

/** Met brièvement en évidence la zone `data-tour` de l'éditeur. */
function flashTarget(target: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  const el = nodes.find((n) => {
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  if (!el) return null;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  el.classList.add('em-assistant-flash');
  window.setTimeout(() => el.classList.remove('em-assistant-flash'), 2600);
  return el;
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function TopicCard({
  topic,
  caps,
  upgradeHref,
  onShow,
}: {
  topic: EditorHelpTopic;
  caps: RoomEditorCapabilities | null;
  upgradeHref: string;
  onShow: (target: string) => void;
}) {
  const lock = editorHelpLock(topic, caps);
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">{topic.title}</p>
      <p className="text-sm leading-relaxed text-foreground/90">{topic.answer}</p>
      {topic.steps?.length ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/90">
          {topic.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      ) : null}
      {topic.shortcut ? (
        <p className="text-xs text-muted">
          Raccourci : <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">{topic.shortcut}</kbd>
        </p>
      ) : null}
      {lock ? (
        <p className="flex items-start gap-1.5 rounded-[var(--radius-button)] border border-amber-300/60 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {lock.message}{' '}
            <a href={upgradeHref} className="font-bold underline">
              Voir les forfaits
            </a>
          </span>
        </p>
      ) : null}
      {topic.target ? (
        <button
          type="button"
          onClick={() => onShow(topic.target as string)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-button)] border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-surface-muted"
        >
          <Crosshair className="h-3.5 w-3.5" aria-hidden /> Me montrer où
        </button>
      ) : null}
    </div>
  );
}

function Chips({ ids, onPick, label }: { ids: string[]; onPick: (topic: EditorHelpTopic) => void; label: string }) {
  const topics = ids.map((id) => editorHelpTopic(id)).filter((t): t is EditorHelpTopic => Boolean(t));
  if (!topics.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="min-h-8 rounded-full border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-surface-muted"
          >
            {t.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function Overview({ caps, onPick }: { caps: RoomEditorCapabilities | null; onPick: (topic: EditorHelpTopic) => void }) {
  const sections = editorHelpOverview();
  const total = sections.reduce((n, s) => n + s.topics.length, 0);
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">Tout ce que vous pouvez faire ({total} actions)</p>
      <p className="text-xs text-muted">Touchez une action pour le mode d’emploi détaillé.</p>
      <div className="space-y-1">
        {sections.map((s) => (
          <details key={s.category} className="group rounded-[var(--radius-button)] border border-border bg-surface">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold text-foreground">
              <span>{s.label}</span>
              <span className="text-xs font-normal text-muted">{s.topics.length}</span>
            </summary>
            <ul className="space-y-0.5 border-t border-border px-2 py-1.5">
              {s.topics.map((t) => {
                const locked = Boolean(editorHelpLock(t, caps));
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onPick(t)}
                      className="flex w-full items-start gap-1.5 rounded px-1.5 py-1.5 text-left text-xs text-foreground hover:bg-surface-muted"
                    >
                      {locked ? <Lock className="mt-0.5 h-3 w-3 shrink-0 text-muted" aria-label="Hors forfait" /> : <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />}
                      <span>
                        <span className="font-semibold">{t.title}</span>
                        <span className="block text-muted">{t.answer.split('. ')[0]}.</span>
                      </span>
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
}: {
  open: boolean;
  onClose: () => void;
  caps?: RoomEditorCapabilities | null;
  upgradeHref?: string;
}) {
  const titleId = useId();
  const [entries, setEntries] = useState<ChatEntry[]>([{ id: 0, from: 'bot', kind: 'welcome' }]);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  /** Côté de l'écran où s'affiche le chat : il s'écarte si la zone montrée est dessous. */
  const [side, setSide] = useState<'right' | 'left'>('right');

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries]);

  const push = useCallback((...items: NewEntry[]) => {
    setEntries((prev) => [...prev, ...items.map((it) => ({ ...it, id: nextId.current++ }) as ChatEntry)]);
  }, []);

  const ask = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q) return;
      const a = answerEditorQuestion(q);
      const reply: NewEntry =
        a.kind === 'overview'
          ? { from: 'bot', kind: 'overview' }
          : a.kind === 'topic'
            ? { from: 'bot', kind: 'topic', topicId: a.topic.id, relatedIds: a.related.map((t) => t.id) }
            : { from: 'bot', kind: 'unknown', suggestionIds: a.suggestions.map((t) => t.id) };
      push({ from: 'user', text: q }, reply);
      setDraft('');
      setNotFound(null);
    },
    [push],
  );

  const pickTopic = useCallback(
    (topic: EditorHelpTopic) => {
      push({ from: 'user', text: topic.title }, { from: 'bot', kind: 'topic', topicId: topic.id, relatedIds: topic.related ?? [] });
      setNotFound(null);
    },
    [push],
  );

  const show = useCallback((target: string) => {
    const el = flashTarget(target);
    setNotFound(el ? null : 'Cette zone n’est pas visible pour l’instant : agrandissez la fenêtre ou ouvrez le menu concerné.');
    const panel = panelRef.current;
    if (!el || !panel) return;
    // Laisse le défilement se terminer avant de comparer les positions.
    window.setTimeout(() => {
      if (overlaps(el.getBoundingClientRect(), panel.getBoundingClientRect())) setSide((v) => (v === 'right' ? 'left' : 'right'));
    }, 350);
  }, []);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={cn(
        'fixed inset-x-2 bottom-2 z-[11950] flex max-h-[min(82vh,40rem)] flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-2xl sm:inset-x-auto sm:bottom-4 sm:w-[24rem]',
        side === 'right' ? 'sm:right-4' : 'sm:left-4',
      )}
    >
      <style>{`.em-assistant-flash{outline:3px solid var(--color-primary,#2563eb)!important;outline-offset:3px;border-radius:10px;transition:outline-color .3s}`}</style>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-muted/60 px-3 py-2">
        <p id={titleId} className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <MessageCircleQuestion className="h-4 w-4 text-primary" aria-hidden /> Assistant de l’éditeur
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => push({ from: 'user', text: 'Tout ce que je peux faire' }, { from: 'bot', kind: 'overview' })}
            className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-button)] px-2 text-xs font-semibold text-foreground hover:bg-surface"
            title="Descriptif complet de l’éditeur"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden /> Tout voir
          </button>
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
                    Bonjour ! Posez-moi une question sur l’éditeur : comment ajouter, déplacer, redimensionner, décorer, vérifier ou partager. Je vous explique où cliquer, pas à pas.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EDITOR_HELP_SUGGESTIONS.map((s) => (
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
                </div>
              ) : e.kind === 'overview' ? (
                <Overview caps={caps} onPick={pickTopic} />
              ) : e.kind === 'topic' ? (
                (() => {
                  const topic = editorHelpTopic(e.topicId);
                  if (!topic) return null;
                  return (
                    <div className="space-y-3">
                      <TopicCard topic={topic} caps={caps} upgradeHref={upgradeHref} onShow={show} />
                      <Chips ids={e.relatedIds} onPick={pickTopic} label="Voir aussi" />
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-2.5">
                  <p className="text-sm text-foreground">
                    Je n’ai pas trouvé d’action qui corresponde exactement. Essayez avec un mot de l’éditeur (table, mur, porte, piste, lumière…) ou choisissez :
                  </p>
                  <Chips ids={e.suggestionIds} onPick={pickTopic} label="Peut-être" />
                </div>
              )}
            </div>
          ),
        )}
        {notFound ? <p className="text-xs text-muted">{notFound}</p> : null}
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
          placeholder="Ex. : comment ajouter une fenêtre ?"
          className="min-h-11 flex-1 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Votre question"
          enterKeyHint="send"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground',
            'disabled:opacity-40',
          )}
          aria-label="Envoyer la question"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>,
    document.body,
  );
}
