'use client';

import React from 'react';
import {
  RoomLayoutBlueprint,
  getFixtureClass,
  AisleStyle,
  DoorStyle,
  ChandelierFixtureStyle,
  type BarStyle,
  type InstrumentStyle,
  type PodiumStyle,
  barStyleLabels,
  instrumentStyleLabels,
  podiumStyleLabels,
} from '@/lib/roomLayoutUtils';
import { ZONE_MATERIAL_COLORS } from '@/lib/roomWebGLMaterials';
import { getCroppedBackgroundStyle } from '@/lib/imageCropUtils';
import FlowerRenderer from '@/components/FlowerRenderer';
import { Sparkles, DoorOpen, ShieldAlert } from 'lucide-react';

type Fixture = RoomLayoutBlueprint['fixtures'][number];

interface FixtureRendererProps {
  fixture: Fixture;
  className?: string;
  showLabel?: boolean;
  /** Si true, remplit le conteneur parent (pas de position absolue) */
  fill?: boolean;
}

export default function FixtureRenderer({
  fixture,
  className = '',
  showLabel = true,
  fill = false,
}: FixtureRendererProps) {
  const isColumn = fixture.kind === 'pillar' || fixture.kind === 'column';
  const isStage = fixture.kind === 'stage' || fixture.kind === 'podium';
  const isFlower = fixture.kind === 'flower';
  const isArch = fixture.kind === 'arch';
  const isPartition = fixture.kind === 'partition';
  const isDecal = fixture.kind === 'decal';
  const isPedestal = fixture.kind === 'pedestal';
  const isStringLight = fixture.kind === 'stringLight';
  const isFountain = fixture.kind === 'fountain';
  const isGazebo = fixture.kind === 'gazebo';
  const isDjBooth = fixture.kind === 'djBooth';
  const isScreen = fixture.kind === 'screen';
  const isInstrument = fixture.kind === 'instrument';
  const isBar = fixture.kind === 'bar';
  const isAisle = fixture.kind === 'aisle';
  const isCarpet = fixture.kind === 'carpet';
  const isDoor = fixture.kind === 'door' || fixture.kind === 'entrance';
  const isChandelier = fixture.kind === 'chandelier';
  const isBuffet = fixture.kind === 'buffet';
  const isStairs = fixture.kind === 'stairs';
  const isBalcony = fixture.kind === 'balcony';
  const colShape = fixture.columnShape ?? 'round';
  const hasImage = Boolean(fixture.imageUrl);

  const imageStyle = hasImage ? getCroppedBackgroundStyle(fixture.imageUrl!, fixture.imageCrop) : undefined;

  const positionStyle: React.CSSProperties = fill
    ? {
        width: '100%',
        height: '100%',
        transform: fixture.rotation ? `rotate(${fixture.rotation}deg)` : undefined,
      }
    : {
        left: `${fixture.x}%`,
        top: `${fixture.y}%`,
        width: `${fixture.w}%`,
        height: `${fixture.h}%`,
        transform: fixture.rotation ? `rotate(${fixture.rotation}deg)` : undefined,
      };

  // ─────────────────────────────────────────────────────────────
  // 1. FLEURS & DÉCORATIONS FLORALES
  // ─────────────────────────────────────────────────────────────
  if (isArch) {
    const bloom = fixture.color ?? fixture.flowerColor ?? '#f4e8e4';
    return (
      <div
        className={`${fill ? 'relative' : 'absolute'} flex items-center justify-center ${className}`}
        style={positionStyle}
      >
        <div
          className="relative w-full h-full rounded-t-full border-[6px] border-b-0"
          style={{ borderColor: bloom, background: 'transparent' }}
        >
          <span className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-emerald-700/70" />
        </div>
        {showLabel && fixture.label && (
          <span className="absolute -bottom-4 text-[8px] font-bold text-muted whitespace-nowrap bg-surface/80 px-1 rounded shadow-xs">
            {fixture.label}
          </span>
        )}
      </div>
    );
  }

  if (isDecal) {
    const tint = fixture.color ?? '#dcaeae';
    return (
      <div className={`${fill ? 'relative' : 'absolute'} select-none ${className}`} style={positionStyle}>
        <div
          className="w-full h-full rounded-full opacity-80"
          style={{ background: fixture.decalKind === 'butterfly'
            ? `radial-gradient(circle at 30% 40%, ${tint}, transparent 55%), radial-gradient(circle at 70% 40%, ${tint}, transparent 55%)`
            : `radial-gradient(circle, ${tint}, transparent 70%)` }}
        />
        {showLabel && fixture.label ? (
          <span className="absolute -bottom-4 text-[8px] font-bold text-muted whitespace-nowrap bg-surface/80 px-1 rounded shadow-xs">
            {fixture.label}
          </span>
        ) : null}
      </div>
    );
  }

  if (isStringLight) {
    return (
      <div className={`${fill ? 'relative' : 'absolute'} select-none ${className}`} style={positionStyle}>
        <div className="w-full h-full border border-dashed border-amber-400/70 rounded-[var(--radius-button)] bg-amber-50/40" />
        {showLabel && fixture.label ? (
          <span className="absolute -bottom-4 text-[8px] font-bold text-muted whitespace-nowrap bg-surface/80 px-1 rounded shadow-xs">
            {fixture.label}
          </span>
        ) : null}
      </div>
    );
  }

  if (isFountain || isGazebo || isDjBooth || isScreen) {
    return (
      <div className={`${fill ? 'relative' : 'absolute'} select-none ${className}`} style={positionStyle}>
        <div
          className={`w-full h-full border ${isFountain ? 'rounded-full bg-sky-100 border-sky-300' : isGazebo ? 'rounded-[0.4rem] bg-stone-50 border-stone-300' : isScreen ? 'bg-zinc-900 border-zinc-600' : 'bg-zinc-200 border-zinc-400'}`}
        />
        {showLabel && fixture.label ? (
          <span className="absolute -bottom-4 text-[8px] font-bold text-muted whitespace-nowrap bg-surface/80 px-1 rounded shadow-xs">
            {fixture.label}
          </span>
        ) : null}
      </div>
    );
  }

  if (isPedestal) {
    return (
      <div className={`${fill ? 'relative' : 'absolute'} select-none ${className}`} style={positionStyle}>
        <div className="w-full h-full flex flex-col items-center justify-end">
          <div className="w-3/5 h-3/5 rounded-sm border border-stone-300 bg-stone-50" />
          <FlowerRenderer flowerType={fixture.flowerType ?? 'rose'} color={fixture.flowerColor ?? '#f4e8e4'} size="sm" />
        </div>
        {showLabel && fixture.label ? (
          <span className="absolute -bottom-4 text-[8px] font-bold text-muted whitespace-nowrap bg-surface/80 px-1 rounded shadow-xs">
            {fixture.label}
          </span>
        ) : null}
      </div>
    );
  }

  if (isPartition) {
    const tint = fixture.color ?? '#c4a4a4';
    return (
      <div
        className={`${fill ? 'relative' : 'absolute'} select-none ${className}`}
        style={positionStyle}
      >
        <div
          className="w-full h-full rounded-[2rem] border-2 shadow-xs flex items-end justify-center pb-0.5"
          style={{ backgroundColor: tint, borderColor: '#9a7a7a' }}
        >
          <span className="text-[8px] font-bold text-rose-950/80">🌿</span>
        </div>
        {showLabel && fixture.label && (
          <span className="absolute -bottom-4 text-[8px] font-bold text-muted whitespace-nowrap bg-surface/80 px-1 rounded shadow-xs">
            {fixture.label}
          </span>
        )}
      </div>
    );
  }

  if (isFlower) {
    return (
      <div
        className={`${fill ? 'relative' : 'absolute'} flex items-center justify-center ${className}`}
        style={positionStyle}
      >
        <FlowerRenderer
          flowerType={fixture.flowerType ?? 'boquet'}
          color={fixture.flowerColor ?? '#e11d48'}
          imageUrl={fixture.imageUrl}
          size="lg"
        />
        {showLabel && fixture.label && (
          <span className="absolute -bottom-4 text-[8px] font-bold text-muted whitespace-nowrap bg-surface/80 px-1 rounded shadow-xs">
            {fixture.label}
          </span>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PORTES & ENTRÉES D’ACCUEIL (Styles Pinterest réalistes)
  // ─────────────────────────────────────────────────────────────
  if (isDoor) {
    const doorStyle: DoorStyle = fixture.doorStyle ?? (fixture.kind === 'entrance' ? 'grandPortal' : 'frenchDoor');
    const swing = fixture.doorSwing ?? (doorStyle === 'single' ? 'right' : 'double');
    const doorColor = fixture.color || '#78350f';
    const hasMat = fixture.hasMat !== false;
    const matColor = fixture.matColor || '#451a03';

    return (
      <div
        className={`${fill ? 'relative' : 'absolute'} select-none ${className}`}
        style={positionStyle}
      >
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Paillasson d’accueil de prestige */}
          {hasMat && (
            <div
              className="absolute -bottom-2 inset-x-2 h-3 rounded-sm border border-amber-600/40 shadow-xs flex items-center justify-center"
              style={{ backgroundColor: matColor }}
            >
              <div className="w-4/5 h-[1px] bg-amber-400/40 border-t border-dashed border-amber-300/40" />
            </div>
          )}

          {/* Cadre de mur / Huisserie */}
          <div className="w-full h-full rounded-md border-2 border-stone-800 bg-stone-900/90 p-1 flex items-center justify-between shadow-md relative overflow-hidden">
            {/* Style : Grand Portail Royal Doré */}
            {doorStyle === 'grandPortal' && (
              <div className="w-full h-full bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 rounded flex items-center justify-between px-2 text-stone-900 shadow-inner">
                <span className="w-1.5 h-full bg-amber-900/40 rounded-full" />
                <div className="flex items-center gap-1 font-black text-[9px] uppercase tracking-wider text-amber-950">
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  {fixture.label || 'Portail Royal'}
                </div>
                <span className="w-1.5 h-full bg-amber-900/40 rounded-full" />
              </div>
            )}

            {/* Style : Double Porte Française avec petits carreaux */}
            {(doorStyle === 'frenchDoor' || doorStyle === 'double') && (
              <div className="w-full h-full grid grid-cols-2 gap-1 p-0.5 bg-stone-800 rounded">
                {/* Battant Gauche */}
                <div
                  className="h-full border border-amber-400/40 rounded-xs flex items-center justify-between px-1 shadow-inner relative"
                  style={{ backgroundColor: doorColor }}
                >
                  <div className="w-full grid grid-cols-2 gap-0.5 py-0.5 opacity-60">
                    <div className="h-2 bg-white/20 rounded-xs border border-white/30" />
                    <div className="h-2 bg-white/20 rounded-xs border border-white/30" />
                  </div>
                  <span className="w-1 h-1 rounded-full bg-amber-300 absolute right-1 shadow-xs" />
                </div>

                {/* Battant Droit */}
                <div
                  className="h-full border border-amber-400/40 rounded-xs flex items-center justify-between px-1 shadow-inner relative"
                  style={{ backgroundColor: doorColor }}
                >
                  <span className="w-1 h-1 rounded-full bg-amber-300 absolute left-1 shadow-xs" />
                  <div className="w-full grid grid-cols-2 gap-0.5 py-0.5 opacity-60">
                    <div className="h-2 bg-white/20 rounded-xs border border-white/30" />
                    <div className="h-2 bg-white/20 rounded-xs border border-white/30" />
                  </div>
                </div>
              </div>
            )}

            {/* Style : Porte de Grange Bois Rustique */}
            {doorStyle === 'barnDoor' && (
              <div
                className="w-full h-full rounded border border-amber-950 flex items-center justify-center relative shadow-inner overflow-hidden"
                style={{ backgroundColor: doorColor }}
              >
                {/* Rail supérieur métallique */}
                <div className="absolute top-0 inset-x-0 h-1 bg-stone-900 border-b border-stone-600 flex justify-around">
                  <span className="w-1 h-1 rounded-full bg-stone-400 -mt-0.5" />
                  <span className="w-1 h-1 rounded-full bg-stone-400 -mt-0.5" />
                </div>
                {/* Croix en bois */}
                <div className="text-[8px] font-bold text-amber-200/90 uppercase tracking-wide">
                  {fixture.label || 'Porte Grange'}
                </div>
              </div>
            )}

            {/* Style : Rideau de velours VIP */}
            {doorStyle === 'velvetCurtain' && (
              <div className="w-full h-full bg-gradient-to-r from-red-950 via-red-800 to-red-950 rounded flex items-center justify-between px-2 text-amber-300 border border-amber-500/40">
                <span className="text-[10px]">⚜</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-amber-200">
                  {fixture.label || 'Sas VIP'}
                </span>
                <span className="text-[10px]">⚜</span>
              </div>
            )}

            {/* Style : Issue de Secours Sécurisée */}
            {doorStyle === 'fireExit' && (
              <div className="w-full h-full bg-emerald-700 text-white rounded border border-emerald-400 flex items-center justify-between px-2 shadow-inner">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                <span className="text-[8px] font-black uppercase tracking-wider">
                  {fixture.label || 'SORTIE SECOURS'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              </div>
            )}

            {/* Style : Porte Simple / Vitrée / Standard */}
            {!['grandPortal', 'frenchDoor', 'double', 'barnDoor', 'velvetCurtain', 'fireExit'].includes(doorStyle) && (
              <div
                className="w-full h-full rounded flex items-center justify-between px-2 text-[8px] font-bold text-white shadow-inner"
                style={{ backgroundColor: doorColor }}
              >
                <span>🚪</span>
                <span className="truncate">{fixture.label || 'Porte'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
            )}
          </div>

          {/* Arcs d'ouverture en pointillés (Double battant) */}
          {swing === 'double' && (
            <div className="absolute -top-3 inset-x-1 h-3 pointer-events-none flex justify-between opacity-60">
              <div className="w-1/2 h-full border-t border-l border-dashed border-amber-500 rounded-tl-full" />
              <div className="w-1/2 h-full border-t border-r border-dashed border-amber-500 rounded-tr-full" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ALLÉES & TAPIS DE PRESTIGE (Styles Pinterest réalistes)
  // ─────────────────────────────────────────────────────────────
  if (isAisle || isCarpet) {
    const aisleStyle: AisleStyle = fixture.aisleStyle ?? (isAisle ? 'royalRed' : 'damaskGold');
    const hasGoldBorder = fixture.hasGoldBorder !== false;
    const hasLanterns = fixture.hasSideLanterns !== false;
    const hasPetals = fixture.hasPetals !== false;

    return (
      <div
        className={`${fill ? 'relative' : 'absolute'} select-none overflow-hidden rounded-md shadow-sm transition-all duration-300 ${className}`}
        style={positionStyle}
      >
        <div className="relative w-full h-full flex flex-col justify-between p-1">
          {/* Texture & Fond du Tapis selon le Style */}
          {aisleStyle === 'royalRed' && (
            <div className="absolute inset-0 bg-gradient-to-r from-rose-950 via-red-800 to-rose-950 shadow-inner" />
          )}

          {aisleStyle === 'whiteMirror' && (
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-100 to-white shadow-inner border border-slate-300" />
          )}

          {aisleStyle === 'botanicalRunner' && (
            <div className="absolute inset-0 bg-[#f8f6f0] border border-stone-300 shadow-inner" />
          )}

          {aisleStyle === 'rusticWood' && (
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#78350f_2px,transparent_2px),linear-gradient(to_right,#92400e,#78350f)] bg-[size:100%_12px] shadow-inner" />
          )}

          {aisleStyle === 'damaskGold' && (
            <div className="absolute inset-0 bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 border border-amber-500/40 shadow-inner" />
          )}

          {aisleStyle === 'ledRunway' && (
            <div className="absolute inset-0 bg-slate-950 border-x-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]" />
          )}

          {aisleStyle === 'blackVelvet' && (
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-neutral-900 to-zinc-950 border-x border-amber-400/50 shadow-inner" />
          )}

          {/* Bordure Dorée / Liseré Prestige */}
          {hasGoldBorder && (
            <>
              <div className="absolute inset-y-0 left-0.5 w-[2px] bg-gradient-to-b from-amber-400 via-amber-200 to-amber-400 opacity-90" />
              <div className="absolute inset-y-0 right-0.5 w-[2px] bg-gradient-to-b from-amber-400 via-amber-200 to-amber-400 opacity-90" />
            </>
          )}

          {/* Lanternes & Bougies latérales */}
          {hasLanterns && (
            <div className="absolute inset-y-2 inset-x-0.5 pointer-events-none flex justify-between flex-col">
              <div className="flex justify-between w-full px-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#f59e0b]" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#f59e0b]" />
              </div>
              <div className="flex justify-between w-full px-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#f59e0b]" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#f59e0b]" />
              </div>
              <div className="flex justify-between w-full px-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#f59e0b]" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#f59e0b]" />
              </div>
            </div>
          )}

          {/* Pétales de fleurs parsemés */}
          {hasPetals && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-80 flex flex-wrap gap-3 p-2 justify-around">
              <span className="w-1 h-1 rounded-full bg-rose-400 rotate-45" />
              <span className="w-1.5 h-1 rounded-full bg-rose-600 -rotate-12" />
              <span className="w-1 h-1.5 rounded-full bg-red-400 rotate-30" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 rotate-90" />
            </div>
          )}

          {/* Libellé centré */}
          {showLabel && fixture.label && (
            <div className="relative z-10 my-auto text-center">
              <span
                className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs ${
                  aisleStyle === 'whiteMirror' || aisleStyle === 'botanicalRunner'
                    ? 'bg-black/60 text-white'
                    : 'bg-black/40 text-amber-200'
                }`}
              >
                {fixture.label}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LUSTRES & SUSPENSIONS DE CRISTAL (Styles Pinterest réalistes)
  // ─────────────────────────────────────────────────────────────
  if (isChandelier) {
    const chandelierStyle: ChandelierFixtureStyle = fixture.chandelierStyle ?? 'crystalCascade';
    const warmth = fixture.lightWarmth ?? 'gold';
    const intensity = fixture.lightIntensity ?? 85;

    const glowColor =
      warmth === 'candle' ? 'rgba(245, 158, 11, 0.45)' :
      warmth === 'rose' ? 'rgba(244, 63, 94, 0.4)' :
      warmth === 'neutral' ? 'rgba(255, 255, 255, 0.45)' :
      warmth === 'night' ? 'rgba(99, 102, 241, 0.45)' :
      'rgba(251, 191, 36, 0.5)';

    return (
      <div
        className={`${fill ? 'relative' : 'absolute'} select-none flex items-center justify-center ${className}`}
        style={positionStyle}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Halo de diffusion de lumière tamisée */}
          <div
            className="absolute rounded-full pointer-events-none transition-all duration-500 animate-pulse-slow"
            style={{
              inset: '-50%',
              background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              opacity: intensity / 100,
            }}
          />

          {/* Rosace du Lustre */}
          <div className="relative z-10 w-full h-full rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center p-1 text-center group cursor-pointer hover:scale-110 transition-transform">
            {/* Style : Cascade de Cristal */}
            {chandelierStyle === 'crystalCascade' && (
              <div className="w-full h-full rounded-full border border-dashed border-white/80 flex items-center justify-center bg-black/20">
                <Sparkles className="w-4 h-4 text-amber-200 animate-spin-slow" />
              </div>
            )}

            {/* Style : Halos géométriques laiton */}
            {chandelierStyle === 'brassRings' && (
              <div className="w-full h-full rounded-full border-2 border-amber-300 flex items-center justify-center">
                <div className="w-2/3 h-2/3 rounded-full border-2 border-amber-200 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            )}

            {/* Style : Couronne Végétale & Fleurs */}
            {chandelierStyle === 'botanicalHalo' && (
              <div className="w-full h-full rounded-full bg-emerald-900/80 border-2 border-emerald-400 flex items-center justify-center text-[8px] text-emerald-200 font-bold">
                🌿
              </div>
            )}

            {/* Style : Ciel Étoilé / Autre */}
            {!['crystalCascade', 'brassRings', 'botanicalHalo'].includes(chandelierStyle) && (
              <div className="w-full h-full rounded-full flex items-center justify-center text-white text-[9px] font-black">
                ✨
              </div>
            )}
          </div>

          {/* Libellé au survol / affichage */}
          {showLabel && fixture.label && (
            <span className="absolute -bottom-4 text-[8px] font-bold text-amber-900 dark:text-amber-200 whitespace-nowrap bg-surface/90 px-1 rounded shadow-xs border border-amber-300/40">
              {fixture.label}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isInstrument) {
    const style: InstrumentStyle = fixture.instrumentStyle ?? 'piano';
    return (
      <div className={`${fill ? 'relative' : 'absolute'} select-none ${className}`} style={positionStyle}>
        <div className="relative w-full h-full rounded-md border-2 border-zinc-700 bg-zinc-900 text-zinc-100 flex flex-col items-center justify-center overflow-hidden shadow-xs">
          {style === 'piano' ? (
            <div className="w-[78%] h-[58%] rounded-[40%_40%_18%_18%] bg-zinc-950 border border-zinc-500 relative">
              <span className="absolute bottom-0 inset-x-[12%] h-[22%] bg-zinc-100 rounded-sm" />
            </div>
          ) : style === 'keyboard' ? (
            <div className="w-[86%] h-[28%] rounded-sm bg-zinc-800 border border-zinc-500">
              <div className="h-full w-full bg-[repeating-linear-gradient(90deg,#f8fafc_0_3px,#171717_3px_5px)] opacity-80 rounded-sm" />
            </div>
          ) : style === 'drums' ? (
            <div className="relative w-[70%] h-[70%]">
              <span className="absolute inset-[18%] rounded-full border-4 border-sky-800 bg-sky-950" />
              <span className="absolute top-0 right-1 w-4 h-4 rounded-full border border-amber-300 bg-amber-200/70" />
            </div>
          ) : style === 'micStand' ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-zinc-200" />
              <span className="w-px h-5 bg-zinc-400" />
              <span className="w-3 h-1 rounded-full bg-zinc-600" />
            </div>
          ) : (
            <div className={`w-[42%] ${style === 'amp' || style === 'speaker' ? 'h-[55%] rounded-sm' : 'h-[70%] rounded-[40%_40%_22%_22%]'} bg-rose-950 border border-zinc-500`} />
          )}
          {showLabel ? (
            <span className="absolute bottom-0.5 text-[7px] font-black uppercase tracking-wide text-zinc-200">
              {fixture.label || instrumentStyleLabels[style]}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (isBar) {
    const style: BarStyle = fixture.barStyle ?? 'cocktail';
    const bottleColors =
      style === 'wine' ? ['#7f1d1d', '#450a0a', '#3f1d1d'] :
      style === 'champagne' ? ['#ca8a04', '#a16207', '#854d0e'] :
      style === 'beer' ? ['#b45309', '#92400e'] :
      style === 'coffee' ? ['#292524', '#44403c'] :
      style === 'whiskey' ? ['#9a3412', '#7c2d12'] :
      ['#14532d', '#7f1d1d', '#1e3a5f', '#854d0e'];
    return (
      <div className={`${fill ? 'relative' : 'absolute'} select-none ${className}`} style={positionStyle}>
        <div className="relative w-full h-full rounded-md border-2 border-amber-800/50 bg-gradient-to-b from-amber-100 to-amber-200 overflow-hidden flex flex-col">
          <div className="flex justify-around items-end px-1 pt-0.5 h-[42%]">
            {bottleColors.concat(bottleColors).slice(0, 7).map((c, i) => (
              <span key={i} className="w-[7%] rounded-t-sm border border-black/20" style={{ height: i % 2 ? '88%' : '70%', background: c }} />
            ))}
          </div>
          <div className="flex-1 border-t border-amber-900/20 bg-amber-50/80 flex items-end justify-around px-1 pb-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`w-[9%] border border-sky-300/60 bg-sky-100/70 ${style === 'wine' || style === 'champagne' || style === 'cocktail' ? 'h-[38%] rounded-b-full' : 'h-[32%] rounded-sm'}`}
              />
            ))}
          </div>
          {showLabel ? (
            <span className="absolute inset-x-0 bottom-0.5 text-center text-[7px] font-black uppercase tracking-wide text-amber-950">
              {fixture.label || barStyleLabels[style]}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (isStage && fixture.kind === 'podium') {
    const style: PodiumStyle = fixture.podiumStyle ?? 'speaker';
    const round = style === 'circular' || style === 'couple';
    const podiumTint = !hasImage && fixture.material ? ZONE_MATERIAL_COLORS[fixture.material] : undefined;
    return (
      <div className={`${fill ? 'relative' : 'absolute'} select-none ${className}`} style={positionStyle}>
        <div
          className={`relative w-full h-full border-2 border-orange-400 ${getFixtureClass('podium')} overflow-hidden flex items-center justify-center ${round ? 'rounded-full' : style === 'runway' ? 'rounded-sm' : 'rounded-lg'}`}
          style={{
            backgroundColor: podiumTint,
            ...imageStyle,
          }}
        >
          {style === 'runway' ? <span className="absolute inset-y-1 left-0.5 w-0.5 bg-pink-400" /> : null}
          {style === 'runway' ? <span className="absolute inset-y-1 right-0.5 w-0.5 bg-pink-400" /> : null}
          {style === 'bandRiser' ? (
            <div className="absolute inset-1 flex gap-0.5">
              <span className="flex-1 bg-orange-300/70 rounded-sm" />
              <span className="flex-1 bg-orange-400/80 rounded-sm" />
              <span className="flex-1 bg-orange-500/80 rounded-sm" />
            </div>
          ) : null}
          {style === 'lectern' || style === 'speaker' ? (
            <span className="absolute w-[28%] h-[42%] rounded-sm bg-stone-800/80 border border-stone-600" />
          ) : null}
          {showLabel ? (
            <span className="relative z-10 text-[8px] font-black uppercase tracking-wide px-1">
              {fixture.label || podiumStyleLabels[style]}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. AUTRES FIXTURES (Scène, Podium, Colonne, Buffet, etc.)
  // ─────────────────────────────────────────────────────────────
  const usesZoneMaterial = isStage || isBuffet || isStairs || isBalcony;
  const materialTint = usesZoneMaterial && fixture.material && !hasImage
    ? ZONE_MATERIAL_COLORS[fixture.material]
    : undefined;

  return (
    <div
      className={`${fill ? 'relative' : 'absolute'} border-2 text-[9px] font-bold flex items-center justify-center px-1 text-center overflow-hidden ${getFixtureClass(
        fixture.kind,
      )} ${className} ${isColumn && colShape === 'round' && !hasImage ? 'rounded-full' : isColumn && !hasImage ? 'rounded-md' : 'rounded-lg'}`}
      style={{
        ...positionStyle,
        backgroundColor: materialTint ?? (!hasImage && isColumn && fixture.color ? fixture.color : undefined),
        ...imageStyle,
      }}
    >
      {hasImage && <div className="absolute inset-0 bg-black/10" />}
      {fixture.kind !== 'aisle' && showLabel && !hasImage && (fixture.label || fixture.kind)}
      {hasImage && isStage && fixture.label && (
        <span className="relative z-10 bg-black/50 text-white px-1.5 py-0.5 rounded text-[8px]">
          {fixture.label}
        </span>
      )}
    </div>
  );
}
