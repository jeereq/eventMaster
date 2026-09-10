'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Sparkles,
  Ticket,
  Search,
  ArrowRight,
  Heart,
  Inbox,
  CalendarCheck,
  Utensils,
  Truck,
  Mail,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Wand2,
  Bookmark,
  Calendar,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  MapPin,
  PartyPopper,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';
import { useListingFavorites } from '@/lib/listingFavorites';
import { cn } from '@/lib/cn';

export default function ClientDashboardHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { items: favoriteItems } = useListingFavorites();

  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    ticketsCount: 0,
    quotesCount: 0,
    bookingsCount: 0,
    packsCount: 0,
    loading: true,
  });

  // Charger les compteurs d'activité du client
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get('/marketplace/my-tickets'),
      api.get('/marketplace/bookings?role=organizer'),
      api.get('/marketplace/inquiries?role=organizer'),
      api.get('/marketplace/event-packs'),
    ]).then(([ticketsRes, bookingsRes, inquiriesRes, packsRes]) => {
      if (!mounted) return;
      let ticketsCount = 0;
      let quotesCount = 0;
      let bookingsCount = 0;
      let packsCount = 0;

      if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.tickets) {
        ticketsCount = Array.isArray(ticketsRes.value.tickets)
          ? ticketsRes.value.tickets.length
          : 0;
      }
      if (inquiriesRes.status === 'fulfilled' && inquiriesRes.value?.inquiries) {
        quotesCount = Array.isArray(inquiriesRes.value.inquiries)
          ? inquiriesRes.value.inquiries.length
          : 0;
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value?.bookings) {
        bookingsCount = Array.isArray(bookingsRes.value.bookings)
          ? bookingsRes.value.bookings.length
          : 0;
      }
      if (packsRes.status === 'fulfilled') {
        const pVal = packsRes.value || {};
        if (Array.isArray(pVal.packs)) packsCount = pVal.packs.length;
        else if (Array.isArray(pVal)) packsCount = pVal.length;
      }

      setStats({
        ticketsCount,
        quotesCount,
        bookingsCount,
        packsCount,
        loading: false,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push('/dashboard/catalogue');
      return;
    }
    router.push(`/dashboard/catalogue?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const userName = user?.name ? user.name.split(' ')[0] : '';

  return (
    <div className="space-y-7 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* ─── 1. HERO : L'ATELIER DE CÉLÉBRATION ─── */}
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-surface via-surface to-primary/5 p-6 sm:p-9 shadow-xs">
        {/* Halos décoratifs subtils */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-6 max-w-3xl">
          {/* Badge & Titre de célébration avec Fraunces */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                Espace Célébration
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                100 % gratuit · Sans aucun abonnement
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
              Bonjour{userName ? `, ${userName}` : ''}
              <span className="text-muted font-normal block sm:inline sm:ml-2 text-xl sm:text-2xl">
                — Votre événement commence ici.
              </span>
            </h1>

            <p className="text-sm text-muted leading-relaxed max-w-2xl">
              Trouvez les plus beaux lieux de réception, réservez des prestataires vérifiés, estimez vos coûts ou obtenez vos pass d’accès en direct.
            </p>
          </div>

          {/* Moteur de recherche intégré */}
          <form onSubmit={handleSearchSubmit} className="relative pt-1">
            <div className="relative flex items-center shadow-xs rounded-2xl bg-surface border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
              <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Une salle à la Gombe, traiteur, photographe, sono, pass d'accès…"
                aria-label="Rechercher une salle, un prestataire ou un équipement"
                className="w-full pl-12 pr-32 py-4 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2.5 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition flex items-center gap-1.5 touch-manipulation cursor-pointer shadow-xs"
              >
                <span>Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Raccourcis de recherche rapides */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
            <span className="text-xs text-muted font-medium">Recherches fréquentes :</span>
            <Link
              href="/dashboard/catalogue?kind=venue&q=Gombe"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground text-xs font-medium transition hover:bg-surface-muted"
            >
              🏛️ Salles à la Gombe
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=caterer"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground text-xs font-medium transition hover:bg-surface-muted"
            >
              🍽️ Traiteurs
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=dj"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground text-xs font-medium transition hover:bg-surface-muted"
            >
              🎵 DJ &amp; Sonorisation
            </Link>
            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai"
              className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/25 hover:border-primary text-primary text-xs font-bold transition inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Simulateur
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. BAROMÈTRE D'ACTIVITÉ : SUIVI EN TEMPS RÉEL (BANDEAU INTÉGRÉ) ─── */}
      <section aria-label="Suivi de vos démarches" className="rounded-2xl border border-border bg-surface p-2 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {/* Devis */}
          <Link
            href="/dashboard/bookings?tab=quotes"
            className="p-3.5 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block truncate">
                Devis
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.quotesCount
                )}
              </p>
              <span className="text-[11px] text-muted truncate block">Reçus &amp; en attente</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Inbox className="w-4 h-4" />
            </div>
          </Link>

          {/* Réservations */}
          <Link
            href="/dashboard/bookings?tab=bookings"
            className="p-3.5 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block truncate">
                Réservations
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.bookingsCount
                )}
              </p>
              <span className="text-[11px] text-muted truncate block">Dates confirmées</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </Link>

          {/* Mes Billets */}
          <Link
            href="/dashboard/tickets"
            className="p-3.5 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block truncate">
                Mes Billets
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.ticketsCount
                )}
              </p>
              <span className="text-[11px] text-muted truncate block">Pass d’accès QR</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Ticket className="w-4 h-4" />
            </div>
          </Link>

          {/* Mes Packs */}
          <Link
            href="/dashboard/catalogue?tab=packs"
            className="p-3.5 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block truncate">
                Mes Packs
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.packsCount
                )}
              </p>
              <span className="text-[11px] text-muted truncate block">Simulations</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Bookmark className="w-4 h-4" />
            </div>
          </Link>

          {/* Favoris */}
          <Link
            href="/dashboard/catalogue?tab=favorites"
            className="p-3.5 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3 col-span-2 md:col-span-1"
          >
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block truncate">
                Favoris
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  favoriteItems.length
                )}
              </p>
              <span className="text-[11px] text-muted truncate block">Coups de cœur</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Heart className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 3. LES 3 ATELIERS CRÉATIFS : LE CŒUR D'EVENTMASTER ─── */}
      <section aria-labelledby="studios-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-border/70 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Conception Assistée par IA
            </span>
            <h2 id="studios-heading" className="font-display text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              Les Ateliers Créatifs
            </h2>
          </div>
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto touch-manipulation"
          >
            <span>Accéder au simulateur central</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Atelier 1 : Simulateur de Budget */}
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 via-surface to-surface p-5 flex flex-col justify-between gap-4 transition hover:border-primary hover:shadow-xs group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition">
                  <Wand2 className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition">
                  Simulateur de Budget
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  3 formules complètes (Éco, Recommandée, Confort) chiffrées en direct selon votre capacité et vos souhaits.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Chiffrage CDF &amp; USD
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Lieux réels
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Devis direct
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai&studio=budget"
              className="w-full inline-flex items-center justify-between pt-3 border-t border-border/70 text-xs font-bold text-primary group-hover:translate-x-0.5 transition"
            >
              <span>Calculer mon budget</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Atelier 2 : Studio Faire-Part & Invitations */}
          <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-b from-pink-500/5 via-surface to-surface p-5 flex flex-col justify-between gap-4 transition hover:border-pink-500 hover:shadow-xs group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">
                  Studio Invitations
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Cartons d’invitation verticaux 9:16 prêts pour WhatsApp avec lien de confirmation de présence (RSVP).
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Format 9:16 Story
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Partage WhatsApp
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  RSVP en direct
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai&studio=invite"
              className="w-full inline-flex items-center justify-between pt-3 border-t border-border/70 text-xs font-bold text-pink-600 dark:text-pink-400 group-hover:translate-x-0.5 transition"
            >
              <span>Créer une invitation</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Atelier 3 : Studio Plans de Salle 2D / 3D */}
          <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-500/5 via-surface to-surface p-5 flex flex-col justify-between gap-4 transition hover:border-sky-500 hover:shadow-xs group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                  Studio Plans 3D
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Modélisez votre lieu, disposez tables et buffets, puis visualisez le rendu dans l’espace immersif 3D.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Visite 3D WebGL
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Tables &amp; Banquets
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Circulation
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai&studio=room"
              className="w-full inline-flex items-center justify-between pt-3 border-t border-border/70 text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition"
            >
              <span>Ouvrir l’atelier 3D</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 4. EXPLORATION PAR UNIVERS : LE MARKETPLACE DE RÉCEPTION ─── */}
      <section aria-labelledby="marketplace-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Sélection Qualifiée
            </span>
            <h2 id="marketplace-heading" className="font-display text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              Explorer par Univers
            </h2>
          </div>
          <Link
            href="/dashboard/catalogue"
            className="text-xs font-bold text-muted hover:text-foreground inline-flex items-center gap-1 transition"
          >
            <span>Tout voir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Univers 1 : Salles */}
          <Link
            href="/dashboard/catalogue?kind=venue"
            className="group rounded-2xl border border-border bg-surface p-5 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Lieux &amp; Espaces
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Salles climatisées, jardins de réception et domaines d’exception à Kinshasa et provinces.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Parcourir les salles</span>
              <ChevronRight className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Univers 2 : Prestataires */}
          <Link
            href="/dashboard/catalogue?kind=service"
            className="group rounded-2xl border border-border bg-surface p-5 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Prestataires de Réception
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Traiteurs, décorateurs, photographes, DJ et animation pour sublimer votre fête.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Voir les prestataires</span>
              <ChevronRight className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Univers 3 : Location matériel */}
          <Link
            href="/dashboard/catalogue?kind=rental"
            className="group rounded-2xl border border-border bg-surface p-5 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-105 transition">
                <Truck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Mobilier &amp; Cortèges
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Chaises VIP, chapiteaux, sonorisation professionnelle et véhicules de cortège.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Consulter le matériel</span>
              <ChevronRight className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Univers 4 : Billetterie & Sorties */}
          <Link
            href="/dashboard/catalogue?kind=event"
            className="group rounded-2xl border border-border bg-surface p-5 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Sorties &amp; Billetterie
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Concerts, galas de prestige et festivals en RDC. Billets avec pass QR instantané.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Voir les événements</span>
              <ChevronRight className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 5. ENGAGEMENTS & CONCIERGERIE (100% SÉRÉNITÉ) ─── */}
      <section className="rounded-2xl border border-border/80 bg-gradient-to-r from-surface via-surface to-surface-muted p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xs">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Une célébration en toute transparence
            </h3>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Consultez les fiches et demandez des devis sans frais. Vous réglez directement les acomptes aux prestataires de votre choix, sans intermédiaire financier sur les prestations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Link
            href="/dashboard/guide"
            className="flex-1 md:flex-none text-center px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition min-h-[44px] inline-flex items-center justify-center"
          >
            Guide pratique
          </Link>
          <Link
            href="/contact"
            className="flex-1 md:flex-none text-center px-4 py-2.5 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition shadow-xs min-h-[44px] inline-flex items-center justify-center"
          >
            Besoin d’assistance
          </Link>
        </div>
      </section>
    </div>
  );
}
