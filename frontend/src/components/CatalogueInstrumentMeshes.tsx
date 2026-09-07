'use client';

import type { InstrumentStyle } from '@/lib/roomLayoutUtils';

const INSTRUMENT_NATIVE: Record<InstrumentStyle, { w: number; d: number }> = {
  piano: { w: 1.72, d: 0.86 },
  upright: { w: 1.28, d: 0.42 },
  keyboard: { w: 1.18, d: 0.36 },
  drums: { w: 1.15, d: 0.95 },
  guitar: { w: 0.46, d: 0.4 },
  bass: { w: 0.46, d: 0.42 },
  doubleBass: { w: 0.55, d: 0.48 },
  cello: { w: 0.42, d: 0.38 },
  harp: { w: 0.72, d: 0.42 },
  micStand: { w: 0.36, d: 0.36 },
  sax: { w: 0.36, d: 0.32 },
  trumpet: { w: 0.34, d: 0.28 },
  violin: { w: 0.3, d: 0.26 },
  conga: { w: 0.72, d: 0.42 },
  cajon: { w: 0.34, d: 0.32 },
  mixer: { w: 1.05, d: 0.55 },
  amp: { w: 0.58, d: 0.34 },
  speaker: { w: 0.44, d: 0.32 },
};

const KEY_COUNT = 14;
const HARP_STRINGS = 11;
const MIXER_FADERS = 8;

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

function PianoKeys({ width, y, z }: { width: number; y: number; z: number }) {
  return (
    <group position={[0, y, z]}>
      <mesh>
        <boxGeometry args={[width, 0.028, 0.16]} />
        <Mat color="#f8fafc" roughness={0.35} />
      </mesh>
      {Array.from({ length: KEY_COUNT }).map((_, i) => {
        if (i % 7 === 2 || i % 7 === 6) return null;
        const x = ((i + 0.5) / KEY_COUNT - 0.5) * width * 0.92;
        return (
          <mesh key={i} position={[x, 0.02, -0.02]}>
            <boxGeometry args={[width / KEY_COUNT * 0.42, 0.018, 0.1]} />
            <Mat color="#171717" roughness={0.28} />
          </mesh>
        );
      })}
    </group>
  );
}

function InstrumentStand({ height = 0.42, chrome = '#d4d4d8' }: { height?: number; chrome?: string }) {
  return (
    <group>
      {([-0.12, 0.12] as const).map((x) => (
        <mesh key={x} position={[x, height * 0.5, 0]} rotation={[0.35, 0, x > 0 ? -0.12 : 0.12]} castShadow>
          <cylinderGeometry args={[0.01, 0.012, height, 8]} />
          <Mat color={chrome} metalness={0.72} roughness={0.22} />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.11, 0.13, 0.03, 12]} />
        <Mat color="#292524" />
      </mesh>
    </group>
  );
}

function HourglassBody({
  color,
  scale = 1,
}: {
  color: string;
  scale?: number;
}) {
  return (
    <group scale={[scale, scale, scale]}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <sphereGeometry args={[0.13, 14, 12]} />
        <Mat color={color} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.26, 0]} castShadow>
        <sphereGeometry args={[0.11, 14, 12]} />
        <Mat color={color} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.1, 12]} />
        <Mat color={color} roughness={0.45} />
      </mesh>
    </group>
  );
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
  const brass = '#ca8a04';

  if (style === 'piano') {
    return (
      <group>
        <mesh position={[0.08, 0.38, -0.06]} castShadow receiveShadow>
          <boxGeometry args={[1.15, 0.2, 0.62]} />
          <Mat color={black} roughness={0.22} metalness={0.18} />
        </mesh>
        <mesh position={[-0.62, 0.38, -0.02]} scale={[1, 1, 0.92]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.2, 20]} />
          <Mat color={black} roughness={0.22} metalness={0.18} />
        </mesh>
        <mesh position={[0.05, 0.72, -0.22]} rotation={[-0.72, 0, 0]} castShadow>
          <boxGeometry args={[1.05, 0.03, 0.62]} />
          <Mat color={black} roughness={0.2} metalness={0.22} />
        </mesh>
        <mesh position={[0.52, 0.58, -0.08]} rotation={[0, 0, 0.15]} castShadow>
          <boxGeometry args={[0.03, 0.38, 0.03]} />
          <Mat color={black} />
        </mesh>
        <PianoKeys width={1.05} y={0.5} z={0.28} />
        <mesh position={[0.22, 0.62, 0.16]} castShadow>
          <boxGeometry args={[0.42, 0.14, 0.02]} />
          <Mat color={black} roughness={0.25} />
        </mesh>
        {([-0.55, 0.12, 0.62] as const).map((x) => (
          <group key={x} position={[x, 0, x < 0 ? -0.08 : 0.16]}>
            <mesh position={[0, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.036, 0.32, 10]} />
              <Mat color={black} />
            </mesh>
            <mesh position={[0, 0.02, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.045, 0.04, 10]} />
              <Mat color="#d4af37" metalness={0.7} roughness={0.25} />
            </mesh>
          </group>
        ))}
        <mesh position={[0.18, 0.08, 0.3]} castShadow>
          <boxGeometry args={[0.22, 0.08, 0.04]} />
          <Mat color={black} />
        </mesh>
        {([-0.06, 0, 0.06] as const).map((x) => (
          <mesh key={x} position={[0.18 + x, 0.04, 0.34]}>
            <boxGeometry args={[0.03, 0.02, 0.06]} />
            <Mat color="#d4af37" metalness={0.65} roughness={0.28} />
          </mesh>
        ))}
      </group>
    );
  }

  if (style === 'upright') {
    return (
      <group>
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.28, 1.12, 0.28]} />
          <Mat color={black} roughness={0.28} metalness={0.12} />
        </mesh>
        <mesh position={[0, 0.72, 0.12]} castShadow>
          <boxGeometry args={[1.12, 0.42, 0.06]} />
          <Mat color={black} roughness={0.3} />
        </mesh>
        <PianoKeys width={1.1} y={0.48} z={0.16} />
        <mesh position={[0, 0.58, 0.18]} castShadow>
          <boxGeometry args={[0.5, 0.12, 0.02]} />
          <Mat color={black} />
        </mesh>
        {([-0.5, 0.5] as const).map((x) => (
          <mesh key={x} position={[x, 0.12, 0.04]} castShadow>
            <boxGeometry args={[0.08, 0.24, 0.22]} />
            <Mat color={black} />
          </mesh>
        ))}
      </group>
    );
  }

  if (style === 'keyboard') {
    return (
      <group>
        <mesh position={[0, 0.84, 0]} castShadow>
          <boxGeometry args={[1.18, 0.07, 0.34]} />
          <Mat color={black} roughness={0.32} />
        </mesh>
        <PianoKeys width={1.08} y={0.89} z={0.04} />
        {([-0.08, 0.08] as const).map((z) => (
          <mesh key={z} position={[0.42, 0.92, z]}>
            <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
            <Mat color="#22c55e" metalness={0.4} roughness={0.3} />
          </mesh>
        ))}
        {([-0.4, 0.4] as const).map((x) => (
          <mesh key={x} position={[x, 0.42, 0]} rotation={[0.15, 0, x > 0 ? -0.2 : 0.2]} castShadow>
            <cylinderGeometry args={[0.014, 0.014, 0.86, 8]} />
            <Mat color={chrome} metalness={0.72} roughness={0.22} />
          </mesh>
        ))}
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <boxGeometry args={[0.62, 0.04, 0.3]} />
          <Mat color="#292524" />
        </mesh>
      </group>
    );
  }

  if (style === 'drums') {
    return (
      <group>
        <mesh position={[0, 0.34, 0.04]} castShadow>
          <cylinderGeometry args={[0.3, 0.32, 0.46, 18]} />
          <Mat color="#1e3a5f" />
        </mesh>
        <mesh position={[0, 0.58, 0.04]}>
          <cylinderGeometry args={[0.29, 0.29, 0.02, 18]} />
          <Mat color="#f8fafc" roughness={0.55} />
        </mesh>
        <mesh position={[-0.36, 0.68, 0.08]} rotation={[0.22, 0, 0.18]} castShadow>
          <cylinderGeometry args={[0.13, 0.14, 0.14, 14]} />
          <Mat color="#f8fafc" />
        </mesh>
        <mesh position={[0.32, 0.64, 0.1]} rotation={[0.18, 0, -0.14]} castShadow>
          <cylinderGeometry args={[0.11, 0.12, 0.12, 14]} />
          <Mat color="#f8fafc" />
        </mesh>
        <mesh position={[0.08, 0.62, 0.32]} rotation={[0.35, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.13, 0.1, 14]} />
          <Mat color="#fafafa" />
        </mesh>
        <mesh position={[0.42, 1.02, -0.06]} rotation={[1.15, 0, 0.22]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.018, 20]} />
          <Mat color="#fde68a" metalness={0.7} roughness={0.18} />
        </mesh>
        <mesh position={[-0.38, 1.0, -0.08]} rotation={[1.05, 0, -0.2]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.016, 18]} />
          <Mat color="#fde68a" metalness={0.7} roughness={0.18} />
        </mesh>
        <mesh position={[-0.22, 0.82, 0.28]} rotation={[1.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.014, 16]} />
          <Mat color="#fef08a" metalness={0.65} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.78, -0.28]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.95, 8]} />
          <Mat color={chrome} metalness={0.72} roughness={0.2} />
        </mesh>
        <mesh position={[-0.48, 0.28, -0.12]} castShadow>
          <cylinderGeometry args={[0.12, 0.13, 0.08, 14]} />
          <Mat color="#171717" />
        </mesh>
      </group>
    );
  }

  if (style === 'guitar' || style === 'bass' || style === 'doubleBass' || style === 'cello') {
    const isBass = style === 'bass';
    const isUpright = style === 'doubleBass' || style === 'cello';
    const bodyColor = isBass ? '#1e3a5f' : style === 'doubleBass' ? '#3f2a1d' : wood;
    const scale = style === 'doubleBass' ? 1.45 : style === 'cello' ? 1.15 : 1;
    const neckH = isBass ? 0.62 : isUpright ? 0.7 : 0.52;
    return (
      <group rotation={isUpright ? [0.08, 0.25, 0.05] : [0, 0.35, 0.18]}>
        <HourglassBody color={bodyColor} scale={scale} />
        <mesh position={[0, 0.38 * scale + neckH * 0.35, 0]} castShadow>
          <boxGeometry args={[0.045, neckH, 0.055]} />
          <Mat color="#292524" />
        </mesh>
        <mesh position={[0, 0.38 * scale + neckH * 0.78, 0]} castShadow>
          <boxGeometry args={[0.07, 0.1, 0.06]} />
          <Mat color="#1c1917" />
        </mesh>
        {([-0.02, 0.02] as const).map((x) => (
          <mesh key={x} position={[x, 0.38 * scale + neckH * 0.84, 0.03]}>
            <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
            <Mat color={chrome} metalness={0.7} roughness={0.22} />
          </mesh>
        ))}
        <mesh position={[0, 0.2 * scale, 0.12 * scale]}>
          <cylinderGeometry args={[0.035, 0.035, 0.01, 14]} />
          <Mat color="#111827" />
        </mesh>
        <InstrumentStand height={isUpright ? 0.28 : 0.38} />
      </group>
    );
  }

  if (style === 'harp') {
    return (
      <group>
        <mesh position={[-0.18, 0.72, 0]} rotation={[0, 0, 0.18]} castShadow>
          <boxGeometry args={[0.06, 1.28, 0.08]} />
          <Mat color={wood} roughness={0.4} />
        </mesh>
        <mesh position={[0.16, 0.22, 0]} castShadow>
          <boxGeometry args={[0.42, 0.1, 0.16]} />
          <Mat color={wood} roughness={0.42} />
        </mesh>
        <mesh position={[0.22, 0.95, 0]} rotation={[0, 0, -0.85]} castShadow>
          <boxGeometry args={[0.05, 0.95, 0.06]} />
          <Mat color={wood} roughness={0.38} />
        </mesh>
        {Array.from({ length: HARP_STRINGS }).map((_, i) => {
          const t = (i + 0.5) / HARP_STRINGS;
          return (
            <mesh key={i} position={[-0.12 + t * 0.32, 0.55 + t * 0.22, 0]} rotation={[0, 0, 0.12]}>
              <boxGeometry args={[0.004, 0.85 - t * 0.28, 0.004]} />
              <Mat color="#fde68a" metalness={0.55} roughness={0.25} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (style === 'micStand') {
    return (
      <group>
        {([-0.7, 0.7, 2.4] as const).map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 0.16, 0.08, Math.sin(a) * 0.16]} rotation={[0.9, 0, a]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.28, 8]} />
            <Mat color={chrome} metalness={0.7} roughness={0.22} />
          </mesh>
        ))}
        <mesh position={[0, 0.78, 0]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, 1.45, 8]} />
          <Mat color={chrome} metalness={0.72} roughness={0.2} />
        </mesh>
        <mesh position={[0.12, 1.42, 0.08]} rotation={[0.9, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.32, 8]} />
          <Mat color={chrome} metalness={0.7} roughness={0.22} />
        </mesh>
        <mesh position={[0.22, 1.52, 0.16]} rotation={[1.1, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.03, 0.09, 12]} />
          <Mat color="#171717" />
        </mesh>
        <mesh position={[0.24, 1.56, 0.2]} rotation={[1.1, 0.2, 0]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <Mat color="#44403c" metalness={0.35} roughness={0.4} />
        </mesh>
      </group>
    );
  }

  if (style === 'sax') {
    return (
      <group rotation={[0.12, 0.35, 0.18]}>
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.048, 0.88, 12]} />
          <Mat color={brass} metalness={0.78} roughness={0.2} />
        </mesh>
        <mesh position={[0.1, 0.2, 0.06]} rotation={[0.85, 0, 0.35]} castShadow>
          <torusGeometry args={[0.11, 0.03, 8, 18, Math.PI * 1.15]} />
          <Mat color={brass} metalness={0.78} roughness={0.2} />
        </mesh>
        <mesh position={[0.2, 0.12, 0.12]} rotation={[0.4, 0, 0.5]} castShadow>
          <cylinderGeometry args={[0.055, 0.03, 0.12, 12]} />
          <Mat color={brass} metalness={0.75} roughness={0.22} />
        </mesh>
        {[0.35, 0.5, 0.65, 0.8].map((y) => (
          <mesh key={y} position={[0.04, y, 0.03]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <Mat color="#fde68a" metalness={0.65} roughness={0.25} />
          </mesh>
        ))}
        <InstrumentStand height={0.32} />
      </group>
    );
  }

  if (style === 'trumpet') {
    return (
      <group rotation={[0.15, 0.4, 0]}>
        <mesh position={[0, 0.42, 0]} rotation={[0, 0, 1.2]} castShadow>
          <cylinderGeometry args={[0.016, 0.018, 0.42, 10]} />
          <Mat color={brass} metalness={0.8} roughness={0.18} />
        </mesh>
        <mesh position={[0.16, 0.48, 0]} rotation={[0, 0, 1.2]} castShadow>
          <cylinderGeometry args={[0.055, 0.02, 0.14, 14]} />
          <Mat color={brass} metalness={0.8} roughness={0.18} />
        </mesh>
        {([-0.04, 0, 0.04] as const).map((z) => (
          <mesh key={z} position={[-0.04, 0.5, z]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.08, 8]} />
            <Mat color={chrome} metalness={0.7} roughness={0.22} />
          </mesh>
        ))}
        <mesh position={[-0.18, 0.18, 0.08]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.08, 10]} />
          <Mat color="#292524" />
        </mesh>
        <InstrumentStand height={0.28} />
      </group>
    );
  }

  if (style === 'violin') {
    return (
      <group rotation={[0.85, 0.15, 0.05]}>
        <HourglassBody color={wood} scale={0.72} />
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[0.028, 0.34, 0.035]} />
          <Mat color="#3f2a1d" />
        </mesh>
        <mesh position={[0.14, 0.22, 0]} rotation={[0, 0, 0.55]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.42, 8]} />
          <Mat color={wood} />
        </mesh>
        <InstrumentStand height={0.22} />
      </group>
    );
  }

  if (style === 'conga') {
    return (
      <group>
        {([-0.18, 0.2] as const).map((x, i) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, i === 0 ? 0.38 : 0.32, 0]} castShadow>
              <cylinderGeometry args={[i === 0 ? 0.16 : 0.14, 0.13, i === 0 ? 0.72 : 0.6, 16]} />
              <Mat color="#7c2d12" roughness={0.55} />
            </mesh>
            <mesh position={[0, i === 0 ? 0.75 : 0.63, 0]}>
              <cylinderGeometry args={[i === 0 ? 0.155 : 0.135, i === 0 ? 0.155 : 0.135, 0.02, 16]} />
              <Mat color="#f5f0e8" roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (style === 'cajon') {
    return (
      <group>
        <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.48, 0.3]} />
          <Mat color={wood} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.24, 0.155]} castShadow>
          <boxGeometry args={[0.28, 0.42, 0.012]} />
          <Mat color="#f5f0e8" roughness={0.65} />
        </mesh>
      </group>
    );
  }

  if (style === 'mixer') {
    return (
      <group>
        <mesh position={[0, 0.72, 0]} rotation={[-0.28, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.02, 0.08, 0.52]} />
          <Mat color="#171717" roughness={0.4} metalness={0.2} />
        </mesh>
        {Array.from({ length: MIXER_FADERS }).map((_, i) => {
          const x = ((i + 0.5) / MIXER_FADERS - 0.5) * 0.88;
          return (
            <group key={i} position={[x, 0.78, 0.04]}>
              <mesh>
                <boxGeometry args={[0.03, 0.02, 0.22]} />
                <Mat color="#292524" />
              </mesh>
              <mesh position={[0, 0.02, -0.04 + (i % 3) * 0.03]}>
                <boxGeometry args={[0.04, 0.03, 0.03]} />
                <Mat color="#f8fafc" />
              </mesh>
              <mesh position={[0, 0.03, -0.16]}>
                <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
                <Mat color={i % 2 ? '#22c55e' : '#f59e0b'} metalness={0.4} roughness={0.3} />
              </mesh>
            </group>
          );
        })}
        {([-0.32, 0.32] as const).map((x) => (
          <mesh key={x} position={[x, 0.36, -0.08]} castShadow>
            <cylinderGeometry args={[0.02, 0.022, 0.7, 8]} />
            <Mat color={chrome} metalness={0.65} roughness={0.25} />
          </mesh>
        ))}
      </group>
    );
  }

  if (style === 'amp') {
    return (
      <group>
        <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.56, 0.64, 0.32]} />
          <Mat color="#292524" roughness={0.68} />
        </mesh>
        {([-0.24, 0.24] as const).flatMap((x) =>
          ([-0.28, 0.28] as const).map((y) => (
            <mesh key={`${x}-${y}`} position={[x, 0.34 + y, 0.14]}>
              <boxGeometry args={[0.04, 0.04, 0.04]} />
              <Mat color="#44403c" metalness={0.35} roughness={0.4} />
            </mesh>
          )),
        )}
        <mesh position={[0, 0.36, 0.17]} castShadow>
          <cylinderGeometry args={[0.17, 0.17, 0.02, 18]} />
          <Mat color="#78716c" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.62, 0.165]}>
          <boxGeometry args={[0.42, 0.04, 0.01]} />
          <Mat color="#171717" />
        </mesh>
        {([-0.1, 0, 0.1] as const).map((x) => (
          <mesh key={x} position={[x, 0.62, 0.172]}>
            <cylinderGeometry args={[0.01, 0.01, 0.012, 8]} />
            <Mat color="#a1a1aa" metalness={0.6} roughness={0.25} />
          </mesh>
        ))}
        <mesh position={[0, 0.68, 0]} castShadow>
          <boxGeometry args={[0.22, 0.03, 0.08]} />
          <Mat color="#171717" />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.58, 0]} rotation={[0.28, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.62, 0.28]} />
        <Mat color="#171717" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.72, 0.08]} rotation={[0.28, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.04, 14]} />
        <Mat color="#44403c" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.46, 0.1]} rotation={[0.28, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.13, 0.03, 16]} />
        <Mat color="#57534e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.88, 0]} rotation={[0.28, 0, 0]} castShadow>
        <boxGeometry args={[0.16, 0.04, 0.08]} />
        <Mat color="#292524" />
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
  const native = INSTRUMENT_NATIVE[style] ?? INSTRUMENT_NATIVE.piano;
  const fit = Math.min(w / native.w, d / native.d);
  const scale = Math.min(2.4, Math.max(0.45, fit));
  return (
    <group scale={[scale, scale, scale]}>
      <InstrumentGlyph style={style} selected={selected} />
    </group>
  );
}
