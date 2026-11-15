'use client';

import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing';
import type { ScenicLightSettings } from '@/lib/roomRenderQuality';

type RoomShowcasePostProcessingProps = {
  lighting: ScenicLightSettings;
};

/**
 * Rendu vitrine (showcase uniquement) : occlusion ambiante, bloom et vignette légers
 * calibrés selon l’ambiance, puis anti-crénelage (le composeur coupe le MSAA).
 */
export default function RoomShowcasePostProcessing({ lighting }: RoomShowcasePostProcessingProps) {
  const bloomIntensity =
    lighting.preset === 'night' ? 0.9
      : lighting.preset === 'dusk' ? 0.58
        : lighting.preset === 'banquet' ? 0.42
          : lighting.preset === 'tent' ? 0.35
            : 0.22;

  const bloomThreshold =
    lighting.preset === 'night' ? 0.72
      : lighting.preset === 'day' ? 0.9
        : lighting.preset === 'banquet' ? 0.78
          : 0.82;

  const vignetteDarkness =
    lighting.preset === 'night' ? 0.74
      : lighting.preset === 'dusk' ? 0.6
        : 0.45;

  // Occlusion ambiante : assombrit les coins, le dessous des tables et le pied des
  // chaises, là où la lumière indirecte n’arrive pas. Rayon en mètres (échelle d’une salle).
  const aoIntensity = lighting.preset === 'night' ? 3 : lighting.preset === 'day' ? 4 : 3.5;

  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.5} distanceFalloff={1} intensity={aoIntensity} quality="medium" halfRes depthAwareUpsampling />
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.38}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.32} darkness={vignetteDarkness} />
      <SMAA />
    </EffectComposer>
  );
}
