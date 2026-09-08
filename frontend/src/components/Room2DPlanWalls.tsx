'use client';

import React from 'react';
import type { RoomWallSegment, RoomWallOpening } from '@/lib/roomLayoutUtils';

interface Room2DPlanWallsProps {
  walls: RoomWallSegment[];
  canvasWidthM: number;
  canvasHeightM: number;
  className?: string;
  showDoorSwings?: boolean;
  activeStoryId?: string;
}

const TEXTURE_FILL_COLORS: Record<string, string> = {
  brick: '#9a3412',
  woodPanel: '#854d0e',
  stone: '#57534e',
  concrete: '#475569',
  glass: 'rgba(56, 189, 248, 0.45)',
  curtain: '#7e22ce',
  plaster: '#e8e4df',
  whiteWood: '#f5f0e8',
};

export default function Room2DPlanWalls({
  walls,
  canvasWidthM,
  canvasHeightM,
  className = '',
  showDoorSwings = true,
  activeStoryId,
}: Room2DPlanWallsProps) {
  if (!walls || walls.length === 0) return null;

  const avgM = (canvasWidthM + canvasHeightM) / 2;

  // Filtrer par étage si spécifié
  const activeWalls = activeStoryId
    ? walls.filter((w) => !w.storyId || w.storyId === activeStoryId)
    : walls;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Motif de hachures architecturales pour murs pleins */}
        <pattern
          id="arch-wall-hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.15" />
        </pattern>
      </defs>

      {activeWalls.map((wall) => {
        const x1 = wall.start.x;
        const y1 = wall.start.y;
        const x2 = wall.end.x;
        const y2 = wall.end.y;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.2) return null;

        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;

        // Épaisseur en pourcentage
        const thicknessM = wall.thicknessM || 0.25;
        const thPct = Math.max(0.8, Math.min(3.5, (thicknessM / avgM) * 100));
        const halfTh = thPct / 2;

        const wallBaseColor = wall.color || TEXTURE_FILL_COLORS[wall.texture] || '#1e293b';
        const openings = Array.isArray(wall.openings) ? [...wall.openings] : [];
        openings.sort((a, b) => (a.t ?? 0.5) - (b.t ?? 0.5));

        // Découper le mur en segments pleins entre les ouvertures
        const intervals: Array<{ tStart: number; tEnd: number }> = [];
        let cursor = 0;

        for (const op of openings) {
          const tCenter = typeof op.t === 'number' ? Math.max(0, Math.min(1, op.t)) : 0.5;
          const opWM = op.widthM || (op.kind === 'door' ? 1.0 : 1.2);
          const opWPct = (opWM / avgM) * 100;
          const halfSpan = Math.max(0.02, (opWPct / len) / 2);

          const t1 = Math.max(0, tCenter - halfSpan);
          const t2 = Math.min(1, tCenter + halfSpan);

          if (t1 > cursor) {
            intervals.push({ tStart: cursor, tEnd: t1 });
          }
          cursor = Math.max(cursor, t2);
        }

        if (cursor < 1) {
          intervals.push({ tStart: cursor, tEnd: 1 });
        }

        return (
          <g key={wall.id} className="arch-wall-segment">
            {/* Segments pleins du mur */}
            {intervals.map((iv, idx) => {
              const segX1 = x1 + iv.tStart * dx;
              const segY1 = y1 + iv.tStart * dy;
              const segX2 = x1 + iv.tEnd * dx;
              const segY2 = y1 + iv.tEnd * dy;

              return (
                <line
                  key={`${wall.id}-seg-${idx}`}
                  x1={segX1}
                  y1={segY1}
                  x2={segX2}
                  y2={segY2}
                  stroke={wallBaseColor}
                  strokeWidth={thPct}
                  strokeLinecap="square"
                />
              );
            })}

            {/* Ouvertures : Portes & Fenêtres architecturales */}
            {openings.map((op, opIdx) => {
              const tCenter = typeof op.t === 'number' ? Math.max(0, Math.min(1, op.t)) : 0.5;
              const opWM = op.widthM || (op.kind === 'door' ? 1.0 : 1.2);
              const opWPct = (opWM / avgM) * 100;
              const halfSpan = Math.max(0.02, (opWPct / len) / 2);

              const t1 = Math.max(0, tCenter - halfSpan);
              const t2 = Math.min(1, tCenter + halfSpan);

              const p1x = x1 + t1 * dx;
              const p1y = y1 + t1 * dy;
              const p2x = x1 + t2 * dx;
              const p2y = y1 + t2 * dy;

              const opLen = Math.hypot(p2x - p1x, p2y - p1y);

              if (op.kind === 'window') {
                // Fenêtre : Cadre et vitrage triple ligne
                const j1a = { x: p1x - nx * halfTh, y: p1y - ny * halfTh };
                const j1b = { x: p1x + nx * halfTh, y: p1y + ny * halfTh };
                const j2a = { x: p2x - nx * halfTh, y: p2y - ny * halfTh };
                const j2b = { x: p2x + nx * halfTh, y: p2y + ny * halfTh };

                return (
                  <g key={`${wall.id}-op-${opIdx}`} className="arch-window">
                    {/* Jambages de baie */}
                    <line x1={j1a.x} y1={j1a.y} x2={j1b.x} y2={j1b.y} stroke={wallBaseColor} strokeWidth={0.5} />
                    <line x1={j2a.x} y1={j2a.y} x2={j2b.x} y2={j2b.y} stroke={wallBaseColor} strokeWidth={0.5} />

                    {/* Appui / tablette de fenêtre */}
                    <line x1={j1a.x} y1={j1a.y} x2={j2a.x} y2={j2a.y} stroke="#94a3b8" strokeWidth={0.6} />
                    <line x1={j1b.x} y1={j1b.y} x2={j2b.x} y2={j2b.y} stroke="#94a3b8" strokeWidth={0.6} />

                    {/* Vitrage central bleuté */}
                    <line x1={p1x} y1={p1y} x2={p2x} y2={p2y} stroke="#38bdf8" strokeWidth={0.7} strokeDasharray="4,1.5" />
                  </g>
                );
              }

              // Porte battante ou coulissante
              if (op.kind === 'door') {
                const j1a = { x: p1x - nx * halfTh, y: p1y - ny * halfTh };
                const j1b = { x: p1x + nx * halfTh, y: p1y + ny * halfTh };
                const j2a = { x: p2x - nx * halfTh, y: p2y - ny * halfTh };
                const j2b = { x: p2x + nx * halfTh, y: p2y + ny * halfTh };

                const isDouble = op.style === 'double';
                const isSliding = op.style === 'sliding';
                const isArch = op.style === 'arch';

                if (isArch) {
                  return (
                    <g key={`${wall.id}-op-${opIdx}`} className="arch-opening">
                      <line x1={j1a.x} y1={j1a.y} x2={j1b.x} y2={j1b.y} stroke={wallBaseColor} strokeWidth={0.6} />
                      <line x1={j2a.x} y1={j2a.y} x2={j2b.x} y2={j2b.y} stroke={wallBaseColor} strokeWidth={0.6} />
                    </g>
                  );
                }

                if (isSliding) {
                  const slideX1 = p1x + nx * (halfTh + 0.4);
                  const slideY1 = p1y + ny * (halfTh + 0.4);
                  const slideX2 = p2x + nx * (halfTh + 0.4);
                  const slideY2 = p2y + ny * (halfTh + 0.4);

                  return (
                    <g key={`${wall.id}-op-${opIdx}`} className="arch-door-sliding">
                      <line x1={j1a.x} y1={j1a.y} x2={j1b.x} y2={j1b.y} stroke={wallBaseColor} strokeWidth={0.6} />
                      <line x1={j2a.x} y1={j2a.y} x2={j2b.x} y2={j2b.y} stroke={wallBaseColor} strokeWidth={0.6} />
                      {/* Vantail coulissant */}
                      <line x1={slideX1} y1={slideY1} x2={slideX2} y2={slideY2} stroke="#c2410c" strokeWidth={1} />
                    </g>
                  );
                }

                if (isDouble) {
                  // Double battant : 2 demi-vantaux à gauche et à droite
                  const halfLen = opLen / 2;
                  const leaf1End = { x: p1x + nx * halfLen, y: p1y + ny * halfLen };
                  const leaf2End = { x: p2x + nx * halfLen, y: p2y + ny * halfLen };
                  const mid = { x: (p1x + p2x) / 2, y: (p1y + p2y) / 2 };

                  return (
                    <g key={`${wall.id}-op-${opIdx}`} className="arch-door-double">
                      {/* Cadre de porte */}
                      <line x1={j1a.x} y1={j1a.y} x2={j1b.x} y2={j1b.y} stroke={wallBaseColor} strokeWidth={0.6} />
                      <line x1={j2a.x} y1={j2a.y} x2={j2b.x} y2={j2b.y} stroke={wallBaseColor} strokeWidth={0.6} />

                      {/* Vantaux */}
                      <line x1={p1x} y1={p1y} x2={leaf1End.x} y2={leaf1End.y} stroke="#ea580c" strokeWidth={0.9} />
                      <line x1={p2x} y1={p2y} x2={leaf2End.x} y2={leaf2End.y} stroke="#ea580c" strokeWidth={0.9} />

                      {/* Arcs de débattement */}
                      {showDoorSwings && (
                        <>
                          <path
                            d={`M ${leaf1End.x} ${leaf1End.y} A ${halfLen} ${halfLen} 0 0 0 ${mid.x} ${mid.y}`}
                            fill="none"
                            stroke="#ea580c"
                            strokeWidth={0.5}
                            strokeDasharray="1.5,1.5"
                            opacity={0.8}
                          />
                          <path
                            d={`M ${leaf2End.x} ${leaf2End.y} A ${halfLen} ${halfLen} 0 0 1 ${mid.x} ${mid.y}`}
                            fill="none"
                            stroke="#ea580c"
                            strokeWidth={0.5}
                            strokeDasharray="1.5,1.5"
                            opacity={0.8}
                          />
                        </>
                      )}
                    </g>
                  );
                }

                // Porte simple battante standard
                const leafEnd = { x: p1x + nx * opLen, y: p1y + ny * opLen };

                return (
                  <g key={`${wall.id}-op-${opIdx}`} className="arch-door-single">
                    {/* Cadre de porte */}
                    <line x1={j1a.x} y1={j1a.y} x2={j1b.x} y2={j1b.y} stroke={wallBaseColor} strokeWidth={0.6} />
                    <line x1={j2a.x} y1={j2a.y} x2={j2b.x} y2={j2b.y} stroke={wallBaseColor} strokeWidth={0.6} />

                    {/* Vantail ouvert à 90° */}
                    <line x1={p1x} y1={p1y} x2={leafEnd.x} y2={leafEnd.y} stroke="#ea580c" strokeWidth={1} />

                    {/* Arc de débattement de porte 90° */}
                    {showDoorSwings && (
                      <path
                        d={`M ${leafEnd.x} ${leafEnd.y} A ${opLen} ${opLen} 0 0 0 ${p2x} ${p2y}`}
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth={0.6}
                        strokeDasharray="1.5,1.5"
                        opacity={0.85}
                      />
                    )}
                  </g>
                );
              }

              return null;
            })}
          </g>
        );
      })}
    </svg>
  );
}
