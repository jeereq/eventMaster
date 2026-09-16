'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, LayoutGrid, Eye, Users, ScanLine, Pencil, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { applyRoomTemplate, type RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import PlanViewModeToggle from '@/components/PlanViewModeToggle';
import { api } from '@/lib/api';
import type { ShowcasePlanData } from '@/components/showcase/ShowcasePlanEditorModal';

const ShowcasePlanEditorModal = dynamic(
  () => import('@/components/showcase/ShowcasePlanEditorModal'),
  { ssr: false }
);

function PreviewFallback() {
  return (
    <div
      className="w-full h-full min-h-[240px] sm:min-h-[320px] rounded-[var(--radius-card)] bg-stage-foreground/10 animate-pulse motion-reduce:animate-none"
      role="status"
      aria-label="Chargement du plan de salle"
    />
  );
}

const RoomLayoutPreview = dynamic(() => import('@/components/RoomLayoutPreview'), {
  ssr: false,
  loading: () => <PreviewFallback />,
});

function resolvePlanBlueprint(plan?: ShowcasePlanData | null): RoomLayoutBlueprint | null {
  if (!plan) {
    try {
      return applyRoomTemplate('banquet-honor');
    } catch {
      return null;
    }
  }
  if (plan.blueprint) {
    return plan.blueprint as RoomLayoutBlueprint;
  }
  const targetId = plan.presetId || plan.id;
  if (targetId) {
    try {
      return applyRoomTemplate(targetId);
    } catch {
      // ignore
    }
  }
  try {
    return applyRoomTemplate('banquet-honor');
  } catch {
    return null;
  }
}

export default function Landing3DTeaserBand() {
  const { user } = useAuth();
  const editorUrl = user
    ? '/dashboard/rooms'
    : '/register?kind=ORGANIZER&intent=personal&action=room_editor';
  const [force2d, setForce2d] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);

  // Privilèges de gestion vitrine
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAuthorizedCommercial = Boolean(
    user?.role === 'COMMERCIAL' && user?.commercialPermissions?.canManageShowcasePlans,
  );
  const canManageShowcase = isSuperAdmin || isAuthorizedCommercial;

  const [showcasePlans, setShowcasePlans] = useState<ShowcasePlanData[]>([]);
  const [activePlan, setActivePlan] = useState<ShowcasePlanData | null>(null);
  const [editorModalOpen, setEditorModalOpen] = useState(false);

  // Chargement des plans configurés en base/paramètres de plateforme
  useEffect(() => {
    let isMounted = true;
    api
      .get('/public/showcase-plans')
      .then((data: any) => {
        if (!isMounted) return;
        if (data?.plans && Array.isArray(data.plans) && data.plans.length > 0) {
          setShowcasePlans(data.plans);
          // Choisir le premier plan publié ou le banquet-honor par défaut
          const candidate =
            data.plans.find((p: ShowcasePlanData) => p.presetId === 'banquet-honor' || p.id === 'banquet-honor') ||
            data.plans[0];
          setActivePlan(candidate);
        }
      })
      .catch((err) => {
        console.warn('[Landing3DTeaserBand] Utilisation du plan vitrine par défaut fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const blueprint = useMemo(() => {
    return resolvePlanBlueprint(activePlan);
  }, [activePlan]);

  const handlePlanSaved = useCallback((savedPlan: ShowcasePlanData) => {
    setShowcasePlans((current) => {
      const idx = current.findIndex((p) => p.id === savedPlan.id);
      if (idx >= 0) {
        const copy = [...current];
        copy[idx] = savedPlan;
        return copy;
      }
      return [savedPlan, ...current];
    });
    setActivePlan(savedPlan);
    setEditorModalOpen(false);
  }, []);

  useEffect(() => {
    setPreviewReady(true);
  }, []);

  return (
    <section className="em-landing-defer py-8 sm:py-14 border-t border-border bg-gradient-to-b from-surface/90 to-surface-muted/50">
      <div className="page-container relative z-10">
        <div className="rounded-[var(--radius-card)] border border-primary/30 em-stage p-5 sm:p-8 lg:p-10">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 lg:gap-10 items-center">
            <div className="max-w-xl space-y-3">
              <h2 className="em-landing-heading text-xl sm:text-3xl lg:text-4xl text-stage-foreground">
                Plan de table 2D coté & visite 3D
              </h2>
              <p className="text-sm text-stage-foreground/80 leading-relaxed">
                Disposition de tables, allées et lustres : visualisez en 2D au millimètre ou plongez en 3D interactive.
              </p>
              <ul className="grid grid-cols-2 gap-2 pt-1 text-xs text-stage-foreground/90 font-medium">
                <li className="flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-festive-on-stage shrink-0" aria-hidden />
                  Plan 2D coté &amp; Allées
                </li>
                <li className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-festive-on-stage shrink-0" aria-hidden />
                  Visite 3D interactive
                </li>
                <li className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-festive-on-stage shrink-0" aria-hidden />
                  Placement des invités
                </li>
                <li className="flex items-center gap-1.5">
                  <ScanLine className="w-3.5 h-3.5 text-festive-on-stage shrink-0" aria-hidden />
                  Accueil QR jour J
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <Button
                  href="/plans-3d"
                  size="lg"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto justify-center"
                >
                  Explorer les modèles
                </Button>
                <Button
                  href={editorUrl}
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto justify-center bg-stage-foreground/10 text-stage-foreground hover:bg-stage-foreground/20 border-stage-foreground/20"
                >
                  Ouvrir l’éditeur
                </Button>
              </div>
            </div>

            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-semibold text-stage-foreground truncate">
                    {force2d
                      ? 'Plan 2D vu du dessus — basculez en 3D ou ouvrez les modèles.'
                      : 'Glissez pour tourner la salle.'}
                  </p>
                  {activePlan?.label && (
                    <span className="hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-stage-foreground/10 text-stage-foreground/90 border border-stage-foreground/15">
                      {activePlan.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canManageShowcase && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditorModalOpen(true)}
                      className="gap-1.5 text-xs font-bold border-amber-400/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 hover:text-white transition shadow-sm min-h-11 sm:min-h-9 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                      aria-label="Éditer le plan 2D/3D vitrine (Super Admin)"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-300" aria-hidden />
                      <span>Éditer ce plan</span>
                    </Button>
                  )}
                  <PlanViewModeToggle force2d={force2d} onChange={setForce2d} tone="stage" />
                </div>
              </div>

              {canManageShowcase && showcasePlans.length > 1 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stage-foreground/5 border border-stage-foreground/10 text-xs text-stage-foreground/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden />
                  <span className="font-semibold text-amber-300 shrink-0">Vitrine Super Admin :</span>
                  <select
                    value={activePlan?.id || ''}
                    onChange={(e) => {
                      const found = showcasePlans.find((p) => p.id === e.target.value);
                      if (found) setActivePlan(found);
                    }}
                    className="bg-stage-foreground/10 text-stage-foreground text-xs rounded-lg px-2.5 py-1.5 min-h-10 sm:min-h-9 border border-stage-foreground/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    aria-label="Sélectionner le plan à afficher et éditer"
                  >
                    {showcasePlans.map((p) => (
                      <option key={p.id} value={p.id} className="bg-surface text-foreground">
                        {p.label || p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-[var(--radius-card)] overflow-hidden border border-stage-foreground/15 bg-stage min-h-[240px] sm:min-h-[320px]">
                {previewReady && blueprint ? (
                  <RoomLayoutPreview
                    blueprint={blueprint}
                    quality="standard"
                    force2d={force2d}
                    onForce2dChange={setForce2d}
                    showMeta={false}
                    allowExpand
                    expandWhen3d
                    className="w-full h-full min-h-[240px] sm:min-h-[320px]"
                  />
                ) : (
                  <PreviewFallback />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale d'édition Super Admin intégrée */}
      {editorModalOpen && (
        <ShowcasePlanEditorModal
          isOpen={editorModalOpen}
          initialPlan={activePlan}
          fallbackBlueprint={blueprint}
          onClose={() => setEditorModalOpen(false)}
          onSaved={handlePlanSaved}
        />
      )}
    </section>
  );
}
