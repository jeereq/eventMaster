'use client';

/**
 * Détails de toiture : plafond à caissons (poutres moulurées, filets dorés, spots encastrés)
 * et équipements de toiture-terrasse (centrales d’air, extracteurs). Pièces identiques en instances.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cofferedGrid, rooftopUnits, type RoofHole, type RoofPoint } from '@/lib/roomRoofGeometry';

type Inst = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY?: number; rotX?: number };

function Instanced({ items, geometry, material, castShadow }: { items: Inst[]; geometry: THREE.BufferGeometry; material: THREE.Material; castShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    items.forEach((it, i) => {
      e.set(it.rotX ?? 0, it.rotY ?? 0, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.sx, it.sy, it.sz));
      mesh.setMatrixAt(i, m);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  if (!items.length) return null;
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow />;
}

function mixHex(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  return `#${ca.lerp(new THREE.Color(b), t).getHexString()}`;
}

/**
 * Plafond à caissons suspendu sous la dalle : `y` est la sous-face de la dalle.
 */
export function CofferedCeiling({ pts, holes, y, color }: { pts: RoofPoint[]; holes: RoofHole[]; y: number; color: string }) {
  const grid = useMemo(() => cofferedGrid(pts, holes, 2.4), [pts, holes]);
  const depth = 0.3;
  const beamW = 0.24;

  const geos = useMemo(
    () => ({
      box: new THREE.BoxGeometry(1, 1, 1),
      plane: new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2),
      disc: new THREE.CircleGeometry(0.5, 20).rotateX(Math.PI / 2),
    }),
    [],
  );
  const mats = useMemo(() => {
    const beam = mixHex(color, '#fbf8f2', 0.75);
    return {
      beam: new THREE.MeshStandardMaterial({ color: beam, roughness: 0.7 }),
      panel: new THREE.MeshStandardMaterial({ color: mixHex(color, '#efe6d6', 0.45), roughness: 0.85, side: THREE.DoubleSide }),
      step: new THREE.MeshStandardMaterial({ color: mixHex(beam, '#d9cfbf', 0.35), roughness: 0.75 }),
      gold: new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.85, roughness: 0.3 }),
      spot: new THREE.MeshBasicMaterial({ color: '#fff3d6', toneMapped: false, side: THREE.DoubleSide }),
    };
  }, [color]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const parts = useMemo(() => {
    const beams: Inst[] = [];
    const fillets: Inst[] = [];
    const panels: Inst[] = [];
    const steps: Inst[] = [];
    const spots: Inst[] = [];
    for (const b of grid.beams) {
      const len = b.len + beamW;
      beams.push({ x: b.cx, y: y - depth / 2, z: b.cz, sx: b.alongX ? len : beamW, sy: depth, sz: b.alongX ? beamW : len });
      fillets.push({ x: b.cx, y: y - depth - 0.012, z: b.cz, sx: b.alongX ? len : beamW * 0.42, sy: 0.024, sz: b.alongX ? beamW * 0.42 : len });
    }
    for (const c of grid.cells) {
      panels.push({ x: c.cx, y: y - 0.005, z: c.cz, sx: c.w, sy: 1, sz: c.d });
      // Gradin intérieur : cadre en retrait qui donne la profondeur moulurée du caisson.
      const iw = c.w - beamW;
      const id = c.d - beamW;
      const t = 0.12;
      const sy = depth * 0.45;
      const yy = y - sy / 2;
      steps.push({ x: c.cx, y: yy, z: c.cz - id / 2 + t / 2, sx: iw, sy, sz: t });
      steps.push({ x: c.cx, y: yy, z: c.cz + id / 2 - t / 2, sx: iw, sy, sz: t });
      steps.push({ x: c.cx - iw / 2 + t / 2, y: yy, z: c.cz, sx: t, sy, sz: id - 2 * t });
      steps.push({ x: c.cx + iw / 2 - t / 2, y: yy, z: c.cz, sx: t, sy, sz: id - 2 * t });
      spots.push({ x: c.cx, y: y - 0.02, z: c.cz, sx: 0.22, sy: 1, sz: 0.22 });
    }
    return { beams, fillets, panels, steps, spots };
  }, [grid, y]);

  return (
    <group>
      <Instanced items={parts.panels} geometry={geos.plane} material={mats.panel} />
      <Instanced items={parts.steps} geometry={geos.box} material={mats.step} />
      <Instanced items={parts.beams} geometry={geos.box} material={mats.beam} castShadow />
      <Instanced items={parts.fillets} geometry={geos.box} material={mats.gold} />
      <Instanced items={parts.spots} geometry={geos.disc} material={mats.spot} />
    </group>
  );
}

/** Centrales d’air et extracteurs posés sur la dalle (`y` = dessus de la dalle). */
export function RooftopEquipment({ pts, holes, y }: { pts: RoofPoint[]; holes: RoofHole[]; y: number }) {
  const units = useMemo(() => rooftopUnits(pts, holes), [pts, holes]);
  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.55, roughness: 0.45 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.4, roughness: 0.6 }),
      rail: new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.6, roughness: 0.4 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return (
    <group>
      {units.map((u, i) =>
        u.kind === 'hvac' ? (
          <group key={i} position={[u.x, y, u.z]} rotation={[0, u.rotY, 0]}>
            {/* Socle sur plots */}
            <mesh position={[0, 0.06, 0]} material={mats.rail} castShadow>
              <boxGeometry args={[u.w + 0.2, 0.12, u.d + 0.2]} />
            </mesh>
            <mesh position={[0, 0.12 + 0.45, 0]} material={mats.body} castShadow receiveShadow>
              <boxGeometry args={[u.w, 0.9, u.d]} />
            </mesh>
            {/* Ventilateurs en partie haute */}
            {[-1, 1].map((s) => (
              <group key={s} position={[(s * u.w) / 4, 1.03, 0]}>
                <mesh material={mats.dark}>
                  <cylinderGeometry args={[0.32, 0.32, 0.04, 24]} />
                </mesh>
                <mesh position={[0, 0.03, 0]} material={mats.rail}>
                  <torusGeometry args={[0.32, 0.025, 6, 24]} />
                </mesh>
                <mesh position={[0, 0.035, 0]} rotation={[0, s * 0.4, 0]} material={mats.rail}>
                  <boxGeometry args={[0.58, 0.01, 0.06]} />
                </mesh>
              </group>
            ))}
            {/* Grilles latérales */}
            {[-1, 1].map((s) => (
              <mesh key={`g${s}`} position={[0, 0.57, (s * u.d) / 2 + s * 0.005]} material={mats.dark}>
                <boxGeometry args={[u.w * 0.8, 0.55, 0.01]} />
              </mesh>
            ))}
          </group>
        ) : (
          <group key={i} position={[u.x, y, u.z]}>
            <mesh position={[0, 0.3, 0]} material={mats.body} castShadow>
              <cylinderGeometry args={[0.09, 0.11, 0.6, 14]} />
            </mesh>
            <mesh position={[0, 0.66, 0]} material={mats.rail} castShadow>
              <coneGeometry args={[0.2, 0.16, 16]} />
            </mesh>
          </group>
        ),
      )}
    </group>
  );
}
