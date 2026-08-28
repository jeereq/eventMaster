'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, Pagination, paginateItems, Skeleton, usePageSize } from '@/components/ui';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import type { LandingTemplate } from '@/config/landingTemplates';
import { useLandingReveal } from '@/components/landing/useLandingReveal';

function categoryLabel(category: string) {
  if (category === 'private') return 'Célébrations';
  if (category === 'corporate') return 'Professionnel';
  return 'Soirées';
}

export default function LandingModelsSection({
  templates,
  loading,
  onPreview,
}: {
  templates: LandingTemplate[];
  loading: boolean;
  onPreview: (template: LandingTemplate) => void;
}) {
  const revealRef = useLandingReveal<HTMLElement>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('landing-models', 8);
  const shown = paginateItems(templates, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [templates, pageSize]);

  return (
    <section
      ref={revealRef}
      id="modeles"
      className="em-reveal py-16 sm:py-20 bg-background border-t border-border scroll-mt-16"
    >
      <div className="page-container space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Modèles d’invitation</p>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Modèles d’invitation prêts à l’emploi
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Choisissez un design élégant, personnalisez les détails et partagez le lien d’invitation en 1 clic.
            </p>
          </div>
          <Link href="/register">
            <Button rightIcon={<ArrowRight className="w-4 h-4" />}>Utiliser un modèle</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted">
            Les modèles publiés apparaîtront ici. Vous pourrez aussi en créer après inscription.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 em-stagger">
              {shown.map((template) => (
                <li key={template.id}>
                  <article className="h-full rounded-[var(--radius-card)] border border-border bg-surface p-3.5 flex flex-col shadow-[var(--shadow-soft)] em-soft-hover">
                    <button
                      type="button"
                      onClick={() => onPreview(template)}
                      className="w-full text-left rounded-[var(--radius-button)] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                    >
                      <LandingInvitationPreview template={template} compact className="!max-h-[200px]" />
                    </button>
                    <div className="mt-3 space-y-1.5 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {categoryLabel(template.category)}
                      </p>
                      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-1">{template.name}</h3>
                      {template.description ? (
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">{template.description}</p>
                      ) : null}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onPreview(template)}
                        className="text-xs font-medium text-foreground hover:underline"
                      >
                        Aperçu
                      </button>
                      <Link href="/register" className="text-xs font-medium text-foreground hover:underline inline-flex items-center gap-1">
                        Utiliser <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={templates.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="modèles"
            />
          </>
        )}
      </div>
    </section>
  );
}
