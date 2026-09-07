/** Accès restreint du rôle protocole (accueil jour J, pas d’atelier créatif). */

export function isProtocolUser(access?: { isProtocolOnly?: boolean } | null): boolean {
  return Boolean(access?.isProtocolOnly);
}

export const PROTOCOL_CREATIVE_DENIED =
  'Votre rôle protocole permet d’accueillir les invités, pas de créer des modèles d’invitation ni des plans de salle.';
