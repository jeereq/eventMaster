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
        <div className="flex items-center gap-2 pt-2 overflow-x-auto no-scrollbar sm:flex-wrap pb-1">
          <Link
            href="/marketplace/salles"
            className="shrink-0 inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border/80 bg-surface text-xs font-semibold text-foreground hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden />
            Salles de fête
          </Link>
          <Link
            href="/marketplace/prestataires"
            className="shrink-0 inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border/80 bg-surface text-xs font-semibold text-foreground hover:bg-amber-500/5 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-300 transition shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
            Prestataires & Métiers
          </Link>
          <Link
            href="/marketplace/locations"
            className="shrink-0 inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border/80 bg-surface text-xs font-semibold text-foreground hover:bg-cyan-500/5 hover:border-cyan-500/40 hover:text-cyan-700 dark:hover:text-cyan-300 transition shadow-2xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden />
            Matériel & Location
          </Link>
          <Link
            href="/marketplace/evenements"
            className="shrink-0 inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border/80 bg-surface text-xs font-semibold text-foreground hover:bg-emerald-500/5 hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Billetterie
          </Link>
        </div>
      </PublicPageHero>

      {/* Contenu avec mise en page 2 colonnes ergonomique */}
      <main className="page-container py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Colonne principale : fil de publications */}
          <div className="lg:col-span-8 space-y-6">
            {/* Bandeau d'action rapide Pro visible sur mobile/tablette (< lg) */}
            <div className="lg:hidden flex items-center justify-between gap-3 p-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-surface to-amber-500/5 text-xs shadow-xs">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-bold text-foreground">Gestionnaire ou prestataire ?</p>
                <p className="text-muted text-[11px] truncate">Donnez de la visibilité à vos réalisations</p>
              </div>
              <Link
                href={user ? '/dashboard/publications?tab=create' : '/register?intent=vendor'}
                className="shrink-0 inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs shadow-xs transition"
              >
                <span>{user ? 'Publier' : 'Rejoindre'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <MarketplaceGlobalActivityFeed linkBase="public" />
          </div>

          {/* Colonne Latérale : Informations, Accès rapide & CTA Pros */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Carte CTA Professionnels */}
            <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-surface to-amber-500/5 p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground flex items-center justify-center shadow-xs">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-foreground">Vous êtes gestionnaire ou prestataire ?</h2>
                <p className="text-xs text-muted leading-relaxed">
                  Publiez vos photos, vidéos et publications pour donner de la visibilité à vos salles et prestations auprès de milliers d’organisateurs.
                </p>
              </div>
              <Link
                href={user ? '/dashboard/publications?tab=create' : '/register?intent=vendor'}
                className="inline-flex items-center justify-center gap-2 w-full min-h-11 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs sm:text-sm font-semibold active:scale-[0.99] transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span>{user ? 'Créer une publication' : 'Créer un compte professionnel'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Carte Raccourcis Marketplace */}
            <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-2xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Explorer le catalogue
              </h2>
              <nav className="space-y-2">
                <Link
                  href="/marketplace/salles?city=Kinshasa"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/5 hover:text-primary text-xs font-medium text-foreground transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Salles à Kinshasa
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </Link>
                <Link
                  href="/marketplace/salles?city=Lubumbashi"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/5 hover:text-primary text-xs font-medium text-foreground transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Salles à Lubumbashi
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </Link>
                <Link
                  href="/marketplace/prestataires"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-500/5 hover:text-amber-700 dark:hover:text-amber-300 text-xs font-medium text-foreground transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Traiteurs, DJ & Décorateurs
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
                </Link>
                <Link
                  href="/marketplace"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-muted text-xs font-medium text-foreground transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-surface-muted/40 to-surface-muted/50 p-5 space-y-3 text-xs text-muted">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Contact & Devis Directs</span>
              </div>
              <p className="leading-relaxed">
                Repérez une prestation ou un décor sur ce fil, cliquez sur <strong className="text-foreground">« Voir la fiche »</strong> pour vérifier les tarifs, disponibilités et échanger directement sans commission cachée.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </PublicPageShell>
  );
}
