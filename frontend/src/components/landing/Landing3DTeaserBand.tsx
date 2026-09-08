'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, LayoutGrid, Eye, Users, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { applyRoomTemplate } from '@/lib/roomLayoutUtils';
import PlanViewModeToggle from '@/components/PlanViewModeToggle';

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

export default function Landing3DTeaserBand() {
  const { user } = useAuth();
  const editorUrl = user
    ? '/dashboard/rooms'
    : '/register?kind=ORGANIZER&intent=personal&action=room_editor';
  const [force2d, setForce2d] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);
  const blueprint = useMemo(() => {
    try {
      return applyRoomTemplate('banquet-honor');
    } catch {
      return null;
    }
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
                Modélisez vos réceptions au millimètre et placez vos invités
              </h2>
              <p className="text-sm text-stage-foreground/80 leading-relaxed">
                Tables, allées et éclairages : explorez un plan 2D coté ou une visite 3D dans le navigateur, puis ouvrez l’éditeur.
              </p>
              <ul className="grid grid-cols-2 gap-2 pt-1 text-xs text-stage-foreground/90 font-medium">
                <li className="flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-festive-on-stage shrink-0" aria-hidden />
                  Plan 2D coté
                </li>
                <li className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-festive-on-stage shrink-0" aria-hidden />
                  Visite 3D 360°
                </li>
                <li className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-festive-on-stage shrink-0" aria-hidden />
                  Placement VIP
                </li>
                <li className="flex items-center gap-1.5">
                  <ScanLine className="w-3.5 h-3.5 text-festive-on-stage shrink-0" aria-hidden />
                  Accueil QR
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
                <p className="text-xs font-semibold text-stage-foreground">
                  {force2d
                    ? 'Plan 2D vu du dessus — basculez en 3D ou ouvrez les modèles.'
                    : 'Glissez pour tourner la salle.'}
                </p>
                <PlanViewModeToggle force2d={force2d} onChange={setForce2d} tone="stage" />
              </div>
              <div className="rounded-[var(--radius-card)] overflow-hidden border border-stage-foreground/15 bg-stage min-h-[240px] sm:min-h-[320px]">
                {previewReady && blueprint ? (
                  <RoomLayoutPreview
                    blueprint={blueprint}
                    quality="standard"
                    force2d={force2d}
                    showMeta={false}
                    allowMobileExpand
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
    </section>
  );
}
