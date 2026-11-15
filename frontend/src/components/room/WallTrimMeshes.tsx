'use client';

/**
 * Moulures de menuiserie : plinthes, corniches et chambranles, extrudées à
 * partir d’un vrai profil (et non de simples boîtes), pour que la lumière
 * rasante dessine les arrondis et les gorges.
 *
 * Repère du mur : X le long du mur, Y en hauteur (origine au centre du mur),
 * Z perpendiculaire ; `side` = +1 ou −1 indique la face concernée.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { SurfaceMat } from '@/components/room/SurfaceMaterial';

type Profile = Array<[number, number]>;

/** Teinte des boiseries peintes par défaut (blanc cassé satiné). */
export const TRIM_DEFAULT_COLOR = '#efebe4';

/** Plinthe de 10 cm : face plate, haut chanfreiné et arrondi (profil x = saillie, y = hauteur). */
const PLINTH: Profile = [[0, 0], [0.014, 0], [0.014, 0.074], [0.011, 0.084], [0.007, 0.091], [0.004, 0.097], [0, 0.1]];

/** Corniche à gorge de 8 cm (profil x = saillie sous plafond, y = hauteur depuis le bas). */
const CORNICE: Profile = (() => {
  const pts: Profile = [[0, 0], [0.01, 0]];
  const cx = 0.08;
  const r = 0.07;
  for (let i = 0; i <= 10; i += 1) {
    const a = Math.PI - (i / 10) * (Math.PI / 2);
    pts.push([cx + Math.cos(a) * r, Math.sin(a) * r]);
  }
  pts.push([0.08, 0.08], [0, 0.08]);
  return pts;
})();

/** Chambranle de 7 cm : plat légèrement incliné vers l’ouverture, baguette en bord extérieur (u = largeur, d = saillie). */
const ARCHITRAVE: Profile = [[0, 0], [0.07, 0], [0.07, 0.021], [0.066, 0.024], [0.061, 0.023], [0.057, 0.017], [0.012, 0.012], [0.004, 0.01], [0, 0.006]];
export const ARCHITRAVE_W = 0.07;

/** Extrude un profil (x, y) sur `length` le long de Z, centré. */
function extrudeProfile(points: Profile, length: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, length), bevelEnabled: false, steps: 1 });
  geo.translate(0, 0, -length / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Profil filant le long de X (plinthe, corniche, traverse haute d’un chambranle). */
function useRunGeometry(profile: Profile, length: number, side: 1 | -1, flipY = false) {
  return useMemo(() => {
    const pts: Profile = profile.map(([x, y]) => [x * side, flipY ? -y : y]);
    const geo = extrudeProfile(pts, length);
    geo.rotateY(-Math.PI / 2);
    return geo;
  }, [profile, length, side, flipY]);
}

function Trim({ geometry, position, color }: { geometry: THREE.BufferGeometry; position: [number, number, number]; color: string }) {
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <SurfaceMat color={color} finish="lacquer" roughness={0.42} />
    </mesh>
  );
}

/** Plinthe posée au pied du mur, de `x0` à `x1`. `y` = niveau du sol, `z` = face du mur. */
export function Plinth({ x0, x1, y, z, side, color = TRIM_DEFAULT_COLOR }: { x0: number; x1: number; y: number; z: number; side: 1 | -1; color?: string }) {
  const len = x1 - x0;
  const geo = useRunGeometry(PLINTH, len, side);
  if (len < 0.02) return null;
  return <Trim geometry={geo} position={[(x0 + x1) / 2, y, z]} color={color} />;
}

/** Corniche à gorge sous le plafond. `y` = hauteur du plafond. */
export function Cornice({ length, y, z, side, color = TRIM_DEFAULT_COLOR }: { length: number; y: number; z: number; side: 1 | -1; color?: string }) {
  const geo = useRunGeometry(CORNICE, length, side);
  return <Trim geometry={geo} position={[0, y - 0.08, z]} color={color} />;
}

/**
 * Chambranle autour d’une ouverture de `w` × `h` (origine au centre), sur la face `side`
 * du mur située en `z`. `bottom` ajoute la pièce basse (fenêtre sans tablette).
 */
export function Architrave({ w, h, z, side, color = TRIM_DEFAULT_COLOR, bottom = false }: { w: number; h: number; z: number; side: 1 | -1; color?: string; bottom?: boolean }) {
  const A = ARCHITRAVE_W;
  const jambs = useMemo(
    () =>
      ([-1, 1] as const).map((dir) => {
        const pts: Profile = ARCHITRAVE.map(([u, d]) => [u * dir, d * side]);
        const geo = extrudeProfile(pts, h + (bottom ? 2 * A : A));
        geo.rotateX(Math.PI / 2);
        return { dir, geo };
      }),
    [h, side, bottom, A],
  );
  const head = useMemo(() => {
    const pts: Profile = ARCHITRAVE.map(([u, d]) => [d * side, u]);
    const geo = extrudeProfile(pts, w + 2 * A);
    geo.rotateY(-Math.PI / 2);
    return geo;
  }, [w, side, A]);
  const foot = useMemo(() => {
    if (!bottom) return null;
    const pts: Profile = ARCHITRAVE.map(([u, d]) => [d * side, -u]);
    const geo = extrudeProfile(pts, w + 2 * A);
    geo.rotateY(-Math.PI / 2);
    return geo;
  }, [bottom, w, side, A]);
  const jambY = bottom ? 0 : A / 2;
  return (
    <group position={[0, 0, z]}>
      {jambs.map(({ dir, geo }) => (
        <Trim key={dir} geometry={geo} position={[dir * (w / 2), jambY, 0]} color={color} />
      ))}
      <Trim geometry={head} position={[0, h / 2, 0]} color={color} />
      {foot ? <Trim geometry={foot} position={[0, -h / 2, 0]} color={color} /> : null}
    </group>
  );
}
