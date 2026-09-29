'use client';

import { useMemo } from 'react';
import type { BarStyle } from '@/lib/roomLayoutUtils';
import { SurfaceMat, type SurfaceFinish } from '@/components/room/SurfaceMaterial';
import { resolveTableMaterial } from '@/lib/roomWebGLMaterials';
import { withRepeat } from '@/lib/roomSurfaceFinish';

export { ConcertInstrumentMesh } from '@/components/CatalogueInstrumentMeshes';

const BOTTLE_COLORS: Record<BarStyle, string[]> = {
  cocktail: ['#14532d', '#7f1d1d', '#1e3a5f', '#854d0e', '#4c1d95'],
  wine: ['#3f1d1d', '#4a1515', '#2d1b14', '#5b1a1a'],
  champagne: ['#854d0e', '#a16207', '#713f12', '#ca8a04'],
  beer: ['#92400e', '#b45309', '#78350f'],
  coffee: ['#1c1917', '#44403c', '#292524'],
  whiskey: ['#7c2d12', '#9a3412', '#451a03', '#b45309'],
  island: ['#14532d', '#7f1d1d', '#854d0e', '#1e3a5f'],
  lShaped: ['#14532d', '#7f1d1d', '#1e3a5f', '#854d0e'],
  juice: ['#ea580c', '#65a30d', '#eab308', '#f97316'],
  mocktail: ['#db2777', '#7c3aed', '#06b6d4', '#84cc16'],
  tapas: ['#7f1d1d', '#854d0e', '#14532d'],
  tea: ['#78716c', '#a8a29e', '#44403c', '#d6d3d1'],
};

const BAR_BOTTLE_MAX = 14;
const BAR_GLASS_MAX = 12;
const BAR_STOOL_MAX = 6;
const BAR_SHELF_COUNT = 3;

const GLASS_TINT: Record<BarStyle, string> = {
  cocktail: '#e0f2fe',
  wine: '#fecaca',
  champagne: '#fef08a',
  beer: '#fbbf24',
  coffee: '#f5f0e8',
  whiskey: '#fdba74',
  island: '#e0f2fe',
  lShaped: '#e0f2fe',
  juice: '#fdba74',
  mocktail: '#f9a8d4',
  tapas: '#fed7aa',
  tea: '#f5f0e8',
};

function Mat({
  color,
  roughness = 0.5,
  metalness = 0.08,
  finish,
  repeat,
  opacity,
}: {
  color: string;
  roughness?: number;
  metalness?: number;
  finish?: SurfaceFinish;
  repeat?: number | [number, number];
  opacity?: number;
}) {
  return (
    <SurfaceMat
      color={color}
      finish={finish ?? 'auto'}
      roughness={roughness}
      metalness={finish === 'wood' || finish === 'leather' || finish === 'glass' ? 0 : metalness}
      repeat={repeat}
      opacity={opacity}
    />
  );
}

/** Plateau marbre du comptoir : même marbre calacatta que les sols / tables, calé sur la longueur. */
function BarMarbleTop({ w, d, color }: { w: number; d: number; color?: string }) {
  const marble = useMemo(() => resolveTableMaterial('rectangular', undefined, undefined, 'marble'), []);
  const rx = Math.max(1, w / 1.6);
  const ry = Math.max(0.5, d / 1.6);
  return (
    <SurfaceMat
      color={color ?? '#ffffff'}
      finish="plain"
      map={withRepeat(marble.map, rx, ry)}
      normalMap={withRepeat(marble.normalMap ?? null, rx, ry)}
      normalScale={0.25}
      roughness={0.12}
      metalness={0}
      clearcoat={0.8}
      clearcoatRoughness={0.06}
    />
  );
}

function BarBottle({
  x,
  z,
  y,
  color,
  tall = false,
}: {
  x: number;
  z: number;
  y: number;
  color: string;
  tall?: boolean;
}) {
  const h = tall ? 0.34 : 0.26;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, h * 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.032, h * 0.7, 10]} />
        <Mat color={color} finish="glass" roughness={0.08} opacity={0.86} />
      </mesh>
      <mesh position={[0, h * 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.022, h * 0.28, 8]} />
        <Mat color={color} finish="glass" roughness={0.08} opacity={0.86} />
      </mesh>
      <mesh position={[0, h + 0.01, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.02, 8]} />
        <Mat color="#d4af37" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

function BarGlass({
  x,
  z,
  y,
  style,
}: {
  x: number;
  z: number;
  y: number;
  style: BarStyle;
}) {
  const tint = GLASS_TINT[style];
  if (style === 'wine' || style === 'champagne') {
    return (
      <group position={[x, y, z]}>
        <mesh>
          <cylinderGeometry args={[0.008, 0.012, 0.1, 8]} />
          <SurfaceMat color="#f1f5f9" finish="glass" opacity={0.35} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[style === 'champagne' ? 0.028 : 0.04, 0.08, 10]} />
          <SurfaceMat color={tint} finish="glass" opacity={0.45} />
        </mesh>
      </group>
    );
  }
  if (style === 'cocktail' || style === 'mocktail' || style === 'island' || style === 'lShaped') {
    return (
      <group position={[x, y, z]}>
        <mesh>
          <cylinderGeometry args={[0.008, 0.01, 0.08, 8]} />
          <SurfaceMat color="#f1f5f9" finish="glass" opacity={0.35} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.07, 10]} />
          <SurfaceMat color={tint} finish="glass" opacity={0.45} />
        </mesh>
      </group>
    );
  }
  if (style === 'coffee' || style === 'tea') {
    return (
      <group position={[x, y, z]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.024, 0.05, 12]} />
          <Mat color="#f8fafc" finish="ceramic" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.03, 10]} />
          <Mat color="#44403c" />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[0.03, 0.026, 0.08, 12]} />
        <SurfaceMat color={tint} finish="glass" opacity={0.45} />
      </mesh>
    </group>
  );
}

function BarStool({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.028, 0.72, 10]} />
        <Mat color="#52525b" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.14, 0.012, 8, 18]} />
        <Mat color="#71717a" metalness={0.72} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.13, 0.05, 16]} />
        <Mat color="#292524" roughness={0.55} />
      </mesh>
    </group>
  );
}

type EventBarMeshProps = {
  w: number;
  d: number;
  height?: number;
  style?: BarStyle;
  color?: string;
  selected?: boolean;
};

export function EventBarMesh(props: EventBarMeshProps) {
  // Emprise « en longueur » dans le sens de la profondeur (bar dessiné verticalement sur le plan) :
  // on oriente le comptoir sur le grand côté au lieu d’écraser un bar de 6 m en 1,8 m de façade.
  const { w, d, style = 'cocktail' } = props;
  if (style !== 'island' && d > w * 1.25) {
    return (
      <group rotation={[0, Math.PI / 2, 0]}>
        <EventBarBody {...props} w={d} d={w} />
      </group>
    );
  }
  return <EventBarBody {...props} />;
}

function EventBarBody({
  w,
  d,
  height = 1.15,
  style = 'cocktail',
  color,
  selected = false,
}: EventBarMeshProps) {
  const body = selected ? '#c7d2fe' : color ?? '#292524';
  const topY = height;
  const bottles = BOTTLE_COLORS[style] ?? BOTTLE_COLORS.cocktail;
  const bottleCount = Math.min(BAR_BOTTLE_MAX, Math.max(4, Math.round(w * 1.6)));
  const glassCount = Math.min(BAR_GLASS_MAX, Math.max(3, Math.round(w * 1.2)));
  const stoolCount = Math.min(BAR_STOOL_MAX, Math.max(2, Math.round(w * 0.7)));
  const isIsland = style === 'island';
  const isL = style === 'lShaped';
  const tallBottles = style === 'wine' || style === 'champagne' || style === 'whiskey';

  // Implantation réaliste : comptoir client à l’avant (≈ 70 cm), allée barman, arrière-bar
  // posé sur un meuble bas contre le fond — et non un bloc plein de toute la profondeur.
  const counterD = Math.min(0.75, Math.max(0.5, d * 0.42));
  const counterZ = d / 2 - counterD / 2;
  const backD = Math.min(0.5, Math.max(0.35, d * 0.28));
  const backZ = -d / 2 + backD / 2;
  const baseH = 0.9;
  const frontZ = d / 2;
  // Plateau de travail (props de style) posé sur le comptoir.
  const propZ = counterZ;
  const propY = topY + 0.05;

  const counter = (cw: number, cd: number) => (
    <>
      <mesh position={[0, height * 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[cw, height * 0.88, cd]} />
        <Mat color={body} finish="wood" roughness={0.5} repeat={[Math.max(1, cw / 1.2), 1]} />
      </mesh>
      {/* Façade à tasseaux verticaux */}
      {Array.from({ length: Math.max(6, Math.min(24, Math.round(cw * 5))) }).map((_, si, arr) => {
        const sx = ((si + 0.5) / arr.length - 0.5) * (cw * 0.94);
        return (
          <mesh key={`slat-${si}`} position={[sx, height * 0.45, cd * 0.5 + 0.01]} castShadow>
            <boxGeometry args={[Math.max(0.015, (cw * 0.8) / (arr.length * 1.6)), height * 0.82, 0.02]} />
            <SurfaceMat color="#6b4a2e" finish="wood" roughness={0.55} repeat={[1, 0.3]} vertical />
          </mesh>
        );
      })}
      <mesh position={[0, 0.04, cd * 0.47]} castShadow>
        <boxGeometry args={[cw * 0.98, 0.08, 0.05]} />
        <Mat color="#09090b" roughness={0.7} />
      </mesh>
      {/* Plateau marbre avec surplomb côté clients */}
      <mesh position={[0, topY + 0.025, 0.08]} receiveShadow castShadow>
        <boxGeometry args={[cw + 0.06, 0.05, cd + 0.16]} />
        <BarMarbleTop w={cw} d={cd} />
      </mesh>
      <mesh position={[0, topY - 0.01, cd / 2 + 0.15]}>
        <boxGeometry args={[cw, 0.012, 0.02]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.65} roughness={0.1} />
      </mesh>
      {/* Repose-pieds laiton */}
      <group position={[0, 0.18, cd / 2 + 0.08]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, cw * 0.92, 12]} />
          <SurfaceMat color="#d4af37" finish="brass" metalness={0.95} roughness={0.22} repeat={[1, 6]} />
        </mesh>
        {[-cw * 0.38, 0, cw * 0.38].map((spX, spi) => (
          <mesh key={spi} position={[spX, -0.09, -0.03]} rotation={[0.4, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
            <SurfaceMat color="#d4af37" finish="brass" metalness={0.95} roughness={0.22} />
          </mesh>
        ))}
      </group>
      {/* Rail égouttoir côté barman */}
      <mesh position={[0, topY + 0.052, -cd * 0.3]}>
        <boxGeometry args={[cw * 0.88, 0.005, 0.1]} />
        <SurfaceMat color="#c4c4c8" finish="metal" metalness={0.95} roughness={0.24} />
      </mesh>
    </>
  );

  return (
    <group>
      {isIsland ? (
        <>
          {/* Îlot : comptoir sur les 4 côtés, barman au centre, tour à bouteilles */}
          <group position={[0, 0, d / 2 - counterD / 2]}>{counter(w, counterD)}</group>
          <group position={[0, 0, -d / 2 + counterD / 2]} rotation={[0, Math.PI, 0]}>{counter(w, counterD)}</group>
          <group position={[w / 2 - counterD / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>{counter(Math.max(0.4, d - counterD * 2), counterD)}</group>
          <group position={[-w / 2 + counterD / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>{counter(Math.max(0.4, d - counterD * 2), counterD)}</group>
          <group>
            <mesh position={[0, 1.2, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 2.4, 12]} />
              <SurfaceMat color="#1c1917" finish="metal" roughness={0.35} />
            </mesh>
            {[1.25, 1.6, 1.95].map((y, k) => (
              <group key={k} position={[0, y, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.42, 0.42, 0.02, 32]} />
                  <SurfaceMat color="#e2f0ee" finish="glass" opacity={0.55} />
                </mesh>
                {Array.from({ length: 8 }).map((_, i) => {
                  const ang = (i / 8) * Math.PI * 2 + k * 0.3;
                  return <BarBottle key={i} x={Math.cos(ang) * 0.32} z={Math.sin(ang) * 0.32} y={0.01} color={bottles[(i + k) % bottles.length]} tall={tallBottles} />;
                })}
              </group>
            ))}
          </group>
        </>
      ) : (
        <>
          <group position={[0, 0, counterZ]}>{counter(w, counterD)}</group>
          {isL ? (
            // Retour d’angle sur le côté gauche, jusqu’à l’arrière-bar.
            <group position={[-w / 2 + counterD / 2, 0, (counterZ - counterD / 2 + backZ + backD / 2) / 2]} rotation={[0, -Math.PI / 2, 0]}>
              {counter(Math.max(0.4, counterZ - counterD / 2 - (backZ + backD / 2)), counterD)}
            </group>
          ) : null}
          {/* Arrière-bar : meuble bas + miroir + étagères verre fixées au fond */}
          <group position={[0, 0, backZ]}>
            <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w * 0.96, baseH, backD]} />
              <Mat color="#2a1d14" finish="wood" roughness={0.55} repeat={[Math.max(1, w / 1.2), 1]} />
            </mesh>
            <mesh position={[0, baseH + 0.015, 0]} castShadow>
              <boxGeometry args={[w * 0.97, 0.03, backD + 0.02]} />
              <SurfaceMat color="#3f3f46" finish="stone" roughness={0.35} />
            </mesh>
            <mesh position={[0, baseH + 0.62, -backD / 2 + 0.03]} castShadow>
              <boxGeometry args={[w * 0.96, 1.24, 0.05]} />
              <SurfaceMat color="#3a2618" finish="wood" roughness={0.5} repeat={[Math.max(1, w / 1.2), 1]} />
            </mesh>
            <mesh position={[0, baseH + 0.62, -backD / 2 + 0.06]}>
              <boxGeometry args={[w * 0.9, 1.1, 0.01]} />
              <meshPhysicalMaterial color="#cbd5e1" roughness={0.06} metalness={0.9} clearcoat={0.9} />
            </mesh>
            <mesh position={[0, baseH + 1.22, -backD / 2 + 0.1]}>
              <boxGeometry args={[w * 0.9, 0.025, 0.04]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.65} />
            </mesh>
            {Array.from({ length: BAR_SHELF_COUNT }).map((_, shelf) => (
              <mesh key={shelf} position={[0, baseH + 0.3 + shelf * 0.32, -backD / 2 + 0.16]} receiveShadow>
                <boxGeometry args={[w * 0.88, 0.02, 0.2]} />
                <SurfaceMat color="#e2f0ee" finish="glass" opacity={0.55} />
              </mesh>
            ))}
            {Array.from({ length: bottleCount }).map((_, i) => {
              const x = ((i + 0.5) / bottleCount - 0.5) * w * 0.82;
              const shelf = i % (BAR_SHELF_COUNT + 1);
              // Rangée 0 = sur le meuble bas, rangées suivantes = étagères.
              const y = shelf === 0 ? baseH + 0.03 : baseH + 0.31 + (shelf - 1) * 0.32;
              return <BarBottle key={`b-${i}`} x={x} z={-backD / 2 + 0.16} y={y} color={bottles[i % bottles.length]} tall={tallBottles} />;
            })}
          </group>
        </>
      )}

      {/* Shaker inox sur le comptoir */}
      <group position={[w * 0.32, topY + 0.14, propZ - counterD * 0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.035, 0.18, 14]} />
          <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.08} />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.028, 0.042, 0.06, 12]} />
          <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.08} />
        </mesh>
      </group>

      {/* Accessoires propres au style, posés sur le comptoir */}
      <group position={[0, 0, propZ]}>
      {style === 'champagne' ? (
        <group position={[-w * 0.28, propY - 0.05 + 0.08, d * 0.12]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.08, 0.16, 14]} />
            <Mat color="#94a3b8" metalness={0.65} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <SurfaceMat color="#e0f2fe" finish="glass" opacity={0.35} />
          </mesh>
        </group>
      ) : null}
      {style === 'beer' ? (
        ([-0.18, 0, 0.18] as const).map((side) => (
          <group key={side} position={[side * w * 0.55, propY - 0.05 + 0.22, -d * 0.05]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.22, 8]} />
              <Mat color="#d4d4d8" metalness={0.7} roughness={0.22} />
            </mesh>
            <mesh position={[0.06, 0.02, 0]} rotation={[0, 0, -0.6]} castShadow>
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              <Mat color="#1c1917" />
            </mesh>
          </group>
        ))
      ) : null}
      {style === 'coffee' ? (
        <group position={[w * 0.28, propY - 0.05 + 0.16, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.32, 0.28, 0.22]} />
            <Mat color="#171717" roughness={0.4} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.18, 0.04]}>
            <cylinderGeometry args={[0.04, 0.05, 0.08, 10]} />
            <Mat color="#44403c" />
          </mesh>
        </group>
      ) : null}
      {style === 'whiskey' ? (
        <mesh position={[w * 0.22, propY - 0.05 + 0.12, 0.05]} castShadow>
          <cylinderGeometry args={[0.05, 0.055, 0.18, 8]} />
          <Mat color="#9a3412" roughness={0.15} metalness={0.2} />
        </mesh>
      ) : null}
      {style === 'juice' ? (
        <group position={[w * 0.22, propY - 0.05 + 0.12, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.18, 12]} />
            <SurfaceMat color="#fb923c" finish="glass" opacity={0.5} />
          </mesh>
          <mesh position={[-0.16, 0.04, 0.04]} castShadow>
            <sphereGeometry args={[0.05, 10, 10]} />
            <Mat color="#ea580c" roughness={0.6} />
          </mesh>
        </group>
      ) : null}
      {style === 'tapas' ? (
        Array.from({ length: 3 }).map((_, i) => (
          <mesh key={i} position={[((i + 0.5) / 3 - 0.5) * w * 0.5, propY - 0.05 + 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.015, 16]} />
            <Mat color="#f8fafc" finish="ceramic" roughness={0.3} />
          </mesh>
        ))
      ) : null}
      {style === 'tea' ? (
        <group position={[w * 0.2, propY - 0.05 + 0.1, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.12, 14]} />
            <Mat color="#f8fafc" finish="ceramic" roughness={0.3} />
          </mesh>
          <mesh position={[0.08, 0.02, 0]} rotation={[0, 0, 0.4]}>
            <torusGeometry args={[0.04, 0.008, 8, 14, Math.PI]} />
            <Mat color="#e7e5e4" />
          </mesh>
        </group>
      ) : null}
      </group>
      {Array.from({ length: glassCount }).map((_, i) => {
        const x = ((i + 0.5) / glassCount - 0.5) * w * 0.7;
        return <BarGlass key={`g-${i}`} x={x} z={propZ + counterD * 0.25} y={topY + 0.06} style={style} />;
      })}
      {!isIsland && Array.from({ length: stoolCount }).map((_, i) => {
        const x = ((i + 0.5) / stoolCount - 0.5) * w * 0.82;
        return <BarStool key={`s-${i}`} x={x} z={frontZ + 0.42} />;
      })}
    </group>
  );
}
