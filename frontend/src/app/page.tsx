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
import { depositPercent } from '@/lib/platformRates';
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
              Invitez, placez, accueillez — depuis le navigateur
            </h1>

            <p className="text-[15px] sm:text-base text-muted leading-relaxed max-w-2xl">
              Envoyez les invitations, suivez les réponses, placez vos invités et scannez les badges le jour J.
              Tout se fait déjà sur le web, y compris au téléphone. L’app iOS et Android arrive bientôt.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Reprendre là où j’en étais
                  </Button>
                </Link>
              ) : site.allowRegistration ? (
                <>
                  <Link href="/register">
                    <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Lancer mon premier événement
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
                C’est pour qui ?
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

          <ul className="em-landing-hero-grid mt-12">
            {[
              {
                icon: Mail,
                title: 'Invitations & RSVP',
                text: 'Chaque invité reçoit un lien. Il répond, vous suivez. Le badge QR arrive dès qu’il dit oui.',
              },
              {
                icon: LayoutGrid,
                title: 'Salles & plan de table',
                text: 'Dessinez la salle, glissez les sièges. Vos confirmés savent où s’asseoir avant d’arriver.',
              },
              {
                icon: QrCode,
                title: 'Accueil le jour J',
                text: 'Scannez le badge à l’entrée, depuis le téléphone. Présence et siège validés tout de suite.',
              },
              {
                icon: Building2,
                title: 'Trouver une salle',
                text: 'Photos, tarifs, plan et calendrier. Filtrez, comparez, demandez un devis.',
              },
              {
                icon: Sparkles,
                title: 'Prestataires & locations',
                text: 'Traiteur, photo, DJ, habits, voitures… Publiez vos offres ou trouvez le bon pro.',
              },
              {
                icon: CalendarCheck,
                title: 'Réservations & budget',
                text: `Trois packs selon votre enveloppe. Acompte ${depositPercent(site)} % versé au pro, hors plateforme.`,
              },
              {
                icon: Share2,
                title: 'Partage public',
                text: 'Copiez le lien d’une salle ou d’une recherche. Le destinataire voit la même chose.',
              },
              {
                icon: Users,
                title: 'Équipe & rôles',
                text: 'Organisateur, protocole, salle, commercial : chacun voit seulement ce qu’il gère.',
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
        title="Prêt à lancer votre événement ?"
        description="Créez votre espace, publiez une salle, ou cherchez un prestataire — tout de suite, dans le navigateur."
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
                <Link href="/register">
                  <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Créer mon espace maintenant
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
