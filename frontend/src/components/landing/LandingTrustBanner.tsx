'use client';

import React from 'react';
import { Smartphone, LayoutGrid, ScanLine, CreditCard } from 'lucide-react';

const TRUST_POINTS = [
  {
    icon: Smartphone,
    title: '100% Navigateur',
    description: 'Zéro application à installer. Fluide sur mobile et ordinateur.',
    highlight: 'Zéro friction',
  },
  {
    icon: LayoutGrid,
    title: 'Plan de Salle 2D / 3D',
    description: 'Placement de tables, allées, lustres et vue immersive.',
    highlight: 'Visuel direct',
  },
  {
    icon: ScanLine,
    title: 'Scan QR Jour J',
    description: 'Validation d’entrée en 2 secondes au smartphone.',
    highlight: 'Zéro attente',
  },
  {
    icon: CreditCard,
    title: 'Paiements Locaux CDF',
    description: 'Mobile Money (M-Pesa, Orange, Airtel) et cartes bancaires.',
    highlight: '100% sécurisé',
  },
];

export default function LandingTrustBanner() {
  return (
    <section className="border-y border-border/80 bg-surface/50 dark:bg-slate-950/40 backdrop-blur-xs py-7 relative">
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {TRUST_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="flex items-start gap-3 p-3 rounded-[var(--radius-card)] em-hud-card transition-all"
              >
                <div className="w-9 h-9 rounded-lg em-glow-icon-box shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-foreground truncate">{point.title}</h4>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{point.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
