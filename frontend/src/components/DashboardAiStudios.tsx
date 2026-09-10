'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  Building2,
  Mail,
  Sparkles,
  Wand2,
  CheckCircle2,
  ArrowRight,
  Layers,
  Coins,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isProtocolUser } from '@/lib/protocolAccess';
import { cn } from '@/lib/cn';
import {
  aiStudioPanelId,
  aiStudioTabId,
  type AiStudioId,
} from '@/components/AiStudioTabList';

export type DashboardAiStudioId = AiStudioId;

const LandingInvitationAiGenerator = dynamic(
  () => import('@/components/landing/LandingInvitationAiGenerator'),
  {
    ssr: false,
    loading: () => <StudioPaneFallback label="Chargement du studio invitation…" />,
  },
);

const LandingRoomPlanAiStudio = dynamic(
  () => import('@/components/landing/LandingRoomPlanAiStudio'),
  {
    ssr: false,
    loading: () => <StudioPaneFallback label="Chargement du studio plan de salle…" />,
  },
);

function StudioPaneFallback({ label }: { label: string }) {
  return (
    <div
      className="min-h-[16rem] rounded-[var(--radius-card)] border border-border bg-surface-muted/40 animate-pulse motion-reduce:animate-none flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center gap-2.5 text-xs text-muted">
        <Sparkles className="w-4 h-4 animate-spin motion-reduce:animate-none text-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}

const DASHBOARD_STUDIO_PREFIX = 'dashboard-ai-studio';

interface StudioOption {
  id: DashboardAiStudioId;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Wand2;
  badge: string;
  pillColor: string;
  iconBg: string;
  features: string[];
}

export default function DashboardAiStudios({
  value,
  onChange,
  budget,
}: {
  value: DashboardAiStudioId;
  onChange: (id: DashboardAiStudioId) => void;
  budget: React.ReactNode;
}) {
  const { access } = useAuth();
  const protocolLocked = isProtocolUser(access);
  // Le studio 3D est désormais accessible pour tous les utilisateurs non restreints par le protocole (y compris les clients)
  const showRoom = !protocolLocked;

  const studioOptions: StudioOption[] = [
    {
      id: 'budget',
      title: 'Simulateur Budget',
      subtitle: 'Formules clés en main & Devis',
      description: 'Chiffre 3 formules complètes (Éco, Recommandée, Confort) avec prestataires réels.',
      icon: Wand2,
      badge: '3 formules catalogue',
      pillColor: 'text-amber-700 bg-amber-500/15 border-amber-500/30 dark:text-amber-300',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      features: ['Salles adaptées', 'Traiteurs & Déco', 'Estimation FC & USD'],
    },
    {
      id: 'invite',
      title: 'Studio Invitations',
      subtitle: 'Cartes 9:16 WhatsApp & RSVP',
      description: 'Cartons d’invitation personnalisés 9:16 pour WhatsApp avec confirmation RSVP invité.',
      icon: Mail,
      badge: 'Format WhatsApp 9:16',
      pillColor: 'text-pink-700 bg-pink-500/15 border-pink-500/30 dark:text-pink-300',
      iconBg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
      features: ['Format 9:16 mobile', 'Partage WhatsApp', 'Lien RSVP invité'],
    },
    ...(showRoom
      ? [
          {
            id: 'room' as DashboardAiStudioId,
            title: 'Studio Plans 3D',
            subtitle: 'Aménagement & Visite 3D',
            description: 'Disposition des tables, podiums et circulation avec visite 3D immersive.',
            icon: Building2,
            badge: 'Rendu 3D immersif',
            pillColor: 'text-sky-700 bg-sky-500/15 border-sky-500/30 dark:text-sky-300',
            iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
            features: ['Tables & Chaises', 'Circulation', 'Visite 3D'],
          },
        ]
      : []),
  ];

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const ids = studioOptions.map((s) => s.id);
    const currentIndex = ids.indexOf(value);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % ids.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + ids.length) % ids.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = ids.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onChange(ids[nextIndex]);
    const nextEl = document.getElementById(aiStudioTabId(DASHBOARD_STUDIO_PREFIX, ids[nextIndex]));
    nextEl?.focus();
  };

  return (
    <div className="space-y-6">
      {/* ─── BLOC DE SÉLECTION : STUDIOS CRÉATIFS ACTIFS ─── */}
      <section
        className="rounded-2xl border border-primary/20 bg-gradient-to-b from-surface via-surface to-surface-muted/50 p-4 sm:p-5 shadow-xs space-y-4"
        aria-label="Sélection des studios créatifs actifs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Studios actifs
            </h2>
            <p className="text-xs text-muted">
              Sélectionnez un atelier : calcul de budget, invitations ou plan de salle 3D.
            </p>
          </div>
        </div>

        {/* ─── GRILLE DES OPTIONS DE STUDIOS ACTIFS ─── */}
        <div
          role="tablist"
          aria-label="Options des studios créatifs actifs"
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
          onKeyDown={handleKeyDown}
        >
          {studioOptions.map((studio) => {
            const isSelected = value === studio.id;
            const Icon = studio.icon;

            return (
              <button
                key={studio.id}
                id={aiStudioTabId(DASHBOARD_STUDIO_PREFIX, studio.id)}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={aiStudioPanelId(DASHBOARD_STUDIO_PREFIX, studio.id)}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onChange(studio.id)}
                className={cn(
                  'group relative text-left rounded-xl p-4 transition-all duration-150 flex flex-col justify-between gap-3 border cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                  isSelected
                    ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-md translate-y-[-1px]'
                    : 'bg-surface/80 hover:bg-surface border-border/80 hover:border-primary/40 hover:shadow-xs',
                )}
              >
                {/* Ligne haute : Icône + Statut studio actif */}
                <div className="flex items-center justify-between gap-2">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105', studio.iconBg)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                      Studio actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/15 text-muted border border-border/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                      Prêt
                    </span>
                  )}
                </div>

                {/* Corps : Titre et description */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className={cn('text-sm font-bold transition', isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary')}>
                      {studio.title}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium text-foreground/80">
                    {studio.subtitle}
                  </p>
                  <p className="text-xs text-muted leading-relaxed line-clamp-2 pt-0.5">
                    {studio.description}
                  </p>
                </div>

                {/* Ligne basse : Caractéristiques & Bouton d'action */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex flex-wrap gap-1">
                    {studio.features.slice(0, 2).map((feat, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium text-muted bg-surface-muted px-1.5 py-0.5 rounded-md"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>

                  <span
                    className={cn(
                      'text-xs font-bold inline-flex items-center gap-1 transition shrink-0',
                      isSelected ? 'text-primary' : 'text-muted group-hover:text-primary',
                    )}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        Ouvert
                      </>
                    ) : (
                      <>
                        Ouvrir
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                      </>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── CONTENU DU STUDIO ACTIF SÉLECTIONNÉ ─── */}
      <div
        role="tabpanel"
        id={aiStudioPanelId(DASHBOARD_STUDIO_PREFIX, 'budget')}
        aria-labelledby={aiStudioTabId(DASHBOARD_STUDIO_PREFIX, 'budget')}
        hidden={value !== 'budget'}
        className="focus:outline-none"
      >
        {value === 'budget' ? budget : null}
      </div>

      <div
        role="tabpanel"
        id={aiStudioPanelId(DASHBOARD_STUDIO_PREFIX, 'invite')}
        aria-labelledby={aiStudioTabId(DASHBOARD_STUDIO_PREFIX, 'invite')}
        hidden={value !== 'invite'}
        className="focus:outline-none"
      >
        {value === 'invite' ? (
          <LandingInvitationAiGenerator id="dashboard-studio-invite" defaultExpanded />
        ) : null}
      </div>

      {showRoom ? (
        <div
          role="tabpanel"
          id={aiStudioPanelId(DASHBOARD_STUDIO_PREFIX, 'room')}
          aria-labelledby={aiStudioTabId(DASHBOARD_STUDIO_PREFIX, 'room')}
          hidden={value !== 'room'}
          className="focus:outline-none"
        >
          {value === 'room' ? (
            <LandingRoomPlanAiStudio id="dashboard-studio-room" defaultExpanded />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
