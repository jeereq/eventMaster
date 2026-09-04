'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
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
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import LandingMedia from '@/components/landing/LandingMedia';

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
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'salles-prestige',
    title: 'Salles de Réception & Espaces VIP',
    category: 'Espaces événementiels',
    location: 'Kinshasa · Gombe, Ngaliema, Limete',
    description: 'Salles climatisées, jardins privés et chapiteaux de prestige avec plan 2D/3D et visite virtuelle.',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80',
    icon: Building2,
    href: '/marketplace/salles',
    badge: 'Visite 3D & Réservation',
  },
  {
    id: 'scenographie-deco',
    title: 'Scénographie, Décoration & Fleurs',
    category: 'Décoration & Mobilier',
    location: 'Kinshasa & Lubumbashi',
    description: 'Arches florales, drapés royaux, chaises Napoléon et mises en lumière pour mariages et galas.',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
    icon: Palette,
    href: '/marketplace/prestataires',
    badge: 'Artisans certifiés',
  },
  {
    id: 'traiteur-gastronomie',
    title: 'Traiteurs d’Exception & Cocktails',
    category: 'Gastronomie & Buffets',
    location: 'Partout en RDC',
    description: 'Buffets chauds/froids, spécialités congolaises raffinées, cocktails signatures et service en gants blancs.',
    imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80',
    icon: Utensils,
    href: '/marketplace/prestataires',
    badge: 'Menus sur-mesure',
  },
  {
    id: 'photo-video',
    title: 'Photographie & Cinématographie 4K',
    category: 'Média & Souvenirs',
    location: 'Kinshasa · Lubumbashi · Goma',
    description: 'Reportages HD, drones aériens, galeries privées en ligne et retransmission en direct pour les proches.',
    imageUrl: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=900&q=80',
    icon: Camera,
    href: '/marketplace/prestataires',
    badge: 'Galerie HD Web',
  },
  {
    id: 'sono-dj',
    title: 'Sonorisation, Lumières & DJ Pro',
    category: 'Son & Ambiance',
    location: 'Kinshasa & Lubumbashi',
    description: 'Régies acoustiques haut de gamme, jeux de lumières d’ambiance, écrans LED et DJ professionnels.',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80',
    icon: Music,
    href: '/marketplace/prestataires',
    badge: 'Régie complète',
  },
  {
    id: 'materiel-equipements',
    title: 'Matériel & Équipements de Réception',
    category: 'Logistique & Équipements',
    location: 'Disponibilité immédiate',
    description: 'Location de tentes étanches, groupes électrogènes insonorisés, estrades, climatiseurs mobiles et mobilier.',
    imageUrl: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=900&q=80',
    icon: KeyRound,
    href: '/marketplace/locations',
    badge: 'Livraison & Installation',
  },
];

export default function LandingVisualBanner() {
  const revealRef = useLandingReveal<HTMLElement>();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredItems = activeCategory === 'all'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((item) => item.id === activeCategory);

  return (
    <section
      ref={revealRef}
      id="galerie-inspiration"
      className="em-reveal em-landing-defer py-14 sm:py-20 border-t border-border bg-surface relative overflow-hidden em-landing-section-glow"
    >
      <div className="page-container relative z-10 space-y-10 sm:space-y-12">
        {/* En-tête de section */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <span className="em-festive-chip">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Inspiration & Réalisations
          </span>

          <h2 className="em-landing-heading text-2xl sm:text-4xl text-foreground">
            Des réceptions d’exception,{' '}
            <span className="text-primary">conçues pour marquer les esprits</span>
          </h2>

          <p className="text-sm sm:text-base text-muted leading-relaxed max-w-xl mx-auto">
            Découvrez en images les plus beaux espaces, décors et prestations en RDC.
          </p>

          {/* Filtres de catégories rapides */}
          <div className="em-chip-row -mx-4 px-4 md:mx-0 md:px-0 pt-2">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-2 rounded-[var(--radius-button)] text-sm md:text-xs font-semibold transition cursor-pointer touch-manipulation ${
                activeCategory === 'all'
                  ? 'bg-primary-solid text-primary-foreground shadow-xs'
                  : 'bg-surface-muted border border-border text-muted hover:text-foreground'
              }`}
            >
              Toutes les inspirations
            </button>
            {GALLERY_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveCategory(item.id)}
                className={`px-3.5 py-2 rounded-[var(--radius-button)] text-sm md:text-xs font-semibold transition cursor-pointer touch-manipulation ${
                  activeCategory === item.id
                    ? 'bg-primary-solid text-primary-foreground shadow-xs'
                    : 'bg-surface-muted border border-border text-muted hover:text-foreground'
                }`}
              >
                {item.title.split('&')[0].trim()}
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
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badge flottant en haut */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-sm">
                      <Icon className="w-3.5 h-3.5 text-festive-on-stage" />
                      {item.badge}
                    </span>
                  </div>

                  {/* Titre et localisation incrustés en bas de l'image */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-festive-on-stage block">
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
                    <div className="flex items-center gap-1 text-[11px] text-muted font-medium">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed hidden sm:block line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover group/link transition"
                    >
                      <span>Explorer ces offres</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>

                    <Link
                      href="/#simulateur-ia"
                      className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold inline-flex items-center gap-1 transition"
                      title="Intégrer dans un pack IA"
                    >
                      <Wand2 className="w-3 h-3" />
                      Simuler en pack
                    </Link>
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
                Des prestataires et salles certifiés sur toute la République Démocratique du Congo
              </p>
              <p className="text-xs text-muted">
                Photos réelles, tarifs transparents en CDF et devis direct sans frais d’intermédiaire.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              href="/marketplace"
              size="md"
              variant="primary"
              className="w-full sm:w-auto"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Explorer tout le catalogue
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
