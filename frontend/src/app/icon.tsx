import { ImageResponse } from 'next/og';
import { fetchPublicSiteSnapshot } from '@/lib/publicSiteServer';

export const dynamic = 'force-dynamic';
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default async function Icon() {
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
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${primary}, ${accent})`,
          borderRadius: 16,
        }}
      >
        <svg
          width="42"
          height="42"
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
    ),
    { ...size },
  );
}
