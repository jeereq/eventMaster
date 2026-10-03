/**
 * Pages publiques où le bouton flottant des studios IA n'a pas sa place :
 * espace invité, impression, connexion, contact (le bouton couvrait l'envoi du
 * formulaire), pages légales et fiches qui ont déjà leur propre barre d'action
 * (prix, devis, réservation), dont le simulateur lui-même.
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
  '/contact',
  '/privacy',
  '/terms',
  '/refund',
  // Le simulateur affiche déjà le solde et les trois studios : le bouton flottant ferait doublon.
  '/simulateur',
];

const LISTING_DETAIL =
  /^\/(marketplace\/(salles|prestataires|evenements|locations|boissons)|evenements)\/[^/]+/;

export function isAiFabHiddenRoute(pathname: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || LISTING_DETAIL.test(pathname);
}
