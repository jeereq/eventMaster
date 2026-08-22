'use client';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import type { ScenicLightSettings } from '@/lib/roomRenderQuality';

type RoomShowcasePostProcessingProps = {
  lighting: ScenicLightSettings;
};

/** Bloom + vignette légers, calibrés selon l’ambiance (showcase uniquement). */
export default function RoomShowcasePostProcessing({ lighting }: RoomShowcasePostProcessingProps) {
  const bloomIntensity =
    lighting.preset === 'night' ? 0.9
      : lighting.preset === 'dusk' ? 0.58
        : lighting.preset === 'banquet' ? 0.48
          : lighting.preset === 'tent' ? 0.35
            : 0.22;

  const bloomThreshold =
    lighting.preset === 'night' ? 0.72
      : lighting.preset === 'day' ? 0.9
        : 0.82;

  const vignetteDarkness =
    lighting.preset === 'night' ? 0.74
      : lighting.preset === 'dusk' ? 0.6
        : 0.45;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.38}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.32} darkness={vignetteDarkness} />
    </EffectComposer>
  );
}
