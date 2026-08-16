'use client';

import React from 'react';
import Link from 'next/link';
import { Copy, Edit3, Eye, Globe, Trash2 } from 'lucide-react';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import { getTemplateElementSummary, templateContentToLandingPreview } from '@/lib/landingTemplateAdapter';
import { cn } from '@/lib/cn';
import { gridColsClass, listStackClass, type GridColumns, type ViewMode } from '@/components/ui/ViewModeToggle';
import { ProjectCard, ListRowAction, StatusPill } from '@/components/ui/ProjectCard';

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
      <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:12px_16px] opacity-40 pointer-events-none" />
      <div className={cn('relative z-10 w-full', compact ? 'max-w-[160px]' : 'max-w-[240px]', onViewDetails && 'pointer-events-none')}>
        <LandingInvitationPreview
          template={templateContentToLandingPreview({
            id: t.id,
            name: t.name,
            content: t.content,
          })}
          compact
          className="w-full shadow-sm"
        />
      </div>
    </>
  );

  const shellClass = cn(
    'relative bg-surface-muted border border-border-subtle rounded-2xl p-3 flex items-center justify-center overflow-hidden',
    compact ? 'min-h-[120px] w-28 shrink-0' : 'w-full min-h-[200px]',
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
            {global && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
                <Globe className="w-3 h-3" />
                Bibliothèque EventMaster
              </span>
            )}
            {isSuperAdmin && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {global ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50">
                      <Globe className="w-3 h-3" />
                      Global (Public)
                    </span>
                    {t.showOnLanding && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        Landing
                      </span>
                    )}
                    {onToggleLanding && (
                      <button
                        type="button"
                        onClick={() => onToggleLanding(t.id, Boolean(t.showOnLanding))}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition',
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-150 dark:border-amber-900/50">
                    Privé : {orgLabel}
                  </span>
                )}
              </div>
            )}
          </>
        );

        const actions = (
          <div
            className={cn(
              'flex gap-2',
              layout === 'grid' ? 'pt-3 border-t border-border' : 'shrink-0',
            )}
          >
            {editable && (editHref ? (
              <Link
                href={editHref(t)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary/15 text-primary font-bold rounded-xl text-xs transition"
              >
                <Edit3 className="w-4 h-4" />
                {layout === 'grid' ? 'Modifier' : ''}
              </Link>
            ) : onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(t)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary/15 text-primary font-bold rounded-xl text-xs transition"
              >
                <Edit3 className="w-4 h-4" />
                {layout === 'grid' ? 'Modifier' : ''}
              </button>
            ) : null)}

            {duplicatable && onDuplicate && global && !editable && (
              <button
                type="button"
                onClick={() => onDuplicate(t)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition"
              >
                <Copy className="w-4 h-4" />
                {layout === 'grid' ? 'Utiliser ce modèle' : ''}
              </button>
            )}

            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(t)}
                className={cn(
                  layout === 'list'
                    ? 'inline-flex items-center'
                    : 'p-2.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-xl transition',
                )}
                title="Voir les détails"
              >
                {layout === 'list' ? <ListRowAction /> : <Eye className="w-4 h-4" />}
              </button>
            )}

            {duplicatable && onDuplicate && (!global || editable) && (
              <button
                type="button"
                onClick={() => onDuplicate(t)}
                className="p-2.5 text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition"
                title={global ? 'Dupliquer vers une organisation' : 'Dupliquer le modèle'}
              >
                <Copy className="w-4 h-4" />
              </button>
            )}

            {deletable && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(t.id, t.name)}
                className="p-2.5 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                title="Supprimer le modèle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
              status={
                <div className="flex flex-wrap items-center gap-1.5">
                  {global ? <StatusPill tone="sky">Global</StatusPill> : null}
                  {t.showOnLanding ? <StatusPill tone="emerald">Landing</StatusPill> : null}
                  {!global && (t.tenantName || t.tenant?.name) ? (
                    <StatusPill tone="slate">{t.tenantName || t.tenant?.name}</StatusPill>
                  ) : null}
                </div>
              }
              onClick={onViewDetails ? () => onViewDetails(t) : undefined}
              actions={actions}
            />
          );
        }

        return (
          <article
            key={t.id}
            className="bg-surface border border-border rounded-[var(--radius-card)] p-5 shadow-sm hover:shadow-md transition flex flex-col gap-4"
          >
            <TemplatePreviewThumb t={t} onViewDetails={onViewDetails} />
            <div className="space-y-2 min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground tracking-tight line-clamp-1">{t.name}</h3>
              <p className="text-xs text-muted">
                Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-[11px] text-muted line-clamp-1" title={summary}>
                {summary}
              </p>
              {badges}
            </div>
            {actions}
          </article>
        );
      })}
    </div>
  );
}
