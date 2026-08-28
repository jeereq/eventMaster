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
    <section className="border-y border-border bg-surface-muted/30 py-8 relative">
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {TRUST_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="flex items-start gap-3.5 p-2 rounded-[var(--radius-card)] transition-colors hover:bg-surface/60"
              >
                <div className="w-9 h-9 rounded-[var(--radius-button)] bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs border border-primary/15">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-foreground">{point.title}</h4>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">{point.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
