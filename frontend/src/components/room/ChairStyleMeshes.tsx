'use client';

/**
 * Modèles 3D des styles de chaises ajoutés au catalogue (trône, paon, œuf, tulipe, paillée,
 * tonneau, coquillage, Acapulco, Parsons). Les matières (assise tapissée, structure) sont
 * fournies par la chaise catalogue pour garder tissus, photos importées et couleurs choisies.
 */

import React, { useMemo, type ReactElement } from 'react';
import * as THREE from 'three';
import type { ChairStyle } from '@/lib/roomLayoutUtils';
import { cushionGeometry, legGeometry, softBoxGeometry } from '@/components/room/furnitureGeometry';

type MatOverrides = { roughness?: number; metalness?: number; side?: THREE.Side; clearcoat?: number };

export type ExtraChairContext = {
  seatH: number;
  sw: number;
  sd: number;
  backH: number;
  /** Matière d’assise (tissu, cuir, photo importée, couleur choisie). */
  seat: (o?: MatOverrides) => ReactElement;
  /** Matière de structure (bois, métal, doré…). */
  frame: (o?: MatOverrides) => ReactElement;
  seatColor: string;
  frameColor: string;
};

export const EXTRA_CHAIR_STYLES: ReadonlySet<ChairStyle> = new Set<ChairStyle>([
  'throne',
  'peacock',
  'egg',
  'tulip',
  'ladderBack',
  'barrel',
  'shell',
  'acapulco',
  'parsons',
]);

function lathe(pts: Array<[number, number]>, segments = 32): THREE.LatheGeometry {
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segments);
}

/** Quatre pieds aux coins de l’assise. */
function Legs({ c, inset = 0.36, profile = 'taper' as const, r = 0.018, splay = 0 }: { c: ExtraChairContext; inset?: number; profile?: 'taper' | 'turned' | 'spindle' | 'bamboo'; r?: number; splay?: number }) {
  return (
    <>
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * c.sw * inset, c.seatH / 2, sz * c.sd * inset]}
            rotation={[sz * splay, 0, -sx * splay]}
            geometry={legGeometry(c.seatH * 1.01, r * 1.1, r * 0.8, profile)}
            castShadow
          >
            {c.frame()}
          </mesh>
        )),
      )}
    </>
  );
}

function Throne({ c }: { c: ExtraChairContext }) {
  // Dossier très haut, cintré en arc, cadre doré mouluré, capitons, accoudoirs volutes.
  const backH = c.backH * 1.25;
  const w = c.sw * 1.1;
  const backShape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = w / 2;
    s.moveTo(-hw, 0);
    s.lineTo(-hw, backH * 0.72);
    s.quadraticCurveTo(-hw, backH * 0.9, -hw * 0.45, backH * 0.93);
    s.quadraticCurveTo(0, backH * 1.12, hw * 0.45, backH * 0.93);
    s.quadraticCurveTo(hw, backH * 0.9, hw, backH * 0.72);
    s.lineTo(hw, 0);
    s.lineTo(-hw, 0);
    return s;
  }, [w, backH]);
  const frameGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(backShape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 24 });
    g.translate(0, 0, -0.025);
    return g;
  }, [backShape]);
  const padGeo = useMemo(() => {
    const inner = new THREE.Shape(backShape.getPoints(48).map((p) => new THREE.Vector2(p.x * 0.84, p.y * 0.88 + backH * 0.05)));
    const g = new THREE.ExtrudeGeometry(inner, { depth: 0.03, bevelEnabled: true, bevelSize: 0.014, bevelThickness: 0.014, bevelSegments: 4 });
    return g;
  }, [backShape, backH]);
  return (
    <group>
      <Legs c={c} inset={0.42} profile="turned" r={0.024} />
      <mesh position={[0, c.seatH - 0.02, 0]} geometry={softBoxGeometry(w * 1.04, 0.09, c.sd * 1.05, 0.02)} castShadow>
        {c.frame({ metalness: 0.85, roughness: 0.22 })}
      </mesh>
      <mesh position={[0, c.seatH + 0.05, 0.02]} geometry={cushionGeometry(w * 0.94, 0.09, c.sd * 0.92, 0.35)} castShadow receiveShadow>
        {c.seat()}
      </mesh>
      <group position={[0, c.seatH + 0.02, -c.sd * 0.5]} rotation={[-0.08, 0, 0]}>
        <mesh geometry={frameGeo} castShadow>{c.frame({ metalness: 0.85, roughness: 0.22 })}</mesh>
        <mesh geometry={padGeo} position={[0, 0, 0.012]} castShadow>{c.seat()}</mesh>
        {/* Capitons */}
        {[-0.22, 0, 0.22].flatMap((bx) => [0.3, 0.52, 0.74].map((by) => (
          <mesh key={`${bx}${by}`} position={[bx * w + (by === 0.52 ? 0.11 * w * Math.sign(bx || 1) * 0 : 0), backH * by, 0.06]}>
            <sphereGeometry args={[0.011, 8, 6]} />
            {c.frame({ metalness: 0.85, roughness: 0.25 })}
          </mesh>
        )))}
        {/* Couronne au sommet */}
        <mesh position={[0, backH * 1.06, 0]} castShadow>
          <sphereGeometry args={[0.035, 14, 10]} />
          {c.frame({ metalness: 0.9, roughness: 0.2 })}
        </mesh>
      </group>
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * w * 0.55, c.seatH + 0.16, 0]}>
          <mesh geometry={softBoxGeometry(0.06, 0.05, c.sd * 0.85, 0.02)} castShadow>{c.seat()}</mesh>
          {/* Volute d’accoudoir */}
          <mesh position={[0, -0.02, c.sd * 0.42]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <torusGeometry args={[0.035, 0.012, 8, 18]} />
            {c.frame({ metalness: 0.88, roughness: 0.22 })}
          </mesh>
          <mesh position={[0, -0.09, c.sd * 0.36]} castShadow>
            <cylinderGeometry args={[0.014, 0.018, 0.14, 10]} />
            {c.frame({ metalness: 0.88, roughness: 0.22 })}
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Peacock({ c }: { c: ExtraChairContext }) {
  // Fauteuil paon : base en rotin tressé (diabolo), grand dossier en éventail ajouré.
  const R = Math.min(0.7, c.backH * 0.72);
  const spokes = 15;
  const baseGeo = useMemo(() => lathe([[0, 0], [0.22, 0], [0.2, 0.04], [0.12, c.seatH * 0.5], [0.2, c.seatH - 0.04], [0.24, c.seatH], [0, c.seatH]], 36), [c.seatH]);
  const rattan = c.frame({ roughness: 0.8, metalness: 0 });
  return (
    <group>
      <mesh geometry={baseGeo} castShadow receiveShadow>{rattan}</mesh>
      <mesh position={[0, c.seatH + 0.045, 0.02]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.08, 32]} />
        {c.seat()}
      </mesh>
      <group position={[0, c.seatH + 0.02, -0.18]} rotation={[-0.16, 0, 0]}>
        {/* Rayons de l’éventail */}
        {Array.from({ length: spokes }).map((_, i) => {
          const a = (i / (spokes - 1) - 0.5) * Math.PI * 0.95;
          return (
            <mesh key={i} position={[Math.sin(a) * R * 0.5, Math.cos(a) * R * 0.5, 0]} rotation={[0, 0, -a]} castShadow>
              <cylinderGeometry args={[0.009, 0.012, R, 6]} />
              {rattan}
            </mesh>
          );
        })}
        {/* Arceaux tressés concentriques */}
        {[0.35, 0.6, 0.82, 1].map((k) => (
          <mesh key={k} rotation={[0, 0, 0]} castShadow>
            <torusGeometry args={[R * k, k === 1 ? 0.018 : 0.008, 8, 48, Math.PI]} />
            {rattan}
          </mesh>
        ))}
        {/* Motif en losanges dans l’éventail */}
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (i / 8 - 0.5) * Math.PI * 0.9;
          return (
            <mesh key={`d${i}`} position={[Math.sin(a) * R * 0.71, Math.cos(a) * R * 0.71, 0]} rotation={[0, 0, -a + Math.PI / 4]}>
              <torusGeometry args={[0.035, 0.005, 6, 4]} />
              {rattan}
            </mesh>
          );
        })}
        {/* Coussin de dos */}
        <mesh position={[0, R * 0.32, 0.05]} geometry={softBoxGeometry(0.4, R * 0.5, 0.08, 0.035)} castShadow>
          {c.seat()}
        </mesh>
      </group>
    </group>
  );
}

function Egg({ c }: { c: ExtraChairContext }) {
  // Coque enveloppante ovoïde sur pied central en étoile, coussin d’assise.
  const shell = useMemo(() => {
    // Ouverture centrée sur +z (face au convive).
    const g = new THREE.SphereGeometry(0.42, 40, 24, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.82);
    g.scale(1, 1.35, 1);
    return g;
  }, []);
  const lining = useMemo(() => {
    const g = new THREE.SphereGeometry(0.4, 40, 24, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.8);
    g.scale(1, 1.35, 1);
    return g;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.024, 32]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.95} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.3, 14]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.95} roughness={0.12} />
      </mesh>
      <group position={[0, c.seatH + 0.26, -0.02]} rotation={[-0.12, 0, 0]}>
        <mesh geometry={shell} castShadow receiveShadow>{c.frame({ roughness: 0.3, metalness: 0.05, side: THREE.DoubleSide, clearcoat: 0.6 })}</mesh>
        <mesh geometry={lining}>{c.seat({ side: THREE.BackSide })}</mesh>
      </group>
      <mesh position={[0, c.seatH + 0.04, 0.06]} geometry={cushionGeometry(0.46, 0.09, 0.44, 0.5)} castShadow receiveShadow>
        {c.seat()}
      </mesh>
    </group>
  );
}

function Tulip({ c }: { c: ExtraChairContext }) {
  // Pied trompette d’un seul tenant et coque moulée en corolle.
  const foot = useMemo(() => lathe([[0, 0], [0.24, 0], [0.24, 0.012], [0.1, 0.04], [0.035, 0.14], [0.03, c.seatH - 0.05], [0.07, c.seatH - 0.01], [0, c.seatH - 0.01]], 40), [c.seatH]);
  const shell = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.29, 0.21, c.backH * 1.05, 40, 1, true, Math.PI * 0.6, Math.PI * 0.8);
    return g;
  }, [c.backH]);
  return (
    <group>
      <mesh geometry={foot} castShadow receiveShadow>{c.frame({ roughness: 0.25, metalness: 0.1, clearcoat: 0.8 })}</mesh>
      <mesh position={[0, c.seatH, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.235, 0.2, 0.04, 36]} />
        {c.frame({ roughness: 0.25, metalness: 0.1, clearcoat: 0.8 })}
      </mesh>
      <mesh position={[0, c.seatH + c.backH * 0.5, -0.02]} rotation={[-0.12, 0, 0]} geometry={shell} castShadow>
        {c.frame({ roughness: 0.25, metalness: 0.1, clearcoat: 0.8, side: THREE.DoubleSide })}
      </mesh>
      <mesh position={[0, c.seatH + 0.035, 0.015]} geometry={cushionGeometry(0.4, 0.045, 0.38, 0.6)} castShadow>
        {c.seat()}
      </mesh>
    </group>
  );
}

function LadderBack({ c }: { c: ExtraChairContext }) {
  // Chaise paillée champêtre : montants tournés, assise en paille tressée, barrettes cintrées.
  return (
    <group>
      <Legs c={c} inset={0.4} profile="turned" r={0.017} />
      {/* Barreaux d’entretoise */}
      {[0.25, 0.55].map((t) => (
        <React.Fragment key={t}>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * c.sw * 0.4, c.seatH * t, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.007, 0.007, c.sd * 0.8, 8]} />
              {c.frame({ roughness: 0.55, metalness: 0 })}
            </mesh>
          ))}
          <mesh position={[0, c.seatH * (t + 0.08), c.sd * 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.007, 0.007, c.sw * 0.8, 8]} />
            {c.frame({ roughness: 0.55, metalness: 0 })}
          </mesh>
        </React.Fragment>
      ))}
      {/* Assise paillée (tressage) */}
      <mesh position={[0, c.seatH, 0]} geometry={softBoxGeometry(c.sw * 0.86, 0.03, c.sd * 0.86, 0.01)} castShadow receiveShadow>
        {c.seat({ roughness: 0.9, metalness: 0 })}
      </mesh>
      {/* Montants arrière prolongés */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * c.sw * 0.4, c.seatH + c.backH * 0.52, -c.sd * 0.4]} rotation={[-0.08, 0, 0]} geometry={legGeometry(c.backH * 1.04, 0.014, 0.017, 'turned')} castShadow>
          {c.frame({ roughness: 0.55, metalness: 0 })}
        </mesh>
      ))}
      {/* Barrettes en échelle, légèrement cintrées */}
      {[0.35, 0.6, 0.85].map((t) => (
        <mesh key={t} position={[0, c.seatH + c.backH * t, -c.sd * 0.4 - c.backH * t * 0.08]} rotation={[-0.08, 0, 0]} geometry={softBoxGeometry(c.sw * 0.8, 0.05, 0.016, 0.006)} castShadow>
          {c.frame({ roughness: 0.55, metalness: 0 })}
        </mesh>
      ))}
    </group>
  );
}

function Barrel({ c }: { c: ExtraChairContext }) {
  // Fauteuil tonneau : dossier bas arrondi continu avec les accoudoirs, pieds compas.
  const R = c.sw * 0.56;
  const h = c.backH * 0.85;
  return (
    <group>
      <Legs c={{ ...c, seatH: c.seatH * 0.6 }} inset={0.36} profile="taper" r={0.016} splay={0.12} />
      <mesh position={[0, c.seatH * 0.62, 0]} castShadow>
        <cylinderGeometry args={[R * 1.02, R * 0.98, 0.08, 40]} />
        {c.seat()}
      </mesh>
      <mesh position={[0, c.seatH - 0.01, 0.01]} castShadow receiveShadow>
        <cylinderGeometry args={[R * 0.96, R * 0.98, 0.11, 40]} />
        {c.seat()}
      </mesh>
      {/* Enveloppe du dossier (3/4 de cercle) + bourrelet */}
      <mesh position={[0, c.seatH * 0.62 + h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, h, 40, 1, true, Math.PI * 0.32, Math.PI * 1.36]} />
        {c.seat({ side: THREE.DoubleSide })}
      </mesh>
      <mesh position={[0, c.seatH * 0.62 + h, 0]} rotation={[Math.PI / 2, 0, Math.PI * 0.82]} castShadow>
        <torusGeometry args={[R, 0.035, 10, 40, Math.PI * 1.36]} />
        {c.seat()}
      </mesh>
    </group>
  );
}

function Shell({ c }: { c: ExtraChairContext }) {
  // Fauteuil coquillage : dossier en éventail de cannelures rembourrées, assise galette.
  const flutes = 9;
  const R = c.backH * 0.95;
  return (
    <group>
      <Legs c={{ ...c, seatH: c.seatH * 0.85 }} inset={0.34} profile="taper" r={0.015} splay={0.08} />
      <mesh position={[0, c.seatH * 0.85 + 0.03, 0.02]} geometry={cushionGeometry(c.sw * 1.05, 0.12, c.sd * 0.95, 0.4)} castShadow receiveShadow>
        {c.seat()}
      </mesh>
      <group position={[0, c.seatH * 0.85 + 0.08, -c.sd * 0.36]} rotation={[-0.2, 0, 0]}>
        {/* Coque arrière en demi-disque qui tient les cannelures */}
        <mesh position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[R * 0.82, R * 0.82, 0.03, 40, 1, false, Math.PI / 2, Math.PI]} />
          {c.seat()}
        </mesh>
        {Array.from({ length: flutes }).map((_, i) => {
          const a = (i / (flutes - 1) - 0.5) * Math.PI * 0.78;
          return (
            <mesh key={i} position={[Math.sin(a) * R * 0.4, Math.cos(a) * R * 0.4, 0]} rotation={[0, 0, -a]} scale={[1, 1, 0.75]} castShadow>
              <capsuleGeometry args={[0.052, R * 0.6, 6, 14]} />
              {c.seat()}
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Acapulco({ c }: { c: ExtraChairContext }) {
  // Structure métal et cordage tressé en ovale, assise inclinée façon hamac.
  const ringTop = 0.3;
  const cords = 13;
  return (
    <group>
      {/* Piètement tubulaire */}
      {([-1, 1] as const).map((sx) => (
        <React.Fragment key={sx}>
          <mesh position={[sx * 0.26, 0.22, 0.12]} rotation={[0.25, 0, sx * 0.1]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.46, 8]} />
            {c.frame({ metalness: 0.8, roughness: 0.3 })}
          </mesh>
          <mesh position={[sx * 0.22, 0.28, -0.16]} rotation={[-0.35, 0, sx * 0.08]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.58, 8]} />
            {c.frame({ metalness: 0.8, roughness: 0.3 })}
          </mesh>
        </React.Fragment>
      ))}
      <group position={[0, c.seatH + 0.08, -0.04]} rotation={[-1.05, 0, 0]}>
        {/* Anneaux ovales : assise (petit) et dossier (grand) */}
        <mesh scale={[1, 1.3, 1]} castShadow>
          <torusGeometry args={[ringTop, 0.01, 8, 48]} />
          {c.frame({ metalness: 0.8, roughness: 0.3 })}
        </mesh>
        {/* Cordage tressé : cordes tendues d’un bord à l’autre */}
        {Array.from({ length: cords }).map((_, i) => {
          const t = (i / (cords - 1)) * 2 - 1;
          const len = Math.sqrt(Math.max(0, 1 - t * t)) * ringTop * 2 * 1.3;
          return (
            <mesh key={i} position={[t * ringTop * 0.97, 0, -0.03 * (1 - t * t)]} castShadow>
              <cylinderGeometry args={[0.005, 0.005, len, 5]} />
              {c.seat({ roughness: 0.6 })}
            </mesh>
          );
        })}
        {Array.from({ length: cords }).map((_, i) => {
          const t = (i / (cords - 1)) * 2 - 1;
          const len = Math.sqrt(Math.max(0, 1 - t * t)) * ringTop * 2;
          return (
            <mesh key={`h${i}`} position={[0, t * ringTop * 1.26, -0.03 * (1 - t * t)]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.005, 0.005, len, 5]} />
              {c.seat({ roughness: 0.6 })}
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Parsons({ c }: { c: ExtraChairContext }) {
  // Chaise Parsons : entièrement tapissée, dossier haut droit, pieds bois apparents.
  const legH = c.seatH - 0.08;
  return (
    <group>
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * c.sw * 0.42, legH / 2, sz * c.sd * 0.42]} geometry={legGeometry(legH, 0.017, 0.013, 'taper')} castShadow>
            {c.frame({ roughness: 0.5, metalness: 0 })}
          </mesh>
        )),
      )}
      <mesh position={[0, c.seatH - 0.03, 0]} geometry={softBoxGeometry(c.sw * 0.98, 0.11, c.sd * 0.98, 0.03)} castShadow receiveShadow>
        {c.seat()}
      </mesh>
      <mesh position={[0, c.seatH + c.backH * 0.55, -c.sd * 0.44]} rotation={[-0.06, 0, 0]} geometry={softBoxGeometry(c.sw * 0.98, c.backH * 1.15, 0.07, 0.03)} castShadow>
        {c.seat()}
      </mesh>
      {/* Passepoil le long du dossier */}
      <mesh position={[0, c.seatH + c.backH * 1.12, -c.sd * 0.47]} rotation={[-0.06, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.009, 0.009, c.sw * 0.96, 8]} />
        {c.seat({ roughness: 0.7 })}
      </mesh>
    </group>
  );
}

/** Rendu d’un style ajouté, ou null si le style est géré par la chaise catalogue. */
export function ExtraChairStyleMesh({ style, c }: { style: ChairStyle; c: ExtraChairContext }) {
  switch (style) {
    case 'throne':
      return <Throne c={c} />;
    case 'peacock':
      return <Peacock c={c} />;
    case 'egg':
      return <Egg c={c} />;
    case 'tulip':
      return <Tulip c={c} />;
    case 'ladderBack':
      return <LadderBack c={c} />;
    case 'barrel':
      return <Barrel c={c} />;
    case 'shell':
      return <Shell c={c} />;
    case 'acapulco':
      return <Acapulco c={c} />;
    case 'parsons':
      return <Parsons c={c} />;
    default:
      return null;
  }
}
