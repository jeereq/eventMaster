'use client';

import React from 'react';
import Link from 'next/link';
import { Copy, Edit3, Eye, Globe, Trash2 } from 'lucide-react';
import TemplatePreviewThumb from '@/components/TemplatePreviewThumb';
import { getTemplateElementSummary } from '@/lib/landingTemplateAdapter';
import { cn } from '@/lib/cn';

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
}

function isGlobalTemplate(t: TemplateCardItem): boolean {
  if (t.isGlobal !== undefined) return t.isGlobal;
  return !t.tenantId;
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
}: TemplateCardGridProps) {
  if (templates.length === 0) {
    return (
      <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{emptyMessage}</p>
        {emptyAction && <div className="mt-6">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      {templates.map((t) => {
        const global = isGlobalTemplate(t);
        const orgLabel = t.tenantName || t.tenant?.name || 'Inconnu';
        const summary = getTemplateElementSummary(t.content);

        return (
          <article
            key={t.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col gap-4"
          >
            <div className="relative bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 min-h-[160px] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_16px] opacity-40" />
              <TemplatePreviewThumb
                content={t.content}
                name={t.name}
                variant="card"
                className="relative z-10"
              />
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">{t.name}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1" title={summary}>
                {summary}
              </p>

              {isSuperAdmin && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {global ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50">
                        <Globe className="w-3 h-3" />
                        Global (Public)
                      </span>
                      {t.showOnLanding && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
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
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100',
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
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {editHref ? (
                <Link
                  href={editHref(t)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl text-xs transition"
                >
                  <Edit3 className="w-4 h-4" />
                  Modifier
                </Link>
              ) : onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl text-xs transition"
                >
                  <Edit3 className="w-4 h-4" />
                  Modifier
                </button>
              ) : null}

              {onViewDetails && (
                <button
                  type="button"
                  onClick={() => onViewDetails(t)}
                  className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Voir les détails"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              {onDuplicate && (
                <button
                  type="button"
                  onClick={() => onDuplicate(t)}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
                  title="Dupliquer le modèle"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(t.id, t.name)}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                  title="Supprimer le modèle"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
