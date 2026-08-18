'use client';

import React from 'react';
import { Shield, ScanLine, Building2, Briefcase, Users, Mail, Lock, TrendingUp, LayoutGrid, Smartphone, CalendarCheck, Heart } from 'lucide-react';
import { ROLE_HIGHLIGHTS, PLATFORM_PILLARS } from '@/config/landingPricing';

const roleIcons = { shield: Shield, scan: ScanLine, building: Building2, briefcase: Briefcase, heart: Heart };
const pillarIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  layout: LayoutGrid,
  qr: ScanLine,
  smartphone: Smartphone,
  users: Users,
  mail: Mail,
  lock: Lock,
  trending: TrendingUp,
  calendar: CalendarCheck,
};

export default function LandingRolesSection() {
  return (
    <>
      <section className="py-16 sm:py-20 bg-background border-t border-border">
        <div className="page-container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="space-y-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Équipes & permissions</p>
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                Chaque rôle voit exactement ce qu&apos;il doit gérer
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                Propriétaire, managers, protocole, salles, prestataires et clients marketplace — sans mélanger les périmètres.
              </p>
              <div className="rounded-[var(--radius-card)] border border-border overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-surface-muted border-b border-border font-semibold text-muted uppercase tracking-wider text-[10px]">
                  <div className="p-3">Rôle</div>
                  <div className="p-3">Périmètre</div>
                  <div className="p-3">Créer</div>
                </div>
                {[
                  ['Propriétaire / Manager', 'Organisation', 'Oui'],
                  ['Protocole org.', 'Tous les invités', 'Non'],
                  ['Manager salle', 'Événements de la salle', 'Non'],
                  ['Protocole événement', 'Invités de l\'événement', 'Non'],
                  ['Client marketplace', 'Favoris & réservations', 'Non'],
                  ['Commercial', 'Parrainage', 'N/A'],
                ].map(([role, scope, create]) => (
                  <div key={role} className="grid grid-cols-3 border-b border-border last:border-0 bg-surface">
                    <div className="p-3 font-medium text-foreground">{role}</div>
                    <div className="p-3 text-muted">{scope}</div>
                    <div className="p-3 text-muted">{create}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {ROLE_HIGHLIGHTS.map((role) => {
                const Icon = roleIcons[role.icon as keyof typeof roleIcons] || Shield;
                return (
                  <div key={role.title} className="p-4 rounded-[var(--radius-card)] border border-border bg-surface">
                    <div className="w-9 h-9 rounded-[var(--radius-button)] bg-surface-muted text-foreground flex items-center justify-center mb-3">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{role.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{role.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-surface border-t border-border">
        <div className="page-container">
          <div className="max-w-2xl mb-10 space-y-2">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Une plateforme complète
            </h2>
            <p className="text-sm text-muted">
              De la conception de salle au scan QR, en passant par le marketplace client (favoris, packs budget) et les réservations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {PLATFORM_PILLARS.map((pillar) => {
              const Icon = pillarIcons[pillar.icon] || Shield;
              return (
                <div key={pillar.title} className="bg-background p-5 rounded-[var(--radius-card)] border border-border">
                  <Icon className="w-5 h-5 text-foreground mb-3" />
                  <h3 className="font-semibold text-foreground text-sm mb-1.5">{pillar.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
