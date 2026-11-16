'use client';

/**
 * Mobilier résidentiel 3D (lit, dressing, mur TV, cuisine, salle de bain…),
 * dans l’esprit « maquette bois clair » d’une visite d’appartement témoin.
 * Chaque modèle remplit l’empreinte w × d (mètres) du plan ; la face
 * « usage » (pied du lit, façade, assise) regarde +Z.
 */

import { RoundedBox } from '@react-three/drei';
import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import type { HomeFurnitureStyle, HomeMetalFinish } from '@/lib/roomHomeFurniture';
import {
  BuiltInBathtub,
  ClawfootBathtub,
  IslandBathtub,
  MetalMat,
  Toilet,
  TowelRail,
  VesselSink,
  WalkInShower,
} from '@/components/room/BathroomMeshes';

type Props = { w: number; d: number; color?: string; selected?: boolean; metalFinish?: HomeMetalFinish };

const SEL = '#c7d2fe';
const OAK = '#d8b98c';
const OAK_DARK = '#b98d5c';
const LINEN = '#f3eee4';
const BOUCLE = '#e8dcc6';
const STONE = '#ece7dd';
const BRASS = '#b08d57';

function tint(color: string, selected?: boolean) {
  return selected ? SEL : color;
}

function Wood({ color, selected }: { color: string; selected?: boolean }) {
  return <SurfaceMat color={tint(color, selected)} finish="wood" roughness={0.62} />;
}

function Lamp({ position, height = 0.42 }: { position: [number, number, number]; height?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, height * 0.35, 0]}>
        <cylinderGeometry args={[0.012, 0.02, height * 0.7, 10]} />
        <SurfaceMat color={BRASS} finish="brass" />
      </mesh>
      <mesh position={[0, height * 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 0.16, 18, 1, true]} />
        <meshStandardMaterial color="#fff7e6" emissive="#ffd9a0" emissiveIntensity={0.55} side={2} />
      </mesh>
    </group>
  );
}

function Bed({ w, d, color, selected }: Props) {
  const frame = tint(color ?? OAK, selected);
  const mattressH = 0.24;
  const baseH = 0.3;
  const headH = 1.05;
  return (
    <group>
      {/* sommier bois */}
      <RoundedBox args={[w, baseH, d - 0.08]} radius={0.03} smoothness={2} position={[0, baseH / 2, 0.04]} castShadow receiveShadow>
        <SurfaceMat color={frame} finish="wood" roughness={0.62} />
      </RoundedBox>
      {/* tête de lit capitonnée */}
      <RoundedBox args={[w + 0.06, headH, 0.1]} radius={0.04} smoothness={3} position={[0, headH / 2, -d / 2 + 0.05]} castShadow>
        <SurfaceMat color={tint(BOUCLE, selected)} finish="linen" />
      </RoundedBox>
      {/* matelas + drap */}
      <RoundedBox args={[w - 0.08, mattressH, d - 0.22]} radius={0.06} smoothness={3} position={[0, baseH + mattressH / 2, 0.06]} castShadow>
        <SurfaceMat color={LINEN} finish="linen" />
      </RoundedBox>
      {/* couette repliée au pied */}
      <RoundedBox args={[w - 0.04, 0.08, (d - 0.22) * 0.55]} radius={0.04} smoothness={3} position={[0, baseH + mattressH + 0.04, 0.06 + (d - 0.22) * 0.2]} castShadow>
        <SurfaceMat color={tint('#d9c7a7', selected)} finish="linen" />
      </RoundedBox>
      {/* plaid */}
      <RoundedBox args={[w + 0.02, 0.05, 0.42]} radius={0.02} smoothness={2} position={[0, baseH + mattressH + 0.1, d / 2 - 0.42]} castShadow>
        <SurfaceMat color="#a98b63" finish="linen" />
      </RoundedBox>
      {/* oreillers */}
      {([-1, 1] as const).map((s) => (
        <RoundedBox key={s} args={[w * 0.4, 0.14, 0.42]} radius={0.06} smoothness={3} position={[s * w * 0.23, baseH + mattressH + 0.07, -d / 2 + 0.38]} rotation={[-0.2, 0, 0]} castShadow>
          <SurfaceMat color="#fbf8f2" finish="linen" />
        </RoundedBox>
      ))}
    </group>
  );
}

function Nightstand({ w, d, color, selected }: Props) {
  const h = 0.52;
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.02} smoothness={2} position={[0, h / 2, 0]} castShadow receiveShadow>
        <Wood color={color ?? OAK_DARK} selected={selected} />
      </RoundedBox>
      <mesh position={[0, h * 0.55, d / 2 + 0.002]}>
        <boxGeometry args={[w * 0.6, 0.012, 0.01]} />
        <SurfaceMat color={BRASS} finish="brass" />
      </mesh>
      <Lamp position={[0, h, 0]} height={0.4} />
    </group>
  );
}

function Wardrobe({ w, d, color, selected }: Props) {
  const h = 2.25;
  const wood = color ?? OAK;
  const bays = Math.max(1, Math.round(w / 0.8));
  const bayW = w / bays;
  const clothes = ['#f5f0e6', '#c8b08a', '#8a7055', '#e4d6bf', '#6b5b4a', '#d9c3a0'];
  return (
    <group>
      {/* caisson ouvert : fond, côtés, dessus, socle */}
      <mesh position={[0, h / 2, -d / 2 + 0.01]} receiveShadow>
        <boxGeometry args={[w, h, 0.02]} />
        <Wood color={wood} selected={selected} />
      </mesh>
      {Array.from({ length: bays + 1 }).map((_, i) => (
        <mesh key={`side${i}`} position={[-w / 2 + i * bayW, h / 2, 0]} castShadow>
          <boxGeometry args={[0.025, h, d]} />
          <Wood color={wood} selected={selected} />
        </mesh>
      ))}
      <mesh position={[0, h - 0.015, 0]} castShadow>
        <boxGeometry args={[w, 0.03, d]} />
        <Wood color={wood} selected={selected} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <Wood color={OAK_DARK} selected={selected} />
      </mesh>
      {/* étagère haute + tringle + vêtements */}
      {Array.from({ length: bays }).map((_, b) => {
        const cx = -w / 2 + (b + 0.5) * bayW;
        const hangers = Math.max(3, Math.round((bayW - 0.1) / 0.09));
        return (
          <group key={`bay${b}`}>
            <mesh position={[cx, h - 0.35, 0]}>
              <boxGeometry args={[bayW - 0.03, 0.025, d - 0.04]} />
              <Wood color={wood} selected={selected} />
            </mesh>
            <mesh position={[cx, h - 0.48, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, bayW - 0.05, 8]} />
              <SurfaceMat color={BRASS} finish="brass" />
            </mesh>
            {b % 2 === 0
              ? Array.from({ length: hangers }).map((__, k) => {
                  const len = 0.75 + ((k * 37 + b * 11) % 5) * 0.12;
                  return (
                    <mesh key={k} position={[cx - (bayW - 0.12) / 2 + (k + 0.5) * ((bayW - 0.12) / hangers), h - 0.5 - len / 2, 0]} castShadow>
                      <boxGeometry args={[0.035, len, d * 0.62]} />
                      <SurfaceMat color={clothes[(k + b) % clothes.length]} finish="linen" />
                    </mesh>
                  );
                })
              : [0.45, 0.85, 1.25].map((y, k) => (
                  <group key={k}>
                    <mesh position={[cx, y, 0]}>
                      <boxGeometry args={[bayW - 0.03, 0.025, d - 0.04]} />
                      <Wood color={wood} selected={selected} />
                    </mesh>
                    <mesh position={[cx, y + 0.08, 0.02]} castShadow>
                      <boxGeometry args={[bayW * 0.6, 0.14, d * 0.6]} />
                      <SurfaceMat color={clothes[(k * 2 + b) % clothes.length]} finish="linen" />
                    </mesh>
                  </group>
                ))}
          </group>
        );
      })}
    </group>
  );
}

function Desk({ w, d, color, selected }: Props) {
  const h = 0.75;
  return (
    <group>
      <RoundedBox args={[w, 0.04, d]} radius={0.015} smoothness={2} position={[0, h, 0]} castShadow receiveShadow>
        <Wood color={color ?? OAK} selected={selected} />
      </RoundedBox>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.04), h / 2, 0]} castShadow>
          <boxGeometry args={[0.04, h, d * 0.9]} />
          <Wood color={color ?? OAK} selected={selected} />
        </mesh>
      ))}
      <Lamp position={[w / 2 - 0.2, h + 0.02, -d / 2 + 0.15]} height={0.45} />
      {/* chaise */}
      <group position={[0, 0, d / 2 + 0.15]}>
        <RoundedBox args={[0.46, 0.06, 0.44]} radius={0.02} smoothness={2} position={[0, 0.46, 0]} castShadow>
          <SurfaceMat color={BOUCLE} finish="linen" />
        </RoundedBox>
        <RoundedBox args={[0.46, 0.42, 0.05]} radius={0.02} smoothness={2} position={[0, 0.7, 0.2]} castShadow>
          <Wood color={OAK_DARK} />
        </RoundedBox>
        {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.2, 0.22, sz * 0.18]}>
            <cylinderGeometry args={[0.015, 0.015, 0.44, 8]} />
            <Wood color={OAK_DARK} />
          </mesh>
        )))}
      </group>
    </group>
  );
}

function TvUnit({ w, d, color, selected }: Props) {
  const lowH = 0.45;
  const screenW = Math.min(w * 0.72, 1.9);
  const screenH = screenW * 0.5625;
  return (
    <group>
      {/* panneau bois mural */}
      <mesh position={[0, 1.2, -d / 2 + 0.02]} receiveShadow>
        <boxGeometry args={[w, 2.4, 0.04]} />
        <Wood color={color ?? OAK} selected={selected} />
      </mesh>
      {/* tasseaux verticaux */}
      {Array.from({ length: Math.max(4, Math.round(w / 0.12)) }).map((_, i, arr) => (
        <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / arr.length), 1.2, -d / 2 + 0.05]}>
          <boxGeometry args={[0.03, 2.4, 0.025]} />
          <Wood color={OAK_DARK} selected={selected} />
        </mesh>
      ))}
      {/* meuble bas */}
      <RoundedBox args={[w * 0.92, lowH, d - 0.06]} radius={0.02} smoothness={2} position={[0, lowH / 2 + 0.06, 0.03]} castShadow receiveShadow>
        <Wood color={color ?? OAK} selected={selected} />
      </RoundedBox>
      {/* écran */}
      <mesh position={[0, lowH + 0.25 + screenH / 2, -d / 2 + 0.09]} castShadow>
        <boxGeometry args={[screenW, screenH, 0.04]} />
        <meshStandardMaterial color="#0b0f14" roughness={0.25} metalness={0.4} />
      </mesh>
      <mesh position={[0, lowH + 0.25 + screenH / 2, -d / 2 + 0.112]}>
        <planeGeometry args={[screenW * 0.96, screenH * 0.92]} />
        <meshStandardMaterial color="#1e293b" emissive="#334155" emissiveIntensity={0.35} roughness={0.2} />
      </mesh>
      {/* déco : vase + livres */}
      <mesh position={[w * 0.32, lowH + 0.2, 0.02]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.26, 14]} />
        <SurfaceMat color="#efe6d6" finish="ceramic" />
      </mesh>
      <mesh position={[-w * 0.3, lowH + 0.1, 0.02]} castShadow>
        <boxGeometry args={[0.28, 0.08, 0.2]} />
        <SurfaceMat color="#8a7055" finish="linen" />
      </mesh>
    </group>
  );
}

function Armchair({ w, d, color, selected }: Props) {
  const fabric = tint(color ?? BOUCLE, selected);
  return (
    <group>
      <RoundedBox args={[w, 0.4, d]} radius={0.12} smoothness={4} position={[0, 0.2, 0]} castShadow receiveShadow>
        <SurfaceMat color={fabric} finish="linen" />
      </RoundedBox>
      <RoundedBox args={[w, 0.42, 0.2]} radius={0.1} smoothness={4} position={[0, 0.56, -d / 2 + 0.1]} castShadow>
        <SurfaceMat color={fabric} finish="linen" />
      </RoundedBox>
      {([-1, 1] as const).map((s) => (
        <RoundedBox key={s} args={[0.16, 0.3, d * 0.85]} radius={0.07} smoothness={3} position={[s * (w / 2 - 0.08), 0.5, 0.02]} castShadow>
          <SurfaceMat color={fabric} finish="linen" />
        </RoundedBox>
      ))}
      <RoundedBox args={[w - 0.34, 0.12, d - 0.28]} radius={0.05} smoothness={3} position={[0, 0.46, 0.08]} castShadow>
        <SurfaceMat color={fabric} finish="linen" />
      </RoundedBox>
    </group>
  );
}

function CoffeeTable({ w, d, color, selected }: Props) {
  const r = Math.min(w, d) / 2;
  return (
    <group>
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 0.04, 40]} />
        <Wood color={color ?? OAK} selected={selected} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[r * 0.55, r * 0.6, 0.36, 32]} />
        <Wood color={OAK_DARK} selected={selected} />
      </mesh>
      <mesh position={[r * 0.3, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.05, 0.1, 16]} />
        <SurfaceMat color="#efe6d6" finish="ceramic" />
      </mesh>
      <mesh position={[-r * 0.25, 0.42, r * 0.15]} castShadow>
        <boxGeometry args={[0.26, 0.04, 0.2]} />
        <SurfaceMat color="#a98b63" finish="linen" />
      </mesh>
    </group>
  );
}

function Rug({ w, d, color, selected }: Props) {
  return (
    <group>
      {/* 3 cm d’épaisseur : le tapis reste visible quand il est posé sur une zone (parquet, marbre…). */}
      <RoundedBox args={[w, 0.03, d]} radius={0.01} smoothness={2} position={[0, 0.015, 0]} receiveShadow>
        <SurfaceMat color={tint(color ?? '#e9e0cf', selected)} finish="linen" />
      </RoundedBox>
      <mesh position={[0, 0.031, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(w, d) * 0.32, Math.min(w, d) * 0.34, 48]} />
        <meshStandardMaterial color="#cdbb9a" roughness={1} />
      </mesh>
    </group>
  );
}

function KitchenIsland({ w, d, color, selected }: Props) {
  const h = 0.9;
  const stools = Math.max(2, Math.min(4, Math.floor(w / 0.6)));
  return (
    <group>
      <RoundedBox args={[w - 0.06, h - 0.04, d - 0.2]} radius={0.02} smoothness={2} position={[0, (h - 0.04) / 2, -0.1]} castShadow receiveShadow>
        <Wood color={color ?? OAK} selected={selected} />
      </RoundedBox>
      {/* plan de travail pierre avec débord côté tabourets */}
      <RoundedBox args={[w, 0.05, d]} radius={0.015} smoothness={2} position={[0, h, 0]} castShadow receiveShadow>
        <SurfaceMat color={tint(STONE, selected)} finish="stone" roughness={0.3} />
      </RoundedBox>
      {/* évier + mitigeur */}
      <mesh position={[-w * 0.22, h + 0.027, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.36]} />
        <SurfaceMat color="#9ca3af" finish="metal" />
      </mesh>
      <mesh position={[-w * 0.22, h + 0.18, -0.32]}>
        <cylinderGeometry args={[0.012, 0.012, 0.32, 8]} />
        <SurfaceMat color="#d6d3d1" finish="chrome" />
      </mesh>
      {/* coupe de fruits */}
      <mesh position={[w * 0.2, h + 0.06, -0.05]} castShadow>
        <sphereGeometry args={[0.13, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <SurfaceMat color="#efe6d6" finish="ceramic" />
      </mesh>
      {/* tabourets */}
      {Array.from({ length: stools }).map((_, i) => (
        <group key={i} position={[-w / 2 + (i + 0.5) * (w / stools), 0, d / 2 + 0.25]}>
          <mesh position={[0, 0.66, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.05, 20]} />
            <SurfaceMat color={BOUCLE} finish="linen" />
          </mesh>
          <mesh position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.66, 8]} />
            <Wood color={OAK_DARK} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.02, 18]} />
            <Wood color={OAK_DARK} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function KitchenRun({ w, d, color, selected }: Props) {
  const lowH = 0.88;
  const wood = color ?? OAK;
  const doors = Math.max(2, Math.round(w / 0.6));
  return (
    <group>
      {/* meubles bas */}
      <mesh position={[0, lowH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, lowH, d]} />
        <Wood color={wood} selected={selected} />
      </mesh>
      {Array.from({ length: doors - 1 }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 1) * (w / doors), lowH / 2, d / 2 + 0.002]}>
          <boxGeometry args={[0.006, lowH - 0.1, 0.004]} />
          <meshStandardMaterial color="#8a6a45" />
        </mesh>
      ))}
      <mesh position={[0, lowH + 0.02, 0.01]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.02, 0.04, d + 0.02]} />
        <SurfaceMat color={tint(STONE, selected)} finish="stone" roughness={0.3} />
      </mesh>
      {/* plaque de cuisson */}
      <mesh position={[w * 0.22, lowH + 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.5]} />
        <meshStandardMaterial color="#111827" roughness={0.15} metalness={0.3} />
      </mesh>
      {/* évier */}
      <mesh position={[-w * 0.2, lowH + 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.55, 0.4]} />
        <SurfaceMat color="#9ca3af" finish="metal" />
      </mesh>
      {/* crédence + meubles hauts */}
      <mesh position={[0, lowH + 0.35, -d / 2 + 0.01]}>
        <boxGeometry args={[w, 0.62, 0.02]} />
        <SurfaceMat color={STONE} finish="stone" roughness={0.35} />
      </mesh>
      <mesh position={[0, lowH + 0.66 + 0.33, -d / 2 + 0.18]} castShadow>
        <boxGeometry args={[w, 0.66, 0.35]} />
        <Wood color={wood} selected={selected} />
      </mesh>
      {/* four encastré */}
      <mesh position={[w * 0.22, lowH * 0.5, d / 2 + 0.003]}>
        <planeGeometry args={[0.56, 0.5]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.4} />
      </mesh>
    </group>
  );
}

function Vanity({ w, d, color, selected, metalFinish }: Props) {
  const h = 0.85;
  const bowl = Math.min(0.21, w * 0.2, d * 0.42);
  const finish = metalFinish ?? 'chrome';
  return (
    <group>
      <RoundedBox args={[w, 0.4, d]} radius={0.02} smoothness={2} position={[0, h - 0.2, 0]} castShadow receiveShadow>
        <Wood color={color ?? OAK} selected={selected} />
      </RoundedBox>
      {/* poignées de tiroir */}
      {[-w / 4, w / 4].map((x) => (
        <mesh key={x} position={[x, h - 0.14, d / 2 + 0.008]}>
          <boxGeometry args={[Math.min(0.22, w * 0.15), 0.012, 0.012]} />
          <MetalMat finish={finish} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.03, d]} />
        <SurfaceMat color={STONE} finish="stone" roughness={0.3} />
      </mesh>
      <group position={[0, h + 0.03, 0.02]}>
        <VesselSink radius={bowl} finish={finish} />
      </group>
      {/* mitigeur haut, bec au-dessus de la vasque */}
      <group position={[0, h + 0.03, -d / 2 + 0.07]}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.016, 0.02, 0.3, 14]} />
          <MetalMat finish={finish} />
        </mesh>
        <mesh position={[0, 0.29, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.13, 10]} />
          <MetalMat finish={finish} />
        </mesh>
        <mesh position={[0, 0.24, -0.03]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.07, 8]} />
          <MetalMat finish={finish} />
        </mesh>
      </group>
      {/* miroir rond cerclé */}
      <group position={[0, h + 0.62, -d / 2 + 0.02]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[Math.min(0.38, w * 0.3), Math.min(0.38, w * 0.3), 0.012, 48]} />
          <meshStandardMaterial color="#dbe4e8" roughness={0.03} metalness={0.95} />
        </mesh>
        <mesh>
          <torusGeometry args={[Math.min(0.38, w * 0.3), 0.012, 10, 64]} />
          <MetalMat finish={finish} />
        </mesh>
      </group>
    </group>
  );
}

export function HomeFurnitureMesh({ style, ...props }: Props & { style: HomeFurnitureStyle }) {
  switch (style) {
    case 'bed': return <Bed {...props} />;
    case 'nightstand': return <Nightstand {...props} />;
    case 'wardrobe': return <Wardrobe {...props} />;
    case 'desk': return <Desk {...props} />;
    case 'tvUnit': return <TvUnit {...props} />;
    case 'armchair': return <Armchair {...props} />;
    case 'coffeeTable': return <CoffeeTable {...props} />;
    case 'rug': return <Rug {...props} />;
    case 'kitchenIsland': return <KitchenIsland {...props} />;
    case 'kitchenRun': return <KitchenRun {...props} />;
    case 'bathtub': return <IslandBathtub {...props} />;
    case 'bathtubBuiltIn': return <BuiltInBathtub {...props} />;
    case 'clawfootTub': return <ClawfootBathtub {...props} />;
    case 'vanity': return <Vanity {...props} />;
    case 'toilet': return <Toilet {...props} />;
    case 'shower': return <WalkInShower {...props} />;
    case 'towelRail': return <TowelRail {...props} />;
    default: return null;
  }
}
