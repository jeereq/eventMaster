'use client';

/**
 * Guide pas à pas d'une action de l'éditeur : éclaire l'élément réel à toucher, attend le geste
 * (clic, choix dans une liste, raccourci, sélection sur le plan) puis passe seul à l'étape suivante.
 * Si l'élément est caché, il montre d'abord le menu ou l'onglet qui le fait apparaître.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, MessageCircle, X } from '@/components/icons';
import { cn } from '@/lib/cn';
import {
  GUIDE_PANE_LABELS,
  guideSelectionMatches,
  guideStepDone,
  guideStepTargets,
  type EditorGuideAction,
  type GuideStep,
} from '@/lib/roomEditorGuide';
import { GUIDE_UI_ATTR, isUiExpanded, keyMatches, resolveGuideLocator, resolveGuideTargets, uiLabelOf } from '@/lib/editorGuideDom';

type Rect = { top: number; left: number; width: number; height: number };

type Located =
  | { mode: 'target'; el: HTMLElement }
  | { mode: 'opener'; el: HTMLElement; label: string }
  | { mode: 'pane'; el: HTMLElement; label: string }
  | { mode: 'missing' }
  | { mode: 'free' };

const PAD = 6;
const CARD_W = 340;

function locate(step: GuideStep): Located {
  const targets = guideStepTargets(step);
  if (!targets.length) return { mode: 'free' };
  const el = resolveGuideTargets(targets);
  if (el) return { mode: 'target', el };
  // Menus à ouvrir d'abord, du plus intérieur au plus extérieur.
  for (const opener of [...(step.via ?? [])].reverse()) {
    const o = resolveGuideLocator(opener);
    if (o && !isUiExpanded(o)) return { mode: 'opener', el: o, label: uiLabelOf(o) };
  }
  if (step.pane) {
    const tab = resolveGuideLocator(`tour:pane-${step.pane}`);
    if (tab && !isUiExpanded(tab)) return { mode: 'pane', el: tab, label: GUIDE_PANE_LABELS[step.pane] };
  }
  return { mode: 'missing' };
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(2, r.top - PAD);
  const left = Math.max(2, r.left - PAD);
  return { top, left, width: Math.min(vw - 2, r.right + PAD) - left, height: Math.min(vh - 2, r.bottom + PAD) - top };
}

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

/** Carte à côté de la zone éclairée, sans la recouvrir ; en bas de l'écran sinon. */
function cardPosition(rect: Rect | null, cardH: number): { top: number; left: number; width: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_W, vw - 16);
  if (!rect) return { top: vh - cardH - 12, left: vw < 640 ? (vw - width) / 2 : vw - width - 16, width };
  const centerLeft = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), vw - width - 8);
  if (rect.top + rect.height + 10 + cardH < vh - 8) return { top: rect.top + rect.height + 10, left: centerLeft, width };
  if (rect.top - 10 - cardH > 8) return { top: rect.top - 10 - cardH, left: centerLeft, width };
  if (rect.left + rect.width + 10 + width < vw - 8) return { top: Math.min(Math.max(8, rect.top), vh - cardH - 8), left: rect.left + rect.width + 10, width };
  if (rect.left - 10 - width > 8) return { top: Math.min(Math.max(8, rect.top), vh - cardH - 8), left: rect.left - 10 - width, width };
  // Très grande zone (le plan) : la carte se pose dans un coin bas, par-dessus.
  return { top: Math.max(8, Math.min(vh - cardH - 8, rect.top + rect.height - cardH - 12)), left: vw < 640 ? (vw - width) / 2 : Math.min(vw - width - 8, rect.left + rect.width - width - 12), width };
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">{children}</kbd>;
}

export default function EditorGuideRunner({
  action,
  selection,
  lock,
  upgradeHref,
  onExit,
}: {
  action: EditorGuideAction;
  /** Sélection courante de l'éditeur (« table », « fixture:door »…). */
  selection: readonly string[];
  lock: { planLabel: string | null; message: string } | null;
  upgradeHref: string;
  /** `quit` : abandon ; `done` : guide terminé ; `more` : terminé, l'utilisateur veut un autre guide. */
  onExit: (reason: 'quit' | 'done' | 'more') => void;
}) {
  const steps = action.steps;
  // -1 = avertissement de forfait, steps.length = fin.
  const [index, setIndex] = useState(lock ? -1 : 0);
  const forward = useRef(true);
  const [located, setLocated] = useState<Located>({ mode: 'missing' });
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(180);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const scrolledFor = useRef<string>('');
  const step = index >= 0 && index < steps.length ? steps[index] : null;
  const done = step ? guideStepDone(step) : null;
  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const go = useCallback(
    (delta: 1 | -1) => {
      forward.current = delta > 0;
      setIndex((i) => Math.max(lock ? -1 : 0, Math.min(steps.length, i + delta)));
    },
    [steps.length, lock],
  );
  /** Avance d'une étape seulement si l'on est toujours sur `from` (plusieurs signaux peuvent arriver ensemble). */
  const advanceFrom = useCallback(
    (from: number) => {
      forward.current = true;
      setIndex((i) => (i === from ? Math.min(steps.length, i + 1) : i));
    },
    [steps.length],
  );

  // Suivi de la cible : apparition, déplacement, étapes déjà faites.
  useEffect(() => {
    if (!step) return;
    let timer = 0;
    const tick = () => {
      if (step.select && guideSelectionMatches(step.select, selectionRef.current) && forward.current) {
        advanceFrom(index);
        return;
      }
      const next = locate(step);
      if (next.mode === 'target' && step.open && isUiExpanded(next.el) && forward.current) {
        advanceFrom(index);
        return;
      }
      setLocated((prev) => (prev.mode === next.mode && ('el' in prev ? prev.el : null) === ('el' in next ? next.el : null) ? prev : next));
      const r = 'el' in next ? rectOf(next.el) : null;
      setRect((prev) => (sameRect(prev, r) ? prev : r));
      if (cardRef.current) setCardH(cardRef.current.offsetHeight);
      const key = `${index}:${next.mode}`;
      if ('el' in next && scrolledFor.current !== key) {
        scrolledFor.current = key;
        // Cible petite : au centre de l'écran, pour laisser la place à la carte (et à la barre d'onglets du téléphone).
        const small = next.el.getBoundingClientRect().height < window.innerHeight * 0.4;
        next.el.scrollIntoView({ block: small ? 'center' : 'nearest', inline: 'nearest' });
      }
    };
    tick();
    timer = window.setInterval(tick, 200);
    window.addEventListener('resize', tick);
    window.addEventListener('scroll', tick, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', tick);
      window.removeEventListener('scroll', tick, true);
    };
  }, [step, index, advanceFrom]);

  // La sélection a changé : réévalue tout de suite les étapes « sélectionnez… ».
  useEffect(() => {
    if (step?.select && forward.current && guideSelectionMatches(step.select, selection)) advanceFrom(index);
  }, [selection, step, index, advanceFrom]);

  // Geste attendu sur la cible : clic, changement de valeur ou raccourci clavier.
  const targetEl = located.mode === 'target' ? located.el : null;
  useEffect(() => {
    if (!step) return;
    const advance = () => {
      window.setTimeout(() => advanceFrom(index), 80);
    };
    const onClick = (e: MouseEvent) => {
      if (done === 'click' && targetEl && e.target instanceof Node && targetEl.contains(e.target)) advance();
    };
    const onChange = (e: Event) => {
      if (done === 'change' && targetEl && e.target instanceof Node && targetEl.contains(e.target)) advance();
    };
    const onKey = (e: KeyboardEvent) => {
      if (done === 'key' && step.key && keyMatches(step.key, e)) advance();
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('change', onChange, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('change', onChange, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [step, done, targetEl, index, advanceFrom]);

  // Repère sur l'élément éclairé (lecteurs d'écran : « actuel » ; vérifications automatiques).
  const litEl = 'el' in located ? located.el : null;
  useEffect(() => {
    if (!litEl) return;
    litEl.setAttribute('data-guide-target', located.mode);
    return () => litEl.removeAttribute('data-guide-target');
  }, [litEl, located.mode]);

  // Les clics sur le voile et la carte ne doivent pas refermer les menus de l'éditeur.
  useEffect(() => {
    const root = overlayRef.current;
    if (!root) return;
    const stop = (e: Event) => e.stopPropagation();
    root.addEventListener('pointerdown', stop);
    root.addEventListener('mousedown', stop);
    return () => {
      root.removeEventListener('pointerdown', stop);
      root.removeEventListener('mousedown', stop);
    };
  }, []);

  if (typeof document === 'undefined') return null;

  const highlight = step && located.mode !== 'missing' && located.mode !== 'free' ? rect : null;
  // Consigne sans cible (fenêtre ouverte, réglage libre) : pas de voile, l'éditeur reste utilisable.
  const dim = Boolean(highlight);
  const pos = typeof window !== 'undefined' ? cardPosition(highlight, cardH) : { top: 0, left: 0, width: CARD_W };
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;

  const blocker = 'fixed bg-[rgba(10,14,12,0.55)] transition-all duration-200';

  return createPortal(
    <div ref={overlayRef} {...{ [GUIDE_UI_ATTR]: '' }} className="fixed inset-0 z-[12000] pointer-events-none" data-guide-step={index} data-guide-mode={step ? located.mode : index < 0 ? 'lock' : 'end'} data-guide-action={action.id} data-guide-done={done ?? undefined} data-guide-select={step?.select} data-guide-key={step?.key}>
      {dim && highlight ? (
        <>
          {/* Voile en quatre bandes : la zone éclairée reste cliquable. */}
          <div className={cn(blocker, 'pointer-events-auto')} style={{ top: 0, left: 0, width: vw, height: highlight.top }} />
          <div className={cn(blocker, 'pointer-events-auto')} style={{ top: highlight.top + highlight.height, left: 0, width: vw, height: Math.max(0, vh - highlight.top - highlight.height) }} />
          <div className={cn(blocker, 'pointer-events-auto')} style={{ top: highlight.top, left: 0, width: highlight.left, height: highlight.height }} />
          <div className={cn(blocker, 'pointer-events-auto')} style={{ top: highlight.top, left: highlight.left + highlight.width, width: Math.max(0, vw - highlight.left - highlight.width), height: highlight.height }} />
          <div
            aria-hidden
            className="fixed rounded-[12px] ring-[3px] ring-primary transition-all duration-200 motion-safe:animate-pulse"
            style={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
          />
        </>
      ) : null}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-live="polite"
        aria-label={`Guide : ${action.title}`}
        className="pointer-events-auto fixed rounded-[var(--radius-card)] border border-border bg-surface p-3.5 shadow-2xl transition-[top,left] duration-200"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
      >
        <button
          type="button"
          onClick={() => onExit('quit')}
          className="absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
          aria-label="Quitter le guide"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <p className="pr-9 text-[11px] font-bold uppercase tracking-wide text-primary">{action.title}</p>

        {index < 0 ? (
          <div className="mt-2 space-y-2">
            <p className="flex items-start gap-1.5 text-sm text-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{lock?.message}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={upgradeHref} className="inline-flex min-h-10 items-center rounded-full bg-primary-solid px-3 text-sm font-semibold text-primary-foreground">
                Voir les forfaits
              </a>
              <button type="button" onClick={() => go(1)} className="inline-flex min-h-10 items-center rounded-full border border-border px-3 text-sm font-semibold text-foreground hover:bg-surface-muted">
                Me guider quand même
              </button>
            </div>
          </div>
        ) : step ? (
          <div className="mt-1.5 space-y-2">
            <p className="text-xs font-semibold tabular-nums text-muted">
              Étape {index + 1} sur {steps.length}
            </p>
            {located.mode === 'opener' ? (
              <p className="text-sm font-semibold text-foreground">D’abord, ouvrez « {located.label} » (en surbrillance).</p>
            ) : located.mode === 'pane' ? (
              <p className="text-sm font-semibold text-foreground">D’abord, touchez l’onglet « {located.label} » en bas de l’écran.</p>
            ) : null}
            <p className={cn('text-sm leading-relaxed', located.mode === 'opener' || located.mode === 'pane' ? 'text-muted' : 'text-foreground')}>{step.say}</p>
            {step.key && done === 'key' ? (
              <p className="text-xs text-muted">
                Raccourci attendu : <Kbd>{step.key.replace('Mod', 'Ctrl').replace('ArrowRight', '→')}</Kbd>
              </p>
            ) : null}
            {located.mode === 'missing' ? (
              <p className="rounded-[var(--radius-button)] border border-dashed border-border bg-surface-muted/50 px-2.5 py-2 text-xs text-muted">
                {step.hint ?? 'Cet élément n’est pas affiché pour l’instant. Faites l’étape précédente, ou passez à la suite.'}
              </p>
            ) : null}
            {located.mode === 'target' && (done === 'click' || done === 'change' || done === 'select') ? (
              <p className="text-xs text-muted">Le guide avance tout seul dès que c’est fait.</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> C’est fait
            </p>
            <p className="text-sm text-muted">{action.result}</p>
            {action.shortcut ? (
              <p className="text-xs text-muted">
                La prochaine fois : <Kbd>{action.shortcut}</Kbd>
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1" aria-hidden>
            {steps.map((s, i) => (
              <span key={`${i}-${s.say.slice(0, 8)}`} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-primary' : i < index ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-border')} />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {index > 0 && index <= steps.length ? (
              <button type="button" onClick={() => go(-1)} className="inline-flex min-h-10 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Précédent
              </button>
            ) : null}
            {step ? (
              <button
                type="button"
                onClick={() => go(1)}
                className={cn(
                  'inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold',
                  done === 'next' || located.mode === 'missing' || located.mode === 'free'
                    ? 'bg-primary-solid text-primary-foreground'
                    : 'border border-border text-foreground hover:bg-surface-muted',
                )}
              >
                {located.mode === 'missing' ? 'Passer' : done === 'next' || located.mode === 'free' ? 'Suivant' : 'Passer'} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : index >= steps.length ? (
              <>
                <button type="button" onClick={() => onExit('more')} className="inline-flex min-h-10 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground">
                  <MessageCircle className="h-4 w-4" aria-hidden /> Autre guide
                </button>
                <button type="button" onClick={() => onExit('done')} className="inline-flex min-h-10 items-center rounded-full bg-primary-solid px-3 text-sm font-semibold text-primary-foreground">
                  Terminer
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
