'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import type { LandingTemplate } from '@/config/landingTemplates';
import { fetchPublicLandingTemplates } from '@/lib/landingTemplateAdapter';
import { Button, Modal, Pagination, usePaginateItems, Skeleton, usePageSize } from '@/components/ui';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Sparkles, Eye, ArrowRight, Search, X, CheckCircle2, Wand2, Mail, ScanLine, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';
import LandingInvitationAiGenerator from '@/components/landing/LandingInvitationAiGenerator';
import {
  invitationModelPhotoFromContent,
  type InvitationModelPhoto,
} from '@/lib/invitationModelPhoto';

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
  const { user, access } = useAuth();
  const { site } = usePlatformSite();
  const isInviteBlocked = site?.studioVisibility?.invite === false;
  const protocolLocked = Boolean(access?.isProtocolOnly);
  const [templates, setTemplates] = useState<LandingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalTemplate, setModalTemplate] = useState<LandingTemplate | null>(null);
  const [studioModelPhoto, setStudioModelPhoto] = useState<InvitationModelPhoto | null>(null);

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

  const shown = usePaginateItems(filtered, page, pageSize);

  const modelPhotoFor = (template: LandingTemplate): InvitationModelPhoto | null =>
    invitationModelPhotoFromContent(template.id, template.name, template.previewContent);

  const useTemplateInStudio = (template: LandingTemplate) => {
    const photo = modelPhotoFor(template);
    if (!photo) return;
    setModalTemplate(null);
    setStudioModelPhoto(photo);
    if (typeof window !== 'undefined') {
      window.location.hash = 'generateur-ia';
      document.getElementById('generateur-ia')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
        description={
          isInviteBlocked
            ? "Designs élégants pour vos réceptions. Le studio de création sur mesure par IA arrive prochainement."
            : "Designs élégants pour vos réceptions, ou création sur mesure avec l'IA."
        }
        compact
      >
        <div className="pt-1 flex flex-wrap items-center gap-2.5">
          <a
            href="#generateur-ia"
            onClick={() => {
              if (typeof window !== 'undefined' && window.location.hash === '#generateur-ia') {
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }
            }}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold active:scale-95 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isInviteBlocked
                ? 'bg-festive-accent/15 text-festive-accent border border-festive-accent/30 hover:bg-festive-accent/25'
                : 'bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover',
            )}
          >
            {isInviteBlocked ? <Clock className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />}
            <span>{isInviteBlocked ? 'Studio IA (À venir)' : 'Studio IA'}</span>
          </a>
          <Link
            href={user ? '/dashboard/events' : '/register?kind=ORGANIZER&intent=personal&action=template'}
            className="inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{user ? 'Créer un événement' : 'Créer mon invitation'}</span>
          </Link>
          <Link
            href="/tarifs"
            className="inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span>Voir les forfaits & tarifs</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </PublicPageHero>

      <div className="page-container py-8 sm:py-12 space-y-8 max-w-7xl mx-auto">
        <LandingInvitationAiGenerator
          preselectedModelPhoto={studioModelPhoto}
          defaultExpanded={Boolean(studioModelPhoto)}
        />
        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/70">
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={selectedCategory === cat.id}
                className={cn(
                  'px-3.5 min-h-[44px] inline-flex items-center justify-center rounded-full text-xs font-semibold transition whitespace-nowrap shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer touch-manipulation',
                  selectedCategory === cat.id
                    ? 'bg-primary-solid text-primary-foreground border-primary shadow-xs'
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
              className="w-full pl-9 pr-10 py-2.5 min-h-[44px] rounded-xl border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              aria-label="Rechercher parmi les modèles"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted hover:text-foreground min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
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
              <Skeleton key={i} className="min-h-[32rem] sm:min-h-[38rem] lg:min-h-[42rem] rounded-xl" />
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
                className="min-h-[44px] px-3 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-muted transition"
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
                  className="group rounded-xl sm:rounded-2xl border border-border/80 bg-surface shadow-xs hover:shadow-lg hover:border-primary/40 transition-all duration-300 p-2 flex flex-col min-h-[32rem] sm:min-h-[38rem] lg:min-h-[42rem]"
                >
                    <button
                      type="button"
                      onClick={() => setModalTemplate(template)}
                      className="relative flex-[9] min-h-0 w-full text-left rounded-lg overflow-hidden group/preview focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      aria-label={`Aperçu du modèle ${template.name}`}
                    >
                      <LandingInvitationPreview
                        template={template}
                        compact
                        fillParent
                        className="absolute inset-0 !rounded-none !shadow-none"
                      />
                      <span className="absolute top-2 left-2 z-10 text-xs font-bold uppercase tracking-wider text-foreground px-2 py-0.5 rounded-full bg-surface/90 border border-border">
                        {categoryLabel(template.category)}
                      </span>
                      <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center text-primary-foreground text-xs font-semibold gap-1.5">
                        <Eye className="w-4 h-4" aria-hidden />
                        <span>Aperçu interactif</span>
                      </div>
                    </button>

                  <div className="flex-[1] min-h-[3.5rem] flex items-center justify-between gap-2 px-1 pt-2">
                    <h3 className="min-w-0 text-sm font-bold text-foreground leading-snug truncate group-hover:text-primary transition-colors">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isInviteBlocked && modelPhotoFor(template) ? (
                        <button
                          type="button"
                          onClick={() => useTemplateInStudio(template)}
                          className="min-h-[44px] py-1 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 active:scale-95 transition inline-flex items-center gap-1 touch-manipulation"
                        >
                          <Wand2 className="w-3 h-3" aria-hidden />
                          <span>Studio</span>
                        </button>
                      ) : null}
                      <Link
                        href={
                          user
                            ? `/dashboard/events`
                            : `/register?kind=ORGANIZER&intent=personal&action=template&templateId=${encodeURIComponent(template.id)}`
                        }
                        className="min-h-[44px] py-1 px-3 rounded-lg bg-primary-solid text-primary-foreground text-xs font-semibold hover:bg-primary-solid-hover active:scale-95 transition inline-flex items-center gap-1 touch-manipulation shadow-2xs"
                      >
                        <span>Utiliser</span>
                        <ArrowRight className="w-3 h-3" aria-hidden />
                      </Link>
                    </div>
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
                <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden />
                Partage WhatsApp en 1 clic
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Envoyez un lien personnalisé et élégant sans gaspillage de papier ni frais d'impression.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden />
                Suivi des réponses en temps réel
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Vos invités confirment leur présence, leurs régimes et accompagnateurs instantanément.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden />
                Scan QR le jour J
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Chaque invité reçoit un pass QR personnel pour un accueil fluide et sécurisé à l'entrée.
              </p>
            </div>
          </div>
        </div>

      </div>

      <PublicCtaBand
        title="Prêt à créer votre propre modèle d'invitation ?"
        description="Personnalisez vos faire-part et suivez vos réponses à l’invitation en temps réel."
        highlights={[
          { icon: Wand2, label: 'Studio IA' },
          { icon: Mail, label: 'WhatsApp' },
          { icon: Sparkles, label: 'Réponses en direct' },
          { icon: ScanLine, label: 'Pass QR' },
        ]}
        primaryHref={
          protocolLocked
            ? '/dashboard/protocol'
            : user
              ? '/dashboard/templates?aiDraft=1'
              : '/register?kind=ORGANIZER&intent=personal&action=template'
        }
        primaryLabel={protocolLocked ? 'Retour au desk protocole' : 'Commencer maintenant'}
        secondaryHref="/tarifs"
        secondaryLabel="Voir les forfaits"
      />

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
            {protocolLocked ? null : (
              <>
                {!isInviteBlocked && modalTemplate && modelPhotoFor(modalTemplate) ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => useTemplateInStudio(modalTemplate)}>
                    Préselectionner dans le studio
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  href={
                    user
                      ? '/dashboard/templates'
                      : modalTemplate
                        ? `/register?kind=ORGANIZER&intent=personal&action=template&templateId=${encodeURIComponent(modalTemplate.id)}`
                        : '/register?kind=ORGANIZER&intent=personal&action=template'
                  }
                >
                  Utiliser ce modèle
                </Button>
              </>
            )}
          </div>
        }
      >
        {modalTemplate && (
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {categoryLabel(modalTemplate.category)}
            </span>
            <LandingInvitationPreview template={modalTemplate} className="max-h-[min(420px,60vh)] overflow-hidden" />
          </div>
        )}
      </Modal>
    </PublicPageShell>
  );
}
