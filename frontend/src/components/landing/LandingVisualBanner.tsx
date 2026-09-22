'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Utensils,
  Camera,
  Music,
  Palette,
  KeyRound,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Wand2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import LandingMedia from '@/components/landing/LandingMedia';
import { cn } from '@/lib/cn';

interface GalleryItem {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  imageUrl: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge: string;
  chip: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'salles-prestige',
    title: 'Salles de Réception & Espaces VIP',
    category: 'Espaces événementiels',
    location: 'Kinshasa · Gombe, Ngaliema, Limete',
    description: 'Photos, capacités et visites virtuelles.',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80',
    icon: Building2,
    href: '/marketplace/salles',
    badge: 'Visite 3D & Réservation',
    chip: 'Salles',
  },
  {
    id: 'scenographie-deco',
    title: 'Scénographie, Décoration & Fleurs',
    category: 'Décoration & Mobilier',
    location: 'Kinshasa & Lubumbashi',
    description: 'Fleurs, drapés et lumières.',
    imageUrl: 'https://images.unsplash.com/photo-1661332306744-70f9ed1a7f40?auto=format&fit=crop&w=900&q=80',
    icon: Palette,
    href: '/marketplace/prestataires',
    badge: 'Artisans certifiés',
    chip: 'Déco',
  },
  {
    id: 'traiteur-gastronomie',
    title: 'Traiteurs d’Exception & Cocktails',
    category: 'Gastronomie & Buffets',
    location: 'Partout en RDC',
    description: 'Buffets, spécialités congolaises et cocktails.',
    imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80',
    icon: Utensils,
    href: '/marketplace/prestataires',
    badge: 'Menus sur-mesure',
    chip: 'Traiteur',
  },
  {
    id: 'photo-video',
    title: 'Photographie & Cinématographie 4K',
    category: 'Média & Souvenirs',
    location: 'Kinshasa · Lubumbashi · Goma',
    description: 'Reportage, drone et galerie en ligne.',
    imageUrl: 'https://i.pinimg.com/1200x/e6/51/ee/e651eef16b155057c02035c4039ca34b.jpg',
    icon: Camera,
    href: '/marketplace/prestataires',
    badge: 'Galerie HD Web',
    chip: 'Photo',
  },
  {
    id: 'sono-dj',
    title: 'Sonorisation, Lumières & DJ Pro',
    category: 'Son & Ambiance',
    location: 'Kinshasa & Lubumbashi',
    description: 'Son, lumières et DJ.',
    imageUrl: 'https://i.pinimg.com/1200x/e0/c9/24/e0c924207a415942c4a0cffd4c1b12db.jpg',
    icon: Music,
    href: '/marketplace/prestataires',
    badge: 'Régie complète',
    chip: 'Sono',
  },
  {
    id: 'materiel-equipements',
    title: 'Matériel & Équipements de Réception',
    category: 'Logistique & Équipements',
    location: 'Disponibilité immédiate',
    description: 'Chaises, habits, voitures, sono. Livraison comprise ou en supplément.',
    imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=80',
    icon: KeyRound,
    href: '/marketplace/locations',
    badge: 'Livraison & Installation',
    chip: 'Matériel',
  },
  {
    id: 'boissons-prix',
    title: 'Boissons',
    category: 'Boissons',
    location: 'Catalogue EventMaster',
    description: 'Bières, vins, champagnes. Le prix le plus bas d’un prestataire.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80',
    icon: Utensils,
    href: '/marketplace/boissons',
    badge: 'Prix prestataires',
    chip: 'Boissons',
  },
];

export default function LandingVisualBanner() {
  const revealRef = useLandingReveal<HTMLElement>();
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const isBudgetBlocked = site?.studioVisibility?.budget === false;
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const budgetHref = '/simulateur';

  const filteredItems = activeCategory === 'all'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((item) => item.id === activeCategory);

  return (
    <section
      ref={revealRef}
      id="galerie-inspiration"
      className="em-reveal em-landing-defer py-8 sm:py-20 border-t border-border bg-surface relative overflow-hidden em-landing-section-glow"
    >
      <div className="page-container relative z-10 space-y-6 sm:space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <h2 className="em-landing-heading text-xl sm:text-4xl text-foreground">
            <span className="sm:hidden">Réceptions d’exception</span>
            <span className="hidden sm:inline">
              Des réceptions d’exception,{' '}
              <span className="text-primary">conçues pour marquer les esprits</span>
            </span>
          </h2>

          <p className="hidden sm:block text-base text-muted leading-relaxed max-w-xl mx-auto">
            Inspirations visuelles pour vos réceptions en RDC — le catalogue réel est juste en dessous.
          </p>

          <div
            className="grid grid-cols-4 gap-1.5 w-full pt-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-2"
            role="group"
            aria-label="Filtrer par catégorie"
          >
            <button
              type="button"
              aria-pressed={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              className={cn(
                'min-h-[44px] w-full sm:w-auto px-1 sm:px-3.5 py-2 rounded-[var(--radius-button)] text-sm font-semibold leading-tight text-center transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background inline-flex items-center justify-center',
                activeCategory === 'all'
                  ? 'bg-primary-solid text-primary-foreground shadow-xs'
                  : 'bg-surface border border-border text-foreground hover:bg-surface-muted',
              )}
            >
              <span className="sm:hidden">Tout</span>
              <span className="hidden sm:inline">Toutes les inspirations</span>
            </button>
            {GALLERY_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={activeCategory === item.id}
                onClick={() => setActiveCategory(item.id)}
                className={cn(
                  'min-h-[44px] w-full sm:w-auto px-1 sm:px-3.5 py-2 rounded-[var(--radius-button)] text-sm font-semibold leading-tight text-center transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background inline-flex items-center justify-center',
                  activeCategory === item.id
                    ? 'bg-primary-solid text-primary-foreground shadow-xs'
                    : 'bg-surface border border-border text-foreground hover:bg-surface-muted',
                )}
              >
                <span className="sm:hidden">{item.chip}</span>
                <span className="hidden sm:inline">{item.title.split('&')[0].trim()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grille d'images photographiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.id}
                className="group relative rounded-[var(--radius-card)] border border-border bg-surface-muted/60 overflow-hidden shadow-md hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Photo avec ratio cinématique et overlay subtil */}
                <div className="relative aspect-[16/10] overflow-hidden bg-stage">
                  <LandingMedia
                    src={item.imageUrl}
                    alt={item.title}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badge flottant en haut */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-stage/80 border border-stage-foreground/20 text-stage-foreground text-sm font-bold inline-flex items-center gap-1 shadow-sm">
                      <Icon className="w-3.5 h-3.5 text-festive-on-stage" />
                      {item.badge}
                    </span>
                  </div>

                  {/* Titre et localisation incrustés en bas de l'image */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="hidden sm:block text-sm font-bold text-festive-on-stage">
                      {item.category}
                    </span>
                    <h3 className="text-base font-bold text-white drop-shadow-sm line-clamp-1">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Contenu et Call to action */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-sm text-foreground font-medium">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed hidden sm:block line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-border flex items-center justify-between gap-2">
                    <Link
                      href={item.href}
                      className="min-h-[44px] inline-flex items-center justify-center sm:justify-start gap-1.5 text-sm font-bold text-primary hover:text-primary-hover group/link transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[var(--radius-button)]"
                      aria-label={`Explorer : ${item.title}`}
                    >
                      <span className="sm:hidden">Explorer</span>
                      <span className="hidden sm:inline">Explorer ces offres</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform motion-reduce:transition-none" />
                    </Link>

                    {isBudgetBlocked ? (
                      <Link
                        href={budgetHref}
                        className="min-h-[44px] px-3 py-2 rounded-[var(--radius-button)] bg-festive-accent/10 hover:bg-festive-accent/20 text-foreground text-sm font-bold inline-flex items-center justify-center gap-1.5 transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background border border-festive-accent/30"
                        aria-label="Simulateur budget IA (Fonctionnalité à venir)"
                        title="Simulateur budget IA (Fonctionnalité à venir)"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span className="sm:hidden">Budget IA</span>
                        <span className="hidden sm:inline">Budget IA · À venir</span>
                      </Link>
                    ) : (
                      <Link
                        href={budgetHref}
                        className="min-h-[44px] px-3 py-2 rounded-[var(--radius-button)] bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold inline-flex items-center justify-center gap-1.5 transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label={user
                          ? 'Ouvrir le simulateur budget dans le tableau de bord (1 jeton)'
                          : 'Estimer un budget avec 3 formules IA (1 jeton)'}
                        title={user
                          ? 'Ouvrir le simulateur budget dans le tableau de bord (1 jeton)'
                          : 'Estimer un budget avec 3 formules IA (1 jeton)'}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span className="sm:hidden">Budget IA</span>
                        <span className="hidden sm:inline">Estimer mon budget · 1 jeton</span>
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Bandeau de réassurance visuelle */}
        <div className="p-4 sm:p-6 rounded-[var(--radius-card)] bg-gradient-to-r from-primary/15 via-surface to-primary/10 border border-primary/25 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-button)] bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Salles et prestataires en RDC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              href="/marketplace"
              size="md"
              variant="primary"
              className="w-full sm:w-auto"
              aria-label="Explorer tout le catalogue"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              <span className="sm:hidden">Voir le catalogue</span>
              <span className="hidden sm:inline">Explorer tout le catalogue</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
