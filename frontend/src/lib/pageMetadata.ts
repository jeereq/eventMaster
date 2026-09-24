import type { Metadata } from 'next';

const SITE_NAME = 'EventMaster';

/**
 * Métadonnées d’une page publique (titre, description, aperçu de partage).
 * `openGraph` est redéfini explicitement : sinon WhatsApp, SMS et e-mail
 * reprennent le titre générique défini dans le layout racine.
 */
export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = `${title} — ${SITE_NAME}`;
  return {
    title: fullTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      siteName: SITE_NAME,
      url: path,
      title: fullTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  };
}
