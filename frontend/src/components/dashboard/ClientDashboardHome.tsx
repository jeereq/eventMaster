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
  Crown,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';
import { useListingFavorites } from '@/lib/listingFavorites';
import { cn } from '@/lib/cn';

export type ClientIntent =
  | 'venue'
  | 'service'
  | 'event'
  | 'template'
  | 'rental'
  | 'ai-plan';

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
  isPaidPlanRequired?: boolean;
  pricingNotice?: {
    badge: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    pricingHighlight?: string;
  };
}

const CLIENT_INTENTS: ClientIntentConfig[] = [
  {
    id: 'venue',
    title: 'Trouver la salle idéale',
    badge: 'Lieux & Espaces',
    tagline: 'Salles de fête, jardins, terrasses et domaines de réception',
    description:
      'Découvrez de superbes lieux à Kinshasa et en RDC avec photos, tarifs transparents, capacités d’accueil et visites 3D immersives.',
    icon: Building2,
    accentColor: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    ctaLabel: 'Parcourir les salles',
    ctaHref: '/dashboard/catalogue?kind=venue',
    quickFilters: [
      { label: 'Mariages & Grands galas', href: '/dashboard/catalogue?kind=venue&type=wedding' },
      { label: 'Salles à la Gombe', href: '/dashboard/catalogue?kind=venue&q=Gombe' },
      { label: 'Jardins & Plein air', href: '/dashboard/catalogue?kind=venue&type=garden' },
      { label: 'Conférences & Séminaires', href: '/dashboard/catalogue?kind=venue&type=conference' },
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
    badge: 'Métiers & Prestations',
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
      { label: 'Photo & Vidéo HD', href: '/dashboard/catalogue?kind=service&cat=photographer' },
      { label: 'DJ & Sonorisation', href: '/dashboard/catalogue?kind=service&cat=dj' },
    ],
    features: [
      'Portfolios photos et vidéos récents',
      'Échanges directs et devis personnalisés',
      'Prestataires vérifiés et recommandés',
    ],
  },
  {
    id: 'ai-plan',
    title: 'Simuler mon pack événement',
    badge: 'Budget & Pack IA',
    tagline: 'Une formule sur-mesure calculée selon votre budget et vos invités',
    description:
      'Indiquez votre budget en Francs Congolais (CDF), votre ville et votre nombre d’invités : notre assistant sélectionne pour vous la meilleure combinaison salle, traiteur, déco et animation.',
    icon: Sparkles,
    accentColor: 'from-amber-500/10 to-emerald-500/10 border-primary/30 text-primary',
    ctaLabel: 'Lancer une simulation',
    ctaHref: '/dashboard/catalogue?tab=plan&planView=ai',
    quickFilters: [
      { label: 'Simulation automatique', href: '/dashboard/catalogue?tab=plan&planView=ai' },
      { label: 'Mes packs enregistrés', href: '/dashboard/catalogue?tab=packs' },
      { label: 'Ajuster mes critères', href: '/dashboard/catalogue?tab=plan&planView=manual' },
      { label: 'Finaliser mon choix', href: '/dashboard/catalogue?tab=plan&planView=final' },
    ],
    features: [
      'Répartition intelligente du budget par poste (salle, traiteur, déco, photo, DJ)',
      'Sélection coordonnée de prestataires disponibles en RDC',
      'Sauvegarde de vos sélections et devis groupé en 1 clic',
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
    tagline: 'Faire-part interactifs, réponses RSVP en direct et QR codes invités',
    description:
      'Pour créer vos propres faire-part personnalisés, envoyer des invitations nominatives par WhatsApp et suivre qui sera présent, passez sur une formule Organisateur (dès 15 $).',
    icon: Mail,
    accentColor: 'from-pink-500/10 to-rose-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400',
    ctaLabel: 'Découvrir les modèles de faire-part',
    ctaHref: '/register?kind=ORGANIZER&intent=personal&action=template',
    isPaidPlanRequired: true,
    pricingNotice: {
      badge: 'Formule Organisateur',
      title: 'Créez vos faire-part et gérez vos invités en toute simplicité',
      description:
        'L’exploration du catalogue et les devis sont 100 % gratuits avec votre compte Client. Pour envoyer de superbes invitations personnalisées sur WhatsApp, collecter les réponses RSVP et générer des badges d’accès QR pour vos invités, activez une formule Organisateur (à partir de 15 $ pour 50 invités).',
      pricingHighlight: 'Envois WhatsApp nominatifs · Suivi des présences en direct · Badges QR invités inclus',
      ctaLabel: 'Voir les formules Organisateur',
      ctaHref: '/register?kind=ORGANIZER&intent=personal&action=template',
    },
    quickFilters: [
      { label: 'Mariages & Fiançailles', href: '/register?kind=ORGANIZER&intent=personal&action=template' },
      { label: 'Anniversaires & Célébrations', href: '/register?kind=ORGANIZER&intent=personal&action=template' },
      { label: 'Événements Pro & Galas', href: '/register?kind=ORGANIZER&intent=pro&action=event' },
    ],
    features: [
      'Modèles soignés et personnalisables à votre image',
      'Envoi direct par WhatsApp avec message nominatif',
      'Suivi des confirmations (RSVP) et plan de table',
      'Génération automatique des pass d’accès avec QR code',
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
      'Tarifs clairs à la journée ou au forfait week-end',
      'Options de livraison et d’installation sur place',
      'Matériel vérifié et prêt pour votre date',
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
      api.get('/marketplace/my-bookings'),
      api.get('/marketplace/event-packs'),
    ]).then(([ticketsRes, bookingsRes, packsRes]) => {
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
      if (bookingsRes.status === 'fulfilled') {
        const val = bookingsRes.value || {};
        const inquiries = Array.isArray(val.inquiries) ? val.inquiries : [];
        const bookings = Array.isArray(val.clientBookings)
          ? val.clientBookings
          : Array.isArray(val.bookings)
            ? val.bookings
            : [];
        quotesCount = inquiries.length;
        bookingsCount = bookings.length;
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
      {/* ─── BANNIÈRE BIENVENUE & RECHERCHE INTÉGRÉE ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-linear-to-br from-primary/10 via-surface to-surface-muted p-5 sm:p-7 shadow-xs">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative space-y-4 max-w-3xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25">
                <Sparkles className="w-3.5 h-3.5" />
                Espace Client
              </span>
              <span className="text-xs text-muted">· Marketplace &amp; Événements</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              Bonjour{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Trouvez votre lieu idéal, de superbes prestataires, vos billets de sortie ou laissez notre simulateur composer un <strong>pack clé en main</strong> adapté à votre budget.
            </p>
          </div>

          {/* Barre de recherche principale avec raccourcis */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Une salle à la Gombe, un traiteur, un photographe, du mobilier…"
                className="w-full pl-11 pr-28 py-3.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent shadow-xs transition"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 touch-manipulation cursor-pointer"
              >
                <span>Rechercher</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Suggestions de recherche en 1 clic */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
            <span className="text-[11px] font-medium text-muted mr-1">Idées rapides :</span>
            <Link
              href="/dashboard/catalogue?kind=venue&q=Gombe"
              className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-[11px] font-medium text-foreground transition"
            >
              Salles à la Gombe
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=caterer"
              className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-[11px] font-medium text-foreground transition"
            >
              Traiteurs &amp; Buffets
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=dj"
              className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-[11px] font-medium text-foreground transition"
            >
              DJ &amp; Sonorisation
            </Link>
            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai"
              className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-[11px] font-bold text-primary transition inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Simulateur de pack
            </Link>
          </div>
        </div>
      </div>

      {/* ─── WIDGETS D'ACTIVITÉS EN TEMPS RÉEL (5 CARTES) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Simulateur & Mes Packs */}
        <Link
          href="/dashboard/catalogue?tab=packs"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Mes Packs</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
              <Sparkles className="w-4 h-4" />
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
            <p className="text-xs text-muted mt-0.5">Vos projets &amp; simulations</p>
          </div>
        </Link>

        {/* 2. Billets */}
        <Link
          href="/dashboard/tickets"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-emerald-500/40 hover:bg-emerald-500/5 transition group flex flex-col justify-between"
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
            <p className="text-xs text-muted mt-0.5">Vos pass &amp; QR codes</p>
          </div>
        </Link>

        {/* 3. Devis envoyés */}
        <Link
          href="/dashboard/bookings?tab=quotes"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-blue-500/40 hover:bg-blue-500/5 transition group flex flex-col justify-between"
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
            <p className="text-xs text-muted mt-0.5">Demandes en cours</p>
          </div>
        </Link>

        {/* 4. Réservations */}
        <Link
          href="/dashboard/bookings?tab=bookings"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-amber-500/40 hover:bg-amber-500/5 transition group flex flex-col justify-between"
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

        {/* 5. Favoris */}
        <Link
          href="/dashboard/catalogue?tab=favorites"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-pink-500/40 hover:bg-pink-500/5 transition group flex flex-col justify-between col-span-2 sm:col-span-1"
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

      {/* ─── DÉCOUVERTE PAR CATÉGORIES & OBJECTIFS ─── */}
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
                className={cn(
                  'p-4 sm:p-5 rounded-2xl border bg-surface transition-all flex flex-col justify-between gap-3 relative hover:border-primary/50 hover:shadow-xs group',
                  intent.id === 'ai-plan' ? 'border-primary/40 bg-linear-to-br from-primary/5 via-surface to-emerald-500/5' : 'border-border',
                  intent.isPaidPlanRequired ? 'border-amber-500/30' : '',
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', intent.accentColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {intent.isPaidPlanRequired ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Crown className="w-3 h-3" />
                          Formule Organisateur
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-muted text-muted border border-border">
                          {intent.badge}
                        </span>
                      )}
                    </div>
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

                <div className="space-y-2.5 pt-2 border-t border-border/70">
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
                    variant={intent.id === 'ai-plan' ? 'primary' : 'secondary'}
                    size="sm"
                    fullWidth
                    onClick={() => router.push(intent.ctaHref)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className={cn(
                      'font-bold text-xs',
                      intent.id === 'ai-plan' ? 'shadow-xs shadow-primary/20' : '',
                    )}
                  >
                    {intent.ctaLabel}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── THÉMATIQUE 3 : 💎 FORMULES & ABONNEMENTS POUR ORGANISATEURS ─── */}
      <div className="rounded-2xl sm:rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-surface to-surface-muted p-5 sm:p-7 space-y-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-border/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <Crown className="w-3.5 h-3.5" />
                Formules d’Abonnement Organisateur
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                −10 % en paiement annuel
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Envie de créer vos propres faire-part et d’inviter vos proches ?
            </h3>
            <p className="text-xs text-muted max-w-2xl leading-relaxed">
              L’exploration du catalogue est 100 % gratuite. Si vous préparez un mariage, un anniversaire ou une réception et souhaitez envoyer des invitations WhatsApp nominatives et générer des pass QR, activez une formule adaptée.
            </p>
          </div>

          <Link
            href="/register?kind=ORGANIZER&intent=personal&action=template"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-xs shadow-primary/20 flex items-center gap-1.5 shrink-0"
          >
            <span>Choisir un forfait</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Détails précis des forfaits disponibles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  Particulier
                </span>
                <span className="text-xs font-bold text-foreground">Dès 60 000 FC / trim.</span>
              </div>
              <h4 className="text-sm font-bold text-foreground">Mariages & Fêtes privées</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Formules 50, 100, 200 ou +200 invités valables 90 jours. Invitations WhatsApp, QR codes d&apos;accès et éditeur 2D/3D complet inclus.
              </p>
            </div>
            <Link
              href="/register?kind=ORGANIZER&intent=personal&plan=PERSONAL_100"
              className="text-[11px] font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 pt-2 border-t border-border"
            >
              Voir Particulier 100 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary">
                  Professionnel
                </span>
                <span className="text-xs font-bold text-foreground">Dès 30 000 FC / mois</span>
              </div>
              <h4 className="text-sm font-bold text-foreground">Business & Premium</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                De 150 à 1 000 invités par mois. Idéal pour plusieurs événements par an, avec OCR de texte, desk d&apos;accueil smartphone et billetterie en ligne.
              </p>
            </div>
            <Link
              href="/register?kind=ORGANIZER&intent=pro&plan=STANDARD"
              className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 pt-2 border-t border-primary/20"
            >
              Découvrir Business <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between gap-3 sm:col-span-2 lg:col-span-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">
                  Prestataires & Salles
                </span>
                <span className="text-xs font-bold text-foreground">Dès 9 900 FC / mois</span>
              </div>
              <h4 className="text-sm font-bold text-foreground">Vitrine & Référencement</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Publiez vos salles et prestations sur le catalogue pour recevoir des demandes de devis d&apos;organisateurs dans toute la RDC.
              </p>
            </div>
            <Link
              href="/register?kind=VENDOR&intent=vendor&action=listing"
              className="text-[11px] font-bold text-purple-600 hover:underline inline-flex items-center gap-1 pt-2 border-t border-border"
            >
              Créer mon compte Pro <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── GUIDE RAPIDE & ASSISTANCE ─── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Besoin d’un coup de main pour organiser votre événement ?</p>
            <p className="text-[11px] text-muted">Parcourez notre guide pratique ou contactez notre équipe pour vous conseiller dans vos choix.</p>
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
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-xs"
          >
            Explorer le catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}
