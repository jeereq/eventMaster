import { ImageResponse } from 'next/og';
import { fetchPublicSiteSnapshot } from '@/lib/publicSiteServer';
import {
  BRAND_LOGO_DARK,
  BRAND_LOGO_MINT,
  BRAND_LOGO_PATH_PETALS,
  BRAND_LOGO_PATH_STAR,
  BRAND_LOGO_TILE_BG,
  BRAND_LOGO_VIEWBOX,
} from '@/lib/brandLogo';

export const dynamic = 'force-dynamic';
export const alt = 'EventMaster';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const site = await fetchPublicSiteSnapshot();
  const primary = site.brandPrimary || '#31714c';
  const accent = site.brandAccent || '#6ee6b6';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: `linear-gradient(135deg, ${primary} 0%, ${accent} 58%, #10291c 100%)`,
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: BRAND_LOGO_TILE_BG,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <svg width="56" height="56" viewBox={BRAND_LOGO_VIEWBOX} style={{ display: 'flex' }}>
              <path d={BRAND_LOGO_PATH_PETALS} fill={BRAND_LOGO_DARK} />
              <path d={BRAND_LOGO_PATH_STAR} fill={BRAND_LOGO_MINT} />
            </svg>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.4 }}>{site.platformName}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980 }}>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.12 }}>{site.platformTagline}</div>
          <div style={{ fontSize: 24, opacity: 0.88 }}>Salles, prestataires, invitations et accueil — en un clic.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
