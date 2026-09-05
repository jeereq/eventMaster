'use client';

import type { BarStyle, InstrumentStyle } from '@/lib/roomLayoutUtils';

const BOTTLE_COLORS: Record<BarStyle, string[]> = {
  cocktail: ['#14532d', '#7f1d1d', '#1e3a5f', '#854d0e', '#4c1d95'],
  wine: ['#3f1d1d', '#4a1515', '#2d1b14', '#5b1a1a'],
  champagne: ['#854d0e', '#a16207', '#713f12', '#ca8a04'],
  beer: ['#92400e', '#b45309', '#78350f'],
  coffee: ['#1c1917', '#44403c', '#292524'],
  whiskey: ['#7c2d12', '#9a3412', '#451a03', '#b45309'],
};

const BAR_BOTTLE_MAX = 12;
const BAR_GLASS_MAX = 10;
const INSTRUMENT_NATIVE: Record<InstrumentStyle, { w: number; d: number }> = {
  piano: { w: 1.55, d: 0.72 },
  keyboard: { w: 1.15, d: 0.32 },
  drums: { w: 0.86, d: 0.7 },
  guitar: { w: 0.42, d: 0.38 },
  bass: { w: 0.42, d: 0.4 },
  micStand: { w: 0.28, d: 0.28 },
  sax: { w: 0.32, d: 0.3 },
  violin: { w: 0.28, d: 0.26 },
  amp: { w: 0.55, d: 0.32 },
  speaker: { w: 0.42, d: 0.28 },
};

const GLASS_TINT: Record<BarStyle, string> = {
  cocktail: '#e0f2fe',
  wine: '#fecaca',
  champagne: '#fef08a',
  beer: '#fbbf24',
  coffee: '#f5f0e8',
  whiskey: '#fdba74',
};

function Mat({
  color,
  roughness = 0.5,
  metalness = 0.08,
}: {
  color: string;
  roughness?: number;
  metalness?: number;
}) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />;
}

function InstrumentGlyph({
  style,
  selected = false,
}: {
  style: InstrumentStyle;
  selected?: boolean;
}) {
  const accent = selected ? '#c7d2fe' : undefined;
  const black = accent ?? '#171717';
  const wood = accent ?? '#5c4030';
  const chrome = '#d4d4d8';

  if (style === 'piano') {
    return (
      <group>
        <mesh position={[0, 0.42, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[1.55, 0.22, 0.72]} />
          <Mat color={black} roughness={0.28} metalness={0.15} />
        </mesh>
        <mesh position={[-0.12, 0.55, -0.28]} rotation={[-0.55, 0, 0]} castShadow>
          <boxGeometry args={[1.4, 0.04, 0.7]} />
          <Mat color={black} roughness={0.25} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.54, 0.28]} castShadow>
          <boxGeometry args={[1.35, 0.03, 0.18]} />
          <Mat color="#f8fafc" roughness={0.4} />
        </mesh>
        {([-0.62, 0, 0.62] as const).map((x) => (
          <mesh key={x} position={[x, 0.18, 0.18]} castShadow>
            <cylinderGeometry args={[0.035, 0.04, 0.36, 8]} />
            <Mat color={black} />
          </mesh>
        ))}
      </group>
    );
  }

  if (style === 'keyboard') {
    return (
      <group>
        <mesh position={[0, 0.82, 0]} castShadow>
          <boxGeometry args={[1.15, 0.08, 0.32]} />
          <Mat color={black} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.87, 0.02]} castShadow>
          <boxGeometry args={[1.05, 0.02, 0.2]} />
          <Mat color="#f8fafc" />
        </mesh>
        {([-0.38, 0.38] as const).map((x) => (
          <mesh key={x} position={[x, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.82, 8]} />
            <Mat color={chrome} metalness={0.7} roughness={0.25} />
          </mesh>
        ))}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[0.7, 0.04, 0.28]} />
          <Mat color="#292524" />
        </mesh>
      </group>
    );
  }

  if (style === 'drums') {
    return (
      <group>
        <mesh position={[0, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.3, 0.42, 16]} />
          <Mat color="#1e3a5f" />
        </mesh>
        <mesh position={[-0.32, 0.62, 0.05]} rotation={[0.2, 0, 0.15]} castShadow>
          <cylinderGeometry args={[0.14, 0.15, 0.16, 14]} />
          <Mat color="#f8fafc" />
        </mesh>
        <mesh position={[0.3, 0.58, 0.08]} rotation={[0.15, 0, -0.12]} castShadow>
          <cylinderGeometry args={[0.12, 0.13, 0.14, 14]} />
          <Mat color="#f8fafc" />
        </mesh>
        <mesh position={[0.38, 0.95, -0.05]} rotation={[1.15, 0, 0.2]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.02, 18]} />
          <Mat color="#fde68a" metalness={0.65} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.78, -0.22]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.9, 8]} />
          <Mat color={chrome} metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
    );
  }

  if (style === 'guitar' || style === 'bass') {
    const long = style === 'bass' ? 1.15 : 0.98;
    return (
      <group rotation={[0, 0.35, 0.15]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <sphereGeometry args={[style === 'bass' ? 0.16 : 0.14, 12, 12]} />
          <Mat color={style === 'bass' ? '#1e3a5f' : '#7f1d1d'} />
        </mesh>
        <mesh position={[0, 0.42 + long * 0.28, 0]} rotation={[0, 0, 0.08]} castShadow>
          <boxGeometry args={[0.05, long * 0.55, 0.06]} />
          <Mat color="#292524" />
        </mesh>
        <mesh position={[0.01, 0.18, 0.08]} castShadow>
          <cylinderGeometry args={[0.018, 0.022, 0.42, 8]} />
          <Mat color={chrome} metalness={0.65} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  if (style === 'micStand') {
    return (
      <group>
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.04, 12]} />
          <Mat color="#292524" />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 1.5, 8]} />
          <Mat color={chrome} metalness={0.7} roughness={0.22} />
        </mesh>
        <mesh position={[0, 1.56, 0.04]} rotation={[0.55, 0, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.032, 0.1, 10]} />
          <Mat color="#171717" />
        </mesh>
      </group>
    );
  }

  if (style === 'sax') {
    return (
      <group rotation={[0.15, 0.4, 0.2]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.05, 0.85, 10]} />
          <Mat color="#ca8a04" metalness={0.75} roughness={0.22} />
        </mesh>
        <mesh position={[0.08, 0.22, 0.05]} rotation={[0.8, 0, 0.4]} castShadow>
          <torusGeometry args={[0.1, 0.028, 8, 16, Math.PI]} />
          <Mat color="#ca8a04" metalness={0.75} roughness={0.22} />
        </mesh>
        <mesh position={[0.01, 0.12, 0.1]} castShadow>
          <cylinderGeometry args={[0.016, 0.02, 0.28, 8]} />
          <Mat color={chrome} metalness={0.6} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  if (style === 'violin') {
    return (
      <group rotation={[0.9, 0.2, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.09, 12, 12]} />
          <Mat color={wood} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <boxGeometry args={[0.03, 0.32, 0.04]} />
          <Mat color="#3f2a1d" />
        </mesh>
        <mesh position={[0.08, 0.28, 0]} rotation={[0, 0, 0.5]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.38, 8]} />
          <Mat color={wood} />
        </mesh>
      </group>
    );
  }

  if (style === 'amp') {
    return (
      <group>
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.62, 0.32]} />
          <Mat color="#292524" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.34, 0.165]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.02, 16]} />
          <Mat color="#78716c" roughness={0.85} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.55, 0]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.55, 0.28]} />
        <Mat color="#171717" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.58, 0.06]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.34, 0.42, 0.04]} />
        <Mat color="#44403c" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function ConcertInstrumentMesh({
  style,
  selected = false,
  w = 1.2,
  d = 0.7,
}: {
  style: InstrumentStyle;
  selected?: boolean;
  w?: number;
  d?: number;
}) {
  const native = INSTRUMENT_NATIVE[style];
  const fit = Math.min(w / native.w, d / native.d);
  const scale = Math.min(2.4, Math.max(0.45, fit));
  return (
    <group scale={[scale, scale, scale]}>
      <InstrumentGlyph style={style} selected={selected} />
    </group>
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
        <Mat color={color} roughness={0.2} metalness={0.15} />
      </mesh>
      <mesh position={[0, h * 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.022, h * 0.28, 8]} />
        <Mat color={color} roughness={0.2} metalness={0.15} />
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
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.45} roughness={0.05} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[style === 'champagne' ? 0.028 : 0.04, 0.08, 10]} />
          <meshStandardMaterial color={tint} transparent opacity={0.45} roughness={0.05} metalness={0.2} />
        </mesh>
      </group>
    );
  }
  if (style === 'cocktail') {
    return (
      <group position={[x, y, z]}>
        <mesh>
          <cylinderGeometry args={[0.008, 0.01, 0.08, 8]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.4} roughness={0.05} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.07, 10]} />
          <meshStandardMaterial color={tint} transparent opacity={0.4} roughness={0.05} />
        </mesh>
      </group>
    );
  }
  if (style === 'coffee') {
    return (
      <group position={[x, y, z]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.024, 0.05, 12]} />
          <Mat color="#f8fafc" roughness={0.4} />
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
        <meshStandardMaterial color={tint} transparent opacity={0.4} roughness={0.08} metalness={0.15} />
      </mesh>
    </group>
  );
}

export function EventBarMesh({
  w,
  d,
  height = 1.15,
  style = 'cocktail',
  color,
  selected = false,
}: {
  w: number;
  d: number;
  height?: number;
  style?: BarStyle;
  color?: string;
  selected?: boolean;
}) {
  const body = selected ? '#c7d2fe' : color ?? '#4a3728';
  const topY = height;
  const bottles = BOTTLE_COLORS[style];
  const bottleCount = Math.min(BAR_BOTTLE_MAX, Math.max(4, Math.round(w * 1.6)));
  const glassCount = Math.min(BAR_GLASS_MAX, Math.max(3, Math.round(w * 1.2)));

  return (
    <group>
      <mesh position={[0, height * 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, height * 0.82, d]} />
        <Mat color={body} roughness={0.48} />
      </mesh>
      <mesh position={[0, topY + 0.02, 0]} receiveShadow castShadow>
        <boxGeometry args={[w * 1.04, 0.05, d * 1.06]} />
        <Mat color="#f5f0e8" roughness={0.28} metalness={0.12} />
      </mesh>
      <mesh position={[0, height * 1.35, -d * 0.42]} castShadow>
        <boxGeometry args={[w * 0.92, height * 0.85, 0.08]} />
        <Mat color="#1c1917" roughness={0.55} />
      </mesh>
      {Array.from({ length: 2 }).map((_, shelf) => (
        <mesh key={shelf} position={[0, height * (0.95 + shelf * 0.38), -d * 0.36]} receiveShadow>
          <boxGeometry args={[w * 0.88, 0.03, 0.16]} />
          <Mat color="#d6c4b0" roughness={0.4} />
        </mesh>
      ))}
      {Array.from({ length: bottleCount }).map((_, i) => {
        const x = ((i + 0.5) / bottleCount - 0.5) * w * 0.82;
        const shelf = i % 2;
        return (
          <BarBottle
            key={`b-${i}`}
            x={x}
            z={-d * 0.34}
            y={height * (0.97 + shelf * 0.38)}
            color={bottles[i % bottles.length]}
            tall={style === 'wine' || style === 'champagne'}
          />
        );
      })}
      {style === 'champagne' ? (
        <group position={[-w * 0.28, topY + 0.08, d * 0.12]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.08, 0.16, 14]} />
            <Mat color="#94a3b8" metalness={0.65} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.35} />
          </mesh>
        </group>
      ) : null}
      {style === 'beer' ? (
        ([-0.18, 0, 0.18] as const).map((side) => (
          <group key={side} position={[side * w * 0.55, topY + 0.22, -d * 0.05]}>
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
        <mesh position={[w * 0.28, topY + 0.16, 0]} castShadow>
          <boxGeometry args={[0.32, 0.28, 0.22]} />
          <Mat color="#171717" roughness={0.4} metalness={0.25} />
        </mesh>
      ) : null}
      {style === 'whiskey' ? (
        <mesh position={[w * 0.22, topY + 0.12, 0.05]} castShadow>
          <cylinderGeometry args={[0.05, 0.055, 0.18, 8]} />
          <Mat color="#9a3412" roughness={0.15} metalness={0.2} />
        </mesh>
      ) : null}
      {Array.from({ length: glassCount }).map((_, i) => {
        const x = ((i + 0.5) / glassCount - 0.5) * w * 0.7;
        return <BarGlass key={`g-${i}`} x={x} z={d * 0.18} y={topY + 0.06} style={style} />;
      })}
    </group>
  );
}
