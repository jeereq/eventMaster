'use client';

/**
 * Visite guidée de l’éditeur de salle : met en lumière une zone de l’interface à la fois et
 * l’explique. Les fonctions hors forfait restent présentées, marquées du forfait qui les débloque.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Lock, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { EditorTourAction, EditorTourStep } from '@/lib/roomEditorTour';

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 6;
const CARD_W = 352;

/** Première zone visible portant `data-tour="target"` (certaines existent en double mobile / bureau). */
function findTarget(target?: string): HTMLElement | null {
  if (!target || typeof document === 'undefined') return null;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  return nodes.find((n) => {
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

function measure(el: HTMLElement | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

/** Place la carte sous la zone, sinon au-dessus, sinon par-dessus (grandes zones comme le plan). */
function cardPosition(rect: Rect | null, cardH: number): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(CARD_W, vw - 24);
  if (!rect) return { top: Math.max(12, (vh - cardH) / 2), left: (vw - w) / 2 };
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - w / 2), vw - w - 12);
  if (rect.top + rect.height + 12 + cardH < vh) return { top: rect.top + rect.height + 12, left };
  if (rect.top - 12 - cardH > 0) return { top: rect.top - 12 - cardH, left };
  return { top: Math.min(vh - cardH - 12, Math.max(12, rect.top + rect.height - cardH - 16)), left: Math.min(Math.max(12, rect.left + 16), vw - w - 12) };
}

export default function EditorTour({
  open,
  steps,
  summary,
  upgradeHref,
  onClose,
  onAction,
}: {
  open: boolean;
  steps: EditorTourStep[];
  summary: { title: string; included: string[]; nextPlan: string | null };
  upgradeHref: string;
  onClose: () => void;
  onAction: (kind: EditorTourAction) => void;
}) {
  // 0 = accueil (résumé du forfait), 1..n = étapes, n + 1 = fin.
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(240);
  const cardRef = useRef<HTMLDivElement>(null);
  const last = steps.length + 1;
  const step = index >= 1 && index <= steps.length ? steps[index - 1] : null;
  const lockedCount = steps.filter((s) => s.locked).length;

  const close = useCallback(() => {
    setIndex(0);
    onClose();
  }, [onClose]);

  // Mesure de la zone éclairée, suivie au défilement et au redimensionnement.
  useLayoutEffect(() => {
    if (!open) return;
    let raf = 0;
    const update = () => {
      const el = findTarget(step?.target);
      const next = measure(el);
      setRect((prev) =>
        prev && next && Math.abs(prev.top - next.top) < 0.5 && Math.abs(prev.left - next.left) < 0.5 && Math.abs(prev.width - next.width) < 0.5 && Math.abs(prev.height - next.height) < 0.5
          ? prev
          : next,
      );
      if (cardRef.current) setCardH(cardRef.current.offsetHeight);
    };
    findTarget(step?.target)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    update();
    const loop = () => {
      update();
      raf = window.setTimeout(loop, 250) as unknown as number;
    };
    raf = window.setTimeout(loop, 250) as unknown as number;
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearTimeout(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, step?.target, index]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        setIndex((i) => Math.min(last, i + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, last, close]);

  if (!open || typeof document === 'undefined') return null;

  const pos = typeof window !== 'undefined' ? cardPosition(step ? rect : null, cardH) : { top: 0, left: 0 };
  const runAction = (kind: EditorTourAction) => {
    // Ces actions ouvrent une fenêtre : on referme le guide pour la laisser au premier plan.
    if (kind === 'openQuickAdd' || kind === 'openShortcuts' || kind === 'openStudio') close();
    onAction(kind);
  };

  return createPortal(
    <div className="fixed inset-0 z-[12000]" role="presentation">
      {/* Voile : découpé autour de la zone montrée, sinon plein écran */}
      {step && rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-[14px] ring-2 ring-primary transition-all duration-300 ease-out"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: '0 0 0 9999px rgba(10, 14, 12, 0.58)' }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[rgba(10,14,12,0.58)]" />
      )}
      {/* Intercepte les clics hors carte : le guide se pilote par ses boutons */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-tour-title"
        tabIndex={-1}
        className="fixed rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-2xl outline-none transition-[top,left] duration-300 ease-out"
        style={{ outline: 'none', top: pos.top, left: pos.left, width: Math.min(CARD_W, typeof window !== 'undefined' ? window.innerWidth - 24 : CARD_W) }}
      >
        <button type="button" onClick={close} className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Fermer le guide">
          <X className="h-4 w-4" aria-hidden />
        </button>

        {index === 0 ? (
          <div className="space-y-3 pr-8">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              <GraduationCap className="h-4 w-4" aria-hidden /> Guide de l’éditeur
            </p>
            <h2 id="editor-tour-title" className="text-base font-bold text-foreground">Bienvenue dans votre éditeur de salle</h2>
            <p className="text-sm text-muted">
              {steps.length} étapes, environ 2 minutes. Votre <strong className="text-foreground">{summary.title.replace(/^Forfait\b/, 'forfait')}</strong> comprend :
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              {summary.included.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            {lockedCount > 0 ? (
              <p className="text-xs text-muted">
                Les fonctions marquées <Lock className="inline h-3 w-3 align-[-1px]" aria-label="cadenas" /> sont présentées aussi, avec le forfait qui les débloque.
              </p>
            ) : null}
          </div>
        ) : step ? (
          <div className="space-y-2 pr-8">
            <p className="text-xs font-semibold text-muted tabular-nums">
              Étape {index} sur {steps.length}
            </p>
            <h2 id="editor-tour-title" className="flex flex-wrap items-center gap-2 text-base font-bold text-foreground">
              {step.title}
              {step.locked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  <Lock className="h-3 w-3" aria-hidden />
                  {step.planLabel ? `Forfait ${step.planLabel}` : 'Option'}
                </span>
              ) : null}
            </h2>
            <p className="text-sm leading-relaxed text-muted">{step.body}</p>
            {step.locked && step.lockMessage ? (
              <p className="rounded-[var(--radius-button)] border border-dashed border-primary/40 bg-primary/5 px-2.5 py-2 text-xs text-foreground">{step.lockMessage}</p>
            ) : null}
            {!step.locked && step.action ? (
              <button
                type="button"
                onClick={() => runAction(step.action!.kind)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/15"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> {step.action.label}
              </button>
            ) : null}
            {step.locked ? (
              <Button href={upgradeHref} size="sm" variant="secondary">
                Voir les forfaits
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 pr-8">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> C’est parti
            </p>
            <h2 id="editor-tour-title" className="text-base font-bold text-foreground">Vous connaissez l’essentiel</h2>
            <p className="text-sm text-muted">
              Le guide reste accessible à tout moment depuis le bouton « Guide ». Ctrl+K pour ajouter, Ctrl+Z pour annuler.
            </p>
            {lockedCount > 0 && summary.nextPlan ? (
              <p className="text-sm text-foreground">
                {lockedCount} fonction{lockedCount > 1 ? 's' : ''} du guide {lockedCount > 1 ? 'sont réservées' : 'est réservée'} à un forfait supérieur, à commencer par <strong>{summary.nextPlan}</strong>.
              </p>
            ) : null}
            {lockedCount > 0 ? (
              <Button href={upgradeHref} size="sm">
                Comparer les forfaits
              </Button>
            ) : null}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
          <div className="flex flex-wrap gap-1" aria-hidden>
            {Array.from({ length: last + 1 }).map((_, i) => (
              <span key={i} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-primary' : 'w-1.5 bg-border', steps[i - 1]?.locked && i !== index && 'bg-primary/30')} />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {index > 0 ? (
              <button type="button" onClick={() => setIndex((i) => i - 1)} className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Précédent
              </button>
            ) : (
              <button type="button" onClick={close} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground">
                Plus tard
              </button>
            )}
            {index < last ? (
              <Button type="button" size="sm" onClick={() => setIndex((i) => i + 1)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                {index === 0 ? 'Commencer' : 'Suivant'}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={close}>
                Terminer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
