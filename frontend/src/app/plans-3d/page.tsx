'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import {
  ROOM_LAYOUT_TEMPLATES,
  applyRoomTemplate,
  type RoomLayoutBlueprint,
  type RoomLayoutTemplate,
} from '@/lib/roomLayoutUtils';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  LayoutGrid,
  Eye,
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  ScanLine,
  Box,
  Layers,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import LandingRoomPlanAiStudio from '@/components/landing/LandingRoomPlanAiStudio';

const RoomLayoutPreview = dynamic(() => import('@/components/RoomLayoutPreview'), {
  loading: () => (
    <div className="w-full aspect-[16/10] sm:aspect-[16/9] max-h-[560px] rounded-2xl bg-surface-muted/80 animate-pulse flex items-center justify-center text-xs text-muted">
      Chargement du rendu spatial 2D / 3D…
    </div>
  ),
  ssr: false,
});

const SHOWCASE_TEMPLATES = [
  { id: 'banquet-honor', category: 'wedding', label: 'Mariage & Table d’Honneur' },
  { id: 'banquet-classic', category: 'banquet', label: 'Banquet & Réception' },
  { id: 'cocktail', category: 'cocktail', label: 'Cocktail & Mange-debout' },
  { id: 'conference-standard', category: 'pro', label: 'Conférence & Séminaire' },
  { id: 'chairs-ceremony', category: 'wedding', label: 'Cérémonie & Allée Nuptiale' },
  { id: 'banquet-ushape', category: 'banquet', label: 'Banquet en U' },
  { id: 'boardroom', category: 'pro', label: 'Salle de Conseil VIP' },
  { id: 'chairs-theater', category: 'pro', label: 'Auditorium & Théâtre' },
  { id: 'classroom', category: 'pro', label: 'Formation & Classe' },
];

const CATEGORIES = [
  { id: 'all', label: 'Tous les modèles' },
  { id: 'wedding', label: 'Mariages & Célébrations' },
  { id: 'banquet', label: 'Banquets & Dîners' },
  { id: 'pro', label: 'Conférences & Entreprise' },
  { id: 'cocktail', label: 'Cocktails & Fêtes' },
];

export default function Plans3DPage() {
  const { user } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('banquet-honor');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [force2d, setForce2d] = useState(false);
  const [studioBlueprint, setStudioBlueprint] = useState<RoomLayoutBlueprint | null>(null);

  const selectedTemplate = useMemo(() => {
    return (
      ROOM_LAYOUT_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      ROOM_LAYOUT_TEMPLATES[0]
    );
  }, [selectedTemplateId]);

  const templateBlueprint = useMemo<RoomLayoutBlueprint | null>(() => {
    try {
      return applyRoomTemplate(selectedTemplateId);
    } catch {
      return null;
    }
  }, [selectedTemplateId]);
  const activeBlueprint = studioBlueprint ?? templateBlueprint;

  const filteredTemplates = useMemo(() => {
    return SHOWCASE_TEMPLATES.filter((item) => {
      if (selectedCategory === 'all') return true;
      return item.category === selectedCategory;
    });
  }, [selectedCategory]);

  const editorUrl = user
    ? '/dashboard/rooms'
    : '/register?kind=ORGANIZER&intent=personal&action=room_editor';

  // Statistiques du blueprint actif
  const stats = useMemo(() => {
    if (!activeBlueprint) return { seats: 0, tables: 0, fixtures: 0 };
    let seats = 0;
    let tables = 0;
    for (const f of activeBlueprint.furniture) {
      if (f.kind === 'table') {
        tables += 1;
        seats += f.capacity || 0;
      }
    }
    const fixtures = activeBlueprint.fixtures?.length || 0;
    return { seats, tables, fixtures };
  }, [activeBlueprint]);

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      {/* ─── Hero épuré ─── */}
      <PublicPageHero
        title="Modèles de salles 2D & 3D interactifs"
        description="Mariages, banquets, conférences ou cocktails. Composez un plan avec l’IA, explorez-le en 2D / 3D, puis ouvrez-le dans l’éditeur."
        compact
      >
        <div className="pt-1 flex flex-wrap items-center gap-2.5">
          <a
            href="#studio-ia"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover active:scale-95 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ouvrir le studio IA</span>
          </a>
          <Link
            href="/marketplace/salles"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Explorer les salles en RDC</span>
          </Link>
        </div>
      </PublicPageHero>

      <div className="page-container py-6 sm:py-10 space-y-12">
        <LandingRoomPlanAiStudio
          defaultExpanded
          onBlueprintChange={setStudioBlueprint}
        />

        {/* ─── Studio Interactif 2D/3D ─── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/80 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  {studioBlueprint ? 'Plan généré par l’IA' : selectedTemplate.name}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {selectedTemplate.roomType}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5 line-clamp-1">
                {selectedTemplate.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex items-center rounded-lg border border-border bg-surface-muted p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setForce2d(false)}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5',
                    !force2d
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Vue 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForce2d(true)}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5',
                    force2d
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Plan 2D</span>
                </button>
              </div>

              <Link href={editorUrl}>
                <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Personnaliser
                </Button>
              </Link>
            </div>
          </div>

          {/* Visualiseur WebGL / 2D interactif */}
          <div className="rounded-2xl sm:rounded-3xl border border-primary/25 bg-stage overflow-hidden shadow-xl relative">
            <div className="w-full aspect-[16/10] sm:aspect-[16/9] max-h-[580px] min-h-[340px]">
              {activeBlueprint ? (
                <RoomLayoutPreview
                  blueprint={activeBlueprint}
                  quality="showcase"
                  force2d={force2d}
                  showDepthControls={false}
                  showMeta={false}
                  allowMobileExpand
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                  Modèle non disponible.
                </div>
              )}
            </div>

            {/* Barre flottante d'indicateurs de capacité */}
            <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 flex items-center justify-between pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-xs">
                {stats.seats > 0 && (
                  <span className="flex items-center gap-1 font-semibold tabular-nums">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>~{stats.seats} convives</span>
                  </span>
                )}
                {stats.tables > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-white/80 tabular-nums">
                    <LayoutGrid className="w-3 h-3 text-amber-400" />
                    <span>{stats.tables} tables</span>
                  </span>
                )}
                <span className="hidden sm:inline text-white/40">·</span>
                <span className="text-white/70 text-[11px]">100% dans le navigateur</span>
              </div>

              <div className="pointer-events-auto text-[11px] text-white/80 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 hidden sm:block">
                Astuce : Cliquez et glissez pour explorer à 360°
              </div>
            </div>
          </div>
        </section>

        {/* ─── Sélecteur de Modèles pré-configurés ─── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                <span>Modèles d’agencement prêts à l’emploi</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Cliquez sur un modèle pour le charger dans le studio interactif ci-dessus.
              </p>
            </div>

            {/* Filtres par catégorie */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold transition shrink-0 border focus-visible:outline-none',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-surface border-border text-muted hover:text-foreground hover:bg-surface-muted',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((item) => {
              const tpl = ROOM_LAYOUT_TEMPLATES.find((t) => t.id === item.id);
              if (!tpl) return null;
              const isSelected = selectedTemplateId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  className={cn(
                    'group rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer text-left',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
                      : 'border-border/80 bg-surface hover:border-primary/40 hover:shadow-xs',
                  )}
                  onClick={() => {
                    setStudioBlueprint(null);
                    setSelectedTemplateId(tpl.id);
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-0.5 rounded-full bg-surface-muted border border-border">
                        {item.label}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          <span>Actif</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted">
                      {tpl.outlineShape === 'circle' ? 'Salle circulaire' : 'Salle rectangulaire'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStudioBlueprint(null);
                        setSelectedTemplateId(tpl.id);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Voir en 3D</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Piliers technologiques de l’éditeur ─── */}
        <section className="rounded-2xl sm:rounded-3xl border border-border/80 bg-surface/70 p-6 sm:p-8 space-y-6">
          <div className="max-w-2xl space-y-1.5">
            <h2 className="em-landing-heading text-lg sm:text-2xl text-foreground">
              Tout ce dont vous avez besoin pour agencer votre salle
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Une suite d’outils intégrée pour éliminer les erreurs de disposition le jour J.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="space-y-2 p-3.5 rounded-xl bg-surface border border-border/70">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">Plan 2D au millimètre</h3>
              <p className="text-xs text-muted leading-relaxed">
                Cotations exactes, grille magnétique, allées de sécurité et sens d’ouverture des portes.
              </p>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl bg-surface border border-border/70">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">Visite 3D interactive</h3>
              <p className="text-xs text-muted leading-relaxed">
                Exploration à 360° dans le navigateur, textures réalistes, lustres suspendus et ambiances lumineuses.
              </p>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl bg-surface border border-border/70">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">Placement & Attribution</h3>
              <p className="text-xs text-muted leading-relaxed">
                Assignation nominative des sièges, gestion des régimes alimentaires et suivi d’occupation en direct.
              </p>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl bg-surface border border-border/70">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <ScanLine className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">Accueil QR le Jour J</h3>
              <p className="text-xs text-muted leading-relaxed">
                Numéro de table sur l’invitation WhatsApp et orientation immédiate de vos invités au scan QR à l’entrée.
              </p>
            </div>
          </div>
        </section>

      </div>

      <PublicCtaBand
        title="Prêt à concevoir le plan de votre événement ?"
        description="Modélisez vos réceptions au millimètre et placez vos invités — plans 2D cotés, visite 3D et accueil QR le jour J."
        highlights={[
          { icon: LayoutGrid, label: 'Plan 2D coté' },
          { icon: Eye, label: 'Visite 3D 360°' },
          { icon: Users, label: 'Placement VIP' },
          { icon: ScanLine, label: 'Accueil QR' },
        ]}
        primaryHref={editorUrl}
        primaryLabel="Lancer l’éditeur maintenant"
        secondaryHref="/tarifs"
        secondaryLabel="Voir les forfaits"
      />
    </PublicPageShell>
  );
}
