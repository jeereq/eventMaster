'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Sparkles,
  Ticket,
  Calendar,
  Store,
  Search,
  ArrowRight,
  Heart,
  Inbox,
  CalendarCheck,
  MapPin,
  Camera,
  Utensils,
  Music,
  Truck,
  Mail,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
  Zap,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button, Card, EmptyState, StatusPill } from '@/components/ui';
import { useListingFavorites } from '@/lib/listingFavorites';
import { formatFc } from '@/config/landingPricing';
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
}

const CLIENT_INTENTS: ClientIntentConfig[] = [
  {
    id: 'venue',
    title: 'Trouver une Salle d’exception',
    badge: 'Lieux & Espaces',
    tagline: 'Salles climatisées, jardins, terrasses et domaines de réception',
    description:
      'Explorez des lieux d’exception à Kinshasa et en RDC avec capacités, tarifs clairs, géolocalisation et visites 3D immersives.',
    icon: Building2,
    accentColor: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    ctaLabel: 'Explorer les salles disponibles',
    ctaHref: '/dashboard/catalogue?kind=venue',
    quickFilters: [
      { label: 'Mariage & Grands galas', href: '/dashboard/catalogue?kind=venue&type=wedding' },
      { label: 'Salles à Gombe', href: '/dashboard/catalogue?kind=venue&q=Gombe' },
      { label: 'Jardins & Espaces ouverts', href: '/dashboard/catalogue?kind=venue&type=garden' },
      { label: 'Conférences & Séminaires', href: '/dashboard/catalogue?kind=venue&type=conference' },
    ],
    features: [
      'Visites virtuelles 3D et agencement 2D',
      'Disponibilités vérifiées en temps réel',
      'Demande de devis gratuite sans engagement',
    ],
  },
  {
    id: 'service',
    title: 'Trouver un Prestataire de confiance',
    badge: 'Métiers & Prestations',
    tagline: 'Traiteurs, décorateurs, photographes, DJ et artistes',
    description:
      'Comparez les portfolios, avis vérifiés et grilles tarifaires des meilleurs professionnels pour sublimer votre fête.',
    icon: Utensils,
    accentColor: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    ctaLabel: 'Trouver des prestataires qualifiés',
    ctaHref: '/dashboard/catalogue?kind=service',
    quickFilters: [
      { label: 'Traiteurs & Buffets', href: '/dashboard/catalogue?kind=service&cat=caterer' },
      { label: 'Décoration & Scénographie', href: '/dashboard/catalogue?kind=service&cat=decoration' },
      { label: 'Photo & Vidéo HD', href: '/dashboard/catalogue?kind=service&cat=photographer' },
      { label: 'DJ & Sonorisation', href: '/dashboard/catalogue?kind=service&cat=dj' },
    ],
    features: [
      'Portfolios médias et vidéos récentes',
      'Messagerie directe et devis personnalisés',
      'Validation transparente des prestations',
    ],
  },
  {
    id: 'event',
    title: 'Acheter des Billets d’Événements',
    badge: 'Billetterie & Accès',
    tagline: 'Concerts, festivals, galas, soirées privées et spectacles',
    description:
      'Réservez vos places en ligne avec paiement sécurisé (FlexPay, Carte bancaire, Mobile Money) et recevez votre e-billet QR instantanément.',
    icon: Ticket,
    accentColor: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    ctaLabel: 'Voir les événements & acheter mes billets',
    ctaHref: '/dashboard/catalogue?kind=event',
    quickFilters: [
      { label: 'Concerts & Festivals', href: '/dashboard/catalogue?kind=event&type=concert' },
      { label: 'Galas & Soirées', href: '/dashboard/catalogue?kind=event&type=gala' },
      { label: 'Conférences & Salons', href: '/dashboard/catalogue?kind=event&type=business' },
      { label: 'Mes billets achetés', href: '/dashboard/tickets' },
    ],
    features: [
      'Paiement sécurisé par Visa, Mastercard et Mobile Money',
      'e-Billets téléchargeables en PDF avec QR Code infalsifiable',
      'Accès rapide le jour J via contrôle protocole',
    ],
  },
  {
    id: 'template',
    title: 'Créer un Faire-part & Invitations WhatsApp',
    badge: 'Faire-part & RSVP',
    tagline: 'Invitations interactives élégantes avec suivi des réponses',
    description:
      'Choisissez un modèle raffiné de faire-part (mariage, anniversaire, baptême), diffusez-le par WhatsApp et collectez les RSVP en direct.',
    icon: Mail,
    accentColor: 'from-pink-500/10 to-rose-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400',
    ctaLabel: 'Découvrir les modèles de faire-part',
    ctaHref: '/register?kind=ORGANIZER&intent=personal&action=template',
    quickFilters: [
      { label: 'Modèles de Mariage', href: '/register?kind=ORGANIZER&intent=personal&action=template' },
      { label: 'Anniversaires & Célébrations', href: '/register?kind=ORGANIZER&intent=personal&action=template' },
      { label: 'Événements d’entreprise', href: '/register?kind=ORGANIZER&intent=pro&action=event' },
    ],
    features: [
      'Envoi fluide par WhatsApp avec personnalisation nominative',
      'Livre d’or et galerie photo interactive pour les invités',
      'Validation de présence avec génération de badges d’accès QR',
    ],
  },
  {
    id: 'rental',
    title: 'Louer du Matériel & Véhicules',
    badge: 'Logistique & Équipements',
    tagline: 'Chaises, tables, chapiteaux, sonorisation et voitures de cortège',
    description:
      'Trouvez tout le matériel nécessaire pour équiper votre lieu : tentes, groupes électrogènes, éclairage et véhicules de prestige.',
    icon: Truck,
    accentColor: 'from-purple-500/10 to-violet-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
    ctaLabel: 'Explorer les offres de location',
    ctaHref: '/dashboard/catalogue?kind=rental',
    quickFilters: [
      { label: 'Tentes & Chapiteaux', href: '/dashboard/catalogue?kind=rental&cat=tent' },
      { label: 'Chaises & Mobilier VIP', href: '/dashboard/catalogue?kind=rental&cat=chairs' },
      { label: 'Sonorisation & Éclairage', href: '/dashboard/catalogue?kind=rental&cat=sound' },
      { label: 'Véhicules de cortège', href: '/dashboard/catalogue?kind=rental&cat=cars' },
    ],
    features: [
      'Tarifs par jour ou forfait weekend',
      'Livraison et montage sur site inclus ou en option',
      'Disponibilités vérifiées avant validation',
    ],
  },
  {
    id: 'ai-plan',
    title: 'Simulateur Intelligent de Pack Événement',
    badge: 'Assistant & Budget',
    tagline: 'Composé automatiquement selon votre budget et nombre d’invités',
    description:
      'Indiquez votre budget global et la nature de votre fête. Notre assistant IA assemble pour vous la salle, le traiteur et la déco idéale.',
    icon: Sparkles,
    accentColor: 'from-amber-500/10 to-emerald-500/10 border-primary/30 text-primary',
    ctaLabel: 'Lancer le simulateur de pack événement',
    ctaHref: '/dashboard/catalogue?tab=plan&planView=ai',
    quickFilters: [
      { label: 'Simuler un mariage complet', href: '/dashboard/catalogue?tab=plan&planView=ai' },
      { label: 'Packs d’anniversaire clés en main', href: '/dashboard/catalogue?tab=packs' },
      { label: 'Packs d’entreprise & galas', href: '/dashboard/catalogue?tab=plan&planView=ai' },
    ],
    features: [
      'Optimisation instantanée des postes budgétaires',
      'Sélection coordonnée des prestataires complémentaires',
      'Sauvegarde et devis groupé en un clic',
    ],
  },
];

const INTENT_STORAGE_KEY = 'em_client_primary_intent';

export default function ClientDashboardHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { favorites } = useListingFavorites();

  const [selectedIntent, setSelectedIntent] = useState<ClientIntent>('venue');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    ticketsCount: 0,
    quotesCount: 0,
    bookingsCount: 0,
    loading: true,
  });

  // Charger la préférence mémorisée
  useEffect(() => {
    try {
      const saved = localStorage.getItem(INTENT_STORAGE_KEY) as ClientIntent | null;
      if (saved && CLIENT_INTENTS.some((i) => i.id === saved)) {
        setSelectedIntent(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSelectIntent = (intentId: ClientIntent) => {
    setSelectedIntent(intentId);
    try {
      localStorage.setItem(INTENT_STORAGE_KEY, intentId);
    } catch {
      /* ignore */
    }
  };

  // Charger les statistiques d'activité client
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get('/marketplace/my-tickets'),
      api.get('/marketplace/my-bookings'),
    ]).then(([ticketsRes, bookingsRes]) => {
      if (!mounted) return;
      let ticketsCount = 0;
      let quotesCount = 0;
      let bookingsCount = 0;

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

      setStats({
        ticketsCount,
        quotesCount,
        bookingsCount,
        loading: false,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const currentConfig = useMemo(() => {
    return (
      CLIENT_INTENTS.find((i) => i.id === selectedIntent) || CLIENT_INTENTS[0]
    );
  }, [selectedIntent]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push('/dashboard/catalogue');
      return;
    }
    router.push(`/dashboard/catalogue?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const IntentIcon = currentConfig.icon;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ─── BANNIÈRE BIENVENUE & ACCROCHE CLIENT ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-linear-to-br from-primary/10 via-surface to-surface-muted p-5 sm:p-8 shadow-xs">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/25">
                <Sparkles className="w-3.5 h-3.5" />
                Espace Client &amp; Découverte
              </span>
              <span className="text-xs text-muted">· Événements &amp; Marketplace</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Bonjour, {user?.name || 'Cher invité'} 👋
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Définissez votre priorité du moment pour explorer nos meilleures salles, prestataires,
              billets de spectacles ou modèles de faire-part en République Démocratique du Congo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/dashboard/catalogue')}
              leftIcon={<Store className="w-4 h-4" />}
              className="font-bold shadow-md shadow-primary/20"
            >
              Ouvrir la Marketplace
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/dashboard/tickets')}
              leftIcon={<Ticket className="w-4 h-4" />}
            >
              Mes Billets ({stats.ticketsCount})
            </Button>
          </div>
        </div>

        {/* ─── BARRE DE RECHERCHE RAPIDE INTÉGRÉE ─── */}
        <form onSubmit={handleSearchSubmit} className="mt-6 relative max-w-3xl">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une salle, un traiteur, un DJ, un lieu à Gombe, Limete, Ngaliema…"
              className="w-full pl-11 pr-28 py-3.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent shadow-xs transition"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 touch-manipulation cursor-pointer"
            >
              <span>Chercher</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* ─── WIDGETS D'ACTIVITÉS EN TEMPS RÉEL (4 CARTES) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Billets */}
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
            <p className="text-2xl font-black text-foreground">{stats.ticketsCount}</p>
            <p className="text-xs text-muted mt-0.5">Accès QR &amp; e-billets payés</p>
          </div>
        </Link>

        {/* 2. Devis envoyés */}
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
            <p className="text-2xl font-black text-foreground">{stats.quotesCount}</p>
            <p className="text-xs text-muted mt-0.5">Demandes auprès des prestataires</p>
          </div>
        </Link>

        {/* 3. Réservations */}
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
            <p className="text-2xl font-black text-foreground">{stats.bookingsCount}</p>
            <p className="text-xs text-muted mt-0.5">Dates confirmées &amp; acomptes</p>
          </div>
        </Link>

        {/* 4. Favoris */}
        <Link
          href="/dashboard/catalogue?tab=favorites"
          className="p-4 rounded-2xl border border-border bg-surface hover:border-pink-500/40 hover:bg-pink-500/5 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Mes Favoris</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground">{favorites.length}</p>
            <p className="text-xs text-muted mt-0.5">Salles &amp; prestataires mis de côté</p>
          </div>
        </Link>
      </div>

      {/* ─── SÉLECTEUR D'OBJECTIFS / RAISON D'ÊTRE CLIENT ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              Que cherchez-vous en premier ?
            </h2>
            <p className="text-xs text-muted">
              Sélectionnez votre besoin principal pour afficher les raccourcis et filtres optimisés.
            </p>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full self-start sm:self-auto">
            {CLIENT_INTENTS.findIndex((i) => i.id === selectedIntent) + 1} / {CLIENT_INTENTS.length} objectifs
          </span>
        </div>

        {/* Grille des 6 choix d'objectifs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {CLIENT_INTENTS.map((intent) => {
            const Icon = intent.icon;
            const isSelected = selectedIntent === intent.id;
            return (
              <button
                key={intent.id}
                type="button"
                onClick={() => handleSelectIntent(intent.id)}
                className={cn(
                  'p-3 sm:p-3.5 rounded-xl border text-left transition flex flex-col justify-between gap-2 touch-manipulation cursor-pointer relative',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                    : 'border-border bg-surface hover:bg-surface-muted hover:border-primary/40',
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isSelected ? 'bg-primary text-white' : 'bg-surface-muted text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-tight">{intent.badge}</p>
                  <p className="text-[10px] text-muted truncate mt-0.5">{intent.title}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ─── FICHE FOCUS DÉTAILLÉE SUR L'OBJECTIF SÉLECTIONNÉ ─── */}
        <div className="p-5 sm:p-7 rounded-2xl border border-border bg-surface shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 border-b border-border pb-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 text-primary',
                )}
              >
                <IntentIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">
                    {currentConfig.badge}
                  </span>
                  <span className="text-xs text-muted">Objectif sélectionné</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  {currentConfig.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted max-w-2xl">
                  {currentConfig.description}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(currentConfig.ctaHref)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="font-bold shrink-0 shadow-md shadow-primary/20 w-full md:w-auto"
            >
              {currentConfig.ctaLabel}
            </Button>
          </div>

          {/* Points forts & Avantages */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {currentConfig.features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-3 rounded-xl bg-surface-muted/60 border border-border text-xs text-foreground/90 font-medium"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Raccourcis de recherche suggérés pour cet objectif */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Accès directs &amp; Filtres populaires pour cet objectif :
            </p>
            <div className="flex flex-wrap gap-2">
              {currentConfig.quickFilters.map((qf, idx) => (
                <Link
                  key={idx}
                  href={qf.href}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 text-xs font-semibold text-foreground transition flex items-center gap-1.5 touch-manipulation"
                >
                  <span>{qf.label}</span>
                  <ArrowRight className="w-3 h-3 text-muted" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── DÉCOUVRIR LE MARKETPLACE EN 3 ÉTAPES CLÉS ─── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Comment profiter au maximum d’EventMaster ?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border space-y-2">
            <div className="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h4 className="font-bold text-foreground">Explorez &amp; Comparez</h4>
            <p className="text-muted leading-relaxed">
              Consultez les fiches détaillées de salles, traiteurs, décorateurs et spectacles à Kinshasa et en province.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border space-y-2">
            <div className="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h4 className="font-bold text-foreground">Demandez des Devis gratuits</h4>
            <p className="text-muted leading-relaxed">
              Envoyez vos demandes de dates directement aux prestataires et suivez leurs réponses en temps réel dans vos devis.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border space-y-2">
            <div className="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">
              3
            </div>
            <h4 className="font-bold text-foreground">Réservez en toute sécurité</h4>
            <p className="text-muted leading-relaxed">
              Réglez vos billets et prestations via FlexPay (Mobile Money ou Cartes bancaires) et conservez vos justificatifs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
