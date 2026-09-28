'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { InstrumentStyle } from '@/lib/roomLayoutUtils';
import { SurfaceMat, type SurfaceFinish } from '@/components/room/SurfaceMaterial';

/** Encombrement réel (m) de chaque instrument, banquette ou tabouret compris. */
const INSTRUMENT_NATIVE: Record<InstrumentStyle, { w: number; d: number }> = {
  piano: { w: 1.5, d: 2.3 },
  upright: { w: 1.5, d: 1.05 },
  keyboard: { w: 1.32, d: 0.55 },
  drums: { w: 1.7, d: 1.5 },
  guitar: { w: 0.42, d: 0.42 },
  bass: { w: 0.42, d: 0.42 },
  doubleBass: { w: 0.7, d: 0.6 },
  cello: { w: 0.5, d: 0.5 },
  harp: { w: 0.95, d: 0.55 },
  micStand: { w: 0.55, d: 0.55 },
  sax: { w: 0.4, d: 0.4 },
  trumpet: { w: 0.4, d: 0.35 },
  violin: { w: 0.3, d: 0.3 },
  conga: { w: 0.72, d: 0.42 },
  cajon: { w: 0.34, d: 0.32 },
  mixer: { w: 1.05, d: 0.7 },
  amp: { w: 0.6, d: 0.34 },
  speaker: { w: 0.7, d: 0.7 },
};

const HARP_STRINGS = 26;
const MIXER_FADERS = 12;

function Mat({
  color,
  roughness = 0.5,
  metalness = 0.08,
  finish,
  clearcoat,
  repeat,
  vertical,
}: {
  color: string;
  roughness?: number;
  metalness?: number;
  finish?: SurfaceFinish;
  clearcoat?: number;
  repeat?: number | [number, number];
  vertical?: boolean;
}) {
  // Sans finition explicite : les pièces métalliques (≥ 0,5) reçoivent un brossé / laiton automatiques.
  return <SurfaceMat color={color} finish={finish ?? 'auto'} roughness={roughness} metalness={finish === 'wood' || finish === 'lacquer' ? 0 : metalness} clearcoat={clearcoat} repeat={repeat} vertical={vertical} />;
}

/** Libère une géométrie construite à la volée quand elle change ou au démontage. */
function useDisposable<T extends THREE.BufferGeometry>(factory: () => T, key: string | number): T {
  // La géométrie ne dépend que de `key` (les fabriques sont recréées à chaque rendu).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => factory(), [key]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

// ─── Piano ──────────────────────────────────────────────────────────────────

const WHITE_KEYS = 52;
/** Notes des touches blanches à partir de La0 : une touche noire suit A, C, D, F et G. */
const WHITE_NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

/** Clavier 88 touches à l’échelle (122 cm), touches noires en relief. */
function PianoKeyboard({ width = 1.22, y, z, accent }: { width?: number; y: number; z: number; accent?: string }) {
  const keyW = width / WHITE_KEYS;
  return (
    <group position={[0, y, z]}>
      {Array.from({ length: WHITE_KEYS }).map((_, i) => (
        <mesh key={`w-${i}`} position={[-width / 2 + keyW * (i + 0.5), 0, 0]} receiveShadow>
          <boxGeometry args={[keyW * 0.94, 0.022, 0.15]} />
          <Mat color={accent ?? '#f7f5ef'} finish="ceramic" roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: WHITE_KEYS - 1 }).map((_, i) => {
        const note = WHITE_NOTES[i % 7];
        if (note === 'B' || note === 'E') return null;
        return (
          <mesh key={`b-${i}`} position={[-width / 2 + keyW * (i + 1), 0.017, -0.028]} castShadow>
            <boxGeometry args={[keyW * 0.56, 0.014, 0.094]} />
            <Mat color="#0c0a09" finish="lacquer" roughness={0.22} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Banquette de piano capitonnée. */
function PianoBench({ z, width = 0.78, accent }: { z: number; width?: number; accent?: string }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.47, 0]} castShadow>
        <boxGeometry args={[width, 0.07, 0.36]} />
        <Mat color={accent ?? '#111111'} finish="leather" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.41, 0]} castShadow>
        <boxGeometry args={[width - 0.02, 0.06, 0.34]} />
        <Mat color={accent ?? '#0a0a0a'} finish="lacquer" roughness={0.18} />
      </mesh>
      {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * (width / 2 - 0.05), 0.19, sz * 0.13]} castShadow>
          <cylinderGeometry args={[0.022, 0.016, 0.38, 10]} />
          <Mat color={accent ?? '#0a0a0a'} finish="lacquer" roughness={0.18} />
        </mesh>
      )))}
    </group>
  );
}

/** Contour vu de dessus d’un piano à queue (x vers la droite, y = -z, clavier en bas). */
function grandPianoOutline(scale = 1): THREE.Shape {
  const s = scale;
  const shape = new THREE.Shape();
  shape.moveTo(-0.74 * s, -0.55 * s);
  shape.lineTo(0.74 * s, -0.55 * s);
  shape.lineTo(0.74 * s, -0.2 * s);
  // Échancrure caractéristique côté aigus puis queue arrondie.
  shape.bezierCurveTo(0.74 * s, 0.25 * s, 0.12 * s, 0.2 * s, 0.1 * s, 0.72 * s);
  shape.bezierCurveTo(0.08 * s, 1.08 * s, -0.5 * s, 1.12 * s, -0.7 * s, 0.98 * s);
  shape.lineTo(-0.74 * s, 0.9 * s);
  shape.lineTo(-0.74 * s, -0.55 * s);
  return shape;
}

function GrandPiano({ accent }: { accent?: string }) {
  const black = accent ?? '#0b0b0c';
  const caseGeo = useDisposable(() => {
    const g = new THREE.ExtrudeGeometry(grandPianoOutline(), { depth: 0.3, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 24 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, 'case');
  const lidGeo = useDisposable(() => {
    const g = new THREE.ExtrudeGeometry(grandPianoOutline(), { depth: 0.018, bevelEnabled: false, curveSegments: 24 });
    g.rotateX(-Math.PI / 2);
    // Charnière le long du flanc gauche (graves) : origine sur l’axe de rotation.
    g.translate(0.74, 0, 0);
    return g;
  }, 'lid');
  const soundboardGeo = useDisposable(() => {
    const g = new THREE.ShapeGeometry(grandPianoOutline(0.93), 24);
    g.rotateX(-Math.PI / 2);
    return g;
  }, 'soundboard');
  const plateGeo = useDisposable(() => {
    const g = new THREE.ShapeGeometry(grandPianoOutline(0.8), 24);
    g.rotateX(-Math.PI / 2);
    return g;
  }, 'plate');
  const lidAngle = 0.62;
  return (
    // Corps centré, clavier vers +Z ; la banquette dépasse devant le clavier.
    <group position={[0, 0, -0.15]}>
      {/* Caisse laquée */}
      <mesh geometry={caseGeo} position={[0, 0.68, 0]} castShadow receiveShadow>
        <Mat color={black} finish="lacquer" roughness={0.1} clearcoat={1} />
      </mesh>
      {/* Table d’harmonie en épicéa et cadre en fonte doré, visibles couvercle ouvert */}
      <mesh geometry={soundboardGeo} position={[0.02, 0.983, 0.03]} receiveShadow>
        <Mat color="#d9b77e" finish="wood" roughness={0.45} />
      </mesh>
      <mesh geometry={plateGeo} position={[0.03, 0.992, 0.02]} receiveShadow>
        <Mat color="#b8923a" metalness={0.75} roughness={0.32} finish="brass" />
      </mesh>
      {Array.from({ length: 18 }).map((_, i) => {
        const x = -0.55 + i * 0.062;
        const len = 1.35 - i * 0.055;
        return (
          <mesh key={`str-${i}`} position={[x, 0.998, 0.52 - len / 2]}>
            <boxGeometry args={[0.004, 0.003, len]} />
            <Mat color="#e5e7eb" metalness={0.85} roughness={0.2} />
          </mesh>
        );
      })}
      {/* Couvercle entrouvert, béquille côté aigus */}
      <group position={[-0.74, 0.992, 0]} rotation={[0, 0, lidAngle]}>
        <mesh geometry={lidGeo} castShadow>
          <Mat color={black} finish="lacquer" roughness={0.1} clearcoat={1} />
        </mesh>
      </group>
      <mesh position={[0.62, 0.992 + 0.36, -0.05]} rotation={[0, 0, 0.22]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.78, 8]} />
        <Mat color={black} finish="lacquer" />
      </mesh>
      {/* Pupitre */}
      <mesh position={[0, 1.12, 0.38]} rotation={[-0.28, 0, 0]} castShadow>
        <boxGeometry args={[0.82, 0.26, 0.015]} />
        <Mat color={black} finish="lacquer" roughness={0.12} />
      </mesh>
      {/* Lit du clavier, joues et cylindre */}
      <mesh position={[0, 0.66, 0.64]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 0.08, 0.2]} />
        <Mat color={black} finish="lacquer" roughness={0.12} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * 0.69, 0.74, 0.64]} castShadow>
          <boxGeometry args={[0.09, 0.1, 0.2]} />
          <Mat color={black} finish="lacquer" roughness={0.12} />
        </mesh>
      ))}
      <mesh position={[0, 0.76, 0.56]} castShadow>
        <boxGeometry args={[1.28, 0.07, 0.04]} />
        <Mat color={black} finish="lacquer" roughness={0.12} />
      </mesh>
      <PianoKeyboard y={0.715} z={0.66} accent={accent} />
      {/* Pieds galbés et roulettes laiton */}
      {([[-0.64, 0.46], [0.64, 0.46], [-0.3, -0.85]] as const).map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.36, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.045, 0.62, 12]} />
            <Mat color={black} finish="lacquer" roughness={0.12} />
          </mesh>
          <mesh position={[0, 0.03, 0]} castShadow>
            <sphereGeometry args={[0.04, 12, 10]} />
            <Mat color="#c9a227" metalness={0.8} roughness={0.25} finish="brass" />
          </mesh>
        </group>
      ))}
      {/* Lyre et trois pédales */}
      {([-0.06, 0.06] as const).map((x) => (
        <mesh key={x} position={[x, 0.38, 0.32]} castShadow>
          <boxGeometry args={[0.025, 0.6, 0.025]} />
          <Mat color={black} finish="lacquer" />
        </mesh>
      ))}
      <mesh position={[0, 0.07, 0.32]} castShadow>
        <boxGeometry args={[0.26, 0.07, 0.1]} />
        <Mat color={black} finish="lacquer" />
      </mesh>
      {([-0.07, 0, 0.07] as const).map((x) => (
        <mesh key={x} position={[x, 0.06, 0.41]} castShadow>
          <boxGeometry args={[0.035, 0.012, 0.1]} />
          <Mat color="#d4af37" metalness={0.8} roughness={0.22} finish="brass" />
        </mesh>
      ))}
      <PianoBench z={1.05} accent={accent} />
    </group>
  );
}

function UprightPiano({ accent }: { accent?: string }) {
  const black = accent ?? '#0b0b0c';
  return (
    <group position={[0, 0, -0.2]}>
      {/* Caisse haute */}
      <mesh position={[0, 0.66, -0.08]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 1.26, 0.34]} />
        <Mat color={black} finish="lacquer" roughness={0.1} clearcoat={1} />
      </mesh>
      <mesh position={[0, 1.3, -0.08]} castShadow>
        <boxGeometry args={[1.52, 0.04, 0.38]} />
        <Mat color={black} finish="lacquer" roughness={0.1} clearcoat={1} />
      </mesh>
      {/* Panneau supérieur et pupitre */}
      <mesh position={[0, 1.02, 0.1]} castShadow>
        <boxGeometry args={[1.3, 0.4, 0.03]} />
        <Mat color={black} finish="lacquer" roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.9, 0.14]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 0.14, 0.012]} />
        <Mat color={black} finish="lacquer" roughness={0.12} />
      </mesh>
      {/* Clavier en saillie avec joues */}
      <mesh position={[0, 0.66, 0.2]} castShadow>
        <boxGeometry args={[1.42, 0.06, 0.26]} />
        <Mat color={black} finish="lacquer" roughness={0.12} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * 0.67, 0.73, 0.2]} castShadow>
          <boxGeometry args={[0.07, 0.1, 0.27]} />
          <Mat color={black} finish="lacquer" roughness={0.12} />
        </mesh>
      ))}
      <PianoKeyboard y={0.705} z={0.24} accent={accent} />
      {/* Consoles et pédales */}
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * 0.64, 0.32, 0.24]} castShadow>
          <boxGeometry args={[0.06, 0.64, 0.06]} />
          <Mat color={black} finish="lacquer" roughness={0.12} />
        </mesh>
      ))}
      {([-0.06, 0, 0.06] as const).map((x) => (
        <mesh key={x} position={[x, 0.05, 0.14]} castShadow>
          <boxGeometry args={[0.035, 0.012, 0.1]} />
          <Mat color="#d4af37" metalness={0.8} roughness={0.22} finish="brass" />
        </mesh>
      ))}
      <PianoBench z={0.72} accent={accent} />
    </group>
  );
}

function StageKeyboard({ accent }: { accent?: string }) {
  const chrome = '#a1a1aa';
  return (
    <group>
      {/* Stand en X */}
      {([-0.32, 0.32] as const).map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {([-1, 1] as const).map((dir) => (
            <mesh key={dir} position={[0, 0.4, 0]} rotation={[dir * 0.62, 0, 0]} castShadow>
              <boxGeometry args={[0.03, 0.96, 0.03]} />
              <Mat color="#18181b" metalness={0.5} roughness={0.35} />
            </mesh>
          ))}
          <mesh position={[0, 0.78, 0]} castShadow>
            <boxGeometry args={[0.04, 0.03, 0.34]} />
            <Mat color={chrome} metalness={0.7} roughness={0.25} />
          </mesh>
        </group>
      ))}
      {/* Clavier de scène 88 notes */}
      <mesh position={[0, 0.84, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.32, 0.1, 0.34]} />
        <Mat color={accent ?? '#1c1917'} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.9, -0.1]} castShadow>
        <boxGeometry args={[1.3, 0.02, 0.12]} />
        <Mat color="#b91c1c" roughness={0.3} />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[-0.5 + i * 0.05, 0.915, -0.11]}>
          <cylinderGeometry args={[0.009, 0.009, 0.018, 10]} />
          <Mat color="#f5f5f4" />
        </mesh>
      ))}
      <mesh position={[0.3, 0.912, -0.1]}>
        <boxGeometry args={[0.16, 0.004, 0.06]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.5} />
      </mesh>
      <PianoKeyboard width={1.22} y={0.898} z={0.07} accent={accent} />
    </group>
  );
}

// ─── Batterie ───────────────────────────────────────────────────────────────

/** Fût de batterie orienté selon Y : coque laquée, peaux, cercles chromés et tirants. */
function Drum({ r, depth, shell, frontHead = '#f5f5f4', lugs = 8 }: { r: number; depth: number; shell: string; frontHead?: string; lugs?: number }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r, depth, 32, 1, true]} />
        <Mat color={shell} finish="lacquer" roughness={0.12} clearcoat={1} />
      </mesh>
      <mesh position={[0, depth / 2, 0]}>
        <cylinderGeometry args={[r * 0.98, r * 0.98, 0.004, 32]} />
        <Mat color="#f5f5f4" roughness={0.75} />
      </mesh>
      <mesh position={[0, -depth / 2, 0]}>
        <cylinderGeometry args={[r * 0.98, r * 0.98, 0.004, 32]} />
        <Mat color={frontHead} roughness={0.6} />
      </mesh>
      {([1, -1] as const).map((side) => (
        <mesh key={side} position={[0, side * depth / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.008, 6, 36]} />
          <Mat color="#e4e4e7" metalness={0.9} roughness={0.15} finish="chrome" />
        </mesh>
      ))}
      {Array.from({ length: lugs }).map((_, i) => {
        const a = (i / lugs) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (r + 0.008), 0, Math.sin(a) * (r + 0.008)]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.014, depth * 0.55, 0.02]} />
            <Mat color="#e4e4e7" metalness={0.9} roughness={0.15} finish="chrome" />
          </mesh>
        );
      })}
    </group>
  );
}

function Cymbal({ r }: { r: number }) {
  const geo = useDisposable(() => {
    const pts = [
      new THREE.Vector2(0.001, 0.028),
      new THREE.Vector2(0.03, 0.026),
      new THREE.Vector2(0.05, 0.012),
      new THREE.Vector2(r * 0.6, 0.006),
      new THREE.Vector2(r, 0),
      new THREE.Vector2(r, -0.003),
      new THREE.Vector2(0.05, 0.008),
      new THREE.Vector2(0.001, 0.024),
    ];
    return new THREE.LatheGeometry(pts, 40);
  }, r);
  return (
    <mesh geometry={geo} castShadow>
      <Mat color="#d6a84a" metalness={0.85} roughness={0.28} finish="brass" />
    </mesh>
  );
}

/** Pied trépied chromé avec tube vertical. */
function TripodStand({ height, spread = 0.26 }: { height: number; spread?: number }) {
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * spread * 0.5, 0.14, Math.sin(a) * spread * 0.5]} rotation={[Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.36, 6]} />
            <Mat color="#d4d4d8" metalness={0.85} roughness={0.2} finish="chrome" />
          </mesh>
        );
      })}
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.011, 0.013, height, 8]} />
        <Mat color="#d4d4d8" metalness={0.85} roughness={0.2} finish="chrome" />
      </mesh>
    </group>
  );
}

function DrumKit({ accent }: { accent?: string }) {
  const shell = accent ?? '#7f1d1d';
  return (
    // Batteur côté -Z, grosse caisse tournée vers le public (+Z).
    <group>
      {/* Grosse caisse 22" couchée */}
      <group position={[0, 0.29, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <Drum r={0.28} depth={0.42} shell={shell} frontHead="#111111" lugs={10} />
      </group>
      <mesh position={[0, 0.29, 0.465]}>
        <circleGeometry args={[0.12, 32]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.6} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * 0.22, 0.07, 0.36]} rotation={[0, 0, side * 0.5]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
          <Mat color="#d4d4d8" metalness={0.85} roughness={0.2} finish="chrome" />
        </mesh>
      ))}
      {/* Pédale */}
      <mesh position={[0, 0.03, -0.02]} castShadow>
        <boxGeometry args={[0.08, 0.02, 0.24]} />
        <Mat color="#3f3f46" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Toms suspendus 10" et 12", inclinés vers le batteur */}
      {([[-0.14, 0.13, 0.2], [0.16, 0.15, 0.22]] as const).map(([x, r, depth]) => (
        <group key={x} position={[x, 0.76, 0.2]} rotation={[-0.35, 0, x < 0 ? 0.12 : -0.12]}>
          <Drum r={r} depth={depth} shell={shell} lugs={6} />
        </group>
      ))}
      <mesh position={[0, 0.62, 0.22]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
        <Mat color="#d4d4d8" metalness={0.85} roughness={0.2} finish="chrome" />
      </mesh>
      {/* Tom basse 16" sur pieds */}
      <group position={[0.5, 0.45, -0.12]}>
        <Drum r={0.2} depth={0.4} shell={shell} lugs={8} />
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.4;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.23, -0.22, Math.sin(a) * 0.23]} castShadow>
              <cylinderGeometry args={[0.007, 0.007, 0.46, 6]} />
              <Mat color="#d4d4d8" metalness={0.85} roughness={0.2} finish="chrome" />
            </mesh>
          );
        })}
      </group>
      {/* Caisse claire 14" sur son pied */}
      <group position={[-0.32, 0, -0.18]}>
        <TripodStand height={0.56} spread={0.3} />
        <group position={[0, 0.62, 0]} rotation={[-0.08, 0, 0.06]}>
          <Drum r={0.18} depth={0.14} shell="#d4d4d8" lugs={10} />
        </group>
      </group>
      {/* Charleston */}
      <group position={[-0.66, 0, -0.08]}>
        <TripodStand height={0.92} spread={0.34} />
        <group position={[0, 0.88, 0]}><Cymbal r={0.18} /></group>
        <group position={[0, 0.905, 0]} rotation={[Math.PI, 0, 0]}><Cymbal r={0.18} /></group>
      </group>
      {/* Crash et ride sur perches */}
      <group position={[-0.5, 0, 0.3]}>
        <TripodStand height={1.3} spread={0.38} />
        <group position={[0.06, 1.34, -0.04]} rotation={[-0.3, 0, -0.25]}><Cymbal r={0.23} /></group>
      </group>
      <group position={[0.72, 0, 0.22]}>
        <TripodStand height={1.1} spread={0.38} />
        <group position={[-0.06, 1.14, -0.04]} rotation={[-0.25, 0, 0.3]}><Cymbal r={0.28} /></group>
      </group>
      {/* Siège de batteur */}
      <group position={[0, 0, -0.55]}>
        <TripodStand height={0.46} spread={0.36} />
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.16, 0.08, 20]} />
          <Mat color="#18181b" finish="leather" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Cordes ─────────────────────────────────────────────────────────────────

type StringBodySpec = {
  /** Longueur de caisse (m), largeur du bas, de la taille et du haut. */
  length: number;
  lower: number;
  waist: number;
  upper: number;
  thickness: number;
  neck: number;
  color: string;
  top?: string;
  soundHole?: boolean;
  fHoles?: boolean;
};

/** Profil en huit (guitare, violon, violoncelle, contrebasse), bas de caisse en y = 0. */
function stringBodyShape(spec: StringBodySpec): THREE.Shape {
  const { length: L, lower, waist, upper } = spec;
  const lw = lower / 2;
  const ww = waist / 2;
  const uw = upper / 2;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(lw * 0.9, 0, lw, L * 0.12, lw, L * 0.26);
  s.bezierCurveTo(lw, L * 0.42, ww, L * 0.44, ww, L * 0.52);
  s.bezierCurveTo(ww, L * 0.6, uw, L * 0.62, uw, L * 0.78);
  s.bezierCurveTo(uw, L * 0.94, uw * 0.4, L, 0, L);
  s.bezierCurveTo(-uw * 0.4, L, -uw, L * 0.94, -uw, L * 0.78);
  s.bezierCurveTo(-uw, L * 0.62, -ww, L * 0.6, -ww, L * 0.52);
  s.bezierCurveTo(-ww, L * 0.44, -lw, L * 0.42, -lw, L * 0.26);
  s.bezierCurveTo(-lw, L * 0.12, -lw * 0.9, 0, 0, 0);
  return s;
}

function StringInstrument({ spec, accent }: { spec: StringBodySpec; accent?: string }) {
  const body = useDisposable(() => {
    const g = new THREE.ExtrudeGeometry(stringBodyShape(spec), {
      depth: spec.thickness,
      bevelEnabled: true,
      bevelSize: 0.006,
      bevelThickness: 0.006,
      bevelSegments: 2,
      curveSegments: 20,
    });
    g.translate(0, 0, -spec.thickness / 2);
    return g;
  }, `${spec.length}:${spec.lower}:${spec.waist}:${spec.upper}:${spec.thickness}`);
  const L = spec.length;
  const front = spec.thickness / 2 + 0.007;
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <Mat color={accent ?? spec.color} finish="wood" roughness={0.28} clearcoat={0.9} />
      </mesh>
      {spec.top ? (
        <mesh position={[0, 0, front - 0.004]}>
          <shapeGeometry args={[stringBodyShape({ ...spec, lower: spec.lower * 0.96, waist: spec.waist * 0.95, upper: spec.upper * 0.96 }), 20]} />
          <Mat color={accent ?? spec.top} finish="wood" roughness={0.3} clearcoat={0.9} />
        </mesh>
      ) : null}
      {spec.soundHole ? (
        <mesh position={[0, L * 0.64, front]}>
          <circleGeometry args={[spec.upper * 0.22, 28]} />
          <meshStandardMaterial color="#0c0a09" roughness={0.9} />
        </mesh>
      ) : null}
      {spec.fHoles ? ([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * spec.waist * 0.32, L * 0.5, front]} rotation={[0, 0, side * 0.12]}>
          <planeGeometry args={[L * 0.012, L * 0.2]} />
          <meshStandardMaterial color="#0c0a09" roughness={0.9} />
        </mesh>
      )) : null}
      {/* Chevalet / cordier */}
      <mesh position={[0, L * (spec.soundHole ? 0.25 : 0.4), front + 0.004]} castShadow>
        <boxGeometry args={[spec.lower * 0.42, L * 0.03, 0.01]} />
        <Mat color="#1c1917" finish="wood" roughness={0.4} />
      </mesh>
      {spec.fHoles ? (
        <mesh position={[0, L * 0.2, front + 0.006]} castShadow>
          <boxGeometry args={[spec.lower * 0.22, L * 0.26, 0.008]} />
          <Mat color="#0c0a09" finish="wood" roughness={0.35} />
        </mesh>
      ) : null}
      {/* Manche, touche et tête */}
      <mesh position={[0, L + spec.neck / 2, 0.005]} castShadow>
        <boxGeometry args={[spec.upper * 0.17, spec.neck, spec.thickness * 0.55]} />
        <Mat color={spec.fHoles ? '#3f2a1d' : '#6b4226'} finish="wood" roughness={0.45} />
      </mesh>
      <mesh position={[0, L * 0.82 + spec.neck / 2, front + 0.002]}>
        <boxGeometry args={[spec.upper * 0.16, spec.neck + L * 0.32, 0.006]} />
        <Mat color="#1c1310" finish="wood" roughness={0.5} />
      </mesh>
      {spec.fHoles ? (
        <mesh position={[0, L + spec.neck + 0.035, -0.005]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.028, 0.012, 8, 16, Math.PI * 1.6]} />
          <Mat color="#3f2a1d" finish="wood" roughness={0.4} />
        </mesh>
      ) : (
        <mesh position={[0, L + spec.neck + 0.09, -0.012]} rotation={[-0.22, 0, 0]} castShadow>
          <boxGeometry args={[spec.upper * 0.3, 0.19, 0.018]} />
          <Mat color="#1c1310" finish="wood" roughness={0.4} />
        </mesh>
      )}
      {/* Cordes */}
      {Array.from({ length: spec.fHoles ? 4 : 6 }).map((_, i, arr) => {
        const spread = spec.upper * 0.12;
        const x = -spread / 2 + (spread * i) / Math.max(1, arr.length - 1);
        const y0 = L * (spec.soundHole ? 0.25 : 0.2);
        const y1 = L + spec.neck;
        return (
          <mesh key={i} position={[x, (y0 + y1) / 2, front + 0.009]}>
            <boxGeometry args={[0.0018, y1 - y0, 0.0018]} />
            <Mat color="#e7e5e4" metalness={0.9} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Support en A pour guitare ou basse. */
function GuitarStand() {
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * 0.12, 0.2, 0.04]} rotation={[0.25, 0, side * -0.28]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, 0.42, 8]} />
          <Mat color="#18181b" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0.1]} castShadow>
        <boxGeometry args={[0.3, 0.03, 0.05]} />
        <Mat color="#27272a" finish="plastic" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.2, -0.1]} rotation={[-0.35, 0, 0]} castShadow>
        <cylinderGeometry args={[0.009, 0.009, 0.44, 8]} />
        <Mat color="#18181b" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}

const STRING_SPECS: Record<'guitar' | 'bass' | 'violin' | 'cello' | 'doubleBass', StringBodySpec> = {
  guitar: { length: 0.5, lower: 0.38, waist: 0.24, upper: 0.29, thickness: 0.1, neck: 0.42, color: '#5b3319', top: '#e3b779', soundHole: true },
  bass: { length: 0.46, lower: 0.34, waist: 0.2, upper: 0.26, thickness: 0.045, neck: 0.62, color: '#0f2a4a', soundHole: false },
  violin: { length: 0.36, lower: 0.205, waist: 0.11, upper: 0.165, thickness: 0.06, neck: 0.13, color: '#8a3b12', fHoles: true },
  cello: { length: 0.76, lower: 0.44, waist: 0.24, upper: 0.35, thickness: 0.2, neck: 0.3, color: '#7c3410', fHoles: true },
  doubleBass: { length: 1.12, lower: 0.68, waist: 0.4, upper: 0.52, thickness: 0.26, neck: 0.46, color: '#5a2a0e', fHoles: true },
};

function StringFamily({ style, accent }: { style: keyof typeof STRING_SPECS; accent?: string }) {
  const spec = STRING_SPECS[style];
  if (style === 'guitar' || style === 'bass') {
    // Posée sur son support, légèrement inclinée vers l’arrière.
    return (
      <group>
        <GuitarStand />
        <group position={[0, 0.08, 0.02]} rotation={[-0.2, 0, 0]}>
          <StringInstrument spec={spec} accent={accent} />
        </group>
      </group>
    );
  }
  if (style === 'violin') {
    return (
      <group>
        <TripodStand height={0.62} spread={0.24} />
        <mesh position={[0, 0.64, 0]} castShadow>
          <boxGeometry args={[0.14, 0.03, 0.08]} />
          <Mat color="#18181b" metalness={0.5} roughness={0.35} />
        </mesh>
        <group position={[0, 0.66, 0.03]} rotation={[-0.22, 0, 0]}>
          <StringInstrument spec={spec} accent={accent} />
        </group>
      </group>
    );
  }
  // Violoncelle et contrebasse debout sur leur pique, appuyés sur un support.
  const lift = style === 'doubleBass' ? 0.16 : 0.12;
  return (
    <group>
      <mesh position={[0, lift / 2, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.012, lift, 8]} />
        <Mat color="#d4d4d8" metalness={0.85} roughness={0.2} finish="chrome" />
      </mesh>
      <group position={[0, lift, 0]} rotation={[-0.12, 0, 0]}>
        <StringInstrument spec={spec} accent={accent} />
      </group>
      <mesh position={[0, 0.02, -0.12]} castShadow>
        <boxGeometry args={[spec.lower * 0.8, 0.03, 0.26]} />
        <Mat color="#18181b" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ─── Harpe de concert ───────────────────────────────────────────────────────

function ConcertHarp({ accent }: { accent?: string }) {
  const wood = accent ?? '#c89b5b';
  const gold = '#d4af37';
  // Profil dans le plan XY, face au public (+Z).
  const base: [number, number] = [0.18, 0.16];
  const top: [number, number] = [-0.2, 1.52];
  const neckCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.36, 1.78, 0),
      new THREE.Vector3(0.15, 1.66, 0),
      new THREE.Vector3(-0.05, 1.76, 0),
      new THREE.Vector3(-0.22, 1.6, 0),
    ]),
    [],
  );
  const neckGeo = useDisposable(() => new THREE.TubeGeometry(neckCurve, 40, 0.035, 10, false), 'harp-neck');
  const neckY = (x: number) => {
    // Hauteur de la console au-dessus d’un x donné (approximation sur 60 points).
    let best = neckCurve.getPoint(0);
    for (let i = 0; i <= 60; i += 1) {
      const p = neckCurve.getPoint(i / 60);
      if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    }
    return best.y - 0.03;
  };
  const sbLen = Math.hypot(top[0] - base[0], top[1] - base[1]);
  const sbAngle = Math.atan2(top[0] - base[0], top[1] - base[1]);
  return (
    <group>
      {/* Socle et pédales */}
      <mesh position={[0.08, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.12, 0.4]} />
        <Mat color={wood} finish="wood" roughness={0.35} clearcoat={0.8} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-0.16 + i * 0.07, 0.03, 0.22]} castShadow>
          <boxGeometry args={[0.02, 0.012, 0.06]} />
          <Mat color={gold} metalness={0.8} roughness={0.25} finish="brass" />
        </mesh>
      ))}
      {/* Colonne */}
      <mesh position={[0.36, 0.97, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.042, 1.62, 16]} />
        <Mat color={gold} metalness={0.75} roughness={0.28} finish="brass" />
      </mesh>
      <mesh position={[0.36, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.06, 14, 12]} />
        <Mat color={gold} metalness={0.8} roughness={0.25} finish="brass" />
      </mesh>
      {/* Console galbée */}
      <mesh geometry={neckGeo} castShadow>
        <Mat color={wood} finish="wood" roughness={0.32} clearcoat={0.8} />
      </mesh>
      {/* Caisse de résonance inclinée, plus large en bas */}
      <mesh position={[(base[0] + top[0]) / 2, (base[1] + top[1]) / 2, -0.02]} rotation={[0, 0, -sbAngle]} castShadow>
        <cylinderGeometry args={[0.07, 0.17, sbLen, 4, 1]} />
        <Mat color={wood} finish="wood" roughness={0.32} clearcoat={0.8} />
      </mesh>
      {/* Cordes : do rouges, fa bleus */}
      {Array.from({ length: HARP_STRINGS }).map((_, i) => {
        const t = (i + 0.5) / HARP_STRINGS;
        const x = base[0] + (top[0] - base[0]) * t;
        const y0 = base[1] + (top[1] - base[1]) * t + 0.04;
        const y1 = neckY(x);
        if (y1 <= y0) return null;
        const color = i % 7 === 0 ? '#b91c1c' : i % 7 === 3 ? '#1d4ed8' : '#f5f5f4';
        return (
          <mesh key={i} position={[x, (y0 + y1) / 2, 0.02]}>
            <cylinderGeometry args={[0.0016, 0.0016, y1 - y0, 4]} />
            <Mat color={color} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Scène / sonorisation ───────────────────────────────────────────────────

function MicrophoneStand() {
  const chrome = '#d4d4d8';
  return (
    <group>
      <TripodStand height={1.02} spread={0.44} />
      {/* Perche inclinée et micro dynamique */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.022, 10, 8]} />
        <Mat color="#18181b" />
      </mesh>
      <group position={[0, 1.02, 0]} rotation={[0.95, 0, 0]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, 0.4, 8]} />
          <Mat color={chrome} metalness={0.85} roughness={0.2} finish="chrome" />
        </mesh>
        <group position={[0, 0.42, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.014, 0.12, 12]} />
            <Mat color="#18181b" roughness={0.35} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.085, 0]} castShadow>
            <sphereGeometry args={[0.03, 14, 12]} />
            <Mat color="#a1a1aa" finish="mesh" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Enceinte de sonorisation sur pied (type 12" + moteur à pavillon). */
function PaSpeaker({ accent }: { accent?: string }) {
  const body = accent ?? '#18181b';
  return (
    <group>
      <TripodStand height={1.28} spread={0.62} />
      <group position={[0, 1.62, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.62, 0.34]} />
          <Mat color={body} finish="plastic" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.172]}>
          <planeGeometry args={[0.34, 0.58]} />
          <Mat color="#27272a" finish="mesh" roughness={0.8} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.09, 0.174]}>
          <circleGeometry args={[0.14, 28]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.2, 0.174]}>
          <planeGeometry args={[0.2, 0.08]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[0.16, 0.03, 0.05]} />
          <Mat color="#27272a" />
        </mesh>
        <mesh position={[0.15, -0.27, 0.176]}>
          <circleGeometry args={[0.008, 10]} />
          <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function Saxophone() {
  const brass = '#c9a227';
  const bodyCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.92, 0.02),
      new THREE.Vector3(0.0, 0.84, 0),
      new THREE.Vector3(0.0, 0.62, 0),
      new THREE.Vector3(0.0, 0.34, 0),
      new THREE.Vector3(0.04, 0.2, 0),
      new THREE.Vector3(0.12, 0.18, 0),
      new THREE.Vector3(0.16, 0.3, 0),
    ]),
    [],
  );
  const tubeGeo = useDisposable(() => new THREE.TubeGeometry(bodyCurve, 60, 0.03, 12, false), 'sax-body');
  const bellGeo = useDisposable(() => {
    const pts = [new THREE.Vector2(0.03, 0), new THREE.Vector2(0.04, 0.05), new THREE.Vector2(0.065, 0.1), new THREE.Vector2(0.08, 0.12)];
    return new THREE.LatheGeometry(pts, 24);
  }, 'sax-bell');
  return (
    <group>
      <TripodStand height={0.28} spread={0.3} />
      <group position={[0, 0.02, 0]}>
        <mesh geometry={tubeGeo} castShadow>
          <Mat color={brass} metalness={0.85} roughness={0.2} finish="brass" />
        </mesh>
        <mesh geometry={bellGeo} position={[0.16, 0.3, 0]} castShadow>
          <Mat color={brass} metalness={0.85} roughness={0.2} finish="brass" />
        </mesh>
        {[0.4, 0.5, 0.6, 0.7, 0.8].map((y) => (
          <mesh key={y} position={[0, y, 0.032]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.006, 10]} />
            <Mat color="#f5e7b8" metalness={0.7} roughness={0.25} />
          </mesh>
        ))}
        <mesh position={[-0.04, 0.96, 0.02]} rotation={[0, 0, 0.9]} castShadow>
          <cylinderGeometry args={[0.009, 0.012, 0.08, 8]} />
          <Mat color="#18181b" />
        </mesh>
      </group>
    </group>
  );
}

/** Ancien pied simple, conservé pour la trompette. */
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

function InstrumentGlyph({
  style,
  selected = false,
}: {
  style: InstrumentStyle;
  selected?: boolean;
}) {
  const accent = selected ? '#c7d2fe' : undefined;
  const wood = accent ?? '#5c4030';
  const chrome = '#d4d4d8';
  const brass = '#c9a227';

  if (style === 'piano') return <GrandPiano accent={accent} />;
  if (style === 'upright') return <UprightPiano accent={accent} />;
  if (style === 'keyboard') return <StageKeyboard accent={accent} />;
  if (style === 'drums') return <DrumKit accent={accent} />;
  if (style === 'guitar' || style === 'bass' || style === 'violin' || style === 'cello' || style === 'doubleBass') {
    return <StringFamily style={style} accent={accent} />;
  }
  if (style === 'harp') return <ConcertHarp accent={accent} />;
  if (style === 'micStand') return <MicrophoneStand />;
  if (style === 'sax') return <Saxophone />;
  if (style === 'speaker') return <PaSpeaker accent={accent} />;

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

  if (style === 'conga') {
    return (
      <group>
        {([-0.18, 0.2] as const).map((x, i) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, i === 0 ? 0.38 : 0.32, 0]} castShadow>
              <cylinderGeometry args={[i === 0 ? 0.16 : 0.14, 0.13, i === 0 ? 0.72 : 0.6, 16]} />
              <Mat color="#9a4a24" finish="wood" roughness={0.38} clearcoat={0.7} repeat={[1, 3]} vertical />
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
          <Mat color={wood} finish="wood" roughness={0.55} clearcoat={0.5} />
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
          <Mat color="#292524" finish="leather" roughness={0.7} repeat={2} />
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
          <Mat color="#57534e" finish="fabric" roughness={0.9} repeat={2} />
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

  return <PaSpeaker accent={accent} />;
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
  // Un instrument garde sa taille réelle : l’emprise ne l’ajuste qu’à ±25 %.
  const fit = Math.min(w / native.w, d / native.d);
  const scale = Math.min(1.25, Math.max(0.75, fit));
  return (
    <group scale={[scale, scale, scale]}>
      <InstrumentGlyph style={style} selected={selected} />
    </group>
  );
}
