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
  ShieldCheck,
  Wand2,
  Bookmark,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
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

  // Chargement des compteurs temps réel
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
    <div className="space-y-6 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* ─── 1. HERO COMPACT & RECHERCHE (ZERO TEXTE SUPERFLU) ─── */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface to-primary/5 p-5 sm:p-7 shadow-xs">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Bonjour{userName ? `, ${userName}` : ''} 👋
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              100 % gratuit · Sans abonnement
            </span>
          </div>

          {/* Recherche directe */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center rounded-2xl bg-surface border border-border shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
              <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Salle à la Gombe, traiteur, DJ, mobilier, pass QR…"
                aria-label="Rechercher une salle, un prestataire ou un équipement"
                className="w-full pl-12 pr-28 py-3.5 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition flex items-center gap-1 touch-manipulation cursor-pointer"
              >
                <span>Chercher</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Raccourcis 1 clic */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Link
              href="/dashboard/catalogue?kind=venue&q=Gombe"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground font-medium transition hover:bg-surface-muted"
            >
              🏛️ Salles Gombe
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=caterer"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground font-medium transition hover:bg-surface-muted"
            >
              🍽️ Traiteurs
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=dj"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground font-medium transition hover:bg-surface-muted"
            >
              🎵 DJ &amp; Sono
            </Link>
            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai"
              className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/25 hover:border-primary text-primary font-bold transition inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Simulateur
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. BAROMÈTRE D'ACTIVITÉ : CHIFFRES CLÉS (ULTRA-PURIFIÉ) ─── */}
      <section aria-label="Compteurs d'activité" className="rounded-2xl border border-border bg-surface p-1.5 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border/60">
          <Link
            href="/dashboard/bookings?tab=quotes"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Devis</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.quotesCount
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Inbox className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/bookings?tab=bookings"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Réservations</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.bookingsCount
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/tickets"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Billets</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.ticketsCount
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Ticket className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/catalogue?tab=packs"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Packs</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.packsCount
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Bookmark className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/catalogue?tab=favorites"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3 col-span-2 md:col-span-1"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Favoris</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  favoriteItems.length
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Heart className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 3. LES 3 STUDIOS ACTIFS (VISUEL · ZÉRO TEXTE PESANT) ─── */}
      <section aria-labelledby="studios-heading" className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <h2 id="studios-heading" className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Studios Actifs
          </h2>
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Simulateur complet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Studio 1 : Budget */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=budget"
            className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-primary hover:shadow-xs group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition">
                  <Wand2 className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition">
                Simulateur Budget
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  3 formules
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  CDF &amp; USD
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Devis direct
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-0.5 transition">
              <span>Calculer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Studio 2 : Invitations */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=invite"
            className="rounded-2xl border border-pink-500/30 bg-gradient-to-b from-pink-500/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-pink-500 hover:shadow-xs group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">
                Invitations &amp; Cartes
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Format 9:16
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  WhatsApp
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Lien RSVP
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-pink-600 dark:text-pink-400 group-hover:translate-x-0.5 transition">
              <span>Créer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Studio 3 : Plans 3D */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=room"
            className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-500/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-sky-500 hover:shadow-xs group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                Plans de Salle 3D
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Visite WebGL
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Tables &amp; Buffets
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Immersion
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition">
              <span>Agencer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 4. EXPLORATION PAR UNIVERS (CHIPS DIRECTS) ─── */}
      <section aria-labelledby="marketplace-heading" className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <h2 id="marketplace-heading" className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight">
            Explorer le Catalogue
          </h2>
          <Link
            href="/dashboard/catalogue"
            className="text-xs font-bold text-muted hover:text-foreground inline-flex items-center gap-1 transition"
          >
            <span>Tout voir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Salles */}
          <Link
            href="/dashboard/catalogue?kind=venue"
            className="group rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Lieux &amp; Espaces
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Salles</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Jardins</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Domaines</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Explorer</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Prestataires */}
          <Link
            href="/dashboard/catalogue?kind=service"
            className="group rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                <Utensils className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Prestataires
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Traiteurs</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">DJ</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Photo</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Explorer</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Mobilier & Cortèges */}
          <Link
            href="/dashboard/catalogue?kind=rental"
            className="group rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-105 transition">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Mobilier &amp; Cortèges
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Chaises</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Tentes</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Voitures</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Explorer</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Sorties & Billetterie */}
          <Link
            href="/dashboard/catalogue?kind=event"
            className="group rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                <Ticket className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Billetterie
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Concerts</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Galas</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Pass QR</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Explorer</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 5. ENGAGEMENTS DIRECTS (1 SEULE LIGNE ÉPURÉE) ─── */}
      <section className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-muted font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Devis gratuits et sans engagement · Acomptes versés directement aux prestataires</span>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/dashboard/guide"
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition min-h-[38px] inline-flex items-center justify-center"
          >
            Guide
          </Link>
          <Link
            href="/contact"
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition shadow-xs min-h-[38px] inline-flex items-center justify-center"
          >
            Assistance
          </Link>
        </div>
      </section>
    </div>
  );
}
