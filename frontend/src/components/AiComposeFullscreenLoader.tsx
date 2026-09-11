'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronRight,
  Compass,
  Cpu,
  Eye,
  Layers,
  Lightbulb,
  Radio,
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  isLocalAudioMuted,
  setLocalAudioMuted,
  playStudioStepSound,
  unlockAudioNotifications,
} from '@/lib/audioNotifications';

export type AiLoaderVariant = 'invitation' | 'room' | 'budget';

export type AiProcessStep = {
  id: string;
  label: string;
};

const COMPOSE_STEPS: AiProcessStep[] = [
  { id: 'brief', label: 'Lecture du brief' },
  { id: 'faces', label: 'Yeux, sourire et joues' },
  { id: 'layout', label: 'Composition 9:16' },
  { id: 'photo', label: 'Rendu de la carte' },
  { id: 'finish', label: 'Finition de l’invitation' },
];

const BUDGET_STEPS: AiProcessStep[] = [
  { id: 'brief', label: 'Lecture du projet et du budget' },
  { id: 'venues', label: 'Salles du catalogue' },
  { id: 'vendors', label: 'Prestataires et matériel' },
  { id: 'packs', label: '3 formules chiffrées' },
  { id: 'split', label: 'Répartition des coûts' },
];

const ROOM_PLAN_STEPS: AiProcessStep[] = [
  { id: 'brief', label: 'Lecture du brief' },
  { id: 'photo', label: 'Lecture de la photo' },
  { id: 'layout', label: 'Placement du mobilier' },
  { id: 'look', label: 'Matières et couleurs' },
  { id: 'finish', label: 'Finition du plan' },
];

const STEP_INTERVAL_MS = 2800;
const PROGRESS_TICK_MS = 350;
const PROGRESS_START = 8;
const PROGRESS_CAP = 94;

export function nextAiLoaderStepIndex(current: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.min(current + 1, stepCount - 1);
}

export function nextAiLoaderProgress(current: number): number {
  if (current >= PROGRESS_CAP) return current;
  const remaining = PROGRESS_CAP - current;
  return Math.min(PROGRESS_CAP, current + Math.max(1.2, remaining * 0.085));
}

/** Astuces et lore du studio style jeu vidéo AAA */
const STUDIO_GAME_TIPS: Record<AiLoaderVariant, Array<{ tip: string; tag: string }>> = {
  invitation: [
    {
      tag: 'CONTRÔLE 3D',
      tip: 'Cliquez et glissez sur l’invitation holographique pour faire pivoter le modèle 3D sous tous les angles.',
    },
    {
      tag: 'VITESSE FLASH',
      tip: 'Le mode Rapide Flash synthétise votre invitation 9:16 en 4 à 8 secondes, parfait pour les tests express.',
    },
    {
      tag: 'QUALITÉ PRO 2K',
      tip: 'En mode Qualité, le moteur simule un rig d’éclairage photo f/1.4 et un grain naturel sans lissage artificiel.',
    },
    {
      tag: 'RATIO 9:16',
      tip: 'Le format vertical natif remplit intégralement l’écran mobile pour les invitations WhatsApp, TikTok et Stories.',
    },
    {
      tag: 'TYPOGRAPHIE',
      tip: 'Chaque bloc de texte reste éditable séparément dans le Studio avec une netteté vectorielle absolue.',
    },
    {
      tag: 'MARIAGES COUTUMIERS',
      tip: 'Retrouvez les palettes et symboles Kongo, Kasaï, Swahili et Lingala préconfigurés dans l’onglet Prompts.',
    },
  ],
  room: [
    {
      tag: 'ARCHITECTURE 3D',
      tip: 'L’intelligence spatiale détecte les accès de service, estrades et dégagements de sécurité aux normes.',
    },
    {
      tag: 'ISOMÉTRIE',
      tip: 'Vous pouvez basculer en vue 2D ou 3D immersive une fois le plan de salle généré.',
    },
    {
      tag: 'CIRCULATION',
      tip: 'Un espacement minimal de 1,50 m entre chaque table est garanti pour la circulation des serveurs.',
    },
    {
      tag: 'PLAN DE TABLE',
      tip: 'Attribuez directement vos invités confirmés aux chaises après la création du plan.',
    },
  ],
  budget: [
    {
      tag: 'CATALOGUE RÉEL',
      tip: 'Les tarifs sont indexés sur les prestataires et salles de fêtes répertoriés dans votre ville.',
    },
    {
      tag: '3 FORMULES',
      tip: 'Le simulateur ventile toujours 3 alternatives équilibrées : Essentielle, Équilibrée et Prestige.',
    },
    {
      tag: 'DEVIS PDF',
      tip: 'Exportez le bilan financier en devis PDF complet d’un simple clic dès la fin du calcul.',
    },
  ],
};

/* ─────────────────────────────────────────────────────────────
   OBJET 3D HOLOGRAPHIQUE INTERACTIF — INVITATION (CARTE 9:16)
───────────────────────────────────────────────────────────── */
function Game3DInvitationArtifact({
  progress,
  stepIndex,
  isDragging,
  dragRot,
}: {
  progress: number;
  stepIndex: number;
  isDragging: boolean;
  dragRot: { x: number; y: number };
}) {
  return (
    <div className="relative w-48 h-64 flex items-center justify-center select-none" style={{ perspective: '1200px' }}>
      {/* Anneaux gyroscopiques 3D en rotation orbitale émeraude */}
      <div
        className="em-gyro-ring-1 absolute w-52 h-52 rounded-full border border-emerald-400/25 pointer-events-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400/50" />
      </div>

      <div
        className="em-gyro-ring-2 absolute w-44 h-44 rounded-full border border-emerald-300/20 border-dashed pointer-events-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
      </div>

      <div
        className="em-gyro-ring-3 absolute w-60 h-60 rounded-full border border-emerald-400/10 pointer-events-none"
        style={{ transformStyle: 'preserve-3d' }}
      />

      {/* Particules flottantes émeraudes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {[
          { left: '20%', top: '25%', delay: '0s', size: 'w-1 h-1' },
          { left: '80%', top: '35%', delay: '1.2s', size: 'w-1.5 h-1.5' },
          { left: '30%', top: '75%', delay: '0.6s', size: 'w-1 h-1' },
          { left: '70%', top: '70%', delay: '1.8s', size: 'w-1 h-1' },
        ].map((pt, i) => (
          <span
            key={i}
            className={cn('absolute rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7] animate-pulse', pt.size)}
            style={{ left: pt.left, top: pt.top, animationDelay: pt.delay }}
          />
        ))}
      </div>

      {/* Carte d'invitation 3D orientable et interactive */}
      <div
        className={cn(
          'relative w-28 h-44 rounded-2xl cursor-grab active:cursor-grabbing transition-transform',
          !isDragging && 'duration-700 ease-out',
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${dragRot.x}deg) rotateY(${dragRot.y}deg) translateZ(0px)`,
        }}
      >
        {/* Face avant 3D de la carte */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-b from-slate-900/95 via-slate-950/90 to-black/95 p-2.5 flex flex-col justify-between overflow-hidden shadow-[0_0_35px_rgba(16,185,129,0.35),inset_0_0_20px_rgba(16,185,129,0.15)]"
          style={{ transform: 'translateZ(12px)', backfaceVisibility: 'hidden' }}
        >
          {/* Laser Scanner 3D */}
          <div className="em-laser-scanner-3d absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_15px_#10b981,0_0_30px_#059669] pointer-events-none z-20" />

          {/* Grille holographique filigrane */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

          {/* Remplissage de synthèse progressif */}
          <div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-500/25 via-emerald-400/15 to-transparent transition-[height] duration-500 pointer-events-none"
            style={{ height: `${Math.max(15, progress)}%` }}
          />

          {/* En-tête de carte 3D */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[7px] font-mono tracking-widest text-emerald-400/80 uppercase">9:16 RAW</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
          </div>

          {/* Monogramme / Emblème royal central */}
          <div className="relative z-10 my-auto text-center space-y-1">
            <div className="w-9 h-9 mx-auto rounded-full border border-emerald-400/50 flex items-center justify-center bg-emerald-400/10 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <Sparkles className="w-4 h-4 text-emerald-300 animate-spin [animation-duration:8s]" />
            </div>
            <div className="space-y-0.5">
              <div
                className={cn(
                  'h-1 mx-auto rounded-full transition-all duration-500',
                  stepIndex >= 1 ? 'w-12 bg-emerald-200/80 shadow-[0_0_6px_#a7f3d0]' : 'w-6 bg-slate-700',
                )}
              />
              <div
                className={cn(
                  'h-0.5 mx-auto rounded-full transition-all duration-500',
                  stepIndex >= 2 ? 'w-16 bg-emerald-200/60' : 'w-8 bg-slate-800',
                )}
              />
              <div
                className={cn(
                  'h-0.5 mx-auto rounded-full transition-all duration-500',
                  stepIndex >= 3 ? 'w-10 bg-emerald-200/40' : 'w-4 bg-slate-850',
                )}
              />
            </div>
          </div>

          {/* Pied de carte avec dorures émeraudes */}
          <div className="relative z-10 pt-1 border-t border-emerald-400/30 flex items-center justify-between text-[7px] font-mono text-emerald-300/80">
            <span>EVENTMASTER</span>
            <span>2K UHD</span>
          </div>
        </div>

        {/* Tranche / épaisseur 3D latérale */}
        <div
          className="absolute inset-0 rounded-2xl bg-emerald-500/20 border border-emerald-400/30"
          style={{ transform: 'translateZ(6px)', backfaceVisibility: 'hidden' }}
        />

        {/* Face arrière 3D de la carte */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-emerald-400/30 bg-slate-950 p-3 flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(16,185,129,0.2)]"
          style={{ transform: 'rotateY(180deg) translateZ(12px)', backfaceVisibility: 'hidden' }}
        >
          <Cpu className="w-6 h-6 text-emerald-400 mb-1 animate-pulse" />
          <span className="text-[8px] font-mono tracking-wider text-emerald-300 uppercase">STUDIO AI ENGINE</span>
          <span className="text-[7px] text-muted font-mono mt-0.5">GEMINI 3 PRO 2K</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   OBJET 3D HOLOGRAPHIQUE INTERACTIF — PLAN DE SALLE
───────────────────────────────────────────────────────────── */
function Game3DRoomPlanArtifact({
  progress,
  isDragging,
  dragRot,
}: {
  progress: number;
  isDragging: boolean;
  dragRot: { x: number; y: number };
}) {
  const tables = [
    { x: '25%', y: '25%', z: 8, label: 'T01', show: progress > 20 },
    { x: '75%', y: '25%', z: 12, label: 'T02', show: progress > 38 },
    { x: '50%', y: '50%', z: 16, label: 'VIP', show: progress > 52 },
    { x: '25%', y: '75%', z: 8, label: 'T03', show: progress > 68 },
    { x: '75%', y: '75%', z: 10, label: 'T04', show: progress > 82 },
  ];

  return (
    <div className="relative w-48 h-64 flex items-center justify-center select-none" style={{ perspective: '1000px' }}>
      {/* Anneau radar de balayage émeraude */}
      <div className="absolute w-52 h-52 rounded-full border border-emerald-400/20 pointer-events-none">
        <div className="em-radar-sweep absolute inset-0 rounded-full border-t border-emerald-400/70 bg-gradient-to-b from-emerald-500/10 to-transparent" />
      </div>

      <div
        className={cn(
          'relative w-40 h-40 rounded-xl cursor-grab active:cursor-grabbing transition-transform duration-700 ease-out',
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${dragRot.x + 35}deg) rotateZ(${dragRot.y - 25}deg)`,
        }}
      >
        {/* Sol isométrique maillé */}
        <div
          className="absolute inset-0 rounded-xl border-2 border-emerald-400/40 bg-slate-950/90 shadow-[0_0_25px_rgba(16,185,129,0.2)] overflow-hidden"
          style={{ transform: 'translateZ(0px)' }}
        >
          {/* Lignes de quadrillage architectural */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(52,211,153,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(52,211,153,0.08)_1px,transparent_1px)] bg-[size:16px_16px]" />

          {/* Scanner LiDAR */}
          <div className="em-laser-scanner-3d absolute inset-x-0 h-0.5 bg-emerald-300 shadow-[0_0_12px_#10b981]" />

          {/* Tables 3D en lévitation */}
          {tables.map((t, i) => (
            <div
              key={i}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-500',
                t.show ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
                t.label === 'VIP'
                  ? 'w-8 h-8 bg-emerald-400/35 border border-emerald-300 shadow-[0_0_15px_#10b981]'
                  : 'w-6 h-6 bg-emerald-400/15 border border-emerald-400/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
              )}
              style={{
                left: t.x,
                top: t.y,
                transform: `translateZ(${t.z}px)`,
              }}
            >
              <span className="text-[7px] font-mono font-bold text-emerald-200">{t.label}</span>
            </div>
          ))}

          {/* Estrade / Scène en fond */}
          <div
            className="absolute top-1 inset-x-8 h-3 rounded border border-emerald-400/50 bg-emerald-400/20 flex items-center justify-center"
            style={{ transform: 'translateZ(14px)' }}
          >
            <span className="text-[6px] font-mono font-bold text-emerald-300 uppercase">ESTRADE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   OBJET 3D HOLOGRAPHIQUE INTERACTIF — BUDGET SIMULATEUR
───────────────────────────────────────────────────────────── */
function Game3DBudgetArtifact({
  stepIndex,
  isDragging,
  dragRot,
}: {
  stepIndex: number;
  isDragging: boolean;
  dragRot: { x: number; y: number };
}) {
  const bars = [
    { height: 45, label: 'SALLE', show: stepIndex >= 1 },
    { height: 75, label: 'TRAITEUR', show: stepIndex >= 2 },
    { height: 60, label: 'DÉCOR', show: stepIndex >= 3 },
    { height: 90, label: 'TECH', show: stepIndex >= 4 },
  ];

  return (
    <div className="relative w-48 h-64 flex items-center justify-center select-none" style={{ perspective: '1000px' }}>
      {/* Orbite émeraude extérieure */}
      <div className="em-gyro-ring-1 absolute w-48 h-48 rounded-full border border-emerald-400/25 pointer-events-none" />

      <div
        className="relative w-36 h-36 flex items-end justify-center gap-2.5 p-2 rounded-xl border border-emerald-400/40 bg-slate-950/80 shadow-[0_0_25px_rgba(16,185,129,0.25)]"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${dragRot.x + 25}deg) rotateY(${dragRot.y - 15}deg)`,
        }}
      >
        {bars.map((bar, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-5 rounded-t-md border transition-all duration-700 shadow-lg',
                bar.show
                  ? 'border-emerald-300 bg-gradient-to-t from-emerald-600/40 via-emerald-400/40 to-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'border-slate-700 bg-slate-800/40',
              )}
              style={{
                height: `${bar.show ? bar.height : 15}%`,
                transform: `translateZ(${10 + i * 4}px)`,
              }}
            />
            <span className="text-[6px] font-mono text-emerald-200/80">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CARROUSEL D'ASTUCES FAÇON JEU VIDÉO (GAME TIPS & LORE)
───────────────────────────────────────────────────────────── */
function GameTipsCarousel({ variant }: { variant: AiLoaderVariant }) {
  const tips = STUDIO_GAME_TIPS[variant] || STUDIO_GAME_TIPS.invitation;
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [tips.length]);

  const current = tips[tipIndex];

  return (
    <div className="relative overflow-hidden rounded-xl border border-stage-foreground/15 bg-stage-elevated/90 backdrop-blur-md p-3.5 text-left shadow-2xl transition">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase">
            ASTUCE DU STUDIO [{tipIndex + 1}/{tips.length}] · {current.tag}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setTipIndex((prev) => (prev + 1) % tips.length)}
          aria-label="Afficher l’astuce suivante"
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-emerald-400/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
        >
          <span>Suivante</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-stage-foreground/85 leading-relaxed font-sans min-h-[2.25rem]">
        {current.tip}
      </p>

      {/* Barre de temps de l'astuce */}
      <div className="mt-2 h-0.5 w-full bg-stage-foreground/10 rounded-full overflow-hidden">
        <div
          key={tipIndex}
          className="h-full bg-emerald-400/80 rounded-full transition-all duration-[5500ms] ease-linear"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPOSANT MAÎTRE DU LOADER 3D GAME
───────────────────────────────────────────────────────────── */
export function AiProcessFullscreenLoader({
  active,
  title,
  footnote,
  steps,
  stageHint,
  icon: Icon = Sparkles,
  variant = 'invitation',
}: {
  active: boolean;
  title: string;
  footnote?: string;
  steps: AiProcessStep[];
  stageHint?: string | null;
  icon?: LucideIcon;
  variant?: AiLoaderVariant;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevStepIndexRef = useRef(0);

  // Contrôles 3D interactifs (glisser-déposer pour orbiter comme un jeu 3D)
  const [dragRot, setDragRot] = useState({ x: -8, y: 12 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, rotX: -8, rotY: 12 });

  useEffect(() => {
    setMounted(true);
    setMuted(isLocalAudioMuted());
  }, []);

  // Déclenchement sonore à chaque étape franchie
  useEffect(() => {
    if (active && stepIndex > prevStepIndexRef.current) {
      playStudioStepSound();
    }
    prevStepIndexRef.current = stepIndex;
  }, [active, stepIndex]);

  // Horloge d'étape et progression
  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setProgress(0);
      setElapsed(0);
      setDragRot({ x: -8, y: 12 });
      return;
    }

    setProgress(PROGRESS_START);
    setElapsed(0);

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setStepIndex(Math.max(0, steps.length - 1));
      setProgress(PROGRESS_CAP);
      return;
    }

    const stepTimer = window.setInterval(() => {
      setStepIndex((index) => nextAiLoaderStepIndex(index, steps.length));
    }, STEP_INTERVAL_MS);

    const progressTimer = window.setInterval(() => {
      setProgress((value) => nextAiLoaderProgress(value));
    }, PROGRESS_TICK_MS);

    const elapsedTimer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    // Oscillation continue lente quand l'utilisateur ne manipule pas la 3D
    const autoSpin = window.setInterval(() => {
      if (!isDragging) {
        setDragRot((prev) => ({
          x: -8 + Math.sin(Date.now() / 1400) * 6,
          y: (prev.y + 0.35) % 360,
        }));
      }
    }, 40);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(progressTimer);
      window.clearInterval(elapsedTimer);
      window.clearInterval(autoSpin);
    };
  }, [active, steps.length, isDragging]);

  // Verrouillage du scroll en arrière-plan
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  // Capture et maintien du focus d'accessibilité
  useEffect(() => {
    if (!active) return;
    rootRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = rootRef.current;
      if (!root) return;
      event.preventDefault();
      root.focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      root.focus();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [active]);

  // Gestion des événements Pointer pour manipuler l'artefact 3D
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotX: dragRot.x,
      rotY: dragRot.y,
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setDragRot({
      x: Math.max(-55, Math.min(55, dragStartRef.current.rotX - deltaY * 0.45)),
      y: (dragStartRef.current.rotY + deltaX * 0.5) % 360,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  if (!active || !mounted) return null;

  const current = steps[stepIndex] || steps[0];
  const shownProgress = Math.round(progress);
  const elapsedLabel = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      className="em-stage em-stage-overlay flex flex-col justify-between p-4 sm:p-6 relative select-none"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="ai-process-loader-title"
      aria-describedby="ai-process-loader-desc"
    >
      {/* ─── 1. SOL EN PERSPECTIVE 3D (CYBERSPACE / GAME ENGINE HORIZON) ─── */}
      <div
        className="em-3d-grid-floor absolute inset-x-0 bottom-0 h-2/5 pointer-events-none opacity-40"
        style={{
          transform: 'perspective(600px) rotateX(68deg)',
          transformOrigin: 'bottom center',
        }}
        aria-hidden
      />

      {/* Halos volumétriques d'arrière-plan (ambiance unifiée émeraude prestigieuse & ardoise pure) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] rounded-full bg-emerald-500/[0.12] blur-[120px] motion-safe:animate-pulse" />
        <div className="absolute bottom-0 inset-x-0 h-96 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      {/* ─── 2. HUD DE JEU — EN-TÊTE SUPÉRIEURE (TELEMETRY & STATUS) ─── */}
      <header className="relative z-30 flex items-center justify-between w-full max-w-5xl mx-auto text-xs font-mono">
        {/* Télémétrie gauche */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stage-elevated/90 border border-stage-foreground/20 shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold tracking-wider text-stage-foreground uppercase">
              STUDIO 3D // EN COURS
            </span>
          </div>
          <span className="hidden md:inline text-stage-foreground/50 tracking-wider">
            MOTEUR GEMINI 3 NANO · 9:16
          </span>
        </div>

        {/* Télémétrie droite : FPS, Horloge & Audio */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-stage-elevated/70 border border-stage-foreground/15 text-stage-foreground/75 tabular-nums">
            <Cpu className="w-3.5 h-3.5 text-emerald-400/80" />
            <span>60 FPS</span>
            <span className="text-stage-foreground/30">|</span>
            <span>T+{elapsedLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              unlockAudioNotifications();
              const next = !muted;
              setMuted(next);
              setLocalAudioMuted(next);
            }}
            aria-label={muted ? 'Activer le son du studio' : 'Couper le son du studio'}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stage-elevated/90 hover:bg-stage-elevated border border-stage-foreground/20 text-xs font-semibold text-stage-foreground transition shadow-xl backdrop-blur-md active:scale-95"
          >
            {muted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-stage-foreground/50 shrink-0" />
                <span className="hidden sm:inline text-stage-foreground/75">Son coupé</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                <span className="hidden sm:inline text-emerald-300">Audio 3D actif</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ─── 3. ZONE CENTRALE : OBJET HOLOGRAPHIQUE 3D & QUEST HUD ─── */}
      <main className="relative z-20 w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 py-4 my-auto">
        {/* ARTEFACT 3D MANIPULABLE */}
        <div className="flex flex-col items-center">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative cursor-grab active:cursor-grabbing p-4 rounded-3xl group touch-none"
            title="Cliquez et faites glisser pour inspecter en 3D"
          >
            {/* Viseur de ciblage HUD d'angle émeraude */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400/60" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400/60" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400/60" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400/60" />

            {/* Rendu 3D selon la variante */}
            {variant === 'invitation' ? (
              <Game3DInvitationArtifact
                progress={shownProgress}
                stepIndex={stepIndex}
                isDragging={isDragging}
                dragRot={dragRot}
              />
            ) : variant === 'room' ? (
              <Game3DRoomPlanArtifact
                progress={shownProgress}
                isDragging={isDragging}
                dragRot={dragRot}
              />
            ) : (
              <Game3DBudgetArtifact
                stepIndex={stepIndex}
                isDragging={isDragging}
                dragRot={dragRot}
              />
            )}
          </div>

          {/* Badge interactif sous l'artefact */}
          <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stage-elevated/80 border border-stage-foreground/15 text-[11px] font-mono text-stage-foreground/70">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            {isDragging ? (
              <span className="text-emerald-300 font-semibold">ROTATION MANUELLE 3D</span>
            ) : (
              <span>GLISSEZ POUR INSPECTER EN 3D</span>
            )}
          </div>
        </div>

        {/* PANNEAU HUD : PROGRESSION & SOUS-ROUTINES (QUEST LOG) */}
        <div className="w-full max-w-md text-left space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
                PHASE {stepIndex + 1}/{steps.length}
              </span>
              <span className="text-xs font-mono text-stage-foreground/50">
                {stageHint || 'SYNTHÈSE HAUTE-FIDÉLITÉ'}
              </span>
            </div>

            <h2
              id="ai-process-loader-title"
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-stage-foreground"
            >
              {title}
            </h2>

            <p id="ai-process-loader-desc" className="text-sm text-stage-foreground/75 mt-1">
              {current.label}
            </p>
            {footnote ? (
              <p className="text-xs text-stage-foreground/50 mt-0.5">{footnote}</p>
            ) : null}
          </div>

          {/* BARRE DE PROGRESSION STYLE JEU VIDÉO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-stage-foreground/70">PROGRESSION DU RENDU</span>
              <span className="font-bold text-emerald-300 tabular-nums">
                [ {shownProgress} % ]
              </span>
            </div>

            <div
              className="h-2.5 overflow-hidden rounded-full bg-stage-elevated border border-stage-foreground/20 p-0.5 relative shadow-inner"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={shownProgress}
              aria-label="Progression du chargement 3D"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-200 transition-[width] duration-350 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${shownProgress}%` }}
              />
            </div>
          </div>

          {/* CHECKLIST DE QUÊTES / SOUS-ROUTINES */}
          <ol className="space-y-1.5 font-mono text-xs" aria-label="Sous-routines du moteur">
            {steps.map((step, index) => {
              const isCurrent = index === stepIndex;
              const isDone = index < stepIndex;

              return (
                <li
                  key={step.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all duration-300',
                    isCurrent
                      ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : isDone
                        ? 'border-stage-foreground/10 bg-stage-foreground/5 text-stage-foreground/75'
                        : 'border-stage-foreground/5 bg-stage-foreground/[0.02] text-stage-foreground/40',
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-md inline-flex items-center justify-center text-[10px] font-bold shrink-0',
                      isCurrent
                        ? 'bg-emerald-400 text-emerald-950 font-black shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                        : isDone
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-stage-foreground/10 text-stage-foreground/40',
                    )}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : `0${index + 1}`}
                  </span>

                  <span className="font-sans text-xs flex-1 truncate">{step.label}</span>

                  {isCurrent ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono shrink-0">
                      <span>RUNNING</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </span>
                  ) : isDone ? (
                    <span className="text-emerald-300/80 text-[10px] font-mono shrink-0">OK</span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </main>

      {/* ─── 4. PIED DE PAGE : CARROUSEL D'ASTUCES STYLE LORE DE JEU ─── */}
      <footer className="relative z-30 w-full max-w-2xl mx-auto mt-2">
        <GameTipsCarousel variant={variant} />
      </footer>
    </div>,
    document.body,
  );
}

/* ─────────────────────────────────────────────────────────────
   EXPORTS SPÉCIFIQUES POUR CHAQUE STUDIO
───────────────────────────────────────────────────────────── */
export default function AiComposeFullscreenLoader({
  active,
  embedText = false,
  hasReferences = false,
  stageHint,
  title = 'Synthèse 3D de l’invitation',
  footnote,
}: {
  active: boolean;
  embedText?: boolean;
  hasReferences?: boolean;
  stageHint?: string | null;
  title?: string;
  footnote?: string;
}) {
  const steps = COMPOSE_STEPS.map((step) => {
    if (step.id === 'faces' && !hasReferences) {
      return { ...step, label: 'Ambiance, matières & textures' };
    }
    if (step.id === 'finish' && embedText) {
      return { ...step, label: 'Incrustation de la typographie' };
    }
    return step;
  });

  return (
    <AiProcessFullscreenLoader
      active={active}
      variant="invitation"
      title={title}
      stageHint={stageHint}
      steps={steps}
      footnote={
        footnote ||
        (hasReferences
          ? 'Les regards, sourires et volumes faciaux restent fidèles aux photos de référence.'
          : 'Modèle 9:16 sculpté fidèlement à partir de votre brief.')
      }
    />
  );
}

export function AiBudgetFullscreenLoader({
  active,
  stageHint,
}: {
  active: boolean;
  stageHint?: string | null;
}) {
  return (
    <AiProcessFullscreenLoader
      active={active}
      variant="budget"
      title="Calcul immersif du budget"
      stageHint={stageHint}
      steps={BUDGET_STEPS}
      footnote="Tarifs réels indexés sur les salles et prestataires de votre région."
    />
  );
}

export function AiRoomPlanFullscreenLoader({
  active,
  hasPhoto = false,
  stageHint,
}: {
  active: boolean;
  hasPhoto?: boolean;
  stageHint?: string | null;
}) {
  const steps = hasPhoto
    ? ROOM_PLAN_STEPS
    : ROOM_PLAN_STEPS.filter((step) => step.id !== 'photo');

  return (
    <AiProcessFullscreenLoader
      active={active}
      variant="room"
      title="Architecture spatiale 3D"
      stageHint={stageHint}
      steps={steps}
      footnote={
        hasPhoto
          ? 'Analyse volumétrique LiDAR de la photo de votre salle.'
          : 'Plan isométrique et calcul des flux de circulation.'
      }
    />
  );
}
