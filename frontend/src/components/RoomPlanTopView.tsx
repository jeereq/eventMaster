'use client';

import React, { useId, useMemo, useSyncExternalStore } from 'react';
import {
  getRoomOutlineClipPath,
  resolveBlueprintWalls,
  resolveTableColor,
  isBlueprintWallsVisible,
  type ChairStyle,
  type ChairType,
  type RoomLayoutBlueprint,
  type SeatMaterial,
  type TableSurfaceStyle,
} from '@/lib/roomLayoutUtils';
import { belongsToActiveStory } from '@/lib/roomBuildingUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { resolveFloorTopViewStyle } from '@/lib/roomFloorUtils';
import { isProceduralFloor, proceduralFloorDataUrl } from '@/lib/roomFloorProcedural';
import { resolveChairVisual } from '@/lib/roomChairVisual';
import { planRotationScreenDeg } from '@/lib/tablePlanUtils';
import { TABLE_DEFAULT_TEXTURE, TABLE_SURFACE_TEXTURES, resolveTableSurface } from '@/lib/roomTableSurface';
import { zoneTopViewStyle } from '@/lib/roomZoneSurface';
import {
  arcTablePath,
  topViewFreeChair,
  topViewRow,
  topViewTable,
  type TopViewSeat,
  type TopViewTable,
} from '@/lib/roomPlanTopViewGeom';
import FixtureRenderer from '@/components/FixtureRenderer';
import Room2DPlanWalls from '@/components/Room2DPlanWalls';
import { cn } from '@/lib/cn';

/** Couleur par défaut du plateau, identique à la vue 3D. */
const DEFAULT_TABLE_COLOR = '#f8fafc';
const OUTLINE = 'rgba(15, 23, 42, 0.45)';
/** Jupe de scène sombre, comme les flancs de l’estrade en 3D. */
const STAGE_SKIRT = '#1c1a19';

const noopSubscribe = () => () => {};

type ChairLook = { chairType: ChairType; chairStyle?: ChairStyle; seatMaterial?: SeatMaterial };

function isNearWhite(color: string): boolean {
  const hex = color.trim().toLowerCase();
  return hex === '#fff' || hex === '#ffffff' || hex === '#fafafa' || hex === '#f8fafc';
}

function isDark(color: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

/** Une chaise vue du dessus : assise et dossier aux couleurs de la 3D, dossier en haut à 0°. */
function ChairGlyph({ seat, look }: { seat: TopViewSeat; look: ChairLook }) {
  const visual = resolveChairVisual(look.chairType, look.chairStyle, look.seatMaterial);
  const w = Math.max(0.3, visual.seatSize[0] * visual.scale + 0.02);
  const d = Math.max(0.28, visual.seatSize[2] * visual.scale);
  const back = visual.backHeight > 0 ? 0.07 : 0;
  return (
    <g transform={`translate(${seat.x} ${seat.y}) rotate(${seat.rotDeg})`}>
      {visual.hasArms ? (
        <rect x={-w / 2 - 0.06} y={-d / 2} width={w + 0.12} height={d} rx={0.05} fill={visual.frameColor} stroke={OUTLINE} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      ) : null}
      <rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d}
        rx={look.chairType === 'POUF' || look.chairType === 'STOOL' || look.chairType === 'BARSTOOL' ? w / 2 : 0.06}
        fill={visual.seatColor}
        stroke={OUTLINE}
        strokeWidth={0.6}
        vectorEffect="non-scaling-stroke"
      />
      {back > 0 ? (
        <rect x={-w / 2} y={-d / 2 - back * 0.6} width={w} height={back} rx={0.03} fill={visual.frameColor} stroke={OUTLINE} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
      ) : null}
    </g>
  );
}

function TableTopShape({
  table,
  cornerRadiusM,
  ...paint
}: {
  table: TopViewTable;
  cornerRadiusM?: number;
} & React.SVGProps<SVGElement>) {
  const [w, d] = table.size;
  const props = paint as React.SVGProps<SVGCircleElement & SVGRectElement & SVGEllipseElement & SVGPathElement>;
  if (table.shape === 'round' || table.shape === 'cocktail' || table.shape === 'highTop') {
    return <circle cx={0} cy={0} r={w / 2} {...(props as React.SVGProps<SVGCircleElement>)} />;
  }
  if (table.shape === 'oval') {
    return <ellipse cx={0} cy={0} rx={w / 2} ry={d / 2} {...(props as React.SVGProps<SVGEllipseElement>)} />;
  }
  if (table.shape === 'arc') {
    return <path d={arcTablePath(table.size)} {...(props as React.SVGProps<SVGPathElement>)} />;
  }
  const r = Math.min(cornerRadiusM ?? 0.03, Math.min(w, d) / 2);
  return <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={r} {...(props as React.SVGProps<SVGRectElement>)} />;
}

export interface RoomPlanTopViewProps {
  blueprint: RoomLayoutBlueprint;
  /** Noms des tables et libellés des éléments fixes. */
  showLabels?: boolean;
  className?: string;
}

/**
 * Plan 2D vu du dessus, à l’échelle réelle de la salle : mêmes proportions,
 * même sol, mêmes tables et chaises (taille, place, couleur) que la vue 3D.
 */
export default function RoomPlanTopView({ blueprint, showLabels = true, className }: RoomPlanTopViewProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const W = Math.max(1, blueprint.canvas.widthM || 20);
  const H = Math.max(1, blueprint.canvas.heightM || 16);
  const ratio = W / H;
  const meta = blueprint.metadata;
  const theme = getRoomTheme(meta.roomThemeId, blueprint);
  const floorType = meta.floorType ?? theme.defaultFloorType;

  // Sols dessinés en 3D (miroir, LED, Versailles) : même dessin, généré côté navigateur.
  const procedural = !meta.floorImageUrl && floorType && isProceduralFloor(floorType) ? floorType : null;
  // Dessin mis en cache : instantané stable ; rien côté serveur (pas de canvas).
  const proceduralUrl = useSyncExternalStore(
    noopSubscribe,
    () => (procedural ? proceduralFloorDataUrl(procedural) : null),
    () => null,
  );

  const floorStyle = resolveFloorTopViewStyle({
    floorType,
    floorImageUrl: meta.floorImageUrl,
    floorImageFit: meta.floorImageFit,
    floorColor: meta.floorColor,
    widthM: W,
    heightM: H,
    proceduralUrl,
  });

  const onStory = (storyId: string | undefined) => belongsToActiveStory(blueprint, storyId);
  const fixtures = blueprint.fixtures.filter((f) => onStory(f.storyId));
  const furniture = blueprint.furniture.filter((item) => onStory(item.storyId));
  const walls = isBlueprintWallsVisible(meta) ? resolveBlueprintWalls(blueprint) : [];
  const outline = blueprint.roomOutline;

  const geometry = useMemo(() => {
    const tables: Array<{ item: Extract<typeof furniture[number], { kind: 'table' }>; top: TopViewTable }> = [];
    const chairs: Array<{ key: string; seat: TopViewSeat; look: ChairLook }> = [];
    for (const item of furniture) {
      if (item.kind === 'table') {
        const top = topViewTable(item, W, H);
        tables.push({ item, top });
        const look = { chairType: item.chairType, chairStyle: item.chairStyle, seatMaterial: item.seatMaterial };
        for (const seat of top.seats) chairs.push({ key: `${item.id}-${seat.index}`, seat, look });
      } else if (item.kind === 'row') {
        const row = topViewRow(item, blueprint.fixtures, W, H);
        const look = { chairType: item.chairType, chairStyle: item.chairStyle, seatMaterial: item.seatMaterial };
        for (const seat of row.seats) chairs.push({ key: `${item.id}-${seat.index}`, seat, look });
      } else if (item.kind === 'chair') {
        chairs.push({
          key: item.id,
          seat: topViewFreeChair(item, W, H),
          look: { chairType: item.chairType, chairStyle: item.chairStyle, seatMaterial: item.seatMaterial },
        });
      }
    }
    return { tables, chairs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint, W, H]);

  // Textures de plateau utilisées (une définition par surface).
  const surfaces = new Set<TableSurfaceStyle>();
  for (const { item } of geometry.tables) {
    if (!item.tableImageUrl) surfaces.add(resolveTableSurface(item.shape, item.tableSurface ?? meta.defaultTableSurface));
  }
  const textureFor = (surface: TableSurfaceStyle) => TABLE_SURFACE_TEXTURES[surface as keyof typeof TABLE_SURFACE_TEXTURES] ?? (surface === 'glass' || surface === 'whiteLacquer' ? null : TABLE_DEFAULT_TEXTURE);

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', className)}
      style={{ containerType: 'size' }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]"
        style={{
          width: `min(calc(100cqw - 16px), calc((100cqh - 16px) * ${ratio}))`,
          aspectRatio: `${W} / ${H}`,
        }}
        data-plan-top-view
      >
        <div className="absolute inset-0" style={floorStyle} />

        {outline ? (
          <div
            className="absolute pointer-events-none z-0 overflow-hidden"
            style={{
              left: `${outline.x}%`,
              top: `${outline.y}%`,
              width: `${outline.w}%`,
              height: `${outline.h}%`,
              border: `2px solid ${outline.stroke ?? theme.roomOutline.stroke}`,
              borderRadius: outline.shape === 'circle' ? '50%' : '4px',
              clipPath: getRoomOutlineClipPath(outline.shape),
            }}
          />
        ) : null}

        {furniture.map((item) =>
          item.kind === 'zone' ? (
            <div
              key={item.id}
              className="absolute z-[1]"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.w}%`,
                height: `${item.h}%`,
                ...zoneTopViewStyle(item, (item.w / 100) * W, (item.h / 100) * H),
                boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.18)',
                transform: item.rotation ? `rotate(${planRotationScreenDeg(item.rotation)}deg)` : undefined,
              }}
            />
          ) : null,
        )}

        {walls.length > 0 ? (
          <Room2DPlanWalls
            walls={walls}
            canvasWidthM={W}
            canvasHeightM={H}
            activeStoryId={meta.activeStoryId}
            showDoorSwings
            metric
          />
        ) : null}

        <div className="absolute inset-0 z-[2] pointer-events-none">
          {fixtures.map((f) => (
            <FixtureRenderer
              key={f.id}
              fixture={f}
              showLabel={showLabels}
              deckStyle={f.kind === 'stage' || f.kind === 'podium' ? {
                ...zoneTopViewStyle({ material: f.material ?? 'wood' }, (f.w / 100) * W, (f.h / 100) * H),
                borderColor: STAGE_SKIRT,
                color: '#fef3c7',
                textShadow: '0 1px 2px rgba(0,0,0,0.7)',
              } : undefined}
            />
          ))}
        </div>

        <svg
          className="absolute inset-0 z-[3] h-full w-full pointer-events-none overflow-visible"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            {[...surfaces].map((surface) => {
              const url = textureFor(surface);
              return url ? (
                <pattern key={surface} id={`${uid}-top-${surface}`} patternContentUnits="objectBoundingBox" width="1" height="1">
                  <image href={url} width="1" height="1" preserveAspectRatio="xMidYMid slice" />
                </pattern>
              ) : null;
            })}
            {geometry.tables.filter(({ item }) => item.tableImageUrl).map(({ item }) => (
              <pattern key={item.id} id={`${uid}-img-${item.id}`} patternContentUnits="objectBoundingBox" width="1" height="1">
                <image href={item.tableImageUrl} width="1" height="1" preserveAspectRatio="xMidYMid slice" />
              </pattern>
            ))}
          </defs>

          {/* Chaises sous les plateaux, comme en 3D où elles glissent sous la table. */}
          {geometry.chairs.map(({ key, seat, look }) => (
            <ChairGlyph key={key} seat={seat} look={look} />
          ))}

          {geometry.tables.map(({ item, top }) => {
            const color = resolveTableColor(item.tableColor, meta.defaultTableColor) ?? DEFAULT_TABLE_COLOR;
            const surface = resolveTableSurface(item.shape, item.tableSurface ?? meta.defaultTableSurface);
            const texture = item.tableImageUrl
              ? `url(#${uid}-img-${item.id})`
              : textureFor(surface)
                ? `url(#${uid}-top-${surface})`
                : null;
            const plainFill = surface === 'glass' ? '#e2e8f0' : '#fafafa';
            const tinted = !isNearWhite(color);
            const dressed = item.hasCenterpiece
              || (meta.dressAllTables === true && item.shape !== 'cocktail' && item.shape !== 'highTop' && item.capacity >= 4);
            return (
              <g key={item.id} transform={`translate(${top.cx} ${top.cy}) rotate(${top.rotDeg})`}>
                <g transform="translate(0.05 0.08)">
                  <TableTopShape table={top} cornerRadiusM={item.cornerRadiusM} fill="rgba(0,0,0,0.22)" />
                </g>
                <TableTopShape
                  table={top}
                  cornerRadiusM={item.cornerRadiusM}
                  fill={texture ?? (tinted ? color : plainFill)}
                  fillOpacity={surface === 'glass' && !item.tableImageUrl ? 0.6 : 1}
                />
                {texture && tinted ? (
                  <TableTopShape table={top} cornerRadiusM={item.cornerRadiusM} fill={color} style={{ mixBlendMode: 'multiply' }} />
                ) : null}
                <TableTopShape
                  table={top}
                  cornerRadiusM={item.cornerRadiusM}
                  fill="none"
                  stroke={OUTLINE}
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                />
                {dressed && item.shape !== 'arc' ? (
                  <circle r={Math.min(0.16, top.size[1] / 5)} fill="#7fa36b" stroke="#f9a8d4" strokeWidth={0.04} />
                ) : null}
              </g>
            );
          })}

          {showLabels
            ? geometry.tables.map(({ item, top }) => {
                if (!item.name) return null;
                const color = resolveTableColor(item.tableColor, meta.defaultTableColor) ?? DEFAULT_TABLE_COLOR;
                const fontSize = Math.max(0.16, Math.min(0.3, Math.min(top.size[0], top.size[1]) * 0.2));
                const dark = isDark(color);
                return (
                  <text
                    key={`${item.id}-label`}
                    x={top.cx}
                    y={top.cy + fontSize * (item.hasCenterpiece ? 1.6 : 0.35)}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight={700}
                    fill={dark ? '#f8fafc' : '#1e293b'}
                    stroke={dark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.75)'}
                    strokeWidth={fontSize * 0.12}
                    paintOrder="stroke"
                  >
                    {item.name}
                  </text>
                );
              })
            : null}
        </svg>
      </div>
    </div>
  );
}
