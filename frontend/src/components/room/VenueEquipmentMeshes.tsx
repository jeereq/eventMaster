'use client';

/**
 * Équipements de restauration, salon de beauté et abords (comptoirs, four à pizza,
 * cuisine, vitrine, poste coiffure, bac à shampoing, station condiments, canapé,
 * véhicule, parasol). Chaque modèle remplit l’empreinte w × d (mètres) du plan ;
 * la face « client » regarde +Z.
 */

import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import { loadTiledTexture } from '@/lib/roomWebGLMaterials';

export type VenueEquipmentKind =
  | 'orderCounter'
  | 'pickupCounter'
  | 'pizzaOven'
  | 'kitchenLine'
  | 'displayCase'
  | 'stylingStation'
  | 'washBasin'
  | 'condimentStation'
  | 'loungeSofa'
  | 'car'
  | 'parasol';

export const VENUE_EQUIPMENT_KINDS: VenueEquipmentKind[] = [
  'orderCounter', 'pickupCounter', 'pizzaOven', 'kitchenLine', 'displayCase',
  'stylingStation', 'washBasin', 'condimentStation', 'loungeSofa', 'car', 'parasol',
];

export function isVenueEquipmentKind(kind: string): kind is VenueEquipmentKind {
  return (VENUE_EQUIPMENT_KINDS as string[]).includes(kind);
}

/** Hauteur hors tout (m), utilisée pour placer l’étiquette au-dessus du modèle. */
export function venueEquipmentHeight(kind: VenueEquipmentKind): number {
  switch (kind) {
    case 'pizzaOven': return 2.1;
    case 'kitchenLine': return 2.2;
    case 'stylingStation': return 1.9;
    case 'car': return 1.45;
    case 'parasol': return 2.6;
    case 'displayCase': return 1.35;
    case 'loungeSofa': return 0.82;
    default: return 1.1;
  }
}

type Props = { w: number; d: number; color?: string; selected?: boolean };

const SEL = '#c7d2fe';
const STEEL = '#c9ccd1';
const STONE_TOP = '#e7e2d8';

function tint(color: string, selected?: boolean) {
  return selected ? SEL : color;
}

// ───────────────────────── comptoirs ─────────────────────────

function CounterBody({ w, d, color, selected, height = 1.05 }: Props & { height?: number }) {
  const slats = Math.max(4, Math.round(w / 0.12));
  return (
    <group>
      {/* caisson */}
      <mesh position={[0, height / 2 - 0.02, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[w, height - 0.04, d - 0.06]} />
        <SurfaceMat color={tint(color ?? '#3b2f28', selected)} finish="wood" roughness={0.55} />
      </mesh>
      {/* lames bois verticales côté client */}
      {Array.from({ length: slats }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / slats), (height - 0.12) / 2 + 0.06, d / 2 - 0.04]} castShadow>
          <boxGeometry args={[w / slats - 0.018, height - 0.16, 0.03]} />
          <SurfaceMat color={tint('#a47148', selected)} finish="wood" roughness={0.5} vertical />
        </mesh>
      ))}
      {/* plinthe noire en retrait */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[w - 0.04, 0.08, d - 0.1]} />
        <SurfaceMat color="#111111" finish="plain" roughness={0.8} />
      </mesh>
      {/* plateau pierre en débord */}
      <RoundedBox args={[w + 0.06, 0.05, d + 0.08]} radius={0.012} smoothness={3} position={[0, height, 0.02]} castShadow receiveShadow>
        <SurfaceMat color={STONE_TOP} finish="stone" roughness={0.3} />
      </RoundedBox>
    </group>
  );
}

function OrderCounter(props: Props) {
  const { w, d, selected } = props;
  return (
    <group>
      <CounterBody {...props} />
      {/* caisse tactile */}
      <group position={[-w * 0.25, 1.03, 0]}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 0.12, 12]} />
          <SurfaceMat color="#1f2937" finish="metal" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0.02]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.34, 0.24, 0.02]} />
          <SurfaceMat color="#111827" finish="plastic" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0.032]} rotation={[-0.35, 0, 0]}>
          <planeGeometry args={[0.3, 0.2]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.6} />
        </mesh>
      </group>
      {/* terminal de paiement */}
      <mesh position={[-w * 0.05, 1.06, d * 0.25]} rotation={[-0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 0.02, 0.16]} />
        <SurfaceMat color="#0f172a" finish="plastic" />
      </mesh>
      {/* menu lumineux suspendu */}
      {w > 1.2 && (
        <group position={[w * 0.15, 2.35, -d * 0.2]}>
          <mesh castShadow>
            <boxGeometry args={[Math.min(2.4, w * 0.6), 0.55, 0.05]} />
            <SurfaceMat color="#111111" finish="plain" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[Math.min(2.3, w * 0.58), 0.48]} />
            <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.35} />
          </mesh>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * Math.min(1.1, w * 0.28), 0.5, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.5, 6]} />
              <SurfaceMat color="#111" finish="metal" />
            </mesh>
          ))}
        </group>
      )}
      {/* présentoir de viennoiseries */}
      <mesh position={[w * 0.28, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.02, 20]} />
        <SurfaceMat color="#f8fafc" finish="ceramic" />
      </mesh>
      <mesh position={[w * 0.28, 1.2, 0]}>
        <sphereGeometry args={[0.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <SurfaceMat color="#e0f2fe" finish="glass" transparent opacity={0.3} />
      </mesh>
      {selected && null}
    </group>
  );
}

function PickupCounter(props: Props) {
  const { w, d } = props;
  const bags = Math.max(2, Math.min(6, Math.floor(w / 0.35)));
  return (
    <group>
      <CounterBody {...props} color={props.color ?? '#1e3a5f'} />
      {/* rampe chauffante */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[w * 0.9, 0.06, 0.22]} />
        <SurfaceMat color={STEEL} finish="chrome" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.465, 0]}>
        <boxGeometry args={[w * 0.86, 0.01, 0.18]} />
        <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={0.9} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * w * 0.44, 1.28, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.44, 8]} />
          <SurfaceMat color={STEEL} finish="chrome" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      {/* sacs kraft prêts à emporter */}
      {Array.from({ length: bags }).map((_, i) => (
        <group key={i} position={[-w * 0.4 + (i + 0.5) * ((w * 0.8) / bags), 1.03, d * 0.05]}>
          <mesh position={[0, 0.13, 0]} castShadow>
            <boxGeometry args={[0.2, 0.26, 0.12]} />
            <SurfaceMat color="#c8a472" finish="linen" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <torusGeometry args={[0.04, 0.006, 6, 12, Math.PI]} />
            <SurfaceMat color="#8b5e34" finish="plain" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CondimentStation(props: Props) {
  const { w, d } = props;
  return (
    <group>
      <CounterBody {...props} height={0.95} color={props.color ?? '#44403c'} />
      {/* fontaines à eau */}
      {([-0.28, 0] as const).map((x, i) => (
        <group key={i} position={[w * x, 0.97, -d * 0.1]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.36, 20]} />
            <SurfaceMat color="#e0f2fe" finish="glass" transparent opacity={0.35} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.24, 20]} />
            <meshStandardMaterial color={i === 0 ? '#bbf7d0' : '#fef9c3'} transparent opacity={0.55} />
          </mesh>
          <mesh position={[0, 0.02, 0.12]}>
            <boxGeometry args={[0.04, 0.03, 0.05]} />
            <SurfaceMat color={STEEL} finish="chrome" />
          </mesh>
        </group>
      ))}
      {/* piles de verres et flacons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[w * 0.18 + (i % 2) * 0.1, 1.02 + Math.floor(i / 2) * 0.1, d * 0.1]}>
          <cylinderGeometry args={[0.035, 0.03, 0.1, 12]} />
          <SurfaceMat color="#f8fafc" finish="glass" transparent opacity={0.45} />
        </mesh>
      ))}
      {['#b91c1c', '#ca8a04', '#15803d'].map((c, i) => (
        <mesh key={c} position={[w * 0.36, 1.05, -d * 0.2 + i * 0.1]} castShadow>
          <cylinderGeometry args={[0.025, 0.028, 0.16, 10]} />
          <SurfaceMat color={c} finish="plastic" roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────── cuisine ─────────────────────────

function PizzaOven({ w, d, selected }: Props) {
  const r = Math.min(w, d) * 0.46;
  const baseH = 0.95;
  const brick = tint('#9a3412', selected);
  const brickMap = useMemo(() => loadTiledTexture('/floors/gen/wall-brick.jpg', 5, 1.4), []);
  const brickNormal = useMemo(() => loadTiledTexture('/floors/gen/wall-brick-normal.jpg', 5, 1.4, true), []);
  return (
    <group>
      {/* socle maçonné */}
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[Math.min(w, r * 2.3), baseH, Math.min(d, r * 2.3)]} />
        <SurfaceMat color="#78716c" finish="stone" roughness={0.9} />
      </mesh>
      <mesh position={[0, baseH + 0.04, 0]} receiveShadow>
        <boxGeometry args={[Math.min(w, r * 2.4), 0.08, Math.min(d, r * 2.4)]} />
        <SurfaceMat color="#d6d3d1" finish="stone" roughness={0.6} />
      </mesh>
      {/* coupole en briques réfractaires, enduit chaux mat (pas de vernis brillant) */}
      <mesh position={[0, baseH + 0.08, 0]} scale={[1, 0.78, 1]} castShadow receiveShadow>
        <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <SurfaceMat color={selected ? brick : '#ffffff'} finish="plain" map={brickMap} normalMap={brickNormal} roughness={0.92} metalness={0} />
      </mesh>
      {/* voûte d’entrée */}
      <group position={[0, baseH + 0.08, r * 0.82]}>
        <mesh castShadow>
          <torusGeometry args={[r * 0.36, r * 0.1, 10, 20, Math.PI]} />
          <SurfaceMat color="#57534e" finish="stone" roughness={0.8} />
        </mesh>
        <mesh position={[0, r * 0.16, -0.02]}>
          <circleGeometry args={[r * 0.3, 20, 0, Math.PI]} />
          <meshStandardMaterial color="#1c0a02" />
        </mesh>
        {/* braises */}
        <mesh position={[0, r * 0.06, -0.08]}>
          <sphereGeometry args={[r * 0.14, 12, 8]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={2.2} />
        </mesh>
      </group>
      <pointLight position={[0, baseH + 0.25, r * 0.9]} color="#fb923c" intensity={1.2} distance={2.5} decay={2} />
      {/* conduit */}
      <mesh position={[0, baseH + r + 0.35, -r * 0.2]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.9, 16]} />
        <SurfaceMat color="#292524" finish="metal" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* pelle à pizza */}
      <mesh position={[r * 1.05, baseH + 0.3, r * 0.6]} rotation={[0, 0, 0.12]} castShadow>
        <boxGeometry args={[0.03, 1.3, 0.03]} />
        <SurfaceMat color="#a16207" finish="wood" />
      </mesh>
    </group>
  );
}

function KitchenLine({ w, d, selected }: Props) {
  const burners = Math.max(2, Math.min(8, Math.floor(w / 0.45)));
  const counterH = 0.9;
  return (
    <group>
      {/* meubles inox */}
      <RoundedBox args={[w, counterH, d * 0.9]} radius={0.015} smoothness={2} position={[0, counterH / 2, 0]} castShadow receiveShadow>
        <SurfaceMat color={tint(STEEL, selected)} finish="metal" metalness={0.8} roughness={0.32} />
      </RoundedBox>
      {/* portes et poignées */}
      {Array.from({ length: burners }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / burners), counterH * 0.45, d * 0.45 + 0.005]}>
          <boxGeometry args={[w / burners - 0.04, counterH * 0.7, 0.01]} />
          <SurfaceMat color="#aeb3ba" finish="metal" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, counterH * 0.84, d * 0.46]}>
        <boxGeometry args={[w * 0.96, 0.02, 0.02]} />
        <SurfaceMat color="#e5e7eb" finish="chrome" />
      </mesh>
      {/* feux vifs */}
      {Array.from({ length: burners }).map((_, i) => (
        <group key={i} position={[-w / 2 + (i + 0.5) * (w / burners), counterH + 0.01, 0]}>
          <mesh>
            <boxGeometry args={[Math.min(0.4, w / burners - 0.05), 0.02, Math.min(0.4, d * 0.6)]} />
            <SurfaceMat color="#111111" finish="metal" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.08, 18]} />
            <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={i % 2 === 0 ? 1.4 : 0} side={THREE.DoubleSide} />
          </mesh>
          {i % 3 === 1 && (
            <mesh position={[0, 0.08, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.12, 0.14, 20]} />
              <SurfaceMat color="#d1d5db" finish="chrome" />
            </mesh>
          )}
        </group>
      ))}
      {/* hotte d’extraction */}
      <mesh position={[0, 2.05, -d * 0.1]} castShadow>
        <boxGeometry args={[w * 1.02, 0.4, d * 0.95]} />
        <SurfaceMat color={STEEL} finish="metal" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.84, -d * 0.1]}>
        <boxGeometry args={[w * 0.96, 0.02, d * 0.88]} />
        <SurfaceMat color="#6b7280" finish="metal" roughness={0.5} />
      </mesh>
      {/* étagère passe-plat */}
      <mesh position={[0, 1.45, -d * 0.38]} castShadow>
        <boxGeometry args={[w * 0.96, 0.03, 0.28]} />
        <SurfaceMat color={STEEL} finish="metal" />
      </mesh>
    </group>
  );
}

function DisplayCase({ w, d, selected }: Props) {
  const baseH = 0.85;
  const treats = ['#f59e0b', '#fbcfe8', '#92400e', '#fde68a', '#f472b6', '#a16207'];
  const per = Math.max(3, Math.floor(w / 0.22));
  return (
    <group>
      <RoundedBox args={[w, baseH, d]} radius={0.02} smoothness={2} position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <SurfaceMat color={tint('#f5f5f4', selected)} finish="lacquer" roughness={0.25} />
      </RoundedBox>
      <mesh position={[0, 0.06, d / 2 + 0.002]}>
        <boxGeometry args={[w, 0.12, 0.004]} />
        <SurfaceMat color="#b08d57" finish="brass" />
      </mesh>
      {/* vitrine bombée */}
      <mesh position={[0, baseH, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, d / 0.9]}>
        <cylinderGeometry args={[0.45, 0.45, w * 0.98, 24, 1, true, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#f0f9ff" transparent opacity={0.22} roughness={0.05} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* étagères + pâtisseries */}
      {[0, 1].map((level) => (
        <group key={level} position={[0, baseH + 0.04 + level * 0.18, -d * 0.1 * level]}>
          <mesh>
            <boxGeometry args={[w * 0.94, 0.012, d * 0.55]} />
            <SurfaceMat color="#e2e8f0" finish="glass" transparent opacity={0.5} />
          </mesh>
          {Array.from({ length: per }).map((_, i) => (
            <mesh key={i} position={[-w * 0.44 + (i + 0.5) * ((w * 0.88) / per), 0.035, 0]} castShadow>
              {i % 2 === 0 ? <cylinderGeometry args={[0.05, 0.055, 0.06, 14]} /> : <sphereGeometry args={[0.045, 12, 8]} />}
              <SurfaceMat color={treats[(i + level) % treats.length]} finish="plain" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, baseH + 0.44, -d * 0.35]}>
        <boxGeometry args={[w * 0.95, 0.02, 0.04]} />
        <meshStandardMaterial color="#fffbeb" emissive="#fef3c7" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

// ───────────────────────── beauté ─────────────────────────

function SalonChair({ z = 0, rotationY = Math.PI, reclined = false }: { z?: number; rotationY?: number; reclined?: boolean }) {
  return (
    <group position={[0, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.28, 0.3, 0.03, 24]} />
        <SurfaceMat color="#d1d5db" finish="chrome" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.42, 14]} />
        <SurfaceMat color="#d1d5db" finish="chrome" />
      </mesh>
      <RoundedBox args={[0.56, 0.12, 0.52]} radius={0.05} smoothness={3} position={[0, 0.5, 0]} castShadow>
        <SurfaceMat color="#1f2937" finish="leather" roughness={0.45} />
      </RoundedBox>
      <RoundedBox
        args={[0.54, 0.62, 0.1]}
        radius={0.05}
        smoothness={3}
        position={[0, reclined ? 0.72 : 0.85, reclined ? -0.38 : -0.24]}
        rotation={[reclined ? -0.75 : -0.12, 0, 0]}
        castShadow
      >
        <SurfaceMat color="#1f2937" finish="leather" roughness={0.45} />
      </RoundedBox>
      {([-1, 1] as const).map((s) => (
        <RoundedBox key={s} args={[0.07, 0.07, 0.44]} radius={0.03} smoothness={2} position={[s * 0.3, 0.68, 0]} castShadow>
          <SurfaceMat color="#111827" finish="leather" />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.2, 0.34]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.36, 0.03, 0.18]} />
        <SurfaceMat color="#9ca3af" finish="chrome" />
      </mesh>
    </group>
  );
}

function StylingStation({ w, d, selected }: Props) {
  const mirrorW = Math.min(1.1, w * 0.8);
  return (
    <group>
      {/* console */}
      <mesh position={[0, 0.82, -d / 2 + 0.2]} castShadow receiveShadow>
        <boxGeometry args={[Math.min(1.2, w * 0.9), 0.06, 0.36]} />
        <SurfaceMat color={tint('#f5f5f4', selected)} finish="stone" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.66, -d / 2 + 0.18]}>
        <boxGeometry args={[Math.min(1.1, w * 0.85), 0.26, 0.3]} />
        <SurfaceMat color="#44403c" finish="wood" />
      </mesh>
      {/* miroir cerclé laiton + éclairage */}
      <mesh position={[0, 1.45, -d / 2 + 0.03]} castShadow>
        <boxGeometry args={[mirrorW + 0.06, 1.2, 0.03]} />
        <SurfaceMat color="#b08d57" finish="brass" />
      </mesh>
      <mesh position={[0, 1.45, -d / 2 + 0.048]}>
        <planeGeometry args={[mirrorW, 1.14]} />
        <meshStandardMaterial color="#dbe4ea" metalness={1} roughness={0.04} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * (mirrorW / 2 + 0.07), 1.45, -d / 2 + 0.06]}>
          <boxGeometry args={[0.04, 1.0, 0.04]} />
          <meshStandardMaterial color="#fffbeb" emissive="#fef3c7" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {/* sèche-cheveux et flacons */}
      <mesh position={[-mirrorW * 0.35, 0.9, -d / 2 + 0.22]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.2, 12]} />
        <SurfaceMat color="#111827" finish="plastic" />
      </mesh>
      {['#e11d48', '#0ea5e9', '#f59e0b'].map((c, i) => (
        <mesh key={c} position={[mirrorW * 0.2 + i * 0.07, 0.92, -d / 2 + 0.22]} castShadow>
          <cylinderGeometry args={[0.022, 0.025, 0.14, 10]} />
          <SurfaceMat color={c} finish="plastic" roughness={0.25} />
        </mesh>
      ))}
      <SalonChair z={Math.min(d / 2 - 0.35, 0.35)} rotationY={Math.PI} />
    </group>
  );
}

function WashBasin({ w, d, selected }: Props) {
  return (
    <group>
      {/* colonne + vasque céramique */}
      <mesh position={[0, 0.42, -d / 2 + 0.25]} castShadow>
        <boxGeometry args={[Math.min(0.6, w * 0.8), 0.84, 0.36]} />
        <SurfaceMat color={tint('#111827', selected)} finish="lacquer" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.9, -d / 2 + 0.25]} castShadow>
        <sphereGeometry args={[0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <SurfaceMat color="#111827" finish="ceramic" roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.9, -d / 2 + 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.24, 24]} />
        <SurfaceMat color="#f8fafc" finish="ceramic" roughness={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* robinetterie + douchette */}
      <mesh position={[0, 1.05, -d / 2 + 0.05]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 10]} />
        <SurfaceMat color="#e5e7eb" finish="chrome" />
      </mesh>
      <mesh position={[0, 1.18, -d / 2 + 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 10]} />
        <SurfaceMat color="#e5e7eb" finish="chrome" />
      </mesh>
      <SalonChair z={Math.min(d / 2 - 0.4, 0.3)} rotationY={0} reclined />
    </group>
  );
}

// ───────────────────────── salon & abords ─────────────────────────

function LoungeSofa({ w, d, color, selected }: Props) {
  const fabric = tint(color ?? '#475569', selected);
  const arm = Math.min(0.2, w * 0.1);
  const seats = Math.max(1, Math.min(4, Math.round((w - arm * 2) / 0.62)));
  const seatW = (w - arm * 2) / seats;
  const depth = Math.min(d, 0.95);
  return (
    <group>
      {/* pieds laiton */}
      {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.08), 0.06, sz * (depth / 2 - 0.08)]}>
          <cylinderGeometry args={[0.018, 0.012, 0.12, 8]} />
          <SurfaceMat color="#b08d57" finish="brass" />
        </mesh>
      )))}
      <RoundedBox args={[w, 0.22, depth]} radius={0.05} smoothness={3} position={[0, 0.23, 0]} castShadow receiveShadow>
        <SurfaceMat color={fabric} finish="velvet" />
      </RoundedBox>
      {/* coussins d’assise */}
      {Array.from({ length: seats }).map((_, i) => (
        <RoundedBox
          key={`s${i}`}
          args={[seatW - 0.02, 0.14, depth - 0.22]}
          radius={0.06}
          smoothness={3}
          position={[-w / 2 + arm + (i + 0.5) * seatW, 0.41, 0.08]}
          castShadow
        >
          <SurfaceMat color={fabric} finish="velvet" />
        </RoundedBox>
      ))}
      {/* dossier */}
      <RoundedBox args={[w, 0.46, 0.18]} radius={0.07} smoothness={3} position={[0, 0.58, -depth / 2 + 0.09]} castShadow>
        <SurfaceMat color={fabric} finish="velvet" />
      </RoundedBox>
      {Array.from({ length: seats }).map((_, i) => (
        <RoundedBox
          key={`b${i}`}
          args={[seatW - 0.04, 0.36, 0.14]}
          radius={0.06}
          smoothness={3}
          position={[-w / 2 + arm + (i + 0.5) * seatW, 0.62, -depth / 2 + 0.22]}
          rotation={[-0.14, 0, 0]}
          castShadow
        >
          <SurfaceMat color={fabric} finish="velvet" />
        </RoundedBox>
      ))}
      {/* accoudoirs */}
      {([-1, 1] as const).map((s) => (
        <RoundedBox key={s} args={[arm, 0.3, depth]} radius={0.06} smoothness={3} position={[s * (w / 2 - arm / 2), 0.48, 0]} castShadow>
          <SurfaceMat color={fabric} finish="velvet" />
        </RoundedBox>
      ))}
      {/* coussin déco */}
      <RoundedBox args={[0.36, 0.34, 0.1]} radius={0.05} smoothness={3} position={[-w / 2 + arm + 0.25, 0.62, -depth / 2 + 0.32]} rotation={[-0.2, 0.3, 0.1]} castShadow>
        <SurfaceMat color="#d4a373" finish="linen" />
      </RoundedBox>
    </group>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.33, 0.33, 0.22, 24]} />
        <SurfaceMat color="#111111" finish="plain" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.112, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.01, 18]} />
        <SurfaceMat color="#cbd5e1" finish="chrome" />
      </mesh>
      <mesh position={[0, -0.112, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.01, 18]} />
        <SurfaceMat color="#cbd5e1" finish="chrome" />
      </mesh>
    </group>
  );
}

function Car({ w, d, color, selected }: Props) {
  // Le véhicule est modélisé le long de Z, puis tourné si l’empreinte est plus large que profonde.
  const alongX = w > d;
  const length = Math.min(Math.max(w, d), 5);
  const width = Math.min(Math.min(w, d), 1.9);
  const paint = tint(color && color !== '#78716c' ? color : '#1e3a8a', selected);
  return (
    <group rotation={[0, alongX ? Math.PI / 2 : 0, 0]}>
      {/* caisse */}
      <RoundedBox args={[width, 0.62, length]} radius={0.16} smoothness={4} position={[0, 0.58, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color={paint} metalness={0.6} roughness={0.25} clearcoat={1} clearcoatRoughness={0.06} />
      </RoundedBox>
      {/* habitacle vitré */}
      <RoundedBox args={[width * 0.86, 0.48, length * 0.5]} radius={0.14} smoothness={4} position={[0, 1.08, -length * 0.04]} castShadow>
        <meshPhysicalMaterial color="#0f172a" metalness={0.2} roughness={0.08} transparent opacity={0.85} clearcoat={1} />
      </RoundedBox>
      <RoundedBox args={[width * 0.88, 0.05, length * 0.44]} radius={0.02} smoothness={2} position={[0, 1.33, -length * 0.05]}>
        <meshPhysicalMaterial color={paint} metalness={0.6} roughness={0.25} clearcoat={1} />
      </RoundedBox>
      {/* phares et feux */}
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh position={[s * width * 0.34, 0.66, length / 2 - 0.02]}>
            <boxGeometry args={[0.32, 0.08, 0.04]} />
            <meshStandardMaterial color="#f8fafc" emissive="#e0f2fe" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[s * width * 0.34, 0.7, -length / 2 + 0.02]}>
            <boxGeometry args={[0.32, 0.08, 0.04]} />
            <meshStandardMaterial color="#b91c1c" emissive="#dc2626" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.46, length / 2 - 0.01]}>
        <boxGeometry args={[width * 0.5, 0.14, 0.03]} />
        <SurfaceMat color="#111827" finish="plastic" />
      </mesh>
      {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
        <Wheel key={`${sx}${sz}`} position={[sx * (width / 2 - 0.08), 0.33, sz * length * 0.32]} />
      )))}
    </group>
  );
}

function Parasol({ w, d, color, selected }: Props) {
  const r = Math.min(w, d) / 2;
  const cloth = tint(color && color !== '#78716c' ? color : '#f5f0e6', selected);
  const ribs = 8;
  return (
    <group>
      {/* pied lesté */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.1, 24]} />
        <SurfaceMat color="#44403c" finish="stone" />
      </mesh>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 2.5, 12]} />
        <SurfaceMat color="#a16207" finish="wood" />
      </mesh>
      {/* toile octogonale */}
      <mesh position={[0, 2.35, 0]} castShadow receiveShadow>
        <coneGeometry args={[r, 0.5, ribs, 1, true]} />
        <SurfaceMat color={cloth} finish="linen" side={THREE.DoubleSide} />
      </mesh>
      {/* lambrequin */}
      <mesh position={[0, 2.06, 0]} castShadow>
        <cylinderGeometry args={[r, r, 0.1, ribs, 1, true]} />
        <SurfaceMat color={cloth} finish="linen" side={THREE.DoubleSide} />
      </mesh>
      {/* baleines */}
      {Array.from({ length: ribs }).map((_, i) => {
        const a = (i / ribs) * Math.PI * 2 + Math.PI / ribs;
        return (
          <mesh key={i} position={[Math.cos(a) * r * 0.5, 2.33, Math.sin(a) * r * 0.5]} rotation={[0, -a, Math.atan2(0.5, r)]}>
            <boxGeometry args={[r * 1.02, 0.015, 0.015]} />
            <SurfaceMat color="#78350f" finish="wood" />
          </mesh>
        );
      })}
      <mesh position={[0, 2.62, 0]}>
        <sphereGeometry args={[0.05, 12, 8]} />
        <SurfaceMat color="#78350f" finish="wood" />
      </mesh>
    </group>
  );
}

/**
 * Profondeur / diamètre maximum réalistes (m) : une emprise dessinée trop grande
 * n’étire pas un comptoir en dalle de 4 m, le meuble garde ses proportions.
 */
const MAX_DEPTH_M: Partial<Record<VenueEquipmentKind, number>> = {
  orderCounter: 0.9,
  pickupCounter: 0.9,
  condimentStation: 0.75,
  kitchenLine: 1.1,
  displayCase: 0.95,
};
const MAX_SIZE_M: Partial<Record<VenueEquipmentKind, number>> = {
  pizzaOven: 2.2,
  stylingStation: 1.6,
  washBasin: 1.8,
  parasol: 3.6,
};

export function VenueEquipmentMesh({ kind, ...raw }: Props & { kind: VenueEquipmentKind }) {
  const maxD = MAX_DEPTH_M[kind];
  const maxSize = MAX_SIZE_M[kind];
  const props: Props = {
    ...raw,
    w: maxSize ? Math.min(raw.w, maxSize) : raw.w,
    d: Math.min(raw.d, maxD ?? maxSize ?? raw.d),
  };
  switch (kind) {
    case 'orderCounter': return <OrderCounter {...props} />;
    case 'pickupCounter': return <PickupCounter {...props} />;
    case 'pizzaOven': return <PizzaOven {...props} />;
    case 'kitchenLine': return <KitchenLine {...props} />;
    case 'displayCase': return <DisplayCase {...props} />;
    case 'stylingStation': return <StylingStation {...props} />;
    case 'washBasin': return <WashBasin {...props} />;
    case 'condimentStation': return <CondimentStation {...props} />;
    case 'loungeSofa': return <LoungeSofa {...props} />;
    case 'car': return <Car {...props} />;
    case 'parasol': return <Parasol {...props} />;
    default: return null;
  }
}
