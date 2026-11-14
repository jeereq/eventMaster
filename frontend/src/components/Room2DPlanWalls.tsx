'use client';

import React from 'react';
import { WALL_TEXTURE_COLORS, type RoomWallSegment } from '@/lib/roomLayoutUtils';

interface Room2DPlanWallsProps {
  walls: RoomWallSegment[];
  canvasWidthM: number;
  canvasHeightM: number;
  className?: string;
  showDoorSwings?: boolean;
  activeStoryId?: string;
  /**
   * Dessin à l’échelle réelle (repère en mètres) : épaisseurs et largeurs de
   * baies exactes, comme en 3D. À utiliser quand le conteneur respecte les
   * proportions de la salle.
   */
  metric?: boolean;
}

/** Teintes des ouvertures, identiques aux maillages 3D. */
const DOOR_LEAF = '#6b4423';
const DOOR_FRAME = '#3f2a1a';
const WINDOW_GLASS = '#93c5fd';
const WINDOW_FRAME = '#f1f5f9';
const WALL_EDGE = 'rgba(15, 23, 42, 0.55)';

function wallColor(wall: RoomWallSegment): string {
  if (wall.color) return wall.color;
  if (wall.texture === 'glass' as string) return 'rgba(147, 197, 253, 0.55)';
  return WALL_TEXTURE_COLORS[wall.texture] ?? '#e8e4df';
}

export default function Room2DPlanWalls({
  walls,
  canvasWidthM,
  canvasHeightM,
  className = '',
  showDoorSwings = true,
  activeStoryId,
  metric = false,
}: Room2DPlanWallsProps) {
  if (!walls || walls.length === 0) return null;

  const avgM = (canvasWidthM + canvasHeightM) / 2;
  // Repère : % du canevas (historique) ou mètres (plan à l’échelle).
  const sx = metric ? canvasWidthM / 100 : 1;
  const sy = metric ? canvasHeightM / 100 : 1;
  /** Mètres → unités du repère. */
  const m = (v: number) => (metric ? v : (v / avgM) * 100);
  /** Traits fins : en pixels écran en mode métrique, en % sinon. */
  const fine = (pctWidth: number, px: number) => (metric ? px : pctWidth);
  const fineProps = metric ? { vectorEffect: 'non-scaling-stroke' as const } : {};
  const dash = (pct: string, px: string) => (metric ? px : pct);

  const activeWalls = activeStoryId
    ? walls.filter((w) => !w.storyId || w.storyId === activeStoryId)
    : walls;

  return (
    <svg
      viewBox={metric ? `0 0 ${canvasWidthM} ${canvasHeightM}` : '0 0 100 100'}
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible ${className}`}
      aria-hidden="true"
    >
      {activeWalls.map((wall) => {
        const x1 = wall.start.x * sx;
        const y1 = wall.start.y * sy;
        const x2 = wall.end.x * sx;
        const y2 = wall.end.y * sy;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < (metric ? 0.05 : 0.2)) return null;

        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;

        const thicknessM = wall.thicknessM || 0.25;
        const th = metric
          ? Math.max(0.1, thicknessM)
          : Math.max(0.8, Math.min(3.5, (thicknessM / avgM) * 100));
        const halfTh = th / 2;

        const base = wallColor(wall);
        const openings = Array.isArray(wall.openings) ? [...wall.openings] : [];
        openings.sort((a, b) => (a.t ?? 0.5) - (b.t ?? 0.5));

        const spanOf = (op: (typeof openings)[number]) => {
          const tCenter = typeof op.t === 'number' ? Math.max(0, Math.min(1, op.t)) : 0.5;
          const opW = m(op.widthM || (op.kind === 'door' ? 1.0 : 1.2));
          const halfSpan = Math.max(0.02, (opW / len) / 2);
          return { t1: Math.max(0, tCenter - halfSpan), t2: Math.min(1, tCenter + halfSpan) };
        };

        // Segments pleins entre les ouvertures.
        const intervals: Array<{ tStart: number; tEnd: number }> = [];
        let cursor = 0;
        for (const op of openings) {
          const { t1, t2 } = spanOf(op);
          if (t1 > cursor) intervals.push({ tStart: cursor, tEnd: t1 });
          cursor = Math.max(cursor, t2);
        }
        if (cursor < 1) intervals.push({ tStart: cursor, tEnd: 1 });

        const seg = (iv: { tStart: number; tEnd: number }) => ({
          x1: x1 + iv.tStart * dx,
          y1: y1 + iv.tStart * dy,
          x2: x1 + iv.tEnd * dx,
          y2: y1 + iv.tEnd * dy,
        });

        return (
          <g key={wall.id} className="arch-wall-segment">
            {/* Arête sombre : un mur clair reste lisible sur un sol clair. */}
            {metric && intervals.map((iv, idx) => (
              <line
                key={`${wall.id}-edge-${idx}`}
                {...seg(iv)}
                stroke={WALL_EDGE}
                strokeWidth={th + 0.05}
                strokeLinecap="square"
              />
            ))}
            {intervals.map((iv, idx) => (
              <line
                key={`${wall.id}-seg-${idx}`}
                {...seg(iv)}
                stroke={base}
                strokeWidth={th}
                strokeLinecap="square"
              />
            ))}

            {openings.map((op, opIdx) => {
              const { t1, t2 } = spanOf(op);
              const p1x = x1 + t1 * dx;
              const p1y = y1 + t1 * dy;
              const p2x = x1 + t2 * dx;
              const p2y = y1 + t2 * dy;
              const opLen = Math.hypot(p2x - p1x, p2y - p1y);

              const j1a = { x: p1x - nx * halfTh, y: p1y - ny * halfTh };
              const j1b = { x: p1x + nx * halfTh, y: p1y + ny * halfTh };
              const j2a = { x: p2x - nx * halfTh, y: p2y - ny * halfTh };
              const j2b = { x: p2x + nx * halfTh, y: p2y + ny * halfTh };

              if (op.kind === 'window') {
                const frame = op.frameColor ?? WINDOW_FRAME;
                const glass = op.color ?? WINDOW_GLASS;
                return (
                  <g key={`${wall.id}-op-${opIdx}`} className="arch-window">
                    {metric && (
                      <polygon
                        points={`${j1a.x},${j1a.y} ${j2a.x},${j2a.y} ${j2b.x},${j2b.y} ${j1b.x},${j1b.y}`}
                        fill={glass}
                        fillOpacity={0.35}
                      />
                    )}
                    {/* Dormant */}
                    <line x1={j1a.x} y1={j1a.y} x2={j1b.x} y2={j1b.y} stroke={frame} strokeWidth={fine(0.5, 2)} {...fineProps} />
                    <line x1={j2a.x} y1={j2a.y} x2={j2b.x} y2={j2b.y} stroke={frame} strokeWidth={fine(0.5, 2)} {...fineProps} />
                    <line x1={j1a.x} y1={j1a.y} x2={j2a.x} y2={j2a.y} stroke={frame} strokeWidth={fine(0.6, 1.5)} {...fineProps} />
                    <line x1={j1b.x} y1={j1b.y} x2={j2b.x} y2={j2b.y} stroke={frame} strokeWidth={fine(0.6, 1.5)} {...fineProps} />
                    {/* Vitrage */}
                    <line x1={p1x} y1={p1y} x2={p2x} y2={p2y} stroke={glass} strokeWidth={fine(0.7, 2)} {...fineProps} />
                  </g>
                );
              }

              if (op.kind !== 'door') return null;
              const leaf = op.color ?? DOOR_LEAF;
              const frame = op.frameColor ?? DOOR_FRAME;
              const jambs = (
                <>
                  <line x1={j1a.x} y1={j1a.y} x2={j1b.x} y2={j1b.y} stroke={frame} strokeWidth={fine(0.6, 2.5)} {...fineProps} />
                  <line x1={j2a.x} y1={j2a.y} x2={j2b.x} y2={j2b.y} stroke={frame} strokeWidth={fine(0.6, 2.5)} {...fineProps} />
                </>
              );

              if (op.style === 'arch') {
                return <g key={`${wall.id}-op-${opIdx}`} className="arch-opening">{jambs}</g>;
              }

              if (op.style === 'sliding') {
                const off = halfTh + (metric ? 0.06 : 0.4);
                return (
                  <g key={`${wall.id}-op-${opIdx}`} className="arch-door-sliding">
                    {jambs}
                    <line
                      x1={p1x + nx * off}
                      y1={p1y + ny * off}
                      x2={p2x + nx * off}
                      y2={p2y + ny * off}
                      stroke={leaf}
                      strokeWidth={fine(1, 3)}
                      {...fineProps}
                    />
                  </g>
                );
              }

              const swing = {
                fill: 'none',
                stroke: leaf,
                strokeWidth: fine(0.5, 1),
                strokeDasharray: dash('1.5,1.5', '4,3'),
                opacity: 0.85,
                ...fineProps,
              };

              if (op.style === 'double') {
                const halfLen = opLen / 2;
                const leaf1End = { x: p1x + nx * halfLen, y: p1y + ny * halfLen };
                const leaf2End = { x: p2x + nx * halfLen, y: p2y + ny * halfLen };
                const mid = { x: (p1x + p2x) / 2, y: (p1y + p2y) / 2 };
                return (
                  <g key={`${wall.id}-op-${opIdx}`} className="arch-door-double">
                    {jambs}
                    <line x1={p1x} y1={p1y} x2={leaf1End.x} y2={leaf1End.y} stroke={leaf} strokeWidth={fine(0.9, 3)} {...fineProps} />
                    <line x1={p2x} y1={p2y} x2={leaf2End.x} y2={leaf2End.y} stroke={leaf} strokeWidth={fine(0.9, 3)} {...fineProps} />
                    {showDoorSwings && (
                      <>
                        <path d={`M ${leaf1End.x} ${leaf1End.y} A ${halfLen} ${halfLen} 0 0 0 ${mid.x} ${mid.y}`} {...swing} />
                        <path d={`M ${leaf2End.x} ${leaf2End.y} A ${halfLen} ${halfLen} 0 0 1 ${mid.x} ${mid.y}`} {...swing} />
                      </>
                    )}
                  </g>
                );
              }

              // Porte simple battante, vantail ouvert à 90°.
              const leafEnd = { x: p1x + nx * opLen, y: p1y + ny * opLen };
              return (
                <g key={`${wall.id}-op-${opIdx}`} className="arch-door-single">
                  {jambs}
                  <line x1={p1x} y1={p1y} x2={leafEnd.x} y2={leafEnd.y} stroke={leaf} strokeWidth={fine(1, 3)} {...fineProps} />
                  {showDoorSwings && (
                    <path d={`M ${leafEnd.x} ${leafEnd.y} A ${opLen} ${opLen} 0 0 0 ${p2x} ${p2y}`} {...swing} />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
