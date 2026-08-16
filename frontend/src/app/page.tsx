'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
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
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  ArrowRight, PartyPopper, Loader2, Sun, Moon, Menu, X,
} from 'lucide-react';

function getCategoryLabel(category: string) {
  if (category === 'private') return 'Privé';
  if (category === 'corporate') return 'Professionnel';
  return 'Cocktail';
}

export default function Home() {
  const { user, tenant, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<string>('');
  const [modalTemplate, setModalTemplate] = useState<LandingTemplate | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
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
          setServerStatus('online');
          const plansData = await api.get('/public/plans').catch(() => null);
          if (plansData) setDbPlans(plansData);
        } else {
          setServerStatus('offline');
        }
      } catch {
        setServerStatus('offline');
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

  const navLinkClass = 'text-sm font-medium text-muted hover:text-foreground transition';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-200">
      <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-50">
        <div className="page-container h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
              <div className="bg-foreground p-1.5 rounded-[var(--radius-button)] text-background">
                <PartyPopper className="w-3.5 h-3.5" />
              </div>
              <span className="text-base font-semibold tracking-tight">EventMaster</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-medium text-muted">
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                serverStatus === 'online' ? 'bg-emerald-500' :
                serverStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse',
              )} />
              {serverStatus === 'online' ? 'En ligne' : serverStatus === 'offline' ? 'Hors ligne' : '…'}
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <a href="#modeles" className={navLinkClass}>Modèles</a>
            <a href="#parcours" className={navLinkClass}>Parcours</a>
            <a href="#tarifs" className={navLinkClass}>Tarifs</a>
            <Link href="/contact" className={navLinkClass}>Contact</Link>
            {user ? (
              <>
                <span className="text-xs text-muted max-w-[180px] truncate">
                  {user.name}{tenant ? ` · ${tenant.name}` : ''}
                </span>
                <Link href="/dashboard">
                  <Button size="sm">Tableau de bord</Button>
                </Link>
                <Button type="button" size="sm" variant="secondary" onClick={logout}>
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className={navLinkClass}>Connexion</Link>
                <Link href="/register">
                  <Button size="sm">Essai gratuit</Button>
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-[var(--radius-button)] border border-border text-muted"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-[var(--radius-button)] border border-border text-muted"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-surface px-6 py-5 space-y-3">
            {[
              { href: '#modeles', label: 'Modèles' },
              { href: '#parcours', label: 'Parcours' },
              { href: '#tarifs', label: 'Tarifs' },
              { href: '/contact', label: 'Contact' },
              { href: '/faq', label: 'FAQ' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-muted hover:text-foreground py-2 border-b border-border"
              >
                {item.label}
              </a>
            ))}
            {user ? (
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" fullWidth>Tableau de bord</Button>
                </Link>
                <Button type="button" size="sm" variant="secondary" fullWidth onClick={() => { logout(); setMobileMenuOpen(false); }}>
                  Déconnexion
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" variant="secondary" fullWidth>Connexion</Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" fullWidth>Essai gratuit</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Hero — composition sobre : marque + message + CTA + aperçu modèle API */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--surface-muted)_0%,var(--background)_55%)]" />
        <div className="page-container relative py-16 lg:py-22">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                EventMaster
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground/90 tracking-tight leading-snug max-w-lg">
                Organisez vos événements, de la salle au scan invité.
              </h1>
              <p className="text-sm text-muted leading-relaxed max-w-md">
                Plans 2D, invitations, RSVP et protocole QR — isolés par organisation.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {user ? (
                  <Link href="/dashboard">
                    <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Accéder au tableau de bord
                    </Button>
                  </Link>
                ) : (
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
                )}
              </div>
            </div>

            <div className="min-h-[320px] flex flex-col justify-center">
              {loadingPlans || loadingPublicTemplates ? (
                <div className="h-80 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-muted animate-spin" />
                </div>
              ) : activePreview ? (
                <div className="space-y-3">
                  {publicTemplates.length > 1 && (
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {publicTemplates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPreviewTemplate(t.id)}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition',
                            previewTemplate === t.id
                              ? 'bg-foreground text-background'
                              : 'bg-surface border border-border text-muted hover:text-foreground',
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <LandingInvitationPreview template={activePreview} />
                </div>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center text-center px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
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
                  {selectedCategory === 'all' && group.title && (
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{group.title}</h3>
                      <p className="text-xs text-muted mt-0.5">{group.subtitle}</p>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.templates.map((t) => (
                      <article
                        key={t.id}
                        className="bg-background border border-border rounded-[var(--radius-card)] p-4 flex flex-col em-soft-hover"
                      >
                        <button
                          type="button"
                          onClick={() => setModalTemplate(t)}
                          className="w-full text-left rounded-[var(--radius-button)] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                        >
                          <LandingInvitationPreview template={t} compact />
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
                          <h3 className="font-semibold text-sm text-foreground leading-snug">{t.name}</h3>
                          <p className="text-xs text-muted leading-relaxed line-clamp-2">{t.description}</p>
                        </div>
                        <div className="border-t border-border pt-3 mt-4">
                          <Link href="/register" className="text-xs font-medium text-foreground hover:underline">
                            Utiliser ce modèle →
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
            Prêt à organiser votre prochain événement ?
          </h2>
          <p className="text-sm text-background/70 max-w-md mx-auto leading-relaxed">
            Invitations, plan de table et protocole QR dans un seul espace, par organisation.
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
                <Link href="/register">
                  <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Créer mon organisation
                  </Button>
                </Link>
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
            <LandingInvitationPreview template={modalTemplate} />
          </div>
        )}
      </Modal>
    </div>
  );
}
