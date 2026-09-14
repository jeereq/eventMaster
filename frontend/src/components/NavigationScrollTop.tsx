'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motionSafeScrollBehavior } from '@/lib/prefersReducedMotion';

const ANCHOR_RETRY_INTERVAL_MS = 100;
const ANCHOR_MAX_RETRIES = 12;
const ASYNC_LAYOUT_SETTLE_MS = 60;

/** Vérifie si une chaîne représente une ancre valide vers une section (non vide). */
function hasValidSectionAnchor(hash?: string | null): boolean {
  if (!hash) return false;
  const clean = hash.replace(/^#/, '').trim();
  return clean.length > 0;
}

/** Fait défiler la vue vers l'élément de section ciblé par l'ancre s'il existe. */
function scrollToAnchorElement(targetId: string): boolean {
  const element = document.getElementById(targetId);
  if (!element) return false;

  element.scrollIntoView({
    behavior: motionSafeScrollBehavior(),
    block: 'start',
  });
  return true;
}

/**
 * Réinitialise le défilement au sommet de la page.
 * Gère à la fois la fenêtre globale et les conteneurs avec scrollbar interne (ex: Dashboard layout).
 */
function resetScrollPositionToTop(instant = true): void {
  if (typeof window === 'undefined') return;

  // Ne pas réinitialiser si l'URL courante comporte déjà une ancre active
  if (hasValidSectionAnchor(window.location.hash)) return;

  const behavior: ScrollBehavior = instant ? 'instant' : motionSafeScrollBehavior();

  try {
    window.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    window.scrollTo(0, 0);
  }

  if (instant) {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  // Conteneur principal avec scrollbar interne (Dashboard layout #main-content)
  const mainContent = document.getElementById('main-content');
  if (mainContent && typeof mainContent.scrollTop === 'number' && mainContent.scrollTop > 0) {
    if (instant) {
      mainContent.scrollTop = 0;
    } else {
      mainContent.scrollTo({ top: 0, behavior });
    }
  }
}

/**
 * Composant contrôleur de navigation :
 * Garantit un scroll top systématique lors des changements de page,
 * sauf lorsqu'une ancre cible une section spécifique de la page.
 */
export default function NavigationScrollTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathnameRef = useRef<string | null>(null);
  const pendingAnchorHashRef = useRef<string | null>(null);

  // Désactivation de la restauration automatique imprévisible du navigateur pour les SPA Next.js
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {
        // Fallback sécurisé pour les navigateurs restreints
      }
    }
  }, []);

  // Détection des clics sur les liens de navigation internes
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchorElement = target.closest('a');
      if (!anchorElement) return;

      const rawHref = anchorElement.getAttribute('href');
      if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

      // Si le lien cliqué contient une ancre vers une section (ex: /#services, #tarifs, /plans-3d#plan-viewer)
      if (hasValidSectionAnchor(anchorElement.hash)) {
        pendingAnchorHashRef.current = anchorElement.hash;
        return;
      }

      pendingAnchorHashRef.current = null;

      // Si le lien pointe vers la page courante sans ancre (ex: clic sur l'onglet actif)
      try {
        const url = new URL(anchorElement.href, window.location.href);
        if (url.origin === window.location.origin) {
          const isSamePath = url.pathname === window.location.pathname;
          const hasNoAnchor = !hasValidSectionAnchor(url.hash);
          if (isSamePath && hasNoAnchor) {
            // Retour doux en haut de la page actuelle
            resetScrollPositionToTop(false);
          }
        }
      } catch {
        // Ignorer les URLs non standard
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, []);

  // Réaction aux transitions de route (changement de page)
  useEffect(() => {
    const isFirstMount = previousPathnameRef.current === null;
    const isPageChange = previousPathnameRef.current !== null && previousPathnameRef.current !== pathname;
    previousPathnameRef.current = pathname;

    const requestedAnchor = window.location.hash || pendingAnchorHashRef.current || '';

    // Si une ancre vers une section est demandée : respecter la cible sans scroller en haut
    if (hasValidSectionAnchor(requestedAnchor)) {
      const targetSectionId = requestedAnchor.replace(/^#/, '');
      if (!scrollToAnchorElement(targetSectionId)) {
        // Observer l'apparition de l'élément si le composant est en lazy loading / suspense
        let attempts = 0;
        const intervalId = window.setInterval(() => {
          attempts++;
          if (scrollToAnchorElement(targetSectionId) || attempts >= ANCHOR_MAX_RETRIES) {
            window.clearInterval(intervalId);
          }
        }, ANCHOR_RETRY_INTERVAL_MS);
      }
      pendingAnchorHashRef.current = null;
      return;
    }

    pendingAnchorHashRef.current = null;

    // Scroll top systématique lors d'un changement de page sans ancre
    if (isPageChange || isFirstMount) {
      resetScrollPositionToTop(true);

      // Deuxième passe sur l'animation frame pour sécuriser le rendu asynchrone / Suspense
      const rafId = window.requestAnimationFrame(() => {
        if (!hasValidSectionAnchor(window.location.hash)) {
          resetScrollPositionToTop(true);
        }
      });

      // Troisième passe de stabilisation après hydratation des vues lourdes
      const timeoutId = window.setTimeout(() => {
        if (!hasValidSectionAnchor(window.location.hash)) {
          resetScrollPositionToTop(true);
        }
      }, ASYNC_LAYOUT_SETTLE_MS);

      return () => {
        window.cancelAnimationFrame(rafId);
        window.clearTimeout(timeoutId);
      };
    }
  }, [pathname, searchParams]);

  return null;
}
