import { ImageResponse } from 'next/og';
import { fetchPublicSiteSnapshot } from '@/lib/publicSiteServer';

export const dynamic = 'force-dynamic';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  const site = await fetchPublicSiteSnapshot();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${site.brandPrimary}, ${site.brandAccent})`,
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            background: '#fbbf24',
            transform: 'rotate(45deg)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
