export const LISTING_INQUIRE_EVENT = 'em:listing-inquire';

export function goToListingInquire() {
  if (typeof window === 'undefined') return;
  const desktop = window.matchMedia('(min-width: 1024px)').matches;
  if (desktop) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('listing-contact')?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    return;
  }
  window.dispatchEvent(new CustomEvent(LISTING_INQUIRE_EVENT));
}
