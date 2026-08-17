'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Input, Pagination, paginateItems, Skeleton, SkeletonLandingTemplateGrid } from '@/components/ui';
import { cn } from '@/lib/cn';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  filterCatalogueItems,
  serviceToCatalogueItem,
  venueToCatalogueItem,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';
import {
  buildLandingTemplateGroups,
  type LandingTemplate,
} from '@/config/landingTemplates';
import { ArrowRight, Building2, Search, Sparkles, FileText } from 'lucide-react';

type VitrineTab = 'venues' | 'services' | 'templates';

const PAGE_SIZE = 8;

function getCategoryLabel(category: string) {
  if (category === 'private') return 'Privé';
  if (category === 'corporate') return 'Professionnel';
  return 'Cocktail';
}

export default function LandingVitrineSection({
  publicTemplates,
  loadingTemplates,
  isSuperAdmin,
  onPreviewTemplate,
}: {
  publicTemplates: LandingTemplate[];
  loadingTemplates: boolean;
  isSuperAdmin: boolean;
  onPreviewTemplate: (template: LandingTemplate) => void;
}) {
  const [tab, setTab] = useState<VitrineTab>('venues');
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [venueQuery, setVenueQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [templateCategory, setTemplateCategory] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const [venuesData, servicesData] = await Promise.all([
          api.get('/public/venues').catch(() => ({ venues: [] })),
          api.get('/public/services').catch(() => ({ services: [] })),
        ]);
        setVenues(venuesData.venues || []);
        setServices(servicesData.services || []);
      } finally {
        setLoadingCatalog(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'modeles') setTab('templates');
      if (hash === 'salles' || hash === 'catalogue' || hash === 'marketplace') setTab('venues');
      if (hash === 'prestataires') setTab('services');
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, venueQuery, serviceQuery, serviceCategory, templateCategory]);

  const venueItems = useMemo(
    () => filterCatalogueItems(venues.map(venueToCatalogueItem), venueQuery),
    [venues, venueQuery],
  );
  const serviceItems = useMemo(() => {
    const mapped = services
      .filter((s) => !serviceCategory || s.category === serviceCategory)
      .map(serviceToCatalogueItem);
    return filterCatalogueItems(mapped, serviceQuery);
  }, [services, serviceQuery, serviceCategory]);

  const templateList = useMemo(
    () => buildLandingTemplateGroups(publicTemplates, templateCategory)[0]?.templates || [],
    [publicTemplates, templateCategory],
  );

  const tabs: Array<{ id: VitrineTab; label: string; icon: typeof Building2; hash: string }> = [
    { id: 'venues', label: 'Salles', icon: Building2, hash: 'salles' },
    { id: 'services', label: 'Prestataires', icon: Sparkles, hash: 'prestataires' },
    { id: 'templates', label: 'Modèles', icon: FileText, hash: 'modeles' },
  ];

  const selectTab = (next: VitrineTab, hash: string) => {
    setTab(next);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/#${hash}`);
    }
  };

  const pagedVenues = paginateItems(venueItems, page, PAGE_SIZE);
  const pagedServices = paginateItems(serviceItems, page, PAGE_SIZE);
  const pagedTemplates = paginateItems(templateList, page, PAGE_SIZE);

  return (
    <section id="catalogue" className="py-14 sm:py-16 border-t border-border bg-surface scroll-mt-16">
      <div className="page-container space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <p className="em-festive-chip w-fit">Vitrine</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Salles, prestataires et modèles
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Parcourez le marketplace EventMaster et les modèles d’invitation publiés
              par la plateforme.
            </p>
          </div>
          <Link href="/marketplace">
            <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
              Tout le marketplace
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tabs.map(({ id, label, icon: Icon, hash }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id, hash)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition',
                tab === id
                  ? 'bg-foreground text-background'
                  : 'bg-background text-muted hover:text-foreground border border-border',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'venues' && (
          <div id="salles" className="space-y-4 scroll-mt-20">
            <Input
              value={venueQuery}
              onChange={(e) => setVenueQuery(e.target.value)}
              placeholder="Filtrer une salle (nom, ville, organisation)…"
              leftIcon={<Search className="w-4 h-4" />}
            />
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={PAGE_SIZE} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedVenues}
                  mode="grid"
                  emptyTitle="Aucune salle publiée"
                  emptyDescription="Les salles enregistrées sur EventMaster apparaîtront ici."
                />
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={venueItems.length}
                  onPageChange={setPage}
                  itemLabel="salles"
                />
              </>
            )}
          </div>
        )}

        {tab === 'services' && (
          <div id="prestataires" className="space-y-4 scroll-mt-20">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <Input
                  value={serviceQuery}
                  onChange={(e) => setServiceQuery(e.target.value)}
                  placeholder="Filtrer un prestataire…"
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full sm:w-56 px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-background text-sm"
              >
                <option value="">Toutes les catégories</option>
                {SERVICE_CATEGORIES.map((id) => (
                  <option key={id} value={id}>{SERVICE_CATEGORY_LABELS[id]}</option>
                ))}
              </select>
            </div>
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={PAGE_SIZE} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedServices}
                  mode="grid"
                  emptyTitle="Aucun prestataire publié"
                  emptyDescription="Les prestataires enregistrés sur EventMaster apparaîtront ici."
                />
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={serviceItems.length}
                  onPageChange={setPage}
                  itemLabel="prestataires"
                />
              </>
            )}
          </div>
        )}

        {tab === 'templates' && (
          <div id="modeles" className="space-y-4 scroll-mt-20">
            <div className="text-sm text-muted leading-relaxed">
              {loadingTemplates ? (
                <Skeleton className="h-4 w-72 max-w-full" />
              ) : publicTemplates.length === 0
                ? 'Aucun modèle publié. Le Super Admin crée un modèle global et active « Afficher sur la landing ».'
                : `${publicTemplates.length} modèle${publicTemplates.length > 1 ? 's' : ''} publié${publicTemplates.length > 1 ? 's' : ''} — personnalisables après inscription.`}
            </div>
            {isSuperAdmin && (
              <Link href="/dashboard?tab=templates" className="inline-flex text-xs font-medium text-foreground underline underline-offset-2 hover:no-underline">
                Gérer la vitrine (Super Admin)
              </Link>
            )}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', name: 'Tous' },
                { id: 'private', name: 'Privé' },
                { id: 'corporate', name: 'Professionnel' },
                { id: 'casual', name: 'Cocktail' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTemplateCategory(c.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition',
                    templateCategory === c.id
                      ? 'bg-foreground text-background'
                      : 'bg-background text-muted hover:text-foreground border border-border',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {loadingTemplates ? (
              <SkeletonLandingTemplateGrid count={PAGE_SIZE} />
            ) : publicTemplates.length === 0 ? (
              <div className="py-12 px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-background text-center max-w-lg">
                <p className="text-sm text-muted leading-relaxed">
                  Créez un modèle global dans le concepteur, puis activez « Afficher sur la landing page ».
                </p>
              </div>
            ) : templateList.length === 0 ? (
              <p className="text-sm text-muted py-8">Aucun modèle dans cette catégorie.</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pagedTemplates.map((t) => (
                    <article
                      key={t.id}
                      className="bg-background border border-border rounded-[var(--radius-card)] p-3.5 flex flex-col em-soft-hover"
                    >
                      <button
                        type="button"
                        onClick={() => onPreviewTemplate(t)}
                        className="w-full text-left rounded-[var(--radius-button)] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 overflow-hidden"
                      >
                        <LandingInvitationPreview template={t} compact className="!max-h-[200px]" />
                      </button>
                      <div className="mt-3 space-y-2 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            {getCategoryLabel(t.category)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onPreviewTemplate(t)}
                            className="text-xs font-medium text-foreground hover:underline inline-flex items-center gap-1"
                          >
                            Aperçu <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-1">{t.name}</h3>
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">{t.description}</p>
                      </div>
                      <div className="border-t border-border pt-3 mt-4">
                        <Link href="/register" className="text-xs font-medium text-foreground hover:underline">
                          Créer mon organisation →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={templateList.length}
                  onPageChange={setPage}
                  itemLabel="modèles"
                />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
