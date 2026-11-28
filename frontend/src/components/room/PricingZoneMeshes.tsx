'use client';

/**
 * Zone tarifaire de billetterie (VIP, Carré d’Or, Standard…) vue en 3D :
 * - voile coloré translucide au sol, qui laisse voir le parquet ou la moquette de la salle ;
 * - liseré de la couleur de la zone sur le pourtour ;
 * - étiquette « nom · prix » qui reste lisible en aperçu, comme sur le plan 2D.
 * Le voile ne capte pas les clics : on touche toujours les tables et les chaises posées dessus.
 */

import { Html } from '@react-three/drei';
import { isLightHexColor } from '@/lib/ticketPricing';
import { formatFc } from '@/config/landingPricing';

const EDGE_W = 0.07;
const EDGE_H = 0.012;
const noRaycast = () => null;

export function PricingZoneSurface({
  w,
  h,
  color = '#c4a35a',
  name,
  priceFc,
  selected = false,
  showLabel = true,
  rows = false,
  elevationM = 0,
}: {
  w: number;
  h: number;
  color?: string;
  name: string;
  priceFc: number;
  selected?: boolean;
  showLabel?: boolean;
  /** Rangées (cinéma, gradins) : les fauteuils portent la couleur ; seul un liseré au sol et l’étiquette sur le côté. */
  rows?: boolean;
  elevationM?: number;
}) {
  const light = isLightHexColor(color);
  const edges: Array<[number, number, number, number]> = [
    [0, -h / 2, w, EDGE_W],
    [0, h / 2, w, EDGE_W],
    [-w / 2, 0, EDGE_W, h],
    [w / 2, 0, EDGE_W, h],
  ];
  const pill = (
    <span
      className="flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-extrabold leading-none shadow-md ring-2 ring-white/80"
      style={{
        backgroundColor: color,
        color: light ? '#111827' : '#ffffff',
        transform: rows ? 'translate(-55%, 0)' : 'translate(50%, -70%)',
      }}
    >
      <span>{name}</span>
      {priceFc > 0 ? <span className="font-bold opacity-90 tabular-nums">· {formatFc(priceFc)}</span> : null}
    </span>
  );

  if (rows) {
    // Gradins : un voile au sol serait caché sous les marches. L’étiquette flotte dans l’allée latérale.
    return showLabel ? (
      <Html
        zIndexRange={[15, 0]}
        center
        distanceFactor={14}
        position={[-w / 2, elevationM + 0.9, 0]}
        style={{ pointerEvents: 'none' }}
      >
        {pill}
      </Html>
    ) : null;
  }

  return (
    <group>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast} renderOrder={1}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.42 : 0.26}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      {edges.map(([x, z, ew, eh], i) => (
        <mesh key={i} position={[x, EDGE_H / 2 + 0.004, z]} raycast={noRaycast}>
          <boxGeometry args={[ew, EDGE_H, eh]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.6} />
        </mesh>
      ))}
      {showLabel ? (
        <Html
          zIndexRange={[15, 0]}
          center
          distanceFactor={14}
          position={[-w / 2, 0.02, -h / 2]}
          style={{ pointerEvents: 'none' }}
        >
          {pill}
        </Html>
      ) : null}
    </group>
  );
}
