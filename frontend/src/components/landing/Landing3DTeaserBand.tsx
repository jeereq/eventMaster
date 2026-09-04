'use client';

import React from 'react';
import { ArrowRight, LayoutGrid, Eye, Users, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function Landing3DTeaserBand() {
  const { user } = useAuth();
  const editorUrl = user
    ? '/dashboard/rooms'
    : '/register?kind=ORGANIZER&intent=personal&action=room_editor';

  return (
    <section className="em-landing-defer py-10 sm:py-14 border-t border-border bg-gradient-to-b from-surface/90 to-surface-muted/50">
      <div className="page-container relative z-10">
        <div className="rounded-[var(--radius-card)] border border-primary/30 em-stage p-6 sm:p-10 shadow-xl">

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            <div className="max-w-2xl space-y-3">
              <h2 className="em-landing-heading text-xl sm:text-3xl lg:text-4xl text-stage-foreground">
                Modélisez vos réceptions au millimètre et placez vos invités
              </h2>

              <p className="text-xs sm:text-sm text-stage-foreground/80 leading-relaxed max-w-xl">
                <span className="hidden sm:inline">
                  Tables rondes, scènes d’honneur, allées et éclairages : testez nos modèles 2D/3D prêts à l'emploi directement dans votre navigateur.
                </span>
                <span className="inline sm:hidden">
                  Agencement précis, visite 3D fluide et synchronisation avec les invitations WhatsApp.
                </span>
              </p>

              {/* 4 points clés en capsules compactes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] sm:text-xs text-stage-foreground/90 font-medium">
                <div className="flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                  <span>Plan 2D coté</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Visite 3D 360°</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-festive-on-stage shrink-0" />
                  <span>Placement VIP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ScanLine className="w-3.5 h-3.5 text-festive-accent shrink-0" />
                  <span>Accueil QR</span>
                </div>
              </div>
            </div>

            {/* Actions directes vers la page dédiée */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 sm:w-auto w-full">
              <Button
                href="/plans-3d"
                size="lg"
                variant="primary"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full justify-center shadow-md font-semibold text-xs sm:text-sm"
              >
                Découvrir les modèles 3D
              </Button>
              <Button
                href={editorUrl}
                size="lg"
                variant="secondary"
                className="w-full justify-center bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs sm:text-sm font-semibold"
              >
                Ouvrir l’éditeur
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
