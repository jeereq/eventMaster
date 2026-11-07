'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  defaultEditorNeedLabel,
  describeEditorUpsell,
  textOfNode,
  type EditorNeed,
  type EditorUpsell,
} from '@/lib/roomEditorUpsell';
import type { RoomEditorLevel } from '@/lib/roomEditorAccess';

const LOCKED_CLASS = 'opacity-60 cursor-not-allowed';
const FORM_FIELD_TAGS = new Set(['input', 'select', 'textarea']);

type ElementWithProps = React.ReactElement<{
  children?: React.ReactNode;
  className?: string;
  title?: string;
}>;

function hasFormField(node: React.ReactNode): boolean {
  return React.Children.toArray(node).some((child) => {
    if (!React.isValidElement(child)) return false;
    const element = child as ElementWithProps;
    if (typeof element.type === 'string' && FORM_FIELD_TAGS.has(element.type)) return true;
    return hasFormField(element.props.children);
  });
}

/** Texte d'un champ (libellé, bouton) sans ses textes d'aide ni ses champs de saisie. */
function captionOf(node: React.ReactNode): string {
  return React.Children.toArray(node)
    .map((child) => {
      if (!React.isValidElement(child)) return typeof child === 'string' ? child : '';
      const element = child as ElementWithProps;
      if (element.type === 'p' || element.type === 'input' || element.type === 'select') return '';
      return captionOf(element.props.children);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

interface LockContext {
  /** Nom de repli quand un contrôle n'a ni texte ni libellé d'accessibilité. */
  fallbackLabel: string;
  /** Construit l'infobulle et l'action d'un contrôle, à partir de son propre nom. */
  forLabel: (label: string) => { tooltip: string; open: () => void };
}

function lockedButton(element: ElementWithProps, ctx: LockContext): React.ReactElement {
  const { tooltip, open } = ctx.forLabel(lockedLabelFor(element, ctx.fallbackLabel));
  return React.cloneElement(
    element as React.ReactElement<Record<string, unknown>>,
    {
      disabled: false,
      'aria-disabled': true,
      title: tooltip,
      className: cn(element.props.className, LOCKED_CLASS),
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        open();
      },
    },
    element.props.children,
    <Lock key="lock" className="ml-auto h-3 w-3 shrink-0" aria-hidden />,
  );
}

/**
 * Remplace un champ de saisie ou un import de fichier par un bouton qui ouvre la même boîte :
 * un champ de formulaire ne peut pas être rendu inerte sans le retirer de l'arbre.
 */
function lockedFieldReplica(element: ElementWithProps, ctx: LockContext): React.ReactElement {
  const caption = captionOf(element.props.children) || ctx.fallbackLabel;
  const { tooltip, open } = ctx.forLabel(caption);
  return (
    <button
      type="button"
      aria-disabled
      title={tooltip}
      onClick={open}
      className={cn(element.props.className, LOCKED_CLASS, 'cursor-not-allowed')}
    >
      {caption}
      <Lock className="ml-auto h-3 w-3 shrink-0" aria-hidden />
    </button>
  );
}

function lockedComponent(node: React.ReactElement, key: React.Key | null | undefined, ctx: LockContext) {
  const { tooltip, open } = ctx.forLabel(ctx.fallbackLabel);
  return (
    <div key={key} className="relative">
      <div inert className="opacity-50">
        {node}
      </div>
      <button
        type="button"
        aria-label={tooltip}
        title={tooltip}
        onClick={open}
        className="absolute inset-0 cursor-not-allowed rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
    </div>
  );
}

function lockNode(node: React.ReactNode, ctx: LockContext): React.ReactNode {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') return node;
  if (Array.isArray(node)) return React.Children.toArray(node).map((child) => lockNode(child, ctx));
  if (!React.isValidElement(node)) return node;

  const element = node as ElementWithProps;
  const { type } = element;

  if (type === React.Fragment) return <>{lockNode(element.props.children, ctx)}</>;
  if (typeof type !== 'string') return lockedComponent(element, element.key, ctx);
  if (type === 'button') return lockedButton(element, ctx);
  if (type === 'label' && hasFormField(element.props.children)) return lockedFieldReplica(element, ctx);
  if (FORM_FIELD_TAGS.has(type)) {
    return React.cloneElement(element as React.ReactElement<Record<string, unknown>>, { disabled: true });
  }
  if (element.props.children === undefined) return element;
  return React.cloneElement(element, undefined, lockNode(element.props.children, ctx));
}

/** Rend `node` désactivé : visible, grisé, cadenassé ; un clic ouvre la proposition de forfait. */
function lockedTool(node: React.ReactNode, ctx: LockContext): React.ReactNode {
  return lockNode(node, ctx);
}

/** Premier `aria-label` ou `title` trouvé dans l'arbre : nom des boutons qui n'ont qu'une icône. */
function accessibleNameOf(node: React.ReactNode): string {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement(child)) continue;
    const element = child as React.ReactElement<{ 'aria-label'?: string; title?: string; children?: React.ReactNode }>;
    const direct = element.props['aria-label'] ?? element.props.title;
    if (direct) return direct;
    const nested = accessibleNameOf(element.props.children);
    if (nested) return nested;
  }
  return '';
}

/** Nom lisible d'une fonction verrouillée, tiré du texte du contrôle ou, à défaut, de son libellé d'accessibilité. */
export function lockedLabelFor(node: React.ReactNode, fallback: string): string {
  const text = textOfNode(node).replace(/\s+/g, ' ').replace(/…$/, '').trim();
  if (text) return text;
  return accessibleNameOf(node) || fallback;
}

/** Remplace une section entière (thèmes, forme de la salle…) par une carte explicative. */
export function LockedSectionCard({
  title,
  description,
  planLabel,
  href = '/dashboard/billing',
  className,
}: {
  title: string;
  description: string;
  planLabel?: string | null;
  href?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'space-y-2 rounded-[var(--radius-card)] border border-dashed border-border bg-surface-muted/40 p-3',
        className,
      )}
      role="group"
      aria-label={`${title} : fonction réservée à un forfait supérieur`}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Lock className="h-3.5 w-3.5 text-muted" aria-hidden />
        {title}
        {planLabel ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{planLabel}</span>
        ) : null}
      </p>
      <p className="text-xs leading-relaxed text-muted">{description}</p>
      <Button href={href} size="sm" variant="secondary">
        Voir les forfaits
      </Button>
    </div>
  );
}

/** Boîte ouverte au clic sur une fonction verrouillée. */
export function EditorUpsellDialog({
  upsell,
  onClose,
  href = '/dashboard/billing',
}: {
  upsell: LockedUpsell | null;
  onClose: () => void;
  href?: string;
}) {
  return (
    <Modal
      open={Boolean(upsell)}
      onClose={onClose}
      title={upsell?.planLabel ? `Disponible avec le forfait ${upsell.planLabel}` : 'Fonction non incluse'}
      description={upsell?.message}
      size="sm"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Plus tard
          </Button>
          <Button href={href}>Voir les forfaits</Button>
        </div>
      }
    >
      <p className="text-sm text-muted">
        La fonction reste visible dans l’éditeur pour que vous sachiez ce que votre plan peut faire. Passez à un forfait
        supérieur pour l’activer.
      </p>
    </Modal>
  );
}

export type LockedUpsell = EditorUpsell & { label: string };

interface EditorGateState {
  level: RoomEditorLevel;
  readOnly: boolean;
  onUpsell: (upsell: LockedUpsell) => void;
}

const EditorGateContext = createContext<EditorGateState | null>(null);

export function EditorGateProvider({
  level,
  readOnly,
  onUpsell,
  children,
}: EditorGateState & { children: React.ReactNode }) {
  const value = useMemo(() => ({ level, readOnly, onUpsell }), [level, readOnly, onUpsell]);
  return <EditorGateContext.Provider value={value}>{children}</EditorGateContext.Provider>;
}

/**
 * Entoure une fonction de l'éditeur. Autorisée : affichée telle quelle. Hors forfait : affichée désactivée,
 * cadenassée, et un clic propose le forfait qui la débloque. En lecture seule, elle reste masquée.
 */
export function EditorGate({
  allowed,
  need,
  children,
}: {
  allowed: boolean;
  need: EditorNeed;
  children: React.ReactNode;
}) {
  const state = useContext(EditorGateContext);
  if (allowed) return <>{children}</>;
  if (!state || state.readOnly) return null;
  const ctx: LockContext = {
    fallbackLabel: defaultEditorNeedLabel(need),
    forLabel: (label) => {
      const info = describeEditorUpsell(label, need, state.level);
      const plan = info.planLabel;
      return {
        tooltip: plan ? `${label} — réservé au forfait ${plan}` : `${label} — non inclus dans votre forfait`,
        open: () => state.onUpsell({ ...info, label }),
      };
    },
  };
  return <>{lockedTool(children, ctx)}</>;
}
