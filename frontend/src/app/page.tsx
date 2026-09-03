'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import LandingProfileGate from '@/components/landing/LandingProfileGate';
import LandingRoomEditorShowcase from '@/components/landing/LandingRoomEditorShowcase';
import FaqSection from '@/components/landing/FaqSection';
import PublicCtaBand from '@/components/PublicCtaBand';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import LandingDashboardQuickAccess from '@/components/landing/LandingDashboardQuickAccess';
import { Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';

// Chargement différé des sections lourdes sous la ligne de flottaison
const LandingAiSimulationShowcase = dynamic(
  () => import('@/components/landing/LandingAiSimulationShowcase'),
  {
    loading: () => <div className="py-16 text-center text-xs text-muted">Chargement du simulateur IA…</div>,
  },
);

const LandingVitrineSection = dynamic(
  () => import('@/components/landing/LandingVitrineSection'),
  {
    loading: () => <div className="py-16 text-center text-xs text-muted">Chargement de la vitrine…</div>,
  },
);

const LandingVisualBanner = dynamic(
  () => import('@/components/landing/LandingVisualBanner'),
  {
    loading: () => <div className="py-16 text-center text-xs text-muted">Chargement des inspirations…</div>,
  },
);

const LandingInvitationPreview = dynamic(
  () => import('@/components/landing/LandingInvitationPreview'),
  {
    ssr: false,
  },
);
import {
  getLandingProfile,
  isLandingProfileId,
  scrollToLandingSection,
  type LandingProfileId,
} from '@/lib/landingProfiles';
import { ArrowRight, LayoutDashboard, Smartphone, Sparkles } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const [profileId, setProfileId] = useState<LandingProfileId>('personal');

  const profile = getLandingProfile(profileId);

  const selectProfile = useCallback((id: LandingProfileId, scrollToSection = true) => {
    const next = getLandingProfile(id);
    setProfileId(id);
    if (typeof window !== 'undefined') {
      const hash = scrollToSection && next.sectionId ? next.sectionId : id;
      window.history.replaceState(null, '', `#${hash}`);
      if (scrollToSection) {
        window.dispatchEvent(new Event('hashchange'));
        scrollToLandingSection(next.sectionId);
      }
    }
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
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased pb-16 md:pb-0">
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

            {/* Raccourci d'accès immédiat au tableau de bord pour utilisateur connecté */}
            {user && (
              <div className="pt-2">
                <div className="p-4 sm:p-5 rounded-2xl bg-surface/90 dark:bg-slate-900/90 border border-primary/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-primary/10 animate-fade-in text-left">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md shadow-primary/25">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-foreground truncate">
                        Ravi de vous revoir{user.name ? `, ${user.name}` : ''} !
                      </p>
                      <p className="text-xs text-muted">
                        Vous êtes connecté. Retrouvez vos événements, réservations et outils.
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard" className="shrink-0 w-full sm:w-auto">
                    <Button size="md" className="w-full sm:w-auto shadow-md font-semibold" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Accéder à mon tableau de bord
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Grille des 4 Solutions / Produits (Visibles immédiatement) */}
          <div className="animate-fade-in">
            <LandingProfileGate
              selectedId={profileId}
              onSelect={(id) => selectProfile(id, false)}
            />
          </div>
        </div>
      </section>

      {/* ─── GALERIE D'INSPIRATION & RÉALISATIONS EN IMAGES (Mise en avant visuelle immédiate) ─── */}
      <LandingVisualBanner />

      {/* ─── CATALOGUE & MARKETPLACE (Salles, Prestataires, Billetteries) ─── */}
      <LandingVitrineSection />

      {/* ─── ÉDITEUR DE SALLE 2D / 3D (Agencement, Visite 3D, Placement, Scan QR) ─── */}
      <LandingRoomEditorShowcase />

      {/* ─── SIMULATION D'ÉVÉNEMENT PAR IA & PACKS BUDGET CLÉS EN MAIN ─── */}
      <LandingAiSimulationShowcase />

      {/* ─── FAQ ─── */}
      <FaqSection itemIds={profile.faqIds} subtitle={faqSubtitle} />

      {/* ─── BANDEAU D'APPEL À L'ACTION FINAL ─── */}
      <PublicCtaBand
        title="Prêt à lancer votre événement ?"
        description="Créez votre compte gratuit en 1 minute. Sans carte bancaire."
        actions={
          user ? (
            <Link href="/dashboard">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Ouvrir mon espace
              </Button>
            </Link>
          ) : (
            <>
              {site.allowRegistration && (
                <Link href={profile.cta.href}>
                  <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {profile.cta.label}
                  </Button>
                </Link>
              )}
              <Link href="/marketplace">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-sm font-semibold"
                >
                  Explorer le marketplace
                </Button>
              </Link>
            </>
          )
        }
      />

      <LandingDashboardQuickAccess />

      <SiteFooter faqHref="/#faq" />
    </div>
  );
}
