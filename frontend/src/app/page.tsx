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
import FaqSection from '@/components/landing/FaqSection';
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
  type LandingProfileId,
} from '@/lib/landingProfiles';
import { ArrowRight, Smartphone, Sparkles } from 'lucide-react';
import CelebrateMood from '@/components/CelebrateMood';

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

  const selectProfile = useCallback((id: LandingProfileId, scrollToParcours = true) => {
    setProfileId(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
    if (scrollToParcours) {
      document.getElementById('parcours')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      ? 'Compte client, devis et packs — sans abonnement.'
      : profileId === 'vendor'
        ? 'Publication, acompte hors plateforme et forfaits salle / presta.'
        : profileId === 'pro'
          ? 'Organisation, équipe, protocoles et forfaits Business.'
          : 'Invitations, plan de table, accueil et forfaits particuliers.';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased">
      <CelebrateMood />
      <SiteHeader variant="landing" />

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
              Vous venez pour… ?
            </h1>

            <p className="text-[15px] sm:text-base text-muted leading-relaxed max-w-2xl">
              Choisissez votre situation. Le parcours, les tarifs et les questions s’adaptent.
              RSVP, plan de table et scan QR marchent déjà dans le navigateur — y compris au téléphone.
            </p>
          </div>

          <LandingProfileGate
            selectedId={profileId}
            onSelect={(id) => selectProfile(id, true)}
          />

          <div className="mt-8 max-w-2xl space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              {profile.eyebrow}
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              {profile.title}
            </h2>
            <p className="text-sm text-muted leading-relaxed">{profile.intro}</p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Reprendre là où j’en étais
                  </Button>
                </Link>
              ) : site.allowRegistration ? (
                <>
                  <Link href={profile.cta.href}>
                    <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      {profile.cta.label}
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="secondary">J’ai déjà un compte</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Accéder à mon espace
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button size="lg" variant="secondary">Parler à l’équipe</Button>
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
                <span className="font-semibold text-foreground">Pas d’app à installer pour l’instant.</span>
                {' '}Le RSVP, le scan QR et le tableau de bord marchent déjà dans le navigateur de votre téléphone.
              </p>
            </div>
          </div>
        </div>
      </section>

      <LandingWorkflowSection profileId={profileId} onProfileChange={(id) => selectProfile(id, false)} />

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
            ? 'Le compte client est gratuit : favoris, packs et devis. Les forfaits ci-dessous concernent l’organisation d’une fête, si vous en avez aussi besoin.'
            : undefined
        }
      />
      <FaqSection itemIds={profile.faqIds} subtitle={faqSubtitle} />

      <PublicCtaBand
        title={profile.title}
        description={profile.registerHint}
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
