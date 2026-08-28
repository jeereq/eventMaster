'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Mail,
  ScanLine,
  CheckCircle2,
  Sparkles,
  Users,
  MapPin,
  Clock,
  Layers,
  Eye,
  ShieldCheck,
  Smartphone,
  Maximize2,
  Sun,
  Moon,
  Flame,
  Check,
  Crown,
  Heart,
  Volume2,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { LandingProfileId } from '@/lib/landingProfiles';

export type PreviewTab = 'room' | 'rsvp' | 'qr';
export type LightingTheme = 'gala' | 'romantic' | 'night';

interface TableDetail {
  id: string;
  name: string;
  category: 'honour' | 'vip' | 'family' | 'friends';
  placed: number;
  capacity: number;
  menu: string;
  color: string;
}

const TABLES_DATA: Record<string, TableDetail> = {
  honour: {
    id: 'honour',
    name: 'Table d’Honneur (Mariés)',
    category: 'honour',
    placed: 10,
    capacity: 10,
    menu: 'Menu Prestige · Foie gras & Filet d’agneau',
    color: 'from-amber-400 to-amber-600',
  },
  t1: {
    id: 't1',
    name: 'Table Orchidée',
    category: 'vip',
    placed: 8,
    capacity: 8,
    menu: 'Menu Terroir & Capitaine braisé',
    color: 'from-primary to-brand-accent',
  },
  t2: {
    id: 't2',
    name: 'Table Jasmin',
    category: 'vip',
    placed: 8,
    capacity: 8,
    menu: 'Menu Saveurs & Poulet rôti',
    color: 'from-primary to-brand-accent',
  },
  t3: {
    id: 't3',
    name: 'Table Magnolia',
    category: 'family',
    placed: 8,
    capacity: 8,
    menu: 'Menu Découverte & Végétarien',
    color: 'from-primary to-brand-accent',
  },
};

export default function LandingHeroPreview({
  profileId,
}: {
  profileId?: LandingProfileId;
} = {}) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('room');
  const [viewMode3D, setViewMode3D] = useState(true);
  const [lightingTheme, setLightingTheme] = useState<LightingTheme>('gala');
  const [selectedTable, setSelectedTable] = useState<string>('honour');
  const [rsvpAnswered, setRsvpAnswered] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    if (profileId === 'personal') {
      setActiveTab('room');
      setViewMode3D(true);
    } else if (profileId === 'pro') {
      setActiveTab('qr');
    } else if (profileId === 'seeker' || profileId === 'vendor') {
      setActiveTab('room');
      setViewMode3D(true);
    }
  }, [profileId]);

  const activeTableInfo = TABLES_DATA[selectedTable] || TABLES_DATA.honour;

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
      {/* Halo festif & néon d'arrière plan cinématique */}
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/30 via-[color:var(--festive-accent-soft)] to-primary/15 blur-2xl -z-10 opacity-75 pointer-events-none em-pulse-glow"
        aria-hidden
      />

      <div className="em-hud-card overflow-hidden transition-all duration-300">
        {/* En-tête des onglets d'aperçu HUD */}
        <div className="flex items-center justify-between border-b border-border/80 bg-surface-muted/60 dark:bg-slate-900/80 px-3 py-2 gap-1 overflow-x-auto [scrollbar-width:none]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('room')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                activeTab === 'room'
                  ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/30 border border-primary/20'
                  : 'text-muted hover:text-foreground hover:bg-surface/50 dark:hover:bg-white/5',
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Plan 2D / 3D</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rsvp')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                activeTab === 'rsvp'
                  ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/30 border border-primary/20'
                  : 'text-muted hover:text-foreground hover:bg-surface/50 dark:hover:bg-white/5',
              )}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>RSVP WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                activeTab === 'qr'
                  ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/30 border border-primary/20'
                  : 'text-muted hover:text-foreground hover:bg-surface/50 dark:hover:bg-white/5',
              )}
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Pass QR</span>
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Preview
          </span>
        </div>

        {/* ─── CONTENU DYNAMIQUE DE L'APERÇU ─── */}
        <div className="p-4 sm:p-5 min-h-[410px] flex flex-col justify-between">
          {/* ========================================================= */}
          {/* 1. ONGLET : PLAN 2D / 3D INTERACTIF                        */}
          {/* ========================================================= */}
          {activeTab === 'room' && (
            <div className="space-y-3 animate-fade-in">
              {/* Barre d'outils de la salle */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Palais des Congrès · Salon Victoria</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                      Éditeur complet
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    34 / 34 placés (100%) · 24m × 16m · 3 Lustres cristal
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {viewMode3D && (
                    <div className="flex items-center bg-surface-muted/90 dark:bg-slate-900 rounded-full p-0.5 border border-border text-[10px]">
                      <button
                        type="button"
                        onClick={() => setLightingTheme('gala')}
                        title="Ambiance Gala Doré 2700K"
                        className={cn(
                          'px-2 py-1 rounded-full flex items-center gap-1 font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'gala' ? 'bg-amber-500 text-white shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Flame className="w-3 h-3" />
                        <span className="hidden sm:inline">Gala Or</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightingTheme('romantic')}
                        title="Ambiance Romantique Rose Poudré"
                        className={cn(
                          'px-2 py-1 rounded-full flex items-center gap-1 font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'romantic' ? 'bg-rose-500 text-white shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Sun className="w-3 h-3" />
                        <span className="hidden sm:inline">Romantique</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightingTheme('night')}
                        title="Ambiance Nocturne & Spotlights"
                        className={cn(
                          'px-2 py-1 rounded-full flex items-center gap-1 font-semibold transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'night' ? 'bg-indigo-600 text-white shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Moon className="w-3 h-3" />
                        <span className="hidden sm:inline">Nuit</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewMode3D(!viewMode3D)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                      viewMode3D
                        ? 'bg-primary text-primary-foreground border-primary/30 shadow-md shadow-primary/25'
                        : 'bg-surface hover:bg-surface-muted text-foreground border-border',
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {viewMode3D ? 'Rendu 3D' : 'Plan 2D'}
                  </button>
                </div>
              </div>

              {/* CANEVAS DE RENDU VISUEL IMMERSIF */}
              <div
                className={cn(
                  'relative h-[275px] rounded-[var(--radius-card)] border border-border overflow-hidden transition-all duration-500 select-none flex flex-col justify-between p-3',
                  viewMode3D
                    ? lightingTheme === 'gala'
                      ? 'bg-radial-[at_50%_35%] from-amber-950/90 via-[#0a0806] to-black text-amber-100 shadow-inner'
                      : lightingTheme === 'romantic'
                        ? 'bg-radial-[at_50%_35%] from-rose-950/80 via-[#0c0608] to-black text-rose-100 shadow-inner'
                        : 'bg-radial-[at_50%_35%] from-indigo-950/90 via-[#060810] to-black text-indigo-100 shadow-inner'
                    : 'bg-[#fcfbf9] dark:bg-[#0e1117] text-foreground',
                )}
              >
                {/* ──────────────────────────────────────────────────────── */}
                {/* VUE 3D CINÉMATIQUE AMBIANCE SHOWCASE                     */}
                {/* ──────────────────────────────────────────────────────── */}
                {viewMode3D ? (
                  <div className="h-full w-full relative flex flex-col justify-between overflow-hidden">
                    {/* Faisceaux volumétriques lumineux descendants */}
                    <div
                      className={cn(
                        'absolute top-0 inset-x-1/6 h-36 blur-xl pointer-events-none opacity-40 mix-blend-screen transition-all duration-500',
                        lightingTheme === 'gala'
                          ? 'bg-gradient-to-b from-amber-300/60 via-amber-400/10 to-transparent'
                          : lightingTheme === 'romantic'
                            ? 'bg-gradient-to-b from-rose-300/60 via-rose-400/10 to-transparent'
                            : 'bg-gradient-to-b from-cyan-300/60 via-indigo-400/10 to-transparent',
                      )}
                    />

                    {/* Lustres de cristal flottants (3D) */}
                    <div className="relative z-10 flex items-center justify-around px-8">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[9px] text-white/90 shadow-sm">
                        <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                        Lustre Cristal 1
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 backdrop-blur-md border border-amber-300/40 text-[9px] font-bold text-amber-200 shadow-md">
                        <Crown className="w-3 h-3 text-amber-300" />
                        Grand Chandelier Central
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[9px] text-white/90 shadow-sm">
                        <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                        Lustre Cristal 2
                      </div>
                    </div>

                    {/* Scène centrale et podium 3D */}
                    <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                      {/* Estrade & Scène Royale */}
                      <div
                        className={cn(
                          'w-4/5 max-w-[340px] py-2 px-4 rounded-xl border flex items-center justify-between text-[11px] font-bold shadow-xl transition-all duration-300 backdrop-blur-xs mb-3.5',
                          lightingTheme === 'gala'
                            ? 'bg-gradient-to-r from-amber-700/50 via-amber-500/50 to-amber-700/50 border-amber-300/70 text-amber-100 shadow-amber-500/30'
                            : lightingTheme === 'romantic'
                              ? 'bg-gradient-to-r from-rose-700/50 via-rose-500/50 to-rose-700/50 border-rose-300/70 text-rose-100 shadow-rose-500/30'
                              : 'bg-gradient-to-r from-slate-800/80 via-indigo-900/80 to-slate-800/80 border-indigo-400/60 text-indigo-100 shadow-indigo-950/50',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-amber-300" />
                          <span>✦ Scène Royale & Pupitre DJ ✦</span>
                        </span>
                        <span className="text-[8px] bg-white/25 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          Estrade +0.60m
                        </span>
                      </div>

                      {/* Tapis rouge d'honneur central & Tables rondes */}
                      <div className="relative w-full flex items-center justify-center gap-4 sm:gap-7">
                        {/* Tapis central */}
                        <div
                          className={cn(
                            'absolute inset-y-0 w-16 -z-1 opacity-60 rounded-full blur-[1px] transition-colors',
                            lightingTheme === 'gala' ? 'bg-amber-900/40' : lightingTheme === 'romantic' ? 'bg-rose-900/40' : 'bg-indigo-950/60',
                          )}
                        />

                        {/* Table 1 (VIP Orchidée) */}
                        <div
                          onClick={() => setSelectedTable('t1')}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className={cn(
                            'w-13 h-13 sm:w-15 sm:h-15 rounded-full border-2 flex flex-col items-center justify-center text-center backdrop-blur-xs transition-all duration-300',
                            selectedTable === 't1'
                              ? 'border-primary bg-primary/30 ring-4 ring-primary/40 scale-110 shadow-lg shadow-primary/40'
                              : 'border-amber-300/60 bg-gradient-to-b from-amber-100/20 to-amber-950/70 hover:scale-105 shadow-md',
                          )}>
                            <span className="text-[9px] font-bold text-white leading-none">T1</span>
                            <span className="text-[7px] text-amber-200 font-medium mt-0.5">8 / 8</span>
                          </div>
                          {/* Chaises Chiavari en cercle */}
                          <div className="absolute -inset-1.5 border border-dashed border-amber-300/40 rounded-full pointer-events-none" />
                          <span className="text-[8px] font-bold text-white/80 mt-1">Orchidée</span>
                        </div>

                        {/* Table Centrale (HONNEUR MARIÉS) */}
                        <div
                          onClick={() => setSelectedTable('honour')}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className={cn(
                            'w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 flex flex-col items-center justify-center text-center transition-all duration-300',
                            selectedTable === 'honour'
                              ? 'border-white bg-gradient-to-b from-amber-200/50 to-amber-900/90 ring-4 ring-amber-400 shadow-xl shadow-amber-500/50 scale-110'
                              : 'border-white/80 bg-gradient-to-b from-white/30 to-amber-950/80 hover:scale-105 shadow-lg',
                          )}>
                            <Crown className="w-3.5 h-3.5 text-amber-300 mb-0.5" />
                            <span className="text-[10px] font-black text-amber-100 leading-none">HONNEUR</span>
                            <span className="text-[8px] text-white font-bold mt-0.5">10 / 10</span>
                          </div>
                          <div className="absolute -inset-2 border-2 border-amber-400/50 rounded-full pointer-events-none animate-spin-slow" />
                          <span className="text-[8px] font-black text-amber-300 mt-1">Mariés & VIP</span>
                        </div>

                        {/* Table 2 (VIP Jasmin) */}
                        <div
                          onClick={() => setSelectedTable('t2')}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className={cn(
                            'w-13 h-13 sm:w-15 sm:h-15 rounded-full border-2 flex flex-col items-center justify-center text-center backdrop-blur-xs transition-all duration-300',
                            selectedTable === 't2'
                              ? 'border-primary bg-primary/30 ring-4 ring-primary/40 scale-110 shadow-lg shadow-primary/40'
                              : 'border-amber-300/60 bg-gradient-to-b from-amber-100/20 to-amber-950/70 hover:scale-105 shadow-md',
                          )}>
                            <span className="text-[9px] font-bold text-white leading-none">T2</span>
                            <span className="text-[7px] text-amber-200 font-medium mt-0.5">8 / 8</span>
                          </div>
                          <div className="absolute -inset-1.5 border border-dashed border-amber-300/40 rounded-full pointer-events-none" />
                          <span className="text-[8px] font-bold text-white/80 mt-1">Jasmin</span>
                        </div>

                        {/* Table 3 (Famille Magnolia) */}
                        <div
                          onClick={() => setSelectedTable('t3')}
                          className="relative group cursor-pointer flex flex-col items-center"
                        >
                          <div className={cn(
                            'w-13 h-13 sm:w-15 sm:h-15 rounded-full border-2 flex flex-col items-center justify-center text-center backdrop-blur-xs transition-all duration-300',
                            selectedTable === 't3'
                              ? 'border-primary bg-primary/30 ring-4 ring-primary/40 scale-110 shadow-lg shadow-primary/40'
                              : 'border-amber-300/60 bg-gradient-to-b from-amber-100/20 to-amber-950/70 hover:scale-105 shadow-md',
                          )}>
                            <span className="text-[9px] font-bold text-white leading-none">T3</span>
                            <span className="text-[7px] text-amber-200 font-medium mt-0.5">8 / 8</span>
                          </div>
                          <div className="absolute -inset-1.5 border border-dashed border-amber-300/40 rounded-full pointer-events-none" />
                          <span className="text-[8px] font-bold text-white/80 mt-1">Magnolia</span>
                        </div>
                      </div>
                    </div>

                    {/* Fiche d'inspection HUD de la table active */}
                    <div className="relative z-10 flex items-center justify-between text-[10px] text-white/90 pt-1.5 border-t border-white/15 bg-black/30 -mx-3 -mb-3 px-3 py-1.5 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-bold text-amber-200">{activeTableInfo.name}</span>
                        <span className="text-white/60">({activeTableInfo.placed}/{activeTableInfo.capacity} placés)</span>
                      </div>
                      <span className="text-white/70 text-[9px] italic truncate max-w-[200px]">
                        {activeTableInfo.menu}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* ──────────────────────────────────────────────────────── */
                  /* VUE 2D PLAN ARCHITECTURAL (CAD / BLUEPRINT)              */
                  /* ──────────────────────────────────────────────────────── */
                  <div className="h-full w-full relative p-2 flex flex-col justify-between">
                    {/* Trame de fond millimétrée CAD */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(to_right,#00000010_1px,transparent_1px),linear-gradient(to_bottom,#00000010_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:16px_16px]"
                    />

                    {/* Scène Haute avec cotations */}
                    <div className="relative z-10 mx-auto w-4/5 h-8 rounded-lg border-2 border-amber-500/50 bg-amber-500/10 flex items-center justify-between px-3 text-[10px] font-bold text-amber-800 dark:text-amber-300 shadow-xs">
                      <span className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        Scène d’Honneur (10.0m × 3.5m)
                      </span>
                      <span className="text-[9px] font-bold text-foreground bg-surface px-2 py-0.5 rounded border border-border">
                        Niveau +0.60m
                      </span>
                    </div>

                    {/* Grille des Tables en 2D avec chaises satellites détaillées */}
                    <div className="relative z-10 grid grid-cols-4 gap-3 my-auto px-1 items-center">
                      {/* Table 1 */}
                      <div
                        onClick={() => setSelectedTable('t1')}
                        className={cn(
                          'relative flex flex-col items-center justify-center p-2 rounded-xl border transition cursor-pointer select-none',
                          selectedTable === 't1'
                            ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                            : 'border-border bg-surface hover:border-primary/50',
                        )}
                      >
                        {/* 8 Chaises satellites */}
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />

                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/40 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary leading-none">T1</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5 truncate max-w-[60px]">
                          Orchidée
                        </span>
                      </div>

                      {/* Table d'Honneur */}
                      <div
                        onClick={() => setSelectedTable('honour')}
                        className={cn(
                          'relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition cursor-pointer select-none',
                          selectedTable === 'honour'
                            ? 'border-amber-500 bg-amber-500/15 shadow-md ring-2 ring-amber-400/50 scale-105'
                            : 'border-amber-500/60 bg-[color:var(--festive-accent-soft)] hover:border-amber-500',
                        )}
                      >
                        <span className="absolute -top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -bottom-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -left-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />

                        <div className="w-11 h-11 rounded-full bg-amber-500/25 border border-amber-500 flex flex-col items-center justify-center text-center">
                          <Crown className="w-3 h-3 text-amber-600 dark:text-amber-300 mb-0.5" />
                          <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 leading-none">
                            HONNEUR
                          </span>
                        </div>
                        <span className="text-[8px] font-black text-amber-800 dark:text-amber-300 mt-0.5">
                          Mariés (10)
                        </span>
                      </div>

                      {/* Table 2 */}
                      <div
                        onClick={() => setSelectedTable('t2')}
                        className={cn(
                          'relative flex flex-col items-center justify-center p-2 rounded-xl border transition cursor-pointer select-none',
                          selectedTable === 't2'
                            ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                            : 'border-border bg-surface hover:border-primary/50',
                        )}
                      >
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />

                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/40 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary leading-none">T2</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5 truncate max-w-[60px]">
                          Jasmin
                        </span>
                      </div>

                      {/* Table 3 */}
                      <div
                        onClick={() => setSelectedTable('t3')}
                        className={cn(
                          'relative flex flex-col items-center justify-center p-2 rounded-xl border transition cursor-pointer select-none',
                          selectedTable === 't3'
                            ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                            : 'border-border bg-surface hover:border-primary/50',
                        )}
                      >
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/50 border border-primary/70" />

                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/40 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary leading-none">T3</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5 truncate max-w-[60px]">
                          Magnolia
                        </span>
                      </div>
                    </div>

                    {/* Zone basse : Portes d'accès & Buffets */}
                    <div className="relative z-10 grid grid-cols-12 gap-2 text-[9px] pt-1">
                      <div className="col-span-4 h-6 rounded-md bg-surface border border-border flex items-center justify-center font-semibold text-muted">
                        Buffet Traiteur
                      </div>
                      <div className="col-span-3 h-6 rounded-md bg-surface border border-border flex items-center justify-center font-semibold text-muted">
                        Bar & Vins
                      </div>
                      <div className="col-span-5 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                        🚪 Entrée Double Battant (Scan QR)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Barre de statut et fonctionnalités sous le plan */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted pt-0.5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-primary" /> 4 Tables & 34 Chaises
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Scène Royale
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Accueil Scan QR
                  </span>
                </div>
                <span className="font-bold text-primary">Synchronisation temps réel</span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. ONGLET : RSVP WHATSAPP IMMERSIF                         */}
          {/* ========================================================= */}
          {activeTab === 'rsvp' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shadow-xs border border-emerald-500/20">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Invitation WhatsApp & Lien Personnel</h4>
                    <p className="text-[11px] text-muted">Zéro application à installer pour l’invité</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Confirmé 100%
                </span>
              </div>

              {/* Mockup Smartphone / Bulle WhatsApp */}
              <div className="rounded-2xl border border-border bg-[#0b141a] text-white p-4 space-y-3 shadow-lg">
                {/* En-tête WhatsApp */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                      EM
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-none text-white">Mariage de Sarah & Christian</p>
                      <p className="text-[9px] text-emerald-400">Compte officiel certifié</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-white/50">14:32</span>
                </div>

                {/* Bulle de message */}
                <div className="bg-[#1f2c34] rounded-2xl rounded-tl-xs p-3.5 space-y-2 border border-white/5 max-w-sm">
                  <p className="text-xs text-white/95 leading-relaxed">
                    Bonjour <strong>Jean-Paul</strong>, Sarah & Christian sont heureux de vous inviter à célébrer leur mariage.
                  </p>

                  <div className="p-2.5 rounded-xl bg-[#111b21] border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-300">✦ Salon Victoria · Palais des Congrès</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/70">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" /> Sam. 18h00
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-400" /> Gombe, Kinshasa
                      </span>
                    </div>
                  </div>

                  {/* Boutons d'action RSVP interactifs */}
                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRsvpAnswered(true)}
                      className={cn(
                        'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5',
                        rsvpAnswered
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                          : 'bg-white/10 text-white/80 hover:bg-white/20',
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Présent (2 pers.)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsvpAnswered(false)}
                      className={cn(
                        'py-1.5 px-3 rounded-lg text-xs font-semibold transition',
                        !rsvpAnswered
                          ? 'bg-rose-600 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10',
                      )}
                    >
                      Décliner
                    </button>
                  </div>
                </div>

                {/* Notification d'attribution de siège */}
                {rsvpAnswered && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-200">Place attribuée automatiquement</p>
                        <p className="text-[10px] text-emerald-300/80">Table Orchidée · Sièges #03 & #04</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-white">
                      Pass QR Généré
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted pt-0.5">
                <span>⚡ Confirmation enregistrée en direct sur le plan</span>
                <span className="text-primary font-bold">Relances automatiques incluses</span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. ONGLET : PASS QR HOLOGRAPHIQUE JOUR J                   */}
          {/* ========================================================= */}
          {activeTab === 'qr' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Accueil Jour J · Contrôle au Smartphone</h4>
                  <p className="text-[11px] text-muted">Scan rapide par caméra sans matériel spécifique</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Desk Protocole
                </span>
              </div>

              {/* Badge Pass QR Holographique */}
              <div className="relative rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white p-4 overflow-hidden shadow-xl">
                {/* Lueur néon d'arrière plan */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Cadre QR avec ligne de scan laser animée */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white p-2 shrink-0 shadow-lg flex items-center justify-center overflow-hidden">
                    {/* Motif QR vectoriel */}
                    <div className="w-full h-full bg-slate-950 rounded-lg p-1.5 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <div className="w-5 h-5 bg-white rounded-xs p-0.5 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-black" />
                        </div>
                        <div className="w-5 h-5 bg-white rounded-xs p-0.5 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-black" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 bg-emerald-500 rounded-xs" />
                      </div>
                      <div className="flex justify-between">
                        <div className="w-5 h-5 bg-white rounded-xs p-0.5 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-black" />
                        </div>
                        <div className="w-2 h-2 bg-white" />
                      </div>
                    </div>

                    {/* Faisceau laser rouge/vert qui balaie le QR */}
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] em-laser-scan pointer-events-none" />
                  </div>

                  {/* Informations de l'invité & Siège */}
                  <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ENTRÉE VALIDÉE · 19:42:10
                    </div>

                    <h5 className="text-base font-bold text-white tracking-tight truncate">
                      Jean-Paul KABAMBA +1
                    </h5>

                    <div className="grid grid-cols-2 gap-2 text-left pt-1">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[9px] text-white/60 block uppercase font-bold">Table assignée</span>
                        <span className="text-xs font-bold text-amber-300">Table Orchidée</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[9px] text-white/60 block uppercase font-bold">Sièges</span>
                        <span className="text-xs font-bold text-white">#03 & #04</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bas de Pass avec validation sonore */}
                <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Billet Sécurisé Anti-Fraude
                  </span>
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" /> Bip sonore & Vibration confirmés
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted pt-0.5">
                <span>⏱️ Temps moyen d’accueil : <strong>1,8 seconde</strong></span>
                <span className="text-primary font-bold">Fonctionne 100% hors-ligne le jour J</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
