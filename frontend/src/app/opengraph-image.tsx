import { ImageResponse } from 'next/og';
import { fetchPublicSiteSnapshot } from '@/lib/publicSiteServer';

export const dynamic = 'force-dynamic';
export const alt = 'EventMaster';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const site = await fetchPublicSiteSnapshot();
  const primary = site.brandPrimary || '#059669';
  const accent = site.brandAccent || '#10b981';

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
          background: `linear-gradient(135deg, ${primary} 0%, ${accent} 58%, #022c22 100%)`,
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: `linear-gradient(135deg, ${primary}, ${accent})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <svg
              width="50"
              height="50"
              viewBox="0 0 512 512"
              style={{ display: 'flex' }}
            >
              <path
                d="M256 0 C256 150 362 256 512 256 C362 256 256 362 256 512 C256 362 150 256 0 256 C150 256 256 150 256 0 Z"
                fill="#fbbf24"
              />
              <path
                d="M384 128 C384 180 437 224 512 224 C437 224 384 268 384 320 C384 268 331 224 256 224 C331 224 384 180 384 128 Z"
                fill="#ffffff"
                opacity="0.85"
              />
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
