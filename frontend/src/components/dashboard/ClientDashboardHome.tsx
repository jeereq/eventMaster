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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';
import { useListingFavorites } from '@/lib/listingFavorites';
import { cn } from '@/lib/cn';

export type ClientIntent =
  | 'venue'
  | 'service'
  | 'rental'
  | 'event'
  | 'template';

interface ClientIntentConfig {
  id: ClientIntent;
  title: string;
  badge: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  ctaLabel: string;
  ctaHref: string;
  quickFilters: Array<{ label: string; href: string }>;
  features: string[];
}

const CLIENT_INTENTS: ClientIntentConfig[] = [
  {
    id: 'venue',
    title: 'Trouver la salle idéale',
    badge: 'Lieux & Espaces',
    tagline: 'Salles de fête, jardins, terrasses et domaines de réception',
    description:
      'Découvrez de superbes lieux à Kinshasa, Lubumbashi et en RDC avec photos, tarifs transparents, capacités d’accueil et visites 3D immersives.',
    icon: Building2,
    accentColor: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    ctaLabel: 'Parcourir les salles',
    ctaHref: '/dashboard/catalogue?kind=venue',
    quickFilters: [
      { label: 'Mariages & Grands galas', href: '/dashboard/catalogue?kind=venue&type=wedding' },
      { label: 'Salles à la Gombe', href: '/dashboard/catalogue?kind=venue&q=Gombe' },
      { label: 'Jardins & Plein air', href: '/dashboard/catalogue?kind=venue&type=garden' },
      { label: 'Conférences & Salons', href: '/dashboard/catalogue?kind=venue&type=conference' },
    ],
    features: [
      'Visites 3D immersives et plans de salle',
      'Disponibilités vérifiées en direct',
      'Demandes de devis gratuites et sans engagement',
    ],
  },
  {
    id: 'service',
    title: 'Trouver les bons prestataires',
    badge: 'Prestataires & Prestations',
    tagline: 'Traiteurs, décorateurs, photographes, DJ et animation',
    description:
      'Découvrez le travail des professionnels, consultez leurs photos et vidéos récentes, et demandez un devis personnalisé pour votre fête.',
    icon: Utensils,
    accentColor: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    ctaLabel: 'Voir les prestataires',
    ctaHref: '/dashboard/catalogue?kind=service',
    quickFilters: [
      { label: 'Traiteurs & Buffets', href: '/dashboard/catalogue?kind=service&cat=caterer' },
      { label: 'Décoration & Scénographie', href: '/dashboard/catalogue?kind=service&cat=decoration' },
      { label: 'Studios Photo & Vidéo', href: '/dashboard/catalogue?kind=service&cat=photographer' },
      { label: 'DJ & Sonorisation', href: '/dashboard/catalogue?kind=service&cat=dj' },
    ],
    features: [
      'Portfolios photos et vidéos récents',
      'Échanges directs et devis personnalisés',
      'Prestataires vérifiés et recommandés',
    ],
  },
  {
    id: 'rental',
    title: 'Louer du matériel & des véhicules',
    badge: 'Mobilier & Matériel',
    tagline: 'Chaises VIP, tables, chapiteaux, sonorisation et cortèges',
    description:
      'Tout pour équiper votre lieu et embellir votre réception : mobilier de prestige, tentes, sonorisation, éclairage et véhicules de cortège.',
    icon: Truck,
    accentColor: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
    ctaLabel: 'Voir le matériel disponible',
    ctaHref: '/dashboard/catalogue?kind=rental',
    quickFilters: [
      { label: 'Tentes & Chapiteaux', href: '/dashboard/catalogue?kind=rental&cat=tent' },
      { label: 'Chaises & Mobilier VIP', href: '/dashboard/catalogue?kind=rental&cat=chairs' },
      { label: 'Sonorisation & Éclairage', href: '/dashboard/catalogue?kind=rental&cat=sound' },
      { label: 'Voitures de cortège', href: '/dashboard/catalogue?kind=rental&cat=cars' },
    ],
    features: [
      'Tarifs clairs à la journée ou au forfait',
      'Options de livraison et d’installation sur place',
      'Matériel vérifié et prêt pour votre date',
    ],
  },
  {
    id: 'event',
    title: 'Prendre mes billets pour un événement',
    badge: 'Sorties & Billetterie',
    tagline: 'Concerts, festivals, galas, soirées et spectacles',
    description:
      'Achetez vos places facilement par Mobile Money ou carte bancaire et recevez instantanément votre billet avec QR code d’accès.',
    icon: Ticket,
    accentColor: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    ctaLabel: 'Voir les événements',
    ctaHref: '/dashboard/catalogue?kind=event',
    quickFilters: [
      { label: 'Concerts & Festivals', href: '/dashboard/catalogue?kind=event&type=concert' },
      { label: 'Galas & Soirées', href: '/dashboard/catalogue?kind=event&type=gala' },
      { label: 'Conférences & Salons', href: '/dashboard/catalogue?kind=event&type=business' },
      { label: 'Mes billets achetés', href: '/dashboard/tickets' },
    ],
    features: [
      'Paiement simple par Mobile Money, Visa et Mastercard',
      'e-Billets téléchargeables en PDF avec QR code d’accès',
      'Entrée fluide et rapide le jour J',
    ],
  },
  {
    id: 'template',
    title: 'Créer un faire-part & invitations WhatsApp',
    badge: 'Invitations & Faire-part',
    tagline: 'Faire-part interactifs et invitations numériques prêtes à partager',
    description:
      'Créez de superbes cartes d’invitation personnalisées pour vos proches et partagez-les en direct sur WhatsApp avec vos invités.',
    icon: Mail,
    accentColor: 'from-pink-500/10 to-rose-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400',
    ctaLabel: 'Ouvrir le Studio Invitations',
    ctaHref: '/dashboard/catalogue?tab=plan&planView=ai&studio=invite',
    quickFilters: [
      { label: 'Studio invitations IA', href: '/dashboard/catalogue?tab=plan&planView=ai&studio=invite' },
      { label: 'Modèles de faire-part', href: '/modeles' },
      { label: 'Invitations mariage', href: '/dashboard/catalogue?tab=plan&planView=ai&studio=invite' },
    ],
    features: [
      'Génération assistée par IA et styles sur-mesure',
      'Format vertical 9:16 idéal pour téléphones et WhatsApp',
      'Partage instantané et sans frais avec vos proches',
    ],
  },
];

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

  // Charger les statistiques d'activité client
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

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ─── BANNIÈRE BIENVENUE CLIENT & RECHERCHE INTÉGRÉE (100% GRATUIT) ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-linear-to-br from-primary/10 via-surface to-surface-muted p-5 sm:p-7 shadow-xs">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative space-y-4 max-w-3xl">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25">
                <Sparkles className="w-3.5 h-3.5" />
                Espace Client
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                100 % gratuit · Aucun abonnement requis
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              Bonjour{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Explorez les meilleures salles et prestataires de réception, simulez votre budget en 1 clic ou réservez vos sorties en RDC. Aucun abonnement à payer : vous réglez uniquement vos billets ou vos réservations directement auprès des professionnels.
            </p>
          </div>

          {/* Barre de recherche principale */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Une salle à la Gombe, un traiteur, un DJ, du mobilier, des billets…"
                className="w-full pl-11 pr-28 py-3.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent shadow-xs transition"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 rounded-lg bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition flex items-center gap-1.5 touch-manipulation cursor-pointer"
              >
                <span>Rechercher</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Suggestions de recherche en 1 clic */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
            <span className="text-xs font-medium text-muted mr-1">Recherches rapides :</span>
            <Link
              href="/dashboard/catalogue?kind=venue&q=Gombe"
              className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition"
            >
              Salles à la Gombe
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=caterer"
              className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition"
            >
              Traiteurs &amp; Buffets
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=dj"
              className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition"
            >
              DJ &amp; Sonorisation
            </Link>
            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai"
              className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-xs font-bold text-primary transition inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Simulateur
            </Link>
          </div>
        </div>
      </div>

      {/* ─── WIDGETS D'ACTIVITÉS EN TEMPS RÉEL (5 CARTES) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Devis */}
        <Link
          href="/dashboard/bookings?tab=quotes"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-blue-500/40 hover:bg-blue-500/5 transition group flex flex-col justify-between h-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Mes Devis</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground min-h-[2rem] flex items-center">
              {stats.loading ? (
                <span className="inline-block w-8 h-6 bg-foreground/10 rounded animate-pulse" />
              ) : (
                stats.quotesCount.toLocaleString('fr-FR')
              )}
            </p>
            <p className="text-xs text-muted mt-0.5">Demandes &amp; devis reçus</p>
          </div>
        </Link>

        {/* 2. Réservations */}
        <Link
          href="/dashboard/bookings?tab=bookings"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-amber-500/40 hover:bg-amber-500/5 transition group flex flex-col justify-between h-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Réservations</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground min-h-[2rem] flex items-center">
              {stats.loading ? (
                <span className="inline-block w-8 h-6 bg-foreground/10 rounded animate-pulse" />
              ) : (
                stats.bookingsCount.toLocaleString('fr-FR')
              )}
            </p>
            <p className="text-xs text-muted mt-0.5">Dates confirmées</p>
          </div>
        </Link>

        {/* 3. Billets */}
        <Link
          href="/dashboard/tickets"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-emerald-500/40 hover:bg-emerald-500/5 transition group flex flex-col justify-between h-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Mes Billets</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground min-h-[2rem] flex items-center">
              {stats.loading ? (
                <span className="inline-block w-8 h-6 bg-foreground/10 rounded animate-pulse" />
              ) : (
                stats.ticketsCount.toLocaleString('fr-FR')
              )}
            </p>
            <p className="text-xs text-muted mt-0.5">Pass d’accès &amp; QR</p>
          </div>
        </Link>

        {/* 4. Mes Packs */}
        <Link
          href="/dashboard/catalogue?tab=packs"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Mes Packs</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground min-h-[2rem] flex items-center">
              {stats.loading ? (
                <span className="inline-block w-8 h-6 bg-foreground/10 rounded animate-pulse" />
              ) : (
                stats.packsCount.toLocaleString('fr-FR')
              )}
            </p>
            <p className="text-xs text-muted mt-0.5">Simulations sauvegardées</p>
          </div>
        </Link>

        {/* 5. Favoris */}
        <Link
          href="/dashboard/catalogue?tab=favorites"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-pink-500/40 hover:bg-pink-500/5 transition group flex flex-col justify-between h-full col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Mes Favoris</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground min-h-[2rem] flex items-center">
              {stats.loading ? (
                <span className="inline-block w-8 h-6 bg-foreground/10 rounded animate-pulse" />
              ) : (
                favoriteItems.length.toLocaleString('fr-FR')
              )}
            </p>
            <p className="text-xs text-muted mt-0.5">Vos coups de cœur</p>
          </div>
        </Link>
      </div>

      {/* ─── SECTION STUDIOS CRÉATIFS & SIMULATEURS ACTIFS (MISE EN VALEUR) ─── */}
      <div className="rounded-2xl sm:rounded-3xl border border-primary/25 bg-linear-to-br from-primary/5 via-surface to-surface-muted p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-primary-foreground">
                <Wand2 className="w-3.5 h-3.5" />
                Studios créatifs actifs
              </span>
              <span className="text-xs text-muted">· Outils interactifs à votre disposition</span>
            </div>
            <h2 className="text-lg font-extrabold text-foreground">
              Simulez, concevez et préparez votre fête
            </h2>
          </div>

          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 self-start sm:self-center"
          >
            <span>Ouvrir le simulateur complet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Studio 1: Simulateur Budget & Packs */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=budget"
            className="p-4 rounded-2xl border border-primary/30 bg-surface hover:border-primary hover:shadow-xs transition group flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Wand2 className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Studio actif
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                  Simulateur de Budget &amp; Packs
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Indiquez votre budget en CDF ou USD : l’IA compose automatiquement 3 formules (Éco, Équilibré, Confort) avec salle, traiteur, déco et sono.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-primary">
              <span>Lancer la simulation</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Studio 2: Invitations & Faire-part */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=invite"
            className="p-4 rounded-2xl border border-pink-500/30 bg-surface hover:border-pink-500 hover:shadow-xs transition group flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Studio actif
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">
                  Studio Cartes &amp; Faire-part
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Créez des invitations numériques élégantes au format 9:16 pour WhatsApp avec confirmation de présence (RSVP) pour vos invités.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-pink-600 dark:text-pink-400">
              <span>Personnaliser ma carte</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Studio 3: Plans 3D & Visites immersives */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=room"
            className="p-4 rounded-2xl border border-blue-500/30 bg-surface hover:border-blue-500 hover:shadow-xs transition group flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Studio actif
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  Studio Plans de Salle 2D / 3D
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Modélisez votre salle à partir d’une photo ou d’un brief : positionnez les tables, allées et visualisez l’espace en 3D immersive.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Visiter et aménager</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        </div>
      </div>

      {/* ─── DÉCOUVERTE PAR UNIVERS (SALLES, PRESTAS, LOCATION, BILLETS) ─── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Que souhaitez-vous organiser aujourd’hui ?
          </h2>
          <p className="text-xs text-muted">
            Accédez directement à ce dont vous avez besoin pour préparer votre événement en toute sérénité.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {CLIENT_INTENTS.map((intent) => {
            const Icon = intent.icon;
            return (
              <div
                key={intent.id}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-surface transition-all flex flex-col justify-between h-full gap-3 relative hover:border-primary/50 hover:shadow-xs group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', intent.accentColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-muted text-muted border border-border">
                      {intent.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition">
                      {intent.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed mt-1 line-clamp-2">
                      {intent.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 mt-auto border-t border-border/70">
                  {/* Raccourcis rapides */}
                  <div className="flex flex-wrap gap-1">
                    {intent.quickFilters.slice(0, 3).map((qf, idx) => (
                      <Link
                        key={idx}
                        href={qf.href}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted truncate max-w-full"
                      >
                        {qf.label}
                      </Link>
                    ))}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => router.push(intent.ctaHref)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="font-bold text-xs"
                  >
                    {intent.ctaLabel}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── COMMENT ÇA MARCHE (100% SÉRÉNITÉ · SANS ABONNEMENT) ─── */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Simplicité &amp; Sérénité
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            Comment fonctionne votre Espace Client sur EventMaster ?
          </h3>
          <p className="text-xs text-muted">
            Un fonctionnement transparent conçu pour vous faciliter la vie à chaque étape de votre fête.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h4 className="text-xs font-bold text-foreground">Explorez &amp; Simulez librement</h4>
            <p className="text-xs text-muted leading-relaxed">
              Consultez gratuitement les fiches des salles et prestataires, testez notre simulateur IA de budget et sauvegardez vos favoris.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h4 className="text-xs font-bold text-foreground">Demandez des devis en 1 clic</h4>
            <p className="text-xs text-muted leading-relaxed">
              Envoyez vos demandes sans aucun engagement. Les professionnels vous répondent directement avec des devis chiffrés et personnalisés.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
              3
            </div>
            <h4 className="text-xs font-bold text-foreground">Bloquez votre date en direct</h4>
            <p className="text-xs text-muted leading-relaxed">
              Validez votre réservation : l’acompte est versé directement au professionnel hors plateforme. Vos billets achetés sont sécurisés par QR code.
            </p>
          </div>
        </div>
      </div>

      {/* ─── GUIDE RAPIDE & ASSISTANCE ─── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Besoin de conseils pour votre événement ?</p>
            <p className="text-[11px] text-muted">Parcourez notre guide ou explorez les réalisations pour trouver l’inspiration.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/dashboard/guide"
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl border border-border hover:bg-surface-muted text-xs font-semibold text-foreground transition"
          >
            Consulter le guide
          </Link>
          <Link
            href="/dashboard/catalogue"
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition shadow-xs"
          >
            Explorer le marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
