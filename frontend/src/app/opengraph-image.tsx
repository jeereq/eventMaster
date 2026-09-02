import { ImageResponse } from 'next/og';
import { fetchPublicSiteSnapshot } from '@/lib/publicSiteServer';

export const dynamic = 'force-dynamic';
export const alt = 'EventMaster';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const site = await fetchPublicSiteSnapshot();

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
          background: `linear-gradient(135deg, ${site.brandPrimary} 0%, ${site.brandAccent} 58%, #022c22 100%)`,
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: 'rgba(255,255,255,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background: '#fbbf24',
                transform: 'rotate(45deg)',
              }}
            />
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.4 }}>{site.platformName}</div>
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
