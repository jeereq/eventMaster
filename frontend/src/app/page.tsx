'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  buildLandingTemplateGroups,
  type LandingTemplate,
} from '@/config/landingTemplates';
import { fetchPublicLandingTemplates } from '@/lib/landingTemplateAdapter';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import LandingRolesSection from '@/components/landing/LandingRolesSection';
import LandingWorkflowSection from '@/components/landing/LandingWorkflowSection';
import LandingMobileSection from '@/components/landing/LandingMobileSection';
import FaqSection from '@/components/landing/FaqSection';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import TemplatePreviewThumb from '@/components/TemplatePreviewThumb';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  ArrowRight, Loader2,
} from 'lucide-react';
import CelebrateMood from '@/components/CelebrateMood';

function getCategoryLabel(category: string) {
  if (category === 'private') return 'Privé';
  if (category === 'corporate') return 'Professionnel';
  return 'Cocktail';
}

export default function Home() {
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<string>('');
  const [modalTemplate, setModalTemplate] = useState<LandingTemplate | null>(null);
  const [dbPlans, setDbPlans] = useState<any>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [publicTemplates, setPublicTemplates] = useState<LandingTemplate[]>([]);
  const [loadingPublicTemplates, setLoadingPublicTemplates] = useState(true);

  useEffect(() => {
    async function checkServerAndFetchPlans() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/health`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const plansData = await api.get('/public/plans').catch(() => null);
          if (plansData) setDbPlans(plansData);
        }
      } catch {
        /* offline — tarifs fallback */
      } finally {
        setLoadingPlans(false);
      }
    }

    async function loadPublicTemplates() {
      const fromDb = await fetchPublicLandingTemplates();
      setPublicTemplates(fromDb);
      setLoadingPublicTemplates(false);
    }

    checkServerAndFetchPlans();
    loadPublicTemplates();
  }, []);

  useEffect(() => {
    if (publicTemplates.length > 0 && !publicTemplates.some((t) => t.id === previewTemplate)) {
      setPreviewTemplate(publicTemplates[0].id);
    }
  }, [publicTemplates, previewTemplate]);

  const categories = [
    { id: 'all', name: 'Tous' },
    { id: 'private', name: 'Privé' },
    { id: 'corporate', name: 'Professionnel' },
    { id: 'casual', name: 'Cocktail' },
  ];

  const filteredTemplateGroups = buildLandingTemplateGroups(publicTemplates, selectedCategory);
  const activePreview = publicTemplates.find((t) => t.id === previewTemplate) || publicTemplates[0];
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-200">
      <CelebrateMood />
      <SiteHeader variant="landing" showServerStatus />

      {/* Hero — marque + message + CTA + aperçu modèle borné */}
      <section className="relative overflow-hidden border-b border-border em-celebrate-hero">
        <div className="page-container relative py-12 sm:py-14 lg:py-16">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
            <div className="space-y-6 animate-slide-up">
              <span className="em-festive-chip">Invitations · RSVP · Jour J</span>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold tracking-tight text-foreground">
                {site.platformName}
              </p>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground/90 tracking-tight leading-snug max-w-lg">
                {site.platformTagline}
              </h1>
              <p className="text-sm text-muted leading-relaxed max-w-md">
                Plans 2D, invitations, RSVP et protocole QR — un espace dédié pour votre entreprise.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {user ? (
                  <Link href="/dashboard">
                    <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Accéder au tableau de bord
                    </Button>
                  </Link>
                ) : site.allowRegistration ? (
                  <>
                    <Link href="/register">
                      <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        Créer mon entreprise
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button size="lg" variant="secondary">Se connecter</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        Se connecter
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button size="lg" variant="secondary">Nous contacter</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
              {loadingPublicTemplates ? (
                <div className="aspect-[3/4] max-h-[380px] flex items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface">
                  <Loader2 className="w-6 h-6 text-muted animate-spin" />
                </div>
              ) : activePreview ? (
                <div className="space-y-4">
                  <div
                    key={activePreview.id}
                    className="aspect-[3/4] max-h-[min(380px,52vh)] w-full mx-auto animate-in fade-in duration-300"
                  >
                    <LandingInvitationPreview
                      template={activePreview}
                      variant="hero"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                    <p className="text-xs text-muted truncate min-w-0">
                      <span className="font-medium text-foreground">{activePreview.name}</span>
                      {' · '}
                      {getCategoryLabel(activePreview.category)}
                    </p>
                    <a
                      href="#modeles"
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      Voir tous
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {publicTemplates.length > 1 && (
                    <div
                      className="flex gap-2.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 snap-x snap-mandatory [scrollbar-width:thin]"
                      role="tablist"
                      aria-label="Modèles vitrine"
                    >
                      {publicTemplates.slice(0, 6).map((t) => {
                        const selected = previewTemplate === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => setPreviewTemplate(t.id)}
                            title={t.name}
                            className={cn(
                              'group shrink-0 w-[4.75rem] sm:w-[5.25rem] snap-start text-left transition',
                              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg',
                            )}
                          >
                            <div
                              className={cn(
                                'aspect-[3/4] rounded-lg border overflow-hidden transition duration-200',
                                selected
                                  ? 'border-primary ring-2 ring-primary/20 shadow-[var(--shadow-soft)]'
                                  : 'border-border opacity-80 group-hover:opacity-100 group-hover:border-primary/40',
                              )}
                            >
                              <TemplatePreviewThumb
                                content={t.previewContent}
                                name={t.name}
                                className="!w-full !h-full !rounded-none !border-0"
                              />
                            </div>
                            <span
                              className={cn(
                                'mt-1.5 block text-[10px] leading-tight truncate px-0.5',
                                selected ? 'font-semibold text-foreground' : 'text-muted',
                              )}
                            >
                              {t.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[3/4] max-h-[320px] flex flex-col items-center justify-center text-center px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
                  <p className="text-sm font-medium text-foreground">Aucun modèle vitrine</p>
                  <p className="text-xs text-muted mt-1.5 max-w-xs leading-relaxed">
                    Le Super Admin active des modèles globaux via « Afficher sur la landing » dans le concepteur.
                  </p>
                  {isSuperAdmin && (
                    <Link href="/dashboard/templates" className="mt-4">
                      <Button size="sm" variant="secondary">Configurer les modèles</Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <LandingRolesSection />
      <LandingWorkflowSection />
      <LandingMobileSection />

      {/* Vitrine modèles — 100 % API publique / Super Admin */}
      <section id="modeles" className="py-16 sm:py-20 bg-surface border-t border-border scroll-mt-16">
        <div className="page-container">
          <div className="max-w-2xl mb-10 space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Modèles d&apos;invitation
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              {loadingPublicTemplates
                ? 'Chargement depuis la plateforme…'
                : publicTemplates.length === 0
                  ? 'Aucun modèle publié. Le Super Admin crée un modèle global et active « Afficher sur la landing ».'
                  : `${publicTemplates.length} modèle${publicTemplates.length > 1 ? 's' : ''} publié${publicTemplates.length > 1 ? 's' : ''} par l’équipe plateforme — personnalisables après inscription.`}
            </p>
            {isSuperAdmin && (
              <Link href="/dashboard?tab=templates" className="inline-flex text-xs font-medium text-foreground underline underline-offset-2 hover:no-underline">
                Gérer la vitrine (Super Admin)
              </Link>
            )}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition',
                    selectedCategory === c.id
                      ? 'bg-foreground text-background'
                      : 'bg-surface-muted text-muted hover:text-foreground border border-border',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {loadingPublicTemplates ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-muted animate-spin" />
            </div>
          ) : publicTemplates.length === 0 ? (
            <div className="py-12 px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-background text-center max-w-lg">
              <p className="text-sm text-muted leading-relaxed">
                Créez un modèle global dans le concepteur, puis activez « Afficher sur la landing page ».
              </p>
            </div>
          ) : filteredTemplateGroups.every((g) => g.templates.length === 0) ? (
            <p className="text-sm text-muted py-8">Aucun modèle dans cette catégorie.</p>
          ) : (
            <div className="space-y-12">
              {filteredTemplateGroups.map((group) => (
                <div key={group.id} className="space-y-5">
                  {selectedCategory === 'all' && group.title ? (
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{group.title}</h3>
                      <p className="text-xs text-muted mt-0.5">{group.subtitle}</p>
                    </div>
                  ) : null}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.templates.map((t) => (
                      <article
                        key={t.id}
                        className="bg-background border border-border rounded-[var(--radius-card)] p-3.5 flex flex-col em-soft-hover"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewTemplate(t.id);
                            setModalTemplate(t);
                          }}
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
                              onClick={() => setModalTemplate(t)}
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
                            Créer mon entreprise →
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <LandingPricingSection dbPlans={dbPlans} />
      <FaqSection />

      <section className="py-16 sm:py-20 bg-foreground text-background">
        <div className="page-container text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-xl mx-auto">
            Créez votre entreprise pour démarrer
          </h2>
          <p className="text-sm text-background/70 max-w-md mx-auto leading-relaxed">
            Un compte entreprise pour centraliser invitations, plan de table et protocole QR.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Tableau de bord
                </Button>
              </Link>
            ) : (
              <>
                {site.allowRegistration && (
                  <Link href="/register">
                    <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Créer mon entreprise
                    </Button>
                  </Link>
                )}
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-background/80 hover:text-background hover:bg-background/10 border border-background/20"
                  >
                    Nous contacter
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <SiteFooter faqHref="/#faq" />

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
            <Link href="/register">
              <Button size="sm">Créer mon entreprise</Button>
            </Link>
          </div>
        }
      >
        {modalTemplate && (
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {getCategoryLabel(modalTemplate.category)}
            </span>
            <LandingInvitationPreview template={modalTemplate} className="max-h-[min(420px,60vh)] overflow-hidden" />
          </div>
        )}
      </Modal>
    </div>
  );
}
