/**
 * Pages publiques où le bouton flottant des studios IA n'a pas sa place :
 * espace invité, impression, connexion, pages légales et fiches qui ont déjà
 * leur propre barre d'action (prix, devis, réservation).
 */
const HIDDEN_PREFIXES = [
  '/rsvp/',
  '/invite/',
  '/print',
  '/login',
  '/register',
  '/ask-reset-password',
  '/reset-password',
  '/verify-email',
  '/verify-otp',
  '/privacy',
  '/terms',
  '/refund',
];

const LISTING_DETAIL =
  /^\/(marketplace\/(salles|prestataires|evenements|locations|boissons)|evenements)\/[^/]+/;

export function isAiFabHiddenRoute(pathname: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || LISTING_DETAIL.test(pathname);
}
