'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye } from 'lucide-react';
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
      className="em-reveal py-16 sm:py-20 bg-background/80 border-t border-border scroll-mt-16 em-landing-section-glow-alt"
    >
      <div className="page-container relative z-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-xl space-y-2.5">
            <h2 className="em-landing-heading text-2xl sm:text-3xl text-foreground">
              Modèles d’invitation prêts à l’emploi
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Choisissez un design élégant, personnalisez les détails et partagez le lien d’invitation WhatsApp en 1 clic.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button href="/modeles#generateur-ia" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Créer avec l’IA
            </Button>
            <Button href="/register?kind=ORGANIZER&intent=personal&action=template" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Créer mon invitation
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-2 sm:pb-0 no-scrollbar snap-x snap-mandatory">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[16rem] sm:min-w-0 h-64 rounded-[var(--radius-card)] shrink-0 snap-start" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center em-hud-card rounded-[var(--radius-card)]">
            <p className="text-sm text-muted">
              Les modèles publiés apparaîtront ici. Vous pourrez aussi créer votre propre modèle sur-mesure.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-3 sm:pb-0 no-scrollbar snap-x snap-mandatory em-stagger">
              {shown.map((template) => (
                <li key={template.id} className="min-w-[16.5rem] sm:min-w-0 shrink-0 snap-start flex-1">
                  <article className="h-full rounded-[var(--radius-card)] em-hud-card p-3 sm:p-3.5 flex flex-col justify-between transition-all group">
                    <div>
                      <Link
                        href={`/register?kind=ORGANIZER&intent=personal&action=template&templateId=${encodeURIComponent(template.id)}`}
                        className="block w-full text-left rounded-[var(--radius-button)] overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary relative group/preview cursor-pointer"
                        title={`Choisir le modèle ${template.name}`}
                      >
                        <LandingInvitationPreview template={template} compact className="!max-h-[190px] sm:!max-h-[200px]" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                          <ArrowRight className="w-4 h-4" />
                          <span>Choisir ce modèle</span>
                        </div>
                      </Link>

                      <div className="mt-2.5 sm:mt-3 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-0.5 rounded-full bg-surface-muted border border-border">
                            {categoryLabel(template.category)}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                          {template.name}
                        </h3>
                        {template.description ? (
                          <p className="text-[11px] sm:text-xs text-muted leading-relaxed line-clamp-2">
                            {template.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-border/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onPreview(template)}
                        className="text-xs font-semibold text-muted hover:text-foreground transition flex items-center gap-1 touch-manipulation cursor-pointer py-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Aperçu
                      </button>
                      <Link
                        href={`/register?kind=ORGANIZER&intent=personal&action=template&templateId=${encodeURIComponent(template.id)}`}
                        className="py-1 px-2.5 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1 touch-manipulation"
                      >
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
