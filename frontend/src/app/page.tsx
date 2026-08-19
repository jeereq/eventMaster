'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { LandingTemplate } from '@/config/landingTemplates';
import { fetchPublicLandingTemplates } from '@/lib/landingTemplateAdapter';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import LandingRolesSection from '@/components/landing/LandingRolesSection';
import LandingWorkflowSection from '@/components/landing/LandingWorkflowSection';
import LandingMobileSection from '@/components/landing/LandingMobileSection';
import FaqSection from '@/components/landing/FaqSection';
import LandingMapSection from '@/components/landing/LandingMapSection';
import LandingVitrineSection from '@/components/landing/LandingVitrineSection';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import PublicCtaBand from '@/components/PublicCtaBand';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import TemplatePreviewThumb from '@/components/TemplatePreviewThumb';
import { Modal, Button, Skeleton } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  ArrowRight, LayoutGrid, QrCode, Mail, Sparkles,
  Building2, Users, CalendarCheck, Smartphone, Share2,
} from 'lucide-react';
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

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased">
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
              EventMaster est la plateforme web pour les organisateurs, les salles, les prestataires
              et les clients en RDC : invitations et RSVP, plan de table 2D, protocole QR le jour J,
              marketplace (salles, métiers et locations — habits, voitures, motos, matériel),
              favoris, packs budget, partage d’une recherche ou d’une fiche, réservation de dates,
              événements publics et billets en ligne. L’application mobile est en construction —
              aujourd’hui, tout se fait dans le navigateur.
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
                      Créer mon organisation
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
                Parcours par rôle
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
                text: 'Privés (liste d’invités) ou publics avec inscription et billets payants en ligne. Badge QR pour chaque participant.',
              },
              {
                icon: LayoutGrid,
                title: 'Salles & plan 2D',
                text: 'Banquet, conférence, tente… Placement des invités, thèmes, et publication de la salle sur le marketplace.',
              },
              {
                icon: QrCode,
                title: 'Protocole jour J',
                text: 'Scan du badge QR dans le navigateur, check-in, validation du siège. PDF, plan et GPS dès le RSVP accepté.',
              },
              {
                icon: Building2,
                title: 'Salles du marketplace',
                text: 'Fiches publiques avec photos, vidéos, carte, tarifs et calendrier. Les clients peuvent les mettre en favoris.',
              },
              {
                icon: Sparkles,
                title: 'Prestataires & locations',
                text: 'Métiers : traiteur, photo, DJ, déco… Location : habits homme / femme / enfant, voitures, motos et matériel. Devis, photos, rayon d’intervention, packs budget.',
              },
              {
                icon: CalendarCheck,
                title: 'Réservations & packs',
                text: 'Compte client : explorer (grille, liste, carte), favoris, préparer un événement (éco / équilibré / confort) et sauvegarder un pack. Acompte 30 % hors plateforme, commission vendeur 8 %.',
              },
              {
                icon: Share2,
                title: 'Partage',
                text: 'Partagez une recherche (l’URL conserve vos filtres) ou une fiche publique salle, prestataire ou événement — sans compte obligatoire pour le destinataire.',
              },
              {
                icon: Users,
                title: 'Équipes & rôles',
                text: 'Propriétaire, managers, protocole, responsables de salle, commercial org. — chacun voit uniquement son périmètre.',
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

          {loadingPublicTemplates ? (
            <div className="mt-10 flex flex-wrap items-center gap-3" role="status" aria-label="Chargement des modèles">
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="w-14 aspect-[3/4] rounded-md shrink-0" />
                ))}
              </div>
            </div>
          ) : publicTemplates.length > 0 ? (
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <p className="text-xs font-medium text-muted shrink-0">Modèles vitrine</p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {publicTemplates.slice(0, 8).map((t) => (
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
          ) : null}
        </div>
      </section>

      <LandingMapSection />

      <LandingRolesSection />
      <LandingWorkflowSection />
      <LandingMobileSection />

      <LandingVitrineSection
        publicTemplates={publicTemplates}
        loadingTemplates={loadingPublicTemplates}
        isSuperAdmin={isSuperAdmin}
        onPreviewTemplate={setModalTemplate}
      />

      <LandingPricingSection dbPlans={dbPlans} />
      <FaqSection />

      <PublicCtaBand
        title="Créez votre organisation pour démarrer"
        description="Un compte organisation pour invitations, RSVP, plan de salle, marketplace et protocole QR — sur le web, dès maintenant."
        actions={
          user ? (
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
                    Créer mon organisation
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
              <Button size="sm">Créer mon organisation</Button>
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
