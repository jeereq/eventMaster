import type { MetadataRoute } from 'next';
import { getMetadataBase } from '@/lib/publicSiteServer';

/** Espaces privés (compte, invités, vérifications) exclus de l’indexation. */
export default function robots(): MetadataRoute.Robots {
  const base = getMetadataBase().toString().replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/rsvp',
          '/editeur',
          '/editeur-3d',
          '/verify-email',
          '/verify-otp',
          '/reset-password',
          '/ask-reset-password',
          '/*/succes',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
