'use client';

import { useEffect } from 'react';

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

export function useHeadStylesheet(href: string, id: string) {
  useEffect(() => {
    ensureHeadStylesheet(href, id);
  }, [href, id]);
}

/** Polices des modèles d’invitation (éditeur + vue RSVP). */
export const INVITATION_GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Dancing+Script:wght@500;700&family=Great+Vibes&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Pinyon+Script&family=Monsieur+La+Doulaise&family=Italiana&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Allura&family=Parisienne&family=Prata&family=Sacramento&family=Marcellus&display=swap';

export const INVITATION_GOOGLE_FONTS_ID = 'em-invitation-google-fonts';
