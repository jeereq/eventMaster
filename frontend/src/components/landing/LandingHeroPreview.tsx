'use client';

import React, { useState } from 'react';
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
  Move,
  Sun,
  Moon,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type PreviewTab = 'room' | 'rsvp' | 'qr';
export type LightingTheme = 'gala' | 'romantic' | 'night';

export default function LandingHeroPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('room');
  const [viewMode3D, setViewMode3D] = useState(false);
  const [lightingTheme, setLightingTheme] = useState<LightingTheme>('gala');
  const [showGuestNames, setShowGuestNames] = useState(true);

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
      {/* Halo festif & néon d'arrière plan (JumpBot & Cinematic Glow) */}
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/25 via-[color:var(--festive-accent-soft)] to-primary/10 blur-2xl -z-10 opacity-75 pointer-events-none animate-pulse duration-1000"
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
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
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
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
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
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
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
            Live
          </span>
        </div>

        {/* Contenu dynamique selon l'onglet */}
        <div className="p-4 sm:p-5 min-h-[380px] flex flex-col justify-between">
          {activeTab === 'room' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Barre d'outils de la salle */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Palais des Congrès · Salon Victoria</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                      Éditeur complet
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Étage 1 · 48 / 50 placés (96%) · 24m × 16m
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {viewMode3D && (
                    <div className="flex items-center bg-surface-muted rounded-[var(--radius-button)] p-0.5 border border-border text-[10px]">
                      <button
                        type="button"
                        onClick={() => setLightingTheme('gala')}
                        title="Ambiance Gala Or"
                        className={cn(
                          'p-1 rounded transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'gala' ? 'bg-surface text-amber-500 shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Flame className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightingTheme('romantic')}
                        title="Ambiance Romantique"
                        className={cn(
                          'p-1 rounded transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'romantic' ? 'bg-surface text-rose-500 shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Sun className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightingTheme('night')}
                        title="Ambiance Nocturne & Spotlights"
                        className={cn(
                          'p-1 rounded transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary',
                          lightingTheme === 'night' ? 'bg-surface text-indigo-400 shadow-xs' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Moon className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewMode3D(!viewMode3D)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-button)] text-[11px] font-semibold border transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                      viewMode3D
                        ? 'bg-primary text-white border-primary hover:bg-primary-hover'
                        : 'bg-surface hover:bg-surface-muted text-foreground border-border',
                    )}
                  >
                    <Eye className="w-3 h-3" />
                    {viewMode3D ? 'Vue Rendu 3D' : 'Basculer en 3D'}
                  </button>
                </div>
              </div>

              {/* CANEVAS DE RENDU 2D / 3D */}
              <div
                className={cn(
                  'relative h-[255px] rounded-[var(--radius-card)] border border-border overflow-hidden transition-all duration-500 select-none',
                  viewMode3D
                    ? lightingTheme === 'gala'
                      ? 'bg-radial-[at_50%_40%] from-amber-950/90 via-slate-950 to-black text-amber-100 shadow-inner'
                      : lightingTheme === 'romantic'
                        ? 'bg-radial-[at_50%_40%] from-rose-950/80 via-slate-950 to-black text-rose-100 shadow-inner'
                        : 'bg-radial-[at_50%_40%] from-indigo-950/90 via-slate-950 to-black text-indigo-100 shadow-inner'
                    : 'bg-[#fcfbf9] dark:bg-[#15171a] text-foreground',
                )}
              >
                {/* ────────────────────────────────────────────────────────── */}
                {/* MODE RENDU 3D ISOMETRIQUE / AMBIANCE SHOWCASE             */}
                {/* ────────────────────────────────────────────────────────── */}
                {viewMode3D ? (
                  <div className="h-full w-full relative flex flex-col justify-between p-3 overflow-hidden">
                    {/* Faisceau lumineux 3D (Spotlights) */}
                    <div
                      className={cn(
                        'absolute inset-0 pointer-events-none opacity-40 mix-blend-screen bg-gradient-to-b',
                        lightingTheme === 'gala'
                          ? 'from-amber-400/30 via-transparent to-transparent'
                          : lightingTheme === 'romantic'
                            ? 'from-rose-400/30 via-transparent to-transparent'
                            : 'from-cyan-400/30 via-transparent to-transparent',
                      )}
                    />

                    {/* Barre d'état haute 3D */}
                    <div className="relative z-10 flex items-center justify-between text-[10px] text-white/80">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-xs">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        {lightingTheme === 'gala'
                          ? 'Ambiance Soirée Gala · Chandelles & Lustres'
                          : lightingTheme === 'romantic'
                            ? 'Ambiance Poudrée · Lumière Tamisée'
                            : 'Ambiance Clubbing · Éclairage LED'}
                      </span>
                      <span className="bg-black/40 px-2 py-0.5 rounded text-[9px] text-white/70">
                        Rendu 3D Stéréo 60 FPS
                      </span>
                    </div>

                    {/* Scène 3D Isométrique centrale */}
                    <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                      {/* Estre & Scène d'Honneur surélevée */}
                      <div
                        className={cn(
                          'w-3/4 max-w-[280px] py-1.5 px-3 rounded-lg border flex items-center justify-between text-[10px] font-bold shadow-lg transition-transform duration-300 hover:scale-[1.02]',
                          lightingTheme === 'gala'
                            ? 'bg-gradient-to-r from-amber-600/40 via-amber-400/40 to-amber-600/40 border-amber-300/50 text-amber-100 shadow-amber-500/20'
                            : lightingTheme === 'romantic'
                              ? 'bg-gradient-to-r from-rose-600/40 via-rose-400/40 to-rose-600/40 border-rose-300/50 text-rose-100 shadow-rose-500/20'
                              : 'bg-gradient-to-r from-slate-800/70 via-indigo-950/70 to-slate-800/70 border-indigo-400/40 text-indigo-100 shadow-indigo-950/40',
                        )}
                      >
                        <span className="flex items-center gap-1 text-[9px]">
                          ✦ Scène Principale & Pupitre
                        </span>
                        <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider">
                          Niveau +0.6m
                        </span>
                      </div>

                      {/* Tables d'Honneur et Tables Rondes 3D */}
                      <div className="grid grid-cols-3 gap-5 sm:gap-8 pt-3 items-center">
                        {/* Table 1 */}
                        <div className="relative group cursor-pointer flex flex-col items-center">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-300/60 bg-gradient-to-b from-amber-100/30 to-amber-950/60 shadow-[0_8px_16px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-center backdrop-blur-xs transition-transform duration-200 group-hover:scale-105">
                            <span className="text-[9px] font-bold text-white leading-none">VIP 1</span>
                            <span className="text-[7px] text-amber-300 font-medium mt-0.5">8 placés</span>
                          </div>
                          {/* Chaises autour */}
                          <div className="absolute -inset-1 border border-dashed border-amber-300/30 rounded-full pointer-events-none" />
                        </div>

                        {/* Table Centrale Mariés / Présidence */}
                        <div className="relative group cursor-pointer flex flex-col items-center">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/80 bg-gradient-to-b from-white/40 to-amber-900/80 shadow-[0_10px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center text-center ring-2 ring-amber-400/50 transition-transform duration-200 group-hover:scale-105">
                            <span className="text-[10px] font-black text-amber-200 leading-none">MARIÉS</span>
                            <span className="text-[8px] text-white/90 font-semibold mt-0.5">Table d’Honneur</span>
                          </div>
                          <div className="absolute -inset-1.5 border border-amber-400/40 rounded-full animate-spin-slow pointer-events-none" />
                        </div>

                        {/* Table 3 */}
                        <div className="relative group cursor-pointer flex flex-col items-center">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-300/60 bg-gradient-to-b from-amber-100/30 to-amber-950/60 shadow-[0_8px_16px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-center backdrop-blur-xs transition-transform duration-200 group-hover:scale-105">
                            <span className="text-[9px] font-bold text-white leading-none">VIP 2</span>
                            <span className="text-[7px] text-amber-300 font-medium mt-0.5">8 placés</span>
                          </div>
                          <div className="absolute -inset-1 border border-dashed border-amber-300/30 rounded-full pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Pied de scène 3D */}
                    <div className="relative z-10 flex items-center justify-between text-[10px] text-white/60 pt-1 border-t border-white/10">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Piste de danse centrale & tapis d’honneur
                      </span>
                      <span className="text-amber-200/90 font-medium">Vue animée 3D active</span>
                    </div>
                  </div>
                ) : (
                  /* ────────────────────────────────────────────────────────── */
                  /* MODE RENDU 2D PLAN ARCHITECTURAL & PLACEMENT               */
                  /* ────────────────────────────────────────────────────────── */
                  <div className="h-full w-full relative p-2.5 flex flex-col justify-between">
                    {/* Trame de fond millimétrée blueprint */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_14px]"
                    />

                    {/* Scène en haut */}
                    <div className="relative z-10 mx-auto w-4/5 h-8 rounded-lg border border-amber-500/40 bg-amber-500/10 flex items-center justify-between px-3 text-[10px] font-bold text-amber-800 dark:text-amber-300 shadow-xs">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Estre d’Honneur & Scène DJ (8m × 3m)
                      </span>
                      <span className="text-[9px] font-semibold text-muted bg-surface/80 dark:bg-background/80 px-1.5 py-0.5 rounded border border-border">
                        Niveau 1
                      </span>
                    </div>

                    {/* Grille des Tables avec Chaises disposées */}
                    <div className="relative z-10 grid grid-cols-4 gap-2.5 my-auto px-1 items-center">
                      {/* Table Ronde 1 */}
                      <div className="relative flex flex-col items-center justify-center p-1 rounded-xl bg-surface dark:bg-surface/50 border border-primary/30 shadow-xs hover:border-primary transition group cursor-pointer">
                        {/* 4 Chaises satellites */}
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />

                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary leading-none">T1</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5 truncate max-w-[55px]">
                          Orchidée
                        </span>
                      </div>

                      {/* Table Ronde 2 (Table d'Honneur) */}
                      <div className="relative flex flex-col items-center justify-center p-1 rounded-xl bg-[color:var(--festive-accent-soft)] border border-[color:var(--festive-accent)] shadow-xs hover:scale-105 transition cursor-pointer">
                        <span className="absolute -top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -bottom-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -left-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                        <span className="absolute -right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />

                        <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500 flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 leading-none">
                            HONNEUR
                          </span>
                          <span className="text-[7px] font-bold text-amber-800 dark:text-amber-200">10 / 10</span>
                        </div>
                        <span className="text-[8px] font-black text-amber-800 dark:text-amber-300 mt-0.5">
                          Mariés
                        </span>
                      </div>

                      {/* Piste de danse centrale */}
                      <div className="h-14 rounded-lg border border-dashed border-border bg-surface-muted/50 flex flex-col items-center justify-center text-center p-1">
                        <span className="text-[8px] font-bold text-foreground uppercase tracking-wider">
                          Piste
                        </span>
                        <span className="text-[7px] text-muted">Centrale</span>
                      </div>

                      {/* Table Ronde 3 */}
                      <div className="relative flex flex-col items-center justify-center p-1 rounded-xl bg-surface dark:bg-surface/50 border border-primary/30 shadow-xs hover:border-primary transition group cursor-pointer">
                        <span className="absolute -top-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -left-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />
                        <span className="absolute -right-1 w-2 h-2 rounded-full bg-primary/40 border border-primary/60" />

                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-primary leading-none">T2</span>
                          <span className="text-[7px] text-muted">8 pl.</span>
                        </div>
                        <span className="text-[8px] font-bold text-foreground mt-0.5 truncate max-w-[55px]">
                          Jasmin
                        </span>
                      </div>
                    </div>

                    {/* Zone basse : Buffet, Bar et Entrée Protocole QR */}
                    <div className="relative z-10 grid grid-cols-12 gap-2 text-[9px] pt-1">
                      <div className="col-span-4 h-6 rounded bg-surface border border-border flex items-center justify-center font-medium text-muted">
                        Buffet Traiteur (6m)
                      </div>
                      <div className="col-span-3 h-6 rounded bg-surface border border-border flex items-center justify-center font-medium text-muted">
                        Bar & Vins
                      </div>
                      <div className="col-span-5 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                        🚪 Entrée & Scan QR
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Barre de statut et fonctionnalités sous le plan */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted pt-0.5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" /> Tables & Chaises
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Scène d’Honneur
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Accueil Protocole
                  </span>
                </div>
                <span className="font-semibold text-foreground">Édition en temps réel</span>
              </div>
            </div>
          )}

          {activeTab === 'rsvp' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Notification WhatsApp & Lien Unique</h4>
                    <p className="text-[10px] text-muted">Sans téléchargement d’application</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  Confirmé à 100%
                </span>
              </div>

              {/* Mockup message invité */}
              <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    EM
                  </div>
                  <div className="bg-surface border border-border rounded-lg p-3 text-xs space-y-1.5 shadow-xs flex-1">
                    <p className="font-medium text-foreground">
                      Bonjour <strong>Jean-Paul</strong>, vous êtes cordialement invité au <em>Mariage de Sarah & Christian</em>.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted pt-1">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" /> Sam. 18h00
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[color:var(--festive-accent)]" /> Gombe, Kinshasa
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-surface rounded-lg border border-border/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Présence confirmée (2 personnes)</p>
                      <p className="text-[10px] text-muted">Menu : Poisson braisé · Table : Orchidée</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary">
                    Badge prêt
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                <span>⚡ Réponse reçue en moins de 10 secondes</span>
                <span className="text-foreground font-semibold">Suivi RSVP temps réel</span>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Contrôle Accueil · Scan en 1 Clic</h4>
                  <p className="text-[10px] text-muted">Caméra du téléphone dans le navigateur</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Équipe Protocole
                </span>
              </div>

              {/* Mockup Badge QR & Validation */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-surface border border-border p-1.5 flex items-center justify-center shadow-xs">
                    <div className="w-full h-full border border-dashed border-foreground/30 flex items-center justify-center text-[10px] font-mono text-muted">
                      [ QR CODE ]
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" /> Badge Validé
                    </div>
                    <p className="text-sm font-bold text-foreground">Jean-Paul Mukendi</p>
                    <p className="text-xs font-medium text-muted">Table Orchidée · Siège 04</p>
                    <p className="text-[10px] text-muted">Accès contrôlé à 19:42 · Porte Principale</p>
                  </div>
                </div>

                <div className="text-center sm:text-right shrink-0">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                    ✓ Autorisé
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-medium text-muted">
                <div className="p-2 rounded bg-surface-muted/50 border border-border">
                  <p className="text-xs font-bold text-foreground">185</p>
                  <p>Invités attendus</p>
                </div>
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  <p className="text-xs font-bold">142</p>
                  <p>Déjà scannés</p>
                </div>
                <div className="p-2 rounded bg-surface-muted/50 border border-border">
                  <p className="text-xs font-bold text-foreground">0 doublon</p>
                  <p>Contrôle strict</p>
                </div>
              </div>
            </div>
          )}

          {/* Pied de carte avec lien interactif */}
          <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Toutes ces fonctionnalités sont incluses
            </span>
            <span className="font-semibold text-primary">Testez en direct</span>
          </div>
        </div>
      </div>
    </div>
  );
}
