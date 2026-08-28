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
import LandingRoomEditorShowcase from '@/components/landing/LandingRoomEditorShowcase';
import LandingMobileStickyBar from '@/components/landing/LandingMobileStickyBar';
import FaqSection from '@/components/landing/FaqSection';
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

  const faqSubtitle =
    profileId === 'seeker'
      ? 'Compte gratuit, devis, packs. Réponses courtes à vos questions.'
      : profileId === 'vendor'
        ? 'Publier ma salle, recevoir des devis et forfaits partenaires.'
        : profileId === 'pro'
          ? 'Équipe, billetterie multi-zones et forfaits Business.'
          : 'Invitations WhatsApp, plan de table et forfaits particuliers.';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased">
      <SiteHeader variant="landing" />

      {/* ─── HERO & HUB DE SOLUTIONS (Sélection immédiate du produit) ─── */}
      <section className="relative em-landing-hero">
        <div className="page-container relative z-10 py-10 sm:py-14 lg:py-16 space-y-10">
          {/* Titre & Slogan d'accroche */}
          <div className="text-center max-w-3xl mx-auto space-y-4 animate-slide-up">
            <div className="inline-flex items-center gap-2">
              <span className="em-festive-chip">
                <Sparkles className="w-3 h-3" />
                {site.platformName}
              </span>
              <span className="text-[11px] font-medium text-muted tracking-wide">
                Plateforme événementielle tout-en-un
              </span>
            </div>

            <h1 className="font-display text-[2.25rem] sm:text-5xl lg:text-[3.35rem] font-semibold tracking-tight text-foreground leading-[1.12]">
              Votre événement,{' '}
              <span className="em-glow-text">maîtrisé de A à Z</span>
            </h1>

            <p className="text-sm sm:text-base text-muted leading-relaxed max-w-2xl mx-auto">
              Plan de salle 2D/3D, invitations WhatsApp, billetterie Mobile Money et scan QR réunis dans votre navigateur.
            </p>

            <div className="inline-flex items-center gap-2 em-hud-pill px-3.5 py-1.5 text-xs text-muted">
              <Smartphone className="w-3.5 h-3.5 shrink-0 text-primary" />
              <p>
                <span className="font-semibold text-foreground">100% dans le navigateur.</span>
                {' '}Zéro application à installer pour vous ou vos invités.
              </p>
            </div>
          </div>

          {/* Grille des 4 Solutions / Produits (Visibles immédiatement) */}
          <div className="animate-fade-in">
            <LandingProfileGate
              selectedId={profileId}
              onSelect={(id) => selectProfile(id, false)}
            />
          </div>

          {/* Démonstration Live interactive synchronisée */}
          <div className="pt-2 max-w-4xl mx-auto">
            <div className="text-center mb-3">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Aperçu en direct · {profile.label}
              </span>
            </div>
            <LandingHeroPreview profileId={profileId} />
          </div>
        </div>
      </section>

      {/* ─── PARCOURS ÉTAPE PAR ÉTAPE (Fonctionnement pratique) ─── */}
      <LandingWorkflowSection profileId={profileId} onProfileChange={(id) => selectProfile(id, false)} />

      {/* ─── ÉDITEUR DE SALLE 2D / 3D (Showcase interactif) ─── */}
      <LandingRoomEditorShowcase />

      {/* ─── MODÈLES D'INVITATION (Papeterie digitale) ─── */}
      <LandingModelsSection
        templates={publicTemplates}
        loading={loadingPublicTemplates}
        onPreview={setModalTemplate}
      />

      {/* ─── CATALOGUE & MARKETPLACE (Salles, Prestataires, Billetteries) ─── */}
      <LandingVitrineSection />

      {/* ─── TARIFICATION ET FORFAITS ─── */}
      <LandingPricingSection
        dbPlans={dbPlans}
        defaultAudience={profile.pricingAudience}
        lead={
          profileId === 'seeker'
            ? 'Le compte client (recherche) est 100% gratuit : listes de favoris, création de packs et demandes de devis. Les forfaits ci-dessous sont dédiés à ceux qui veulent la sérénité absolue pour gérer l\'organisation complète d’une fête (invitations, placement, scan le jour J).'
            : undefined
        }
      />

      {/* ─── FAQ ─── */}
      <FaqSection itemIds={profile.faqIds} subtitle={faqSubtitle} />

      {/* ─── BANDEAU D'APPEL À L'ACTION FINAL ─── */}
      <PublicCtaBand
        title="Prêt à lancer votre événement ?"
        description="Créez votre compte gratuit en 1 minute. Sans carte bancaire."
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
