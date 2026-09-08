'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import {
  ROOM_LAYOUT_TEMPLATES,
  applyRoomTemplate,
  type RoomLayoutBlueprint,
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
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import LandingRoomPlanAiStudio from '@/components/landing/LandingRoomPlanAiStudio';
import PlanViewModeToggle from '@/components/PlanViewModeToggle';
import { StudioHowTo } from '@/components/StudioAiTabs';

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
  { id: 'all', label: 'Tous' },
  { id: 'wedding', label: 'Mariages' },
  { id: 'banquet', label: 'Banquets' },
  { id: 'pro', label: 'Entreprise' },
  { id: 'cocktail', label: 'Cocktails' },
];

export default function Plans3DPage() {
  const { user, access } = useAuth();
  const protocolLocked = Boolean(access?.isProtocolOnly);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('banquet-honor');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [force2d, setForce2d] = useState(true);
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

  const editorUrl = protocolLocked
    ? '/dashboard/protocol'
    : user
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
          <Button href="#plan-viewer" size="sm">
            Voir le plan 2D / 3D
          </Button>
          <Button href="#studio-ia" size="sm" variant="secondary" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
            Composer avec l’IA
          </Button>
          <Button href="/marketplace/salles" size="sm" variant="ghost" leftIcon={<Building2 className="w-3.5 h-3.5" />}>
            Salles en RDC
          </Button>
        </div>
      </PublicPageHero>

      <div className="page-container py-6 sm:py-10 space-y-12">
        <section id="plan-viewer" className="space-y-4 scroll-mt-20">
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {studioBlueprint ? 'Plan généré par l’IA' : selectedTemplate.name}
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {studioBlueprint
                ? 'Le studio IA a posé ce plan. Basculez 2D / 3D, puis ouvrez l’éditeur pour le peaufiner.'
                : selectedTemplate.description}
            </p>
            <StudioHowTo
              steps={[
                'Choisissez un modèle ci-dessous',
                'Basculez Plan 2D ou Vue 3D',
                'Personnalisez dans l’éditeur',
              ]}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <PlanViewModeToggle force2d={force2d} onChange={setForce2d} />
            <Button href={editorUrl} size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              {protocolLocked ? 'Desk protocole' : 'Personnaliser dans l’éditeur'}
            </Button>
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
            <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 flex items-center justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-foreground/85 px-3 py-1.5 rounded-full border border-background/20 text-background text-xs">
                {stats.seats > 0 && (
                  <span className="flex items-center gap-1 font-semibold tabular-nums">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>~{stats.seats} convives</span>
                  </span>
                )}
                {stats.tables > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-background/80 tabular-nums">
                    <LayoutGrid className="w-3 h-3" />
                    <span>{stats.tables} tables</span>
                  </span>
                )}
              </div>
              <p className="pointer-events-auto text-xs text-background bg-foreground/80 px-2.5 py-1.5 rounded-full border border-background/15">
                {force2d ? 'Plan coté vu du dessus' : 'Glissez pour tourner à 360°'}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Sélecteur de Modèles pré-configurés ─── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Modèles d’agencement
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                Un clic charge le plan dans la vue ci-dessus.
              </p>
            </div>

            {/* Filtres par catégorie */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={selectedCategory === cat.id}
                  className={cn(
                    'px-3 min-h-11 rounded-full text-xs font-semibold transition shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
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
                <button
                  type="button"
                  key={tpl.id}
                  aria-pressed={isSelected}
                  className={cn(
                    'group rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 text-left w-full',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
                      : 'border-border/80 bg-surface hover:border-primary/40 hover:shadow-xs',
                  )}
                  onClick={() => {
                    setStudioBlueprint(null);
                    setSelectedTemplateId(tpl.id);
                    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    document.getElementById('plan-viewer')?.scrollIntoView({
                      block: 'start',
                      behavior: reduceMotion ? 'auto' : 'smooth',
                    });
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted px-2 py-0.5 rounded-full bg-surface-muted border border-border">
                        {item.label}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
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
                    <span className="text-xs font-semibold text-muted">
                      {tpl.outlineShape === 'circle' ? 'Salle circulaire' : 'Salle rectangulaire'}
                    </span>
                    <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" aria-hidden />
                      <span>Charger ce plan</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <LandingRoomPlanAiStudio
          defaultExpanded={false}
          onBlueprintChange={setStudioBlueprint}
        />

        <section className="space-y-4">
          <div className="max-w-2xl space-y-1.5">
            <h2 className="em-landing-heading text-lg sm:text-2xl text-foreground">
              Du plan coté à l’accueil jour J
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Même fichier : millimètres en 2D, visite 3D, places nominatives, QR à l’entrée.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <li className="flex gap-3">
              <LayoutGrid className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-foreground">Plan 2D au millimètre</p>
                <p className="text-xs text-muted leading-relaxed">Cotations, allées de sécurité, ouverture des portes.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Eye className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-foreground">Visite 3D</p>
                <p className="text-xs text-muted leading-relaxed">Tournez la salle dans le navigateur, sans plugin.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-foreground">Placement des invités</p>
                <p className="text-xs text-muted leading-relaxed">Sièges nominatifs liés à la liste et au RSVP.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <ScanLine className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-foreground">Accueil QR</p>
                <p className="text-xs text-muted leading-relaxed">Table et siège sur l’invitation, scan à l’entrée.</p>
              </div>
            </li>
          </ul>
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
        primaryLabel={protocolLocked ? 'Retour au desk protocole' : 'Lancer l’éditeur maintenant'}
        secondaryHref="/tarifs"
        secondaryLabel="Voir les forfaits"
      />
    </PublicPageShell>
  );
}
