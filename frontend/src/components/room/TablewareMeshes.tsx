'use client';

/**
 * Arts de la table en 3D : service complet devant chaque convive et centres de table.
 *
 * Les profils (assiettes, verres) sont des tours (lathe) partagés entre toutes les tables :
 * une salle de 30 tables de 10 ne crée qu’un jeu de géométries.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import { resolveCouvertSpec, type CenterpieceStyle, type CouvertSpec, type CouvertStyle } from '@/lib/roomTableware';

/* ---------------------------------------------------------------------------------------------
 * Géométries partagées (modèle dessiné à mi-échelle, agrandi ×1,9 par l’appelant).
 * ------------------------------------------------------------------------------------------- */

let shared: ReturnType<typeof buildShared> | null = null;

function lathe(pts: Array<[number, number]>, segments = 28): THREE.LatheGeometry {
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segments);
}

function buildShared() {
  return {
    // Assiette plate : pied, fond, aile relevée et bord arrondi.
    plate: lathe([[0, 0.0015], [0.034, 0.0015], [0.036, 0], [0.04, 0], [0.042, 0.0012], [0.046, 0.0035], [0.06, 0.0062], [0.0635, 0.0072], [0.064, 0.0082], [0.062, 0.0082], [0.058, 0.0068], [0.046, 0.0047], [0.04, 0.0028], [0, 0.0028]], 36),
    // Assiette creuse (entrée / soupe).
    bowl: lathe([[0, 0], [0.022, 0], [0.026, 0.002], [0.034, 0.011], [0.041, 0.0135], [0.043, 0.0145], [0.0415, 0.0148], [0.033, 0.0125], [0.025, 0.0045], [0, 0.0035]], 32),
    // Verre à vin (cristal, bord fin).
    wine: lathe([[0, 0], [0.014, 0], [0.0145, 0.0012], [0.0025, 0.003], [0.0018, 0.034], [0.008, 0.039], [0.0145, 0.05], [0.0155, 0.062], [0.0125, 0.074], [0.0119, 0.0742], [0.0148, 0.062], [0.0138, 0.05], [0.0075, 0.04], [0, 0.039]], 24),
    // Verre à eau : gobelet à pied court.
    water: lathe([[0, 0], [0.012, 0], [0.0125, 0.001], [0.003, 0.003], [0.0025, 0.014], [0.0125, 0.018], [0.0145, 0.05], [0.0139, 0.0502], [0.0119, 0.0185], [0, 0.017]], 24),
    // Flûte.
    flute: lathe([[0, 0], [0.0115, 0], [0.012, 0.001], [0.002, 0.0028], [0.0016, 0.03], [0.006, 0.036], [0.0085, 0.06], [0.0092, 0.08], [0.0086, 0.0802], [0.0079, 0.06], [0.0054, 0.037], [0, 0.034]], 24),
    // Sous-assiette lisse (biseautée).
    charger: lathe([[0, 0], [0.074, 0], [0.081, 0.0018], [0.0835, 0.0058], [0.082, 0.0072], [0.072, 0.0052], [0, 0.0045]], 40),
    // Sous-assiette festonnée : couronne de lobes.
    scallop: (() => {
      const shape = new THREE.Shape();
      const lobes = 16;
      for (let i = 0; i <= lobes * 8; i += 1) {
        const a = (i / (lobes * 8)) * Math.PI * 2;
        const r = 0.078 + 0.0045 * Math.abs(Math.cos((a * lobes) / 2));
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 4 });
      g.rotateX(-Math.PI / 2);
      return g;
    })(),
    bead: new THREE.SphereGeometry(0.0032, 8, 6),
    // Couteau : lame + manche ; fourchette : manche + dents ; cuillère : manche + cuilleron.
    knifeBlade: new THREE.BoxGeometry(0.0085, 0.0018, 0.07),
    handle: new THREE.BoxGeometry(0.0075, 0.0034, 0.058),
    tine: new THREE.BoxGeometry(0.0016, 0.0016, 0.022),
    neck: new THREE.BoxGeometry(0.008, 0.002, 0.012),
    spoonBowl: (() => {
      const g = new THREE.SphereGeometry(0.009, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      g.scale(1, 0.35, 1.45);
      g.rotateX(Math.PI);
      return g;
    })(),
    napkinRing: new THREE.TorusGeometry(0.0105, 0.0025, 8, 20),
  };
}

function useShared() {
  if (!shared) shared = buildShared();
  return shared;
}

/* ---------------------------------------------------------------------------------------------
 * Pièces.
 * ------------------------------------------------------------------------------------------- */

function Charger({ spec }: { spec: CouvertSpec }) {
  const g = useShared();
  const beads = useMemo(() => {
    if (spec.charger !== 'beaded' && spec.charger !== 'glass') return [] as Array<[number, number]>;
    const n = 44;
    return Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * 0.0795, Math.sin((i / n) * Math.PI * 2) * 0.0795] as [number, number]);
  }, [spec.charger]);
  switch (spec.charger) {
    case 'none':
      return null;
    case 'wood':
      return (
        <group>
          {/* Rondin de bois : tranche avec écorce sur la tranche */}
          <mesh position={[0, 0.003, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.084, 0.085, 0.006, 40]} />
            <SurfaceMat color={spec.chargerColor} finish="wood" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.003, 0]}>
            <cylinderGeometry args={[0.0865, 0.087, 0.0055, 40, 1, true]} />
            <meshStandardMaterial color="#4a3221" roughness={0.95} />
          </mesh>
        </group>
      );
    case 'rattan':
      return (
        <group>
          <mesh position={[0, 0.002, 0]} receiveShadow>
            <cylinderGeometry args={[0.083, 0.083, 0.004, 40]} />
            <SurfaceMat color={spec.chargerColor} finish="rattan" roughness={0.85} repeat={3} />
          </mesh>
          {/* Spirale tressée : anneaux concentriques en relief */}
          {[0.081, 0.07, 0.058].map((r) => (
            <mesh key={r} position={[0, 0.0042, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[r, 0.0024, 6, 48]} />
              <SurfaceMat color={spec.chargerColor} finish="rattan" roughness={0.85} />
            </mesh>
          ))}
        </group>
      );
    case 'marble':
      return (
        <mesh castShadow receiveShadow geometry={g.charger}>
          <SurfaceMat color={spec.chargerColor} finish="stone" roughness={0.18} />
        </mesh>
      );
    case 'ceramic':
      return (
        <mesh castShadow receiveShadow geometry={g.charger}>
          <SurfaceMat color={spec.chargerColor} finish="ceramic" roughness={0.55} />
        </mesh>
      );
    case 'scalloped':
      return (
        <mesh castShadow receiveShadow geometry={g.scallop}>
          <meshPhysicalMaterial color={spec.chargerColor} roughness={0.25} clearcoat={0.8} />
        </mesh>
      );
    case 'glass':
    case 'beaded': {
      const metal = spec.charger === 'beaded';
      return (
        <group>
          <mesh castShadow receiveShadow geometry={g.charger}>
            {metal ? (
              <meshStandardMaterial color={spec.chargerColor} metalness={0.9} roughness={0.22} />
            ) : (
              <meshPhysicalMaterial color={spec.chargerColor} metalness={0.35} roughness={0.12} transparent opacity={0.72} clearcoat={1} />
            )}
          </mesh>
          {beads.map(([x, z], i) => (
            <mesh key={i} geometry={g.bead} position={[x, 0.0045, z]}>
              <meshStandardMaterial color={spec.chargerColor} metalness={0.92} roughness={0.15} />
            </mesh>
          ))}
        </group>
      );
    }
    default:
      return (
        <mesh castShadow receiveShadow geometry={g.charger}>
          <meshPhysicalMaterial color={spec.chargerColor} metalness={0.88} roughness={0.18} clearcoat={0.6} />
        </mesh>
      );
  }
}

function Napkin({ spec, y }: { spec: CouvertSpec; y: number }) {
  const g = useShared();
  const mat = <SurfaceMat color={spec.napkin} finish="linen" roughness={0.9} repeat={1} />;
  switch (spec.fold) {
    case 'flat':
      // Pliée en rectangle, posée à gauche de la fourchette.
      return (
        <mesh position={[0.122, 0.0035, 0.004]} castShadow receiveShadow>
          <boxGeometry args={[0.032, 0.004, 0.072]} />
          {mat}
        </mesh>
      );
    case 'pocket':
      // Pochette : rectangle plié avec un rabat en biais, sur l’assiette.
      return (
        <group position={[0, y, 0]} rotation={[0, 0.12, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.005, 0.066]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.0032, 0.012]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <boxGeometry args={[0.03, 0.0022, 0.03]} />
            {mat}
          </mesh>
        </group>
      );
    case 'knot':
      // Nouée : boudin de tissu et nœud central.
      return (
        <group position={[0, y + 0.004, 0]} rotation={[0, 0.5, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.75]} castShadow>
            <capsuleGeometry args={[0.0085, 0.05, 4, 10]} />
            {mat}
          </mesh>
          <mesh scale={[1, 0.8, 1]} castShadow>
            <sphereGeometry args={[0.013, 12, 10]} />
            <SurfaceMat color={spec.napkinAccent} finish="linen" roughness={0.9} repeat={1} />
          </mesh>
        </group>
      );
    case 'fan':
      // Éventail : plis dressés sur l’assiette.
      return (
        <group position={[0, y, -0.012]}>
          {Array.from({ length: 7 }).map((_, i) => {
            const a = (i / 6 - 0.5) * 1.5;
            return (
              <mesh key={i} position={[Math.sin(a) * 0.012, 0.024, Math.cos(a) * 0.004]} rotation={[0.18, 0, -a]} castShadow>
                <boxGeometry args={[0.011, 0.048, 0.0022]} />
                {mat}
              </mesh>
            );
          })}
          <mesh position={[0, 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.009, 0.0028, 8, 16]} />
            <meshStandardMaterial color={spec.napkinAccent} metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      );
    default:
      return (
        <group position={[0, y, 0]} rotation={[0, 0.15, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.042, 0.005, 0.068]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.004, 0]} geometry={g.napkinRing} rotation={[0, Math.PI / 2, 0]} castShadow>
            <meshStandardMaterial color={spec.napkinAccent} metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      );
  }
}

function Flatware({ spec }: { spec: CouvertSpec }) {
  const g = useShared();
  const metal = (
    <meshStandardMaterial color={spec.flatware} metalness={spec.flatwareShine > 0.3 ? 0.95 : 0.4} roughness={0.05 + (1 - spec.flatwareShine) * 0.45} />
  );
  const dx = spec.fold === 'flat' ? 0.088 : 0.092;
  return (
    <group position={[0, 0.0012, 0]}>
      {/* Couteau à droite du convive (convive en -Z, regard vers +Z : sa droite est en -X) */}
      <group position={[-dx, 0, 0.004]}>
        <mesh geometry={g.knifeBlade} position={[0, 0, 0.035]} castShadow>{metal}</mesh>
        <mesh geometry={g.handle} position={[0, 0.0008, -0.028]} castShadow>{metal}</mesh>
      </group>
      {/* Cuillère à soupe à côté du couteau quand il y a une assiette creuse */}
      {spec.bowl ? (
        <group position={[-dx - 0.018, 0, 0.004]}>
          <mesh geometry={g.spoonBowl} position={[0, 0.0012, 0.044]} castShadow>{metal}</mesh>
          <mesh geometry={g.handle} position={[0, 0.0008, -0.004]} scale={[0.75, 1, 1.25]} castShadow>{metal}</mesh>
        </group>
      ) : null}
      {/* Fourchette à gauche : manche, col et quatre dents */}
      <group position={[dx, 0, 0.004]}>
        <mesh geometry={g.handle} position={[0, 0.0008, -0.03]} castShadow>{metal}</mesh>
        <mesh geometry={g.neck} position={[0, 0.0005, 0.005]} castShadow>{metal}</mesh>
        {[-0.0027, -0.0009, 0.0009, 0.0027].map((x) => (
          <mesh key={x} geometry={g.tine} position={[x, 0.0005, 0.022]} castShadow>{metal}</mesh>
        ))}
      </group>
      {/* Cuillère à dessert au-dessus de l’assiette */}
      <group position={[0, 0, 0.088]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={g.spoonBowl} position={[0, 0.001, 0.024]} scale={0.7} castShadow>{metal}</mesh>
        <mesh geometry={g.handle} position={[0, 0.0006, -0.008]} scale={[0.6, 0.8, 0.85]} castShadow>{metal}</mesh>
      </group>
    </group>
  );
}

function Glasses({ spec }: { spec: CouvertSpec }) {
  const g = useShared();
  const glassMat = (
    <meshPhysicalMaterial
      color={spec.glass}
      metalness={0}
      roughness={0.04}
      transparent
      opacity={spec.tintedGlass ? 0.55 : 0.32}
      clearcoat={1}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  );
  return (
    <group>
      <mesh geometry={g.wine} position={[-0.055, 0.003, 0.082]}>{glassMat}</mesh>
      <mesh geometry={g.water} position={[-0.085, 0.003, 0.06]}>{glassMat}</mesh>
      {/* Vin rouge servi au fond du verre */}
      <mesh position={[-0.055, 0.0475, 0.082]}>
        <cylinderGeometry args={[0.0118, 0.0065, 0.008, 16]} />
        <meshStandardMaterial color="#5b1220" roughness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={g.flute} position={[-0.028, 0.003, 0.098]}>{glassMat}</mesh>
    </group>
  );
}

/** Service complet devant un convive (sous-assiette, assiette, couverts, verres, serviette). */
export function PlaceSetting({
  style = 'classic',
  position,
  rotationY,
  scale = 1,
}: {
  style?: CouvertStyle;
  position: [number, number, number];
  rotationY: number;
  scale?: number;
}) {
  const g = useShared();
  const spec = resolveCouvertSpec(style);
  const plateY = spec.charger === 'none' ? 0 : spec.charger === 'wood' ? 0.0062 : 0.0048;
  const topY = plateY + 0.0085 + (spec.bowl ? 0.0145 : 0);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Charger spec={spec} />
      <mesh geometry={g.plate} position={[0, plateY, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color={spec.plate} roughness={0.12} clearcoat={0.95} clearcoatRoughness={0.08} />
      </mesh>
      {spec.rim ? (
        <mesh position={[0, plateY + 0.0074, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.0585, 0.0605, 40]} />
          <meshStandardMaterial color={spec.rim} metalness={/^#(c9|d4|b0|b7)/i.test(spec.rim) ? 0.9 : 0.1} roughness={0.25} />
        </mesh>
      ) : null}
      {spec.bowl ? (
        <mesh geometry={g.bowl} position={[0, plateY + 0.003, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color={spec.bowl} roughness={0.12} clearcoat={0.95} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      <Napkin spec={spec} y={topY} />
      <Flatware spec={spec} />
      <Glasses spec={spec} />
    </group>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Centres de table supplémentaires (bouquet, runner et bougies restent dans roomCelebrationMeshes).
 * Repère : plateau en y = 0, échelle réelle (m).
 * ------------------------------------------------------------------------------------------- */

const FLAME = '#ffb347';

function Candle({ h = 0.12, r = 0.012, color = '#fbf7ee', lit = true }: { h?: number; r?: number; color?: string; lit?: boolean }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 14]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {lit ? (
        <mesh position={[0, h + 0.012, 0]} scale={[1, 1.8, 1]}>
          <sphereGeometry args={[0.0055, 10, 8]} />
          <meshStandardMaterial color="#fff2c6" emissive={FLAME} emissiveIntensity={3} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function Candelabra() {
  const stem = useMemo(() => lathe([[0, 0], [0.018, 0], [0.012, 0.04], [0.026, 0.08], [0.012, 0.12], [0.01, 0.24], [0.02, 0.29], [0.016, 0.33], [0, 0.33]], 20), []);
  const gold = <meshStandardMaterial color="#c9a227" metalness={0.92} roughness={0.22} />;
  const arms = [-2, -1, 1, 2];
  return (
    <group>
      <mesh position={[0, 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.075, 0.024, 28]} />
        {gold}
      </mesh>
      {/* Fût balustre */}
      <mesh position={[0, 0.024, 0]} castShadow geometry={stem}>
        {gold}
      </mesh>
      {arms.map((k) => {
        const x = k * 0.075;
        const y = Math.abs(k) === 2 ? 0.33 : 0.36;
        return (
          <group key={k}>
            <mesh position={[x / 2, y - 0.03, 0]} rotation={[0, 0, Math.atan2(0.05, -x) - Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.005, 0.005, Math.hypot(x, 0.06), 8]} />
              {gold}
            </mesh>
            <mesh position={[x, y, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.012, 0.014, 16]} />
              {gold}
            </mesh>
            <group position={[x, y + 0.007, 0]}>
              <Candle h={0.13} r={0.009} />
            </group>
          </group>
        );
      })}
      <mesh position={[0, 0.39, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.012, 0.016, 16]} />
        {gold}
      </mesh>
      <group position={[0, 0.398, 0]}>
        <Candle h={0.15} r={0.0095} />
      </group>
    </group>
  );
}

function Lantern({ h = 0.3, w = 0.12 }: { h?: number; w?: number }) {
  const iron = <meshStandardMaterial color="#1c1917" metalness={0.65} roughness={0.45} />;
  return (
    <group>
      <mesh position={[0, 0.01, 0]} castShadow>
        <boxGeometry args={[w, 0.02, w]} />
        {iron}
      </mesh>
      {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
        <mesh key={`${sx}${sz}`} position={[(sx * w) / 2 - sx * 0.005, h / 2, (sz * w) / 2 - sz * 0.005]} castShadow>
          <boxGeometry args={[0.008, h - 0.02, 0.008]} />
          {iron}
        </mesh>
      )))}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w - 0.012, h - 0.04, w - 0.012]} />
        <meshPhysicalMaterial color="#f8fafc" roughness={0.05} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {/* Toit pyramidal et anneau */}
      <mesh position={[0, h + 0.025, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[w * 0.75, 0.05, 4]} />
        {iron}
      </mesh>
      <mesh position={[0, h + 0.065, 0]} castShadow>
        <torusGeometry args={[0.018, 0.004, 8, 16]} />
        {iron}
      </mesh>
      <group position={[0, 0.02, 0]}>
        <Candle h={h * 0.4} r={w * 0.2} />
      </group>
      <pointLight position={[0, h * 0.5, 0]} color={FLAME} intensity={0.25} distance={0.9} decay={2} />
    </group>
  );
}

function Pampas() {
  const plumes = useMemo(
    () => Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const tilt = 0.18 + (i % 3) * 0.1;
      return { a, tilt, h: 0.42 + ((i * 37) % 5) * 0.035 };
    }),
    [],
  );
  const vase = useMemo(() => lathe([[0, 0], [0.05, 0], [0.075, 0.06], [0.07, 0.13], [0.035, 0.19], [0.03, 0.22], [0.034, 0.23], [0, 0.23]], 28), []);
  return (
    <group>
      <mesh geometry={vase} castShadow receiveShadow>
        <SurfaceMat color="#d8cbb8" finish="ceramic" roughness={0.85} />
      </mesh>
      {plumes.map(({ a, tilt, h }, i) => (
        <group key={i} position={[0, 0.2, 0]} rotation={[Math.cos(a) * tilt, 0, Math.sin(a) * tilt]}>
          <mesh position={[0, h / 2, 0]}>
            <cylinderGeometry args={[0.0025, 0.003, h, 6]} />
            <meshStandardMaterial color="#b7a27c" roughness={0.9} />
          </mesh>
          <mesh position={[0, h + 0.05, 0]} scale={[1, 3.4, 1]} castShadow>
            <sphereGeometry args={[0.032, 12, 10]} />
            <SurfaceMat color={i % 3 === 0 ? '#f1e6d2' : '#e6d4b3'} finish="boucle" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FloatingCandles() {
  const tubes: Array<[number, number, number]> = [[-0.09, 0.26, 0.02], [0, 0.36, -0.03], [0.09, 0.2, 0.025]];
  return (
    <group>
      {tubes.map(([x, h, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h / 2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, h, 28, 1, true]} />
            <meshPhysicalMaterial color="#e6f2f5" roughness={0.03} transparent opacity={0.38} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.004, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.008, 28]} />
            <meshPhysicalMaterial color="#f8fafc" roughness={0.05} transparent opacity={0.4} />
          </mesh>
          {/* Eau */}
          <mesh position={[0, h * 0.4, 0]}>
            <cylinderGeometry args={[0.047, 0.047, h * 0.78, 24]} />
            <meshPhysicalMaterial color="#8ccbe0" roughness={0.02} transparent opacity={0.5} depthWrite={false} />
          </mesh>
          {/* Orchidée immergée */}
          <mesh position={[0, h * 0.25, 0]} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.022, 10, 8]} />
            <meshStandardMaterial color="#f5d0fe" roughness={0.6} />
          </mesh>
          <group position={[0, h * 0.79, 0]}>
            <Candle h={0.025} r={0.026} />
          </group>
        </group>
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`p${i}`} position={[Math.cos(i * 2.4) * (0.08 + (i % 3) * 0.04), 0.002, Math.sin(i * 2.4) * (0.08 + (i % 3) * 0.04)]} rotation={[-Math.PI / 2, 0, i]} scale={[1, 0.7, 1]}>
          <circleGeometry args={[0.012, 8]} />
          <meshStandardMaterial color="#f9a8d4" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function FruitBowl() {
  const bowl = useMemo(() => lathe([[0, 0], [0.05, 0], [0.05, 0.008], [0.014, 0.014], [0.012, 0.07], [0.03, 0.08], [0.12, 0.11], [0.125, 0.118], [0.118, 0.12], [0.03, 0.09], [0, 0.088]], 32), []);
  const fruits = useMemo(() => {
    const list: Array<{ p: [number, number, number]; r: number; c: string }> = [];
    const colors = ['#f59e0b', '#ea580c', '#facc15', '#65a30d', '#dc2626'];
    for (let i = 0; i < 9; i += 1) {
      const a = i * 2.39;
      const rr = i === 0 ? 0 : 0.055 + (i % 2) * 0.015;
      list.push({ p: [Math.cos(a) * rr, 0.13 + (i === 0 ? 0.05 : 0), Math.sin(a) * rr], r: 0.03 + (i % 3) * 0.004, c: colors[i % colors.length] });
    }
    return list;
  }, []);
  return (
    <group>
      <mesh geometry={bowl} castShadow receiveShadow>
        <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      {fruits.map((f, i) => (
        <mesh key={i} position={f.p} castShadow>
          <sphereGeometry args={[f.r, 16, 12]} />
          <meshPhysicalMaterial color={f.c} roughness={0.45} clearcoat={0.4} />
        </mesh>
      ))}
      {/* Grappe de raisin qui déborde */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`g${i}`} position={[0.1 + (i % 3) * 0.012, 0.11 - Math.floor(i / 3) * 0.016, 0.03 + (i % 2) * 0.01]} castShadow>
          <sphereGeometry args={[0.0085, 10, 8]} />
          <meshPhysicalMaterial color="#5b2150" roughness={0.3} clearcoat={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function MirrorVotives() {
  const pts: Array<[number, number, number]> = [[0, 0, 0], [-0.1, 0, 0.05], [0.1, 0, -0.04], [0.06, 0, 0.09], [-0.07, 0, -0.08]];
  return (
    <group>
      <mesh position={[0, 0.004, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.008, 48]} />
        <meshStandardMaterial color="#9aa6b2" metalness={1} roughness={0.06} />
      </mesh>
      <mesh position={[0, 0.004, 0]}>
        <cylinderGeometry args={[0.208, 0.208, 0.018, 48, 1, true]} />
        <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.2} />
      </mesh>
      {pts.map(([x, , z], i) => {
        const h = 0.06 + (i % 3) * 0.05;
        return (
          <group key={i} position={[x, 0.008, z]}>
            <mesh position={[0, h / 2, 0]}>
              <cylinderGeometry args={[0.03, 0.028, h, 20, 1, true]} />
              <meshPhysicalMaterial color="#f5c26b" roughness={0.08} transparent opacity={0.6} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <Candle h={0.02} r={0.02} />
          </group>
        );
      })}
      {/* Pétales et petites roses */}
      {[[-0.13, -0.02], [0.14, 0.04], [0, -0.12]].map(([x, z], i) => (
        <mesh key={`r${i}`} position={[x, 0.025, z]} castShadow>
          <sphereGeometry args={[0.022, 12, 10]} />
          <meshStandardMaterial color={i === 1 ? '#fbcfe8' : '#fdf2f8'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Succulents({ length = 0.42 }: { length?: number }) {
  const plants = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ x: ((i + 0.5) / 5 - 0.5) * length * 0.9, kind: i % 3, s: 0.8 + (i % 2) * 0.3 })), [length]);
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.08, 0.13]} />
        <SurfaceMat color="#a07850" finish="wood" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.081, 0]}>
        <boxGeometry args={[length - 0.02, 0.002, 0.11]} />
        <meshStandardMaterial color="#5a4632" roughness={1} />
      </mesh>
      {plants.map((p, i) => (
        <group key={i} position={[p.x, 0.082, 0]} scale={p.s}>
          {p.kind === 2 ? (
            // Cactus boule.
            <mesh position={[0, 0.03, 0]} castShadow>
              <sphereGeometry args={[0.032, 14, 12]} />
              <meshStandardMaterial color="#4d7c5a" roughness={0.8} />
            </mesh>
          ) : (
            // Rosette d’échévéria : feuilles charnues disposées en spirale.
            Array.from({ length: 10 }).map((_, k) => {
              const a = k * 2.4;
              const ring = k < 5 ? 1 : 0.55;
              return (
                <mesh key={k} position={[Math.cos(a) * 0.022 * ring, 0.012 + (1 - ring) * 0.012, Math.sin(a) * 0.022 * ring]} rotation={[Math.sin(a) * 0.9 * ring, 0, -Math.cos(a) * 0.9 * ring]} scale={[0.7, 1.4, 0.35]} castShadow>
                  <sphereGeometry args={[0.012, 8, 6]} />
                  <meshStandardMaterial color={p.kind === 0 ? '#8fb8a0' : '#b7a3c9'} roughness={0.6} />
                </mesh>
              );
            })
          )}
        </group>
      ))}
    </group>
  );
}

function RosePomander() {
  const roses = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    const n = 38;
    for (let i = 0; i < n; i += 1) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      out.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    return out;
  }, []);
  const stand = useMemo(() => lathe([[0, 0], [0.07, 0], [0.07, 0.01], [0.015, 0.03], [0.01, 0.22], [0.05, 0.25], [0.055, 0.26], [0, 0.255]], 28), []);
  const R = 0.11;
  return (
    <group>
      <mesh geometry={stand} castShadow>
        <meshStandardMaterial color="#d1d5db" metalness={0.92} roughness={0.18} />
      </mesh>
      <group position={[0, 0.25 + R * 0.92, 0]}>
        <mesh>
          <sphereGeometry args={[R * 0.95, 20, 16]} />
          <meshStandardMaterial color="#4c7a52" roughness={0.9} />
        </mesh>
        {roses.map(([x, y, z], i) => (
          <mesh key={i} position={[x * R, y * R, z * R]} castShadow>
            <sphereGeometry args={[0.026, 10, 8]} />
            <meshStandardMaterial color={i % 5 === 0 ? '#fbcfe8' : i % 3 === 0 ? '#be123c' : '#e11d48'} roughness={0.75} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Tropical() {
  const leaves = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * Math.PI * 2, tilt: 0.5 + (i % 2) * 0.25, s: 1 + (i % 3) * 0.2 })),
    [],
  );
  const vase = useMemo(() => lathe([[0, 0], [0.06, 0], [0.065, 0.16], [0.07, 0.17], [0, 0.17]], 28), []);
  return (
    <group>
      <mesh geometry={vase} castShadow>
        <meshPhysicalMaterial color="#e0f2fe" roughness={0.04} transparent opacity={0.35} clearcoat={1} depthWrite={false} />
      </mesh>
      {leaves.map(({ a, tilt, s }, i) => (
        <group key={i} position={[0, 0.16, 0]} rotation={[0, a, 0]}>
          <group rotation={[tilt, 0, 0]}>
            <mesh position={[0, 0.12 * s, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.24 * s, 6]} />
              <meshStandardMaterial color="#166534" roughness={0.8} />
            </mesh>
            {/* Feuille de monstera : disque aplati et nervuré */}
            <mesh position={[0, 0.25 * s, 0.02]} rotation={[-0.6, 0, 0]} scale={[0.75, 1.7, 0.1]} castShadow>
              <sphereGeometry args={[0.05 * s, 16, 10]} />
              <meshStandardMaterial color={i % 2 ? '#14532d' : '#15803d'} roughness={0.55} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Orchidées et protée */}
      {[[0.04, 0.33, 0.03, '#f472b6'], [-0.05, 0.3, -0.02, '#fde047'], [0, 0.36, -0.05, '#fb923c']].map(([x, y, z, c], i) => (
        <mesh key={`f${i}`} position={[x as number, y as number, z as number]} castShadow>
          <sphereGeometry args={[0.03, 12, 10]} />
          <meshStandardMaterial color={c as string} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Centres de table ajoutés au catalogue. `length` : grande dimension du plateau (m). */
export function ExtraCenterpiece({ style, length = 1.2 }: { style: CenterpieceStyle; length?: number }) {
  switch (style) {
    case 'candelabra':
      return <Candelabra />;
    case 'lanterns':
      return (
        <group>
          <Lantern h={0.34} w={0.13} />
          <group position={[-0.17, 0, 0.05]}><Lantern h={0.24} w={0.1} /></group>
          <group position={[0.16, 0, -0.04]}><Lantern h={0.2} w={0.09} /></group>
        </group>
      );
    case 'pampas':
      return <Pampas />;
    case 'floatingCandles':
      return <FloatingCandles />;
    case 'fruitBowl':
      return <FruitBowl />;
    case 'mirrorVotives':
      return <MirrorVotives />;
    case 'succulents':
      return <Succulents length={Math.min(0.6, Math.max(0.32, length * 0.35))} />;
    case 'rosePomander':
      return <RosePomander />;
    case 'tropical':
      return <Tropical />;
    default:
      return null;
  }
}

/** Les centres de table gérés par `ExtraCenterpiece`. */
export const EXTRA_CENTERPIECES: ReadonlySet<CenterpieceStyle> = new Set([
  'candelabra',
  'lanterns',
  'pampas',
  'floatingCandles',
  'fruitBowl',
  'mirrorVotives',
  'succulents',
  'rosePomander',
  'tropical',
]);
