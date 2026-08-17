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
  ArrowRight, Loader2, LayoutGrid, QrCode, Mail, Sparkles,
  Building2, Users, CalendarCheck, Smartphone,
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

  const categories = [
    { id: 'all', name: 'Tous' },
    { id: 'private', name: 'Privé' },
    { id: 'corporate', name: 'Professionnel' },
    { id: 'casual', name: 'Cocktail' },
  ];

  const filteredTemplateGroups = buildLandingTemplateGroups(publicTemplates, selectedCategory);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-200">
      <CelebrateMood />
      <SiteHeader variant="landing" />

      {/* Hero */}
      <section className="relative em-landing-hero">
        <div className="page-container relative z-10 py-14 sm:py-18 lg:py-22">
          <div className="max-w-3xl space-y-6 animate-slide-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="em-festive-chip">
                <Sparkles className="w-3 h-3" />
                {site.platformName}
              </span>
              <span className="text-[11px] font-medium text-muted tracking-wide">
                {site.platformTagline}
              </span>
            </div>

            <h1 className="font-display text-[2.15rem] sm:text-5xl lg:text-[3.2rem] font-semibold tracking-tight text-foreground leading-[1.12]">
              Organiser, publier et accueillir — tout le cycle de l’événement
            </h1>

            <p className="text-[15px] sm:text-base text-muted leading-relaxed max-w-2xl">
              EventMaster est la plateforme web pour les organisateurs, les salles et les prestataires
              en RDC : invitations et RSVP, plan de table 2D, protocole QR le jour J, catalogue public
              avec photos et vidéos, puis réservation de dates. L’application mobile est en construction
              et n’est pas encore déployée — aujourd’hui, tout se fait dans le navigateur.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
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
              <a
                href="#parcours"
                className="inline-flex items-center justify-center gap-1.5 px-1 py-2 text-sm font-semibold text-foreground/80 hover:text-primary transition"
              >
                Voir le parcours
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="inline-flex items-start gap-2.5 rounded-[var(--radius-card)] border border-border bg-surface/90 px-3.5 py-2.5 text-xs text-muted max-w-xl">
              <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-foreground" />
              <p>
                <span className="font-semibold text-foreground">App iOS &amp; Android : en construction.</span>
                {' '}Elle n’est pas déployée pour l’instant. Le protocole QR, le RSVP et le tableau de bord
                fonctionnent déjà sur le web, y compris depuis un téléphone.
              </p>
            </div>
          </div>

          <ul className="em-landing-hero-grid mt-12">
            {[
              {
                icon: Mail,
                title: 'Invitations & RSVP',
                text: 'Modèles visuels, envoi e-mail ou WhatsApp, portail invité, badge QR et suivi des réponses.',
              },
              {
                icon: LayoutGrid,
                title: 'Salles & plan 2D',
                text: 'Banquet, conférence, tente… Placement des invités, thèmes, et publication de la salle au catalogue.',
              },
              {
                icon: QrCode,
                title: 'Protocole jour J',
                text: 'Scan du badge QR dans le navigateur, check-in, validation du siège. PDF, plan et GPS dès le RSVP accepté.',
              },
              {
                icon: Building2,
                title: 'Catalogue de salles',
                text: 'Fiches publiques avec photos, vidéos, carte, tarifs et calendrier des dates déjà réservées.',
              },
              {
                icon: Sparkles,
                title: 'Prestataires',
                text: 'Traiteur, photo, DJ, déco… Devis, médias, rayon d’intervention et réservation de date.',
              },
              {
                icon: CalendarCheck,
                title: 'Réservations',
                text: 'Demande, acompte hors plateforme (30 %), confirmation qui bloque la date. Commission vendeur 8 %.',
              },
              {
                icon: Users,
                title: 'Équipes & rôles',
                text: 'Propriétaire, managers, protocole, responsables de salle — chacun voit uniquement son périmètre.',
              },
              {
                icon: Smartphone,
                title: 'Mobile (bientôt)',
                text: 'L’app native est en cours de construction. Elle n’est pas encore disponible sur les stores.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-soft)]"
              >
                <Icon className="w-5 h-5 text-[color:var(--festive-accent)] mb-3" />
                <h2 className="text-sm font-semibold text-foreground mb-1">{title}</h2>
                <p className="text-xs text-muted leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>

          {!loadingPublicTemplates && publicTemplates.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <p className="text-xs font-medium text-muted shrink-0">Modèles vitrine</p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {publicTemplates.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalTemplate(t)}
                    title={t.name}
                    className="shrink-0 w-14 aspect-[3/4] rounded-md border border-border overflow-hidden hover:border-primary/40 transition"
                  >
                    <TemplatePreviewThumb
                      content={t.previewContent}
                      name={t.name}
                      className="!w-full !h-full !rounded-none !border-0"
                    />
                  </button>
                ))}
              </div>
              <a href="#modeles" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                Tous les modèles <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </section>

      <LandingRolesSection />
      <LandingWorkflowSection />
      <LandingMobileSection />

      <section className="py-14 sm:py-16 border-t border-border bg-surface">
        <div className="page-container flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--festive-accent)]">
              Catalogue
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Salles et prestataires, sans quitter EventMaster
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Publiez une salle ou une prestation avec photos et vidéos, tarifs, carte et calendrier.
              Un organisateur demande un devis ou réserve une date ; l’acompte se verse hors plateforme.
            </p>
          </div>
          <Link href="/marketplace">
            <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
              Voir le catalogue
            </Button>
          </Link>
        </div>
      </section>

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
                          onClick={() => setModalTemplate(t)}
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
            Un compte entreprise pour invitations, RSVP, plan de salle, catalogue et protocole QR — sur le web, dès maintenant.
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
