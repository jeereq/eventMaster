'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { LandingTemplate } from '@/config/landingTemplates';
import { fetchPublicLandingTemplates } from '@/lib/landingTemplateAdapter';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import LandingWorkflowSection from '@/components/landing/LandingWorkflowSection';
import LandingProfileGate from '@/components/landing/LandingProfileGate';
import LandingHeroPreview from '@/components/landing/LandingHeroPreview';
import LandingTrustBanner from '@/components/landing/LandingTrustBanner';
import LandingRoomEditorShowcase from '@/components/landing/LandingRoomEditorShowcase';
import LandingMobileStickyBar from '@/components/landing/LandingMobileStickyBar';
import FaqSection from '@/components/landing/FaqSection';
import LandingProductOverview from '@/components/landing/LandingProductOverview';
import LandingModelsSection from '@/components/landing/LandingModelsSection';
import LandingVitrineSection from '@/components/landing/LandingVitrineSection';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import PublicCtaBand from '@/components/PublicCtaBand';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { Modal, Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  getLandingProfile,
  isLandingProfileId,
  LANDING_SLOGAN,
  scrollToLandingSection,
  type LandingProfileId,
} from '@/lib/landingProfiles';
import { ArrowRight, Smartphone, Sparkles } from 'lucide-react';

function getCategoryLabel(category: string) {
  if (category === 'private') return 'Célébrations';
  if (category === 'corporate') return 'Professionnel';
  return 'Soirées';
}

export default function Home() {
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const [modalTemplate, setModalTemplate] = useState<LandingTemplate | null>(null);
  const [dbPlans, setDbPlans] = useState<any>(null);
  const [publicTemplates, setPublicTemplates] = useState<LandingTemplate[]>([]);
  const [loadingPublicTemplates, setLoadingPublicTemplates] = useState(true);
  const [profileId, setProfileId] = useState<LandingProfileId>('personal');

  const profile = getLandingProfile(profileId);

  const selectProfile = useCallback((id: LandingProfileId, scrollToSection = true) => {
    const next = getLandingProfile(id);
    setProfileId(id);
    if (typeof window !== 'undefined') {
      const hash = scrollToSection && next.sectionId !== 'parcours' ? next.sectionId : id;
      window.history.replaceState(null, '', `#${hash}`);
      if (scrollToSection) {
        window.dispatchEvent(new Event('hashchange'));
        scrollToLandingSection(next.sectionId);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const plansData = await api.get('/public/plans');
        if (plansData) setDbPlans(plansData);
      } catch {
        /* offline — tarifs fallback du fichier landing */
      }
    }

    async function loadPublicTemplates() {
      const fromDb = await fetchPublicLandingTemplates();
      setPublicTemplates(fromDb);
      setLoadingPublicTemplates(false);
    }

    fetchPlans();
    loadPublicTemplates();
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (isLandingProfileId(hash)) setProfileId(hash);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const faqSubtitle =
    profileId === 'seeker'
      ? 'Compte gratuit, devis, packs. Quatre questions, des réponses courtes.'
      : profileId === 'vendor'
        ? 'Publier, acompte, forfaits salle et presta.'
        : profileId === 'pro'
          ? 'Équipe, protocoles, forfaits Business.'
          : 'Invitations, places, accueil. Forfaits particuliers.';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased">
      <SiteHeader variant="landing" />

      <section className="relative em-landing-hero">
        <div className="page-container relative z-10 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Colonne gauche (7 cols) : Accroche & Choix rapide */}
            <div className="lg:col-span-7 space-y-6 animate-slide-up">
              <div className="flex flex-wrap items-center gap-2">
                <span className="em-festive-chip">
                  <Sparkles className="w-3 h-3" />
                  {site.platformName}
                </span>
                <span className="text-[11px] font-medium text-muted tracking-wide">
                  Invitez, placez, accueillez
                </span>
              </div>

              <h1 className="font-display text-[2.15rem] sm:text-5xl lg:text-[3.2rem] font-semibold tracking-tight text-foreground leading-[1.12]">
                {LANDING_SLOGAN.full}
              </h1>

              <p className="text-[15px] sm:text-base text-muted leading-relaxed max-w-2xl">
                Rassemblez le lieu idéal, les meilleurs prestataires et tous vos invités sur une seule plateforme intuitive. Tout se fait dans le navigateur, y compris au téléphone.
              </p>

              {/* Actions directes */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                {user ? (
                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
                      Ouvrir mon tableau de bord
                    </Button>
                  </Link>
                ) : site.allowRegistration ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <Link href={profile.cta.href} className="w-full sm:w-auto">
                      <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
                        {profile.cta.label}
                      </Button>
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-foreground hover:underline transition"
                    >
                      J’ai déjà un compte
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
                        Accéder à mon espace
                      </Button>
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-foreground hover:underline transition"
                    >
                      Parler à l’équipe
                    </Link>
                  </div>
                )}
                <a
                  href={profile.exploreCta.href}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary hover:text-primary-hover transition"
                >
                  {profile.exploreCta.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Badge d'aide et réassurance */}
              <div className="inline-flex items-start gap-2.5 rounded-[var(--radius-card)] border border-border bg-surface/90 px-3.5 py-2.5 text-xs text-muted max-w-xl shadow-xs">
                <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-foreground" />
                <p>
                  <span className="font-semibold text-foreground">Pas d’app à installer.</span>
                  {' '}RSVP WhatsApp, scan QR et tableau de bord fonctionnent déjà dans votre navigateur.
                </p>
              </div>
            </div>

            {/* Colonne droite (5 cols) : Aperçu dynamique interactif */}
            <div className="lg:col-span-5 animate-fade-in">
              <LandingHeroPreview />
            </div>
          </div>

          {/* Sélecteur de profil par cas d'usage */}
          <div className="mt-14 pt-8 border-t border-border/80">
            <LandingProfileGate
              selectedId={profileId}
              onSelect={(id) => selectProfile(id, true)}
            />

            <div className="mt-6 max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted bg-surface px-2 py-0.5 rounded border border-border">
                  {profile.eyebrow}
                </span>
                <span className="text-xs text-muted">Parcours personnalisé</span>
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {profile.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{profile.intro}</p>

              <ol
                key={profileId}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted animate-fade-in pt-1"
                aria-label="Les étapes"
              >
                {profile.clicks.map((label, index) => {
                  const href = profile.clickHrefs[index];
                  const clickClass =
                    'font-medium text-foreground hover:text-primary underline-offset-2 hover:underline transition';
                  return (
                    <li key={`${profile.id}-${label}`} className="inline-flex items-center gap-2">
                      <span className="text-[11px] font-semibold tabular-nums text-foreground/70">{index + 1}.</span>
                      {href.startsWith('#') ? (
                        <a href={href} className={clickClass}>{label}</a>
                      ) : (
                        <Link href={href} className={clickClass}>{label}</Link>
                      )}
                      {index < profile.clicks.length - 1 ? (
                        <ArrowRight className="w-3.5 h-3.5 text-border" aria-hidden />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <LandingTrustBanner />

      <LandingWorkflowSection profileId={profileId} onProfileChange={(id) => selectProfile(id, false)} />

      <LandingRoomEditorShowcase />

      <LandingProductOverview />

      <LandingModelsSection
        templates={publicTemplates}
        loading={loadingPublicTemplates}
        onPreview={setModalTemplate}
      />

      <LandingVitrineSection
        publicTemplates={publicTemplates}
        loadingTemplates={loadingPublicTemplates}
        isSuperAdmin={isSuperAdmin}
        onPreviewTemplate={setModalTemplate}
      />

      <LandingPricingSection
        dbPlans={dbPlans}
        defaultAudience={profile.pricingAudience}
        lead={
          profileId === 'seeker'
            ? 'Le compte client (recherche) est 100% gratuit : listes de favoris, création de packs et demandes de devis. Les forfaits ci-dessous sont dédiés à ceux qui veulent la sérénité absolue pour gérer l\'organisation complète d’une fête (invitations, placement, scan le jour J).'
            : undefined
        }
      />
      <FaqSection itemIds={profile.faqIds} subtitle={faqSubtitle} />

      <PublicCtaBand
        title={LANDING_SLOGAN.full}
        description={profile.intro}
        actions={
          user ? (
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Ouvrir mon espace
              </Button>
            </Link>
          ) : (
            <>
              {site.allowRegistration && (
                <Link href={profile.cta.href}>
                  <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {profile.cta.label}
                  </Button>
                </Link>
              )}
              <Link href="/marketplace">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-background/80 hover:text-background hover:bg-background/10 border border-background/20"
                >
                  Explorer le marketplace
                </Button>
              </Link>
            </>
          )
        }
      />

      <LandingMobileStickyBar ctaLabel={profile.cta.label} ctaHref={profile.cta.href} />

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
              <Button size="sm">Utiliser ce modèle</Button>
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
