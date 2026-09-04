'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import type { LandingTemplate } from '@/config/landingTemplates';
import { fetchPublicLandingTemplates } from '@/lib/landingTemplateAdapter';
import { Button, Modal, Pagination, paginateItems, Skeleton, usePageSize } from '@/components/ui';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Sparkles, Eye, ArrowRight, Search, X, CheckCircle2, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import LandingInvitationAiGenerator from '@/components/landing/LandingInvitationAiGenerator';

function categoryLabel(category: string) {
  if (category === 'private') return 'Célébrations & Mariages';
  if (category === 'corporate') return 'Professionnel & Conférences';
  return 'Soirées & Fêtes';
}

const CATEGORIES = [
  { id: 'all', label: 'Tous les modèles' },
  { id: 'private', label: 'Célébrations & Mariages' },
  { id: 'corporate', label: 'Professionnel & Conférences' },
  { id: 'party', label: 'Soirées & Galas' },
];

export default function ModelesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<LandingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalTemplate, setModalTemplate] = useState<LandingTemplate | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('modeles-page', 12);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const fromDb = await fetchPublicLandingTemplates();
        setTemplates(fromDb);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    void loadTemplates();
  }, []);

  const filtered = useMemo(() => {
    return templates.filter((tpl) => {
      const matchCat = selectedCategory === 'all' || tpl.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchQuery =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        (tpl.description && tpl.description.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [templates, selectedCategory, search]);

  const shown = paginateItems(filtered, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, search, pageSize]);

  return (
    <PublicPageShell
      faqHref="/faq"
      mobileFooterPad
    >
      <PublicPageHero
        title="Modèles d'invitations prêts à l'emploi"
        description="Mariages, anniversaires, réceptions d'entreprise ou galas. Choisissez un design élégant, personnalisez vos informations — ou créez le vôtre avec l’IA."
        compact
      >
        <div className="pt-1 flex flex-wrap items-center gap-2.5">
          <a
            href="#generateur-ia"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover active:scale-95 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Créer avec l’IA</span>
          </a>
          <Link
            href={user ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=personal&action=template'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{user ? 'Créer un événement' : 'Créer mon invitation'}</span>
          </Link>
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span>Voir les forfaits & tarifs</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </PublicPageHero>

      <div className="page-container py-8 sm:py-12 space-y-8 max-w-7xl mx-auto">
        <LandingInvitationAiGenerator />
        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/70">
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-surface border-border text-muted hover:text-foreground hover:bg-surface-muted',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px] sm:min-w-[280px]">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un modèle…"
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-surface text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              aria-label="Rechercher parmi les modèles"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5 rounded"
                aria-label="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grille de modèles */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface/50 space-y-3 max-w-md mx-auto">
            <Sparkles className="w-8 h-8 text-muted mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Aucun modèle trouvé</h3>
            <p className="text-xs text-muted leading-relaxed">
              {search
                ? 'Aucun modèle ne correspond à vos critères de recherche. Essayez d’autres termes.'
                : 'De nouveaux modèles seront ajoutés très prochainement.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-muted transition"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {shown.map((template) => (
                <article
                  key={template.id}
                  className="group rounded-xl sm:rounded-2xl border border-border/80 bg-surface shadow-xs hover:shadow-lg hover:border-primary/40 transition-all duration-300 p-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setModalTemplate(template)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setModalTemplate(template);
                        }
                      }}
                      className="block w-full text-left rounded-lg overflow-hidden relative group/preview cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      title={`Aperçu du modèle ${template.name}`}
                    >
                      <LandingInvitationPreview template={template} compact className="!max-h-[200px]" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-2xs">
                        <Eye className="w-4 h-4" />
                        <span>Aperçu interactif</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-0.5 rounded-full bg-surface-muted border border-border">
                          {categoryLabel(template.category)}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      {template.description ? (
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">
                          {template.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setModalTemplate(template)}
                      className="text-xs font-semibold text-muted hover:text-foreground transition flex items-center gap-1 touch-manipulation py-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Aperçu
                    </button>
                    <Link
                      href={
                        user
                          ? `/dashboard/events`
                          : `/register?kind=ORGANIZER&intent=personal&action=template&templateId=${encodeURIComponent(template.id)}`
                      }
                      className="py-1 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover active:scale-95 transition inline-flex items-center gap-1 touch-manipulation shadow-2xs"
                    >
                      <span>Utiliser</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="modèles"
            />
          </>
        )}

        {/* Section explicative bénéfices */}
        <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-surface/80 p-6 sm:p-8 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            Pourquoi choisir les invitations digitales EventMaster ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Partage WhatsApp en 1 clic
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Envoyez un lien personnalisé et élégant sans gaspillage de papier ni frais d'impression.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Suivi RSVP en temps réel
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Vos invités confirment leur présence, leurs régimes et accompagnateurs instantanément.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Scan QR le jour J
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Chaque invité reçoit un pass QR personnel pour un accueil fluide et sécurisé à l'entrée.
              </p>
            </div>
          </div>
        </div>

        {/* CTA final */}
        <PublicCtaBand
          title="Prêt à créer votre propre modèle d'invitation ?"
          description="Inscrivez-vous gratuitement et personnalisez vos faire-part en quelques minutes."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register?kind=ORGANIZER&intent=personal&action=template">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Commencer maintenant
                </Button>
              </Link>
              <Link href="/tarifs">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-sm font-semibold"
                >
                  Voir les forfaits
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      {/* Modale d'aperçu de modèle d'invitation */}
      <Modal
        open={Boolean(modalTemplate)}
        onClose={() => setModalTemplate(null)}
        title={modalTemplate?.name}
        description={modalTemplate?.description}
        size="md"
        footer={
          <div className="flex w-full gap-2 justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalTemplate(null)}>
              Fermer
            </Button>
            <Link
              href={
                modalTemplate
                  ? `/register?kind=ORGANIZER&intent=personal&action=template&templateId=${encodeURIComponent(modalTemplate.id)}`
                  : '/register?kind=ORGANIZER&intent=personal&action=template'
              }
            >
              <Button size="sm">Utiliser ce modèle</Button>
            </Link>
          </div>
        }
      >
        {modalTemplate && (
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {categoryLabel(modalTemplate.category)}
            </span>
            <LandingInvitationPreview template={modalTemplate} className="max-h-[min(420px,60vh)] overflow-hidden" />
          </div>
        )}
      </Modal>
    </PublicPageShell>
  );
}
