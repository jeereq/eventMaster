'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  Box,
  Building2,
  FileText,
  Rss,
  LayoutDashboard,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

interface QuickCard {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  mobileSubtitle: string;
  imageUrl: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_CARDS: QuickCard[] = [
  {
    id: 'salles-3d',
    badge: 'Immersion 3D',
    title: 'Salles & Espaces',
    subtitle: 'Visite 3D et agencement au millimètre',
    mobileSubtitle: 'Plans & visite 3D',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=80',
    href: '/plans-3d',
    icon: Box,
  },
  {
    id: 'prestataires',
    badge: 'Pros vérifiés',
    title: 'Prestataires',
    subtitle: 'Traiteurs, DJ, photographes et déco',
    mobileSubtitle: 'Traiteurs, déco, DJ',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80',
    href: '/marketplace/prestataires',
    icon: Sparkles,
  },
  {
    id: 'modeles',
    badge: 'WhatsApp & QR',
    title: 'Faire-part & RSVP',
    subtitle: 'Modèles chics et suivi en direct',
    mobileSubtitle: 'Modèles & scan QR',
    imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=700&q=80',
    href: '/modeles',
    icon: FileText,
  },
  {
    id: 'publications',
    badge: 'En direct',
    title: 'Publications',
    subtitle: 'Réalisations et coulisses récentes',
    mobileSubtitle: 'Photos & stories',
    imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=700&q=80',
    href: '/activite',
    icon: Rss,
  },
];

export default function LandingHeroStreamlined() {
  const { user } = useAuth();

  return (
    <section className="relative em-landing-hero overflow-hidden pt-6 pb-10 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-20">
      <div className="page-container relative z-10 space-y-6 sm:space-y-10">
        {/* ─── En-tête Hero compact et percutant ─── */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 animate-slide-up">
          {/* Badge festif minimaliste */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] sm:text-xs font-semibold backdrop-blur-sm shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>EventMaster RDC</span>
            <span className="text-primary/40">·</span>
            <span className="text-foreground/90 font-medium">L'art de célébrer</span>
          </div>

          {/* Titre qui marque sans écraser */}
          <h1 className="font-display text-2xl min-[400px]:text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-foreground leading-[1.12]">
            Votre événement d’exception,{' '}
            <br className="hidden sm:inline" />
            <span className="em-glow-text">parfaitement orchestré.</span>
          </h1>

          {/* Description : ultra-courte sur mobile, aérée sur desktop */}
          <p className="text-xs sm:text-base text-muted leading-relaxed max-w-xl mx-auto">
            <span className="hidden sm:inline">
              Salles prestigieuses, prestataires d’exception, plans de table 3D et invitations WhatsApp réunis au même endroit.
            </span>
            <span className="inline sm:hidden">
              Salles, prestataires, plans 3D et invitations WhatsApp réunis dans votre navigateur.
            </span>
          </p>

          {/* Boutons d'action rapides */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Ouvrir mon tableau de bord
                </Button>
              </Link>
            ) : (
              <Link href="/marketplace">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explorer le marketplace
                </Button>
              </Link>
            )}

            <Link href="/plans-3d">
              <Button
                size="lg"
                variant="secondary"
                leftIcon={<Box className="w-4 h-4 text-primary" />}
                className="bg-surface/80 hover:bg-surface border-border shadow-xs"
              >
                <span>Plans 2D / 3D</span>
              </Button>
            </Link>

            <Link href="/modeles" className="hidden sm:inline-flex">
              <Button
                size="lg"
                variant="ghost"
                leftIcon={<FileText className="w-4 h-4 text-muted" />}
                className="text-muted hover:text-foreground"
              >
                <span>Faire-part & RSVP</span>
              </Button>
            </Link>
          </div>

          {/* Raccourci utilisateur connecté si présent */}
          {user && (
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs text-primary font-semibold">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Connecté en tant que {user.name || user.email}</span>
              </div>
            </div>
          )}

          {/* Réassurance discrète en 1 ligne */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Kinshasa · Lubumbashi · Goma</span>
            </span>
            <span className="hidden min-[480px]:inline text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Mobile Money & Cartes</span>
            </span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>100% dans le navigateur</span>
            </span>
          </div>
        </div>

        {/* ─── Vitrine Visuelle des 4 Univers (Showcase qui marque sans texte lourd) ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1 sm:pt-3">
          {QUICK_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.id}
                href={card.href}
                className="group relative rounded-xl sm:rounded-2xl overflow-hidden border border-border/80 bg-slate-950 aspect-[4/3] sm:aspect-[4/3] shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col justify-between p-2.5 sm:p-4 text-white"
              >
                {/* Image de fond de haute qualité avec zoom fluide */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  loading="eager"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-500"
                />

                {/* Voile sombre pour lisibilité sans faille */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none" />

                {/* Badge supérieur */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wide uppercase bg-black/55 backdrop-blur-md border border-white/20 text-white shadow-xs">
                    <Icon className="w-3 h-3 text-primary" />
                    <span>{card.badge}</span>
                  </span>
                  <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary transition-colors">
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Bas de carte : Titre et sous-titre allégé pour mobile */}
                <div className="relative z-10 space-y-0.5">
                  <h2 className="text-xs sm:text-base font-bold tracking-tight text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                    {card.title}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-white/75 line-clamp-1">
                    <span className="hidden sm:inline">{card.subtitle}</span>
                    <span className="inline sm:hidden">{card.mobileSubtitle}</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
