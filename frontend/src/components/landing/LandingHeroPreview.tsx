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
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type PreviewTab = 'room' | 'rsvp' | 'qr';

export default function LandingHeroPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('room');
  const [viewMode3D, setViewMode3D] = useState(false);

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
      {/* Halo festif d'arrière plan */}
      <div
        className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-primary/15 via-[color:var(--festive-accent-soft)] to-transparent blur-2xl -z-10 opacity-70 pointer-events-none"
        aria-hidden
      />

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)] overflow-hidden transition-all duration-300">
        {/* En-tête des onglets d'aperçu */}
        <div className="flex items-center justify-between border-b border-border bg-surface-muted/60 p-2 gap-1 overflow-x-auto [scrollbar-width:none]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('room')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-xs font-semibold transition',
                activeTab === 'room'
                  ? 'bg-surface text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground hover:bg-surface/50',
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              <span>Plan de salle 2D/3D</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rsvp')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-xs font-semibold transition',
                activeTab === 'rsvp'
                  ? 'bg-surface text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground hover:bg-surface/50',
              )}
            >
              <Mail className="w-3.5 h-3.5 text-[color:var(--festive-accent)]" />
              <span>Invitation & RSVP</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-xs font-semibold transition',
                activeTab === 'qr'
                  ? 'bg-surface text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground hover:bg-surface/50',
              )}
            >
              <ScanLine className="w-3.5 h-3.5 text-emerald-600" />
              <span>Scan QR Jour J</span>
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-muted px-2 py-0.5 rounded-full bg-background border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En direct
          </span>
        </div>

        {/* Contenu dynamique selon l'onglet */}
        <div className="p-4 sm:p-5 min-h-[340px] flex flex-col justify-between">
          {activeTab === 'room' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Grande Salle des Fêtes</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      Éditeur complet
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">Niveau 1 · 12 tables · 48 / 50 placés</p>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode3D(!viewMode3D)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-button)] text-[11px] font-medium border border-border bg-surface hover:bg-surface-muted transition text-foreground"
                >
                  <Eye className="w-3 h-3 text-primary" />
                  {viewMode3D ? 'Vue Plan 2D' : 'Aperçu Rendu 3D'}
                </button>
              </div>

              {/* Simulation interactive du plan */}
              <div
                className={cn(
                  'relative h-56 rounded-xl border border-border overflow-hidden p-3 transition-all duration-500',
                  viewMode3D
                    ? 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white shadow-inner'
                    : 'bg-surface-muted/40 grid grid-cols-6 grid-rows-4 gap-2',
                )}
              >
                {viewMode3D ? (
                  <div className="h-full flex flex-col justify-between p-2">
                    <div className="flex items-center justify-between text-[10px] text-white/70">
                      <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Ambiance Soirée Gala & Lustres
                      </span>
                      <span>Éclairage tamisé</span>
                    </div>

                    <div className="text-center space-y-1">
                      <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/40 text-amber-300 font-semibold text-xs shadow-lg">
                        ✦ Scène d’Honneur & Table d’Honneur ✦
                      </div>
                      <div className="flex justify-center gap-3 pt-2">
                        <div className="w-12 h-12 rounded-full border-2 border-primary/60 bg-primary/20 flex items-center justify-center text-[9px] font-bold text-white shadow-md">
                          VIP 1
                        </div>
                        <div className="w-12 h-12 rounded-full border-2 border-amber-400/60 bg-amber-500/20 flex items-center justify-center text-[9px] font-bold text-white shadow-md">
                          Mariés
                        </div>
                        <div className="w-12 h-12 rounded-full border-2 border-primary/60 bg-primary/20 flex items-center justify-center text-[9px] font-bold text-white shadow-md">
                          VIP 2
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-white/60 pt-1 border-t border-white/10">
                      <span>Piste de danse centrale</span>
                      <span>Capacité maximale : 100 %</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Scène en haut */}
                    <div className="col-span-6 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between px-3 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Scène Principale & DJ
                      </span>
                      <span className="text-[9px] font-normal text-muted">Étage 1</span>
                    </div>

                    {/* Tables rondes */}
                    <div className="col-span-2 row-span-2 rounded-full border-2 border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-1 text-center hover:border-primary transition cursor-pointer">
                      <span className="text-[10px] font-bold text-primary">Table 1</span>
                      <span className="text-[9px] text-muted">8 / 8 placés</span>
                    </div>

                    <div className="col-span-2 row-span-2 rounded-lg border border-dashed border-border bg-surface flex flex-col items-center justify-center p-1 text-center">
                      <span className="text-[9px] font-medium text-foreground">Piste de Danse</span>
                      <span className="text-[8px] text-muted">Centrale</span>
                    </div>

                    <div className="col-span-2 row-span-2 rounded-full border-2 border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-1 text-center hover:border-primary transition cursor-pointer">
                      <span className="text-[10px] font-bold text-primary">Table 2</span>
                      <span className="text-[9px] text-muted">8 / 8 placés</span>
                    </div>

                    {/* Buffet et entrée */}
                    <div className="col-span-3 bg-surface border border-border rounded-md flex items-center justify-center text-[9px] font-medium text-muted">
                      Buffet Gastronomique
                    </div>
                    <div className="col-span-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center justify-center text-[9px] font-medium text-emerald-700 dark:text-emerald-400">
                      Entrée & Accueil QR
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted pt-1">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" /> Tables rondes
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Scénographie
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Portes & QR
                  </span>
                </div>
                <span className="font-semibold text-foreground">Glissez-déposez vos invités</span>
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
