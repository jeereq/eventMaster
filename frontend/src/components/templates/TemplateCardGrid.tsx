'use client';

import React from 'react';
import Link from 'next/link';
import { Copy, Edit3, Globe, MoreHorizontal, Trash2, Wand2 } from '@/components/icons';
import OverflowMenu, { type OverflowMenuItem } from '@/components/ui/OverflowMenu';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import { getTemplateElementSummary, templateContentToLandingPreview } from '@/lib/landingTemplateAdapter';
import { cn } from '@/lib/cn';
import { gridColsClass, listStackClass, type GridColumns, type ViewMode } from '@/components/ui/ViewModeToggle';
import { ProjectCard, StatusPill } from '@/components/ui/ProjectCard';

export interface TemplateCardItem {
  id: string;
  name: string;
  content?: {
    global?: { bgColor?: string };
    elements?: Array<{ type: string; text?: string; color?: string; fontSize?: string; align?: string }>;
  };
  createdAt: string;
  tenantId?: string | null;
  tenantName?: string | null;
  tenant?: { name: string } | null;
  showOnLanding?: boolean;
  isGlobal?: boolean;
  isOwned?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canDuplicate?: boolean;
}

interface TemplateCardGridProps {
  templates: TemplateCardItem[];
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  isSuperAdmin?: boolean;
  editHref?: (t: TemplateCardItem) => string;
  onEdit?: (t: TemplateCardItem) => void;
  onDelete?: (id: string, name: string) => void;
  onDuplicate?: (t: TemplateCardItem) => void;
  onToggleLanding?: (id: string, current: boolean) => void;
  onViewDetails?: (t: TemplateCardItem) => void;
  onUseInStudio?: (t: TemplateCardItem) => void;
  /** Sélection multiple (suppression groupée côté admin). */
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
  /** Défaut grille (aligné plateforme). */
  layout?: ViewMode;
  columns?: GridColumns;
  className?: string;
}

function isGlobalTemplate(t: TemplateCardItem): boolean {
  if (t.isGlobal !== undefined) return t.isGlobal;
  return !t.tenantId;
}

function canEditTemplate(t: TemplateCardItem, isSuperAdmin: boolean): boolean {
  if (t.canEdit !== undefined) return t.canEdit;
  return isSuperAdmin || Boolean(t.tenantId);
}

function canDuplicateTemplate(t: TemplateCardItem, isSuperAdmin: boolean): boolean {
  if (t.canDuplicate !== undefined) return t.canDuplicate;
  return isSuperAdmin || isGlobalTemplate(t) || Boolean(t.tenantId);
}

function canDeleteTemplate(t: TemplateCardItem, isSuperAdmin: boolean): boolean {
  if (t.canDelete !== undefined) return t.canDelete;
  return isSuperAdmin || Boolean(t.tenantId);
}

function TemplatePreviewThumb({
  t,
  onViewDetails,
  compact,
}: {
  t: TemplateCardItem;
  onViewDetails?: (t: TemplateCardItem) => void;
  compact?: boolean;
}) {
  const preview = (
    <>
      <div className={cn('relative z-10 w-full h-full', compact ? 'max-w-[160px]' : 'max-w-none', onViewDetails && 'pointer-events-none')}>
        <LandingInvitationPreview
          template={templateContentToLandingPreview({
            id: t.id,
            name: t.name,
            content: t.content,
          })}
          compact
          fillParent={!compact}
          className={cn('w-full shadow-sm', !compact && 'absolute inset-0 !rounded-none')}
        />
      </div>
    </>
  );

  const shellClass = cn(
    'relative bg-surface-muted overflow-hidden flex items-center justify-center',
    compact ? 'min-h-[120px] w-28 shrink-0 rounded-md p-2' : 'w-full aspect-[4/5] rounded-none bg-surface-muted p-2',
  );

  if (onViewDetails) {
    return (
      <button
        type="button"
        onClick={() => onViewDetails(t)}
        className={cn(
          shellClass,
          'text-left transition hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
        )}
      >
        {preview}
      </button>
    );
  }

  return <div className={shellClass}>{preview}</div>;
}

export default function TemplateCardGrid({
  templates,
  emptyMessage = 'Aucun modèle trouvé.',
  emptyAction,
  isSuperAdmin = false,
  editHref,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleLanding,
  onViewDetails,
  onUseInStudio,
  isSelected,
  onToggleSelect,
  layout = 'grid',
  columns = 3,
  className,
}: TemplateCardGridProps) {
  if (templates.length === 0) {
    return (
      <div className="col-span-full text-center py-16 bg-surface border border-border rounded-[var(--radius-card)]">
        <p className="text-sm text-muted font-medium">{emptyMessage}</p>
        {emptyAction && <div className="mt-6">{emptyAction}</div>}
      </div>
    );
  }

  const containerClass =
    layout === 'list' ? cn(listStackClass, className) : cn(gridColsClass(columns), className);

  return (
    <div className={containerClass}>
      {templates.map((t) => {
        const global = isGlobalTemplate(t);
        const editable = canEditTemplate(t, isSuperAdmin);
        const duplicatable = canDuplicateTemplate(t, isSuperAdmin);
        const deletable = canDeleteTemplate(t, isSuperAdmin);
        const orgLabel = t.tenantName || t.tenant?.name || 'Inconnu';
        const summary = getTemplateElementSummary(t.content);

        const badges = (
          <>
            {isSuperAdmin && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {global ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50">
                      <Globe className="w-3 h-3" />
                      Global (Public)
                    </span>
                    {t.showOnLanding && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        Landing
                      </span>
                    )}
                    {onToggleLanding && (
                      <button
                        type="button"
                        onClick={() => onToggleLanding(t.id, Boolean(t.showOnLanding))}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition',
                          t.showOnLanding
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                            : 'bg-surface-muted border-border text-muted hover:bg-surface',
                        )}
                      >
                        {t.showOnLanding ? 'Retirer de la landing' : 'Afficher sur la landing'}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-150 dark:border-amber-900/50">
                    Privé : {orgLabel}
                  </span>
                )}
              </div>
            )}
          </>
        );

        const menuItems: OverflowMenuItem[] = [];
        if (onUseInStudio) {
          menuItems.push({ id: 'studio', label: 'Studio', icon: Wand2, onSelect: () => onUseInStudio(t) });
        }
        if (duplicatable && onDuplicate && (!global || editable)) {
          menuItems.push({
            id: 'duplicate',
            label: global ? 'Dupliquer vers une organisation' : 'Dupliquer',
            icon: Copy,
            onSelect: () => onDuplicate(t),
          });
        }
        if (deletable && onDelete) {
          menuItems.push({ id: 'delete', label: 'Supprimer', icon: Trash2, danger: true, onSelect: () => onDelete(t.id, t.name) });
        }

        const actions = (
          <div
            className={cn(
              'flex gap-2',
              layout === 'grid' ? 'mt-auto pt-3 border-t border-border' : 'shrink-0',
            )}
          >
            {editable && (editHref ? (
              <Link
                href={editHref(t)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary/15 text-primary font-semibold rounded-[var(--radius-button)] text-xs transition"
              >
                <Edit3 className="w-4 h-4" />
                {layout === 'grid' ? 'Modifier' : ''}
              </Link>
            ) : onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(t)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary/15 text-primary font-semibold rounded-[var(--radius-button)] text-xs transition"
              >
                <Edit3 className="w-4 h-4" />
                {layout === 'grid' ? 'Modifier' : ''}
              </button>
            ) : null)}

            {duplicatable && onDuplicate && global && !editable && (
              <button
                type="button"
                onClick={() => onDuplicate(t)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary/15 text-primary font-semibold rounded-[var(--radius-button)] text-xs transition"
              >
                <Copy className="w-4 h-4" />
                {layout === 'grid' ? 'Utiliser ce modèle' : ''}
              </button>
            )}

            {menuItems.length > 0 && (
              <OverflowMenu
                align="right"
                triggerLabel={`Autres actions pour ${t.name}`}
                triggerClassName="min-h-11 min-w-11 inline-flex items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground hover:bg-surface-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                trigger={<MoreHorizontal className="w-5 h-5" aria-hidden />}
                items={menuItems}
              />
            )}
          </div>
        );

        if (layout === 'list') {
          return (
            <ProjectCard
              key={t.id}
              id={t.id}
              title={t.name}
              layout="list"
              icon={<Globe className="w-4 h-4" />}
              badge={
                global ? <StatusPill tone="sky">Global</StatusPill> : (
                  <StatusPill tone="slate">{orgLabel}</StatusPill>
                )
              }
              meta={
                <span>
                  {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' · '}
                  {summary}
                </span>
              }
              aside={t.showOnLanding ? <StatusPill tone="emerald">Landing</StatusPill> : undefined}
              onClick={onViewDetails ? () => onViewDetails(t) : undefined}
              actions={actions}
              selection={
                onToggleSelect
                  ? { checked: Boolean(isSelected?.(t.id)), onToggle: () => onToggleSelect(t.id), label: `Sélectionner ${t.name}` }
                  : undefined
              }
            />
          );
        }

        return (
          <article
            key={t.id}
            className={`relative ${isSelected?.(t.id) ? 'ring-2 ring-primary/40 !border-primary ' : ''}group flex flex-col bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-soft)] hover:border-primary/40 transition`}
          >
            {onToggleSelect ? (
              <label className="absolute top-1 right-1 z-20 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-white/90 dark:bg-surface/90 shadow-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(isSelected?.(t.id))}
                  onChange={() => onToggleSelect(t.id)}
                  aria-label={`Sélectionner ${t.name}`}
                  className="h-5 w-5 rounded border-border accent-primary cursor-pointer"
                />
              </label>
            ) : null}
            <TemplatePreviewThumb t={t} onViewDetails={onViewDetails} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3.5">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-tight text-foreground">{t.name}</h3>
                <p className="mt-1 truncate text-xs text-muted" title={summary}>
                  {new Date(t.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {summary ? ` · ${summary}` : ''}
                </p>
              </div>
              {badges}
              {actions}
            </div>
          </article>
        );
      })}
    </div>
  );
}
