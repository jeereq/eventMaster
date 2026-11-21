'use client';

import { memo, useMemo, useRef } from 'react';
import { cn } from '@/lib/cn';
import type { SimulatedGuest } from '@/lib/roomGuestSimulation';
import type { RoomSpace } from '@/lib/roomSpaces';
import {
  SEAT_VIEW_GRADE_COLORS,
  filterAvatarViewers,
  nearestAvatarViewer,
  seatViewQuality,
  type AvatarViewFilter,
  type SeatViewGrade,
} from '@/lib/roomAvatarView';

const GRADES: SeatViewGrade[] = ['excellent', 'good', 'fair', 'far'];
const NEUTRAL = '#94a3b8';
const SHORT_LABELS: Record<SeatViewGrade, string> = { excellent: 'Excellente', good: 'Bonne', fair: 'Correcte', far: 'Difficile' };

/**
 * Plan miniature de la salle pendant la vue à la place d'un invité, façon billetterie de stade :
 * chaque place est un point coloré selon sa vue sur la scène, la place occupée clignote
 * avec son cône de regard, et un clic sur le plan fait voler la caméra jusqu'à la place la plus proche.
 */
function AvatarSeatMap({
  widthM,
  heightM,
  guests,
  filter,
  current,
  stage,
  onPick,
  className,
}: {
  widthM: number;
  heightM: number;
  guests: SimulatedGuest[];
  filter: AvatarViewFilter;
  current: SimulatedGuest | null;
  stage: RoomSpace | null;
  onPick: (guest: SimulatedGuest) => void;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const halfW = widthM / 2;
  const halfH = heightM / 2;
  const pad = Math.max(widthM, heightM) * 0.04;
  // Un point lisible quelle que soit la taille de la salle (≈ 2,4 % du grand côté, entre 0,22 et 0,6 m).
  const dotR = Math.min(0.6, Math.max(0.22, Math.max(widthM, heightM) * 0.012));

  const dots = useMemo(() => {
    const active = new Set(filterAvatarViewers(guests, filter).map((g) => g.id));
    return guests.map((g) => {
      const grade = stage ? seatViewQuality(g, stage.center).grade : null;
      return { g, grade, active: active.has(g.id) };
    });
  }, [guests, filter, stage]);

  const presentGrades = useMemo(() => {
    const set = new Set(dots.filter((d) => d.active && d.grade).map((d) => d.grade as SeatViewGrade));
    return GRADES.filter((g) => set.has(g));
  }, [dots]);

  const pick = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const next = nearestAvatarViewer(guests, { x: pt.x, z: pt.y }, filter, Math.max(widthM, heightM) * 0.25);
    if (next) onPick(next);
  };

  const cone = current
    ? (() => {
        const len = Math.max(1.6, Math.max(widthM, heightM) * 0.1);
        const spread = 0.42;
        const a = current.rotY - spread;
        const b = current.rotY + spread;
        return `M ${current.x} ${current.z} L ${current.x + Math.sin(a) * len} ${current.z + Math.cos(a) * len} L ${current.x + Math.sin(b) * len} ${current.z + Math.cos(b) * len} Z`;
      })()
    : null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-background/92 p-1.5 text-foreground shadow-lg dark:bg-surface-elevated/92',
        className,
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`${-halfW - pad} ${-halfH - pad} ${widthM + pad * 2} ${heightM + pad * 2}`}
        className="block h-auto w-full max-h-56 cursor-pointer touch-none select-none"
        role="img"
        aria-label="Plan de la salle : touchez une place pour vous y asseoir"
        // Clic plutôt que pointerdown : la visionneuse coupe la propagation de pointerdown pour protéger le défilement.
        onClick={(e) => pick(e.clientX, e.clientY)}
      >
        <rect
          x={-halfW}
          y={-halfH}
          width={widthM}
          height={heightM}
          rx={Math.min(widthM, heightM) * 0.03}
          className="fill-surface-muted stroke-border"
          strokeWidth={Math.max(widthM, heightM) * 0.008}
        />
        {stage ? (
          <g transform={`translate(${stage.center.x} ${stage.center.z}) rotate(${stage.rotationDeg})`}>
            <rect
              x={-stage.size.w / 2}
              y={-stage.size.d / 2}
              width={stage.size.w}
              height={stage.size.d}
              rx={0.2}
              className="fill-foreground/80"
            />
          </g>
        ) : null}
        {cone ? <path d={cone} className="fill-primary/25" /> : null}
        {dots.map(({ g, grade, active }) => (
          <circle
            key={g.id}
            cx={g.x}
            cy={g.z}
            r={dotR}
            fill={grade ? SEAT_VIEW_GRADE_COLORS[grade] : NEUTRAL}
            opacity={active ? 0.9 : 0.2}
          />
        ))}
        {current ? (
          <g>
            <circle cx={current.x} cy={current.z} r={dotR * 2.6} className="fill-none stroke-primary" strokeWidth={dotR * 0.7}>
              <animate attributeName="r" values={`${dotR * 1.8};${dotR * 3};${dotR * 1.8}`} dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={current.x} cy={current.z} r={dotR * 1.35} className="fill-primary stroke-background" strokeWidth={dotR * 0.4} />
          </g>
        ) : null}
      </svg>
      {presentGrades.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 px-0.5" aria-label="Vue sur la scène">
          {presentGrades.map((g) => (
            <li key={g} className="inline-flex items-center gap-1 text-[11px] leading-4 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEAT_VIEW_GRADE_COLORS[g] }} aria-hidden />
              {SHORT_LABELS[g]}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 px-0.5 text-[11px] leading-4 text-muted">Touchez une place</p>
      )}
    </div>
  );
}

export default memo(AvatarSeatMap);
