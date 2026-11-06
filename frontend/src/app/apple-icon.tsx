import { ImageResponse } from 'next/og';
import {
  BRAND_LOGO_DARK,
  BRAND_LOGO_MINT,
  BRAND_LOGO_PATH_PETALS,
  BRAND_LOGO_PATH_STAR,
  BRAND_LOGO_TILE_BG,
  BRAND_LOGO_VIEWBOX,
} from '@/lib/brandLogo';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_LOGO_TILE_BG,
          borderRadius: 0,
        }}
      >
        <svg width="128" height="128" viewBox={BRAND_LOGO_VIEWBOX} style={{ display: 'flex' }}>
          <path d={BRAND_LOGO_PATH_PETALS} fill={BRAND_LOGO_DARK} />
          <path d={BRAND_LOGO_PATH_STAR} fill={BRAND_LOGO_MINT} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
