'use client';

import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplaceGlobalActivityFeed from '@/components/marketplace/MarketplaceGlobalActivityFeed';
import {
  Building2, Sparkles, Store, PlusCircle, ShieldCheck,
  Calendar, KeyRound, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ActivitePage() {
  const { user } = useAuth();

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      {/* En-tête Héros */}
      <PublicPageHero
        chip="Fil de la communauté"
        title="Publications & réalisations en direct"
        description="Découvrez les coulisses, nouveaux décors, événements récents et publications partagés par les salles et prestataires en RDC."
        compact
      >
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Link
            href="/marketplace/salles"
            className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border/80 bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted hover:border-primary/40 transition shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden />
            Salles de fête
          </Link>
          <Link
            href="/marketplace/prestataires"
            className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border/80 bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted hover:border-primary/40 transition shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
            Prestataires & Métiers
          </Link>
          <Link
            href="/marketplace/locations"
            className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border/80 bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted hover:border-primary/40 transition shadow-2xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-600" aria-hidden />
            Matériel & Location
          </Link>
          <Link
            href="/marketplace/evenements"
            className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border/80 bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted hover:border-primary/40 transition shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
            Billetterie
          </Link>
        </div>
      </PublicPageHero>

      {/* Contenu avec mise en page 2 colonnes ergonomique */}
      <main className="page-container py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Colonne principale : fil de publications */}
          <div className="lg:col-span-8 space-y-6">
            <MarketplaceGlobalActivityFeed linkBase="public" />
          </div>

          {/* Colonne Latérale : Informations, Accès rapide & CTA Pros */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Carte CTA Professionnels */}
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">Vous êtes gestionnaire ou prestataire ?</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Publiez vos photos, vidéos et publications pour donner de la visibilité à vos salles et prestations auprès de milliers d’organisateurs.
                </p>
              </div>
              <Link
                href={user ? '/dashboard/publications?tab=create' : '/register?intent=vendor'}
                className="inline-flex items-center justify-center gap-2 w-full min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:opacity-95 transition shadow-xs"
              >
                <span>{user ? 'Créer une publication' : 'Créer un compte professionnel'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Carte Raccourcis Marketplace */}
            <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Explorer le catalogue
              </h4>
              <nav className="space-y-2">
                <Link
                  href="/marketplace/salles?city=Kinshasa"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-muted text-xs font-medium text-foreground transition group"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Salles à Kinshasa
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                </Link>
                <Link
                  href="/marketplace/salles?city=Lubumbashi"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-muted text-xs font-medium text-foreground transition group"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Salles à Lubumbashi
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                </Link>
                <Link
                  href="/marketplace/prestataires"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-muted text-xs font-medium text-foreground transition group"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Traiteurs, DJ & Décorateurs
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                </Link>
                <Link
                  href="/marketplace"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-muted text-xs font-medium text-foreground transition group"
                >
                  <span className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted" />
                    Accueil Marketplace
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                </Link>
              </nav>
            </div>

            {/* Carte Confiance & Direct */}
            <div className="rounded-3xl border border-border/80 bg-surface-muted/50 p-5 space-y-3 text-xs text-muted">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Contact & Devis Directs</span>
              </div>
              <p className="leading-relaxed">
                Repérez une prestation ou un décor sur ce fil, cliquez sur <strong>« Voir la fiche »</strong> pour vérifier les tarifs, disponibilités et échanger directement sans commission cachée.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </PublicPageShell>
  );
}
