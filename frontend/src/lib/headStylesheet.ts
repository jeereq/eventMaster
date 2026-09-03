'use client';

import { useEffect, useMemo } from 'react';

/**
 * Injecte une feuille de style dans document.head hors de l’arbre React.
 * Ne jamais rendre <link rel="stylesheet"> dans le body : le navigateur
 * le déplace dans <head>, puis React plante au démontage
 * (Cannot read properties of null (reading 'removeChild')).
 */
export function ensureHeadStylesheet(href: string, id: string) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(id) as HTMLLinkElement | null;
  if (existing) {
    if (existing.getAttribute('href') !== href) existing.href = href;
    return;
  }
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function useHeadStylesheet(href: string | null | undefined, id: string, enabled = true) {
  useEffect(() => {
    if (!enabled || !href) return;
    ensureHeadStylesheet(href, id);
  }, [href, id, enabled]);
}

/** Paramètres Google Fonts CSS2 par famille d’invitation. */
export const INVITATION_FONT_CATALOG: Record<string, string> = {
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400',
  'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,700;1,400',
  'Great Vibes': 'Great+Vibes',
  'Alex Brush': 'Alex+Brush',
  Montserrat: 'Montserrat:wght@300;400;500;600;700',
  Cinzel: 'Cinzel:wght@400;600;700',
  'Dancing Script': 'Dancing+Script:wght@500;700',
  'Pinyon Script': 'Pinyon+Script',
  'Monsieur La Doulaise': 'Monsieur+La+Doulaise',
  Italiana: 'Italiana',
  'Bodoni Moda': 'Bodoni+Moda:ital,wght@0,400;0,700;1,400',
  Allura: 'Allura',
  Parisienne: 'Parisienne',
  Prata: 'Prata',
  Sacramento: 'Sacramento',
  Marcellus: 'Marcellus',
};

export const INVITATION_FONT_FAMILY_IDS = Object.keys(INVITATION_FONT_CATALOG);

const DEFAULT_INVITATION_FONTS = ['Cormorant Garamond', 'Montserrat'] as const;

export const INVITATION_GOOGLE_FONTS_ID = 'em-invitation-google-fonts';

export function buildInvitationGoogleFontsHref(families: Iterable<string>): string {
  const unique = new Set<string>();
  for (const raw of families) {
    const name = String(raw || '').trim();
    if (name && INVITATION_FONT_CATALOG[name]) unique.add(name);
  }
  for (const fallback of DEFAULT_INVITATION_FONTS) unique.add(fallback);

  const params = [...unique]
    .sort()
    .map((name) => `family=${INVITATION_FONT_CATALOG[name]}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Bundle complet — éditeur de modèles uniquement. */
export const INVITATION_GOOGLE_FONTS_HREF = buildInvitationGoogleFontsHref(INVITATION_FONT_FAMILY_IDS);

export function collectInvitationFontFamilies(
  elements?: Array<{ fontFamily?: string | null } | null> | null,
  extras: string[] = [],
): string[] {
  const out = new Set<string>(DEFAULT_INVITATION_FONTS);
  for (const el of elements || []) {
    const name = el?.fontFamily?.trim();
    if (name) out.add(name);
  }
  for (const extra of extras) {
    const name = extra?.trim();
    if (name) out.add(name);
  }
  return [...out];
}

/** Charge uniquement les familles demandées (vue RSVP / impression). */
export function useInvitationFonts(
  families: string[] | null | undefined,
  enabled = true,
  id = INVITATION_GOOGLE_FONTS_ID,
) {
  const familyKey = (families || []).slice().sort().join('|');
  const href = useMemo(() => {
    if (!enabled) return null;
    return buildInvitationGoogleFontsHref(familyKey ? familyKey.split('|') : DEFAULT_INVITATION_FONTS);
  }, [enabled, familyKey]);

  useHeadStylesheet(href, id, enabled && Boolean(href));
}
