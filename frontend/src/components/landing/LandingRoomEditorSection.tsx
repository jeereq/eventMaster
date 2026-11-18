'use client';

/**
 * Accueil : mise en avant de l’éditeur de salles 2D / 3D. Les niveaux affichés sont lus dans
 * `roomEditorCapabilities`, la même source que l’éditeur et son guide : la page ne peut pas
 * promettre ce que le forfait ne débloque pas.
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Box, Building2, CheckCircle2, GraduationCap, Keyboard, Ruler, Sparkles, Wine } from '@/components/icons';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { roomEditorCapabilities, type RoomEditorLevel } from '@/lib/roomEditorAccess';
import { editorTourSummary } from '@/lib/roomEditorTour';

const VIEWS = [
  {
    id: 'plan',
    label: 'Plan à l’échelle',
    src: '/images/landing/editor/editeur-plan.webp',
    alt: 'Éditeur de salle : plan d’un banquet avec tables rondes, scène et panneau de réglages',
    caption: 'Chaque élément est à sa taille réelle, avec ses espacements de circulation.',
  },
  {
    id: '3d',
    label: 'Visite 3D',
    src: '/images/landing/editor/editeur-3d.webp',
    alt: 'Vue 3D d’une salle de mariage dressée : parquet en chevrons, scène drapée, piste de danse avec monogramme et lustres',
    caption: 'La même salle en 3D : matières, lumière et reflets, directement dans le navigateur.',
  },
  {
    id: 'decor',
    label: 'Bars et décor',
    src: '/images/landing/editor/editeur-bar.webp',
    alt: 'Bar à vins en 3D : façade en douelles, comptoir en chêne et casier à bouteilles',
    caption: 'Bars, scène, lustres, instruments : chaque pièce s’habille à votre goût.',
  },
] as const;

const FEATURES = [
  { icon: Ruler, title: 'Plan au centimètre', text: 'Tables, rangées, scène et allées à l’échelle. L’outil « Espacements » repère les passages trop étroits.' },
  { icon: Box, title: 'Visite 3D réaliste', text: 'Passez du plan à la 3D d’un clic et faites visiter la salle à vos clients ou à vos proches.' },
  { icon: Wine, title: 'Décor complet', text: 'Douze bars, podiums, lustres, instruments, fleurs, écrans… avec façade, matière et couleur réglables.' },
  { icon: Sparkles, title: 'Studio IA', text: 'Décrivez l’événement ou envoyez une photo du plan : l’IA compose la salle, vous ajustez.' },
  { icon: Keyboard, title: 'Rapide à prendre en main', text: 'Ctrl+K pour ajouter, copier-coller, modèles prêts, et une visite guidée qui suit votre forfait.' },
] as const;

const LEVELS: RoomEditorLevel[] = ['basic', 'standard', 'advanced', 'complete'];

export default function LandingRoomEditorSection() {
  const { user } = useAuth();
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('3d');
  const active = VIEWS.find((v) => v.id === view) ?? VIEWS[1];
  // Visiteur : les modèles 2D / 3D publics ; inscrit : ses salles, visite guidée lancée à l’ouverture de l’éditeur.
  const tryHref = user ? '/dashboard/rooms' : '/plans-3d';
  const guideHref = user ? '/dashboard/rooms?guide=1' : `/register?next=${encodeURIComponent('/dashboard/rooms?guide=1')}`;

  return (
    <section id="editeur-salles" className="bg-background py-14 sm:py-20 scroll-mt-16 md:scroll-mt-24" aria-labelledby="editeur-salles-title">
      <div className="page-container space-y-8 sm:space-y-10">
        <div className="max-w-3xl">
          <span className="text-xs sm:text-sm font-bold text-primary tracking-[0.06em] uppercase">Éditeur de salles 2D / 3D</span>
          <h2 id="editeur-salles-title" className="em-landing-heading mt-3 text-3xl sm:text-[2.5rem] font-bold text-foreground">
            Votre salle, dessinée et visitée avant le jour J
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted">
            Organisateurs comme gérants de salle : posez tables, scène et décor sur le vrai plan, vérifiez les passages, puis montrez le résultat en 3D.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <figure className="space-y-3">
            <div role="tablist" aria-label="Aperçus de l’éditeur" className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  id={`editor-view-${v.id}`}
                  aria-selected={view === v.id}
                  aria-controls="editor-view-panel"
                  onClick={() => setView(v.id)}
                  className={cn(
                    'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    view === v.id ? 'bg-primary-solid text-primary-foreground' : 'text-muted hover:text-foreground',
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div
              id="editor-view-panel"
              role="tabpanel"
              aria-labelledby={`editor-view-${active.id}`}
              className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] border border-border bg-surface-muted shadow-[var(--shadow-soft)]"
            >
              {VIEWS.map((v) => (
                <Image
                  key={v.id}
                  src={v.src}
                  alt={v.alt}
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className={cn('object-cover transition-opacity duration-500 motion-reduce:transition-none', v.id === active.id ? 'opacity-100' : 'opacity-0')}
                  aria-hidden={v.id !== active.id}
                />
              ))}
            </div>
            <figcaption className="text-sm text-muted">{active.caption}</figcaption>
          </figure>

          <div className="space-y-5">
            <ul className="space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">{f.title}</span>
                    <span className="block text-sm text-muted">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col min-[420px]:flex-row gap-3">
              <Button href={tryHref} size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                {user ? 'Ouvrir mes salles' : 'Essayer l’éditeur'}
              </Button>
              <Button href={guideHref} size="lg" variant="secondary" leftIcon={<GraduationCap className="w-4 h-4" />}>
                {user ? 'Visite guidée' : 'Créer mon compte'}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-display text-xl font-bold text-foreground">Ce que débloque chaque niveau d’éditeur</h3>
            <Link href="/tarifs" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Quel forfait pour quel niveau <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((level, i) => {
              const caps = roomEditorCapabilities(level, true);
              const summary = editorTourSummary(caps);
              const prev = i > 0 ? editorTourSummary(roomEditorCapabilities(LEVELS[i - 1], true)).included : [];
              // Ce que le niveau ajoute au précédent (le nombre de tables change toujours).
              const added = summary.included.filter((item) => !prev.includes(item));
              return (
                <li
                  key={level}
                  className={cn(
                    'rounded-[var(--radius-card)] border p-4',
                    level === 'complete' ? 'border-primary/50 bg-primary/5' : 'border-border bg-surface',
                  )}
                >
                  <p className="text-xs font-bold text-muted">Niveau {i + 1}</p>
                  <p className="font-display text-lg font-bold text-foreground">{caps.label}</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                    {i > 0 ? <li className="text-xs text-muted">Tout le niveau {roomEditorCapabilities(LEVELS[i - 1], true).label}, plus :</li> : null}
                    {added.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-sm text-foreground">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span>
              <strong>Vous gérez une salle ?</strong> Modélisez-la une fois, publiez sa visite 3D sur la marketplace et recevez les demandes de devis
              d’organisateurs qui savent déjà où tout se place.
            </span>
          </p>
          <Button href={user ? '/dashboard/rooms' : '/register?action=venue'} variant="secondary" className="shrink-0">
            {user ? 'Mes salles' : 'Référencer ma salle'}
          </Button>
        </div>
      </div>
    </section>
  );
}
