export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Message d'erreur si le mot de passe est refusé, sinon null. */
export function passwordPolicyError(password: unknown): string | null {
  if (typeof password !== 'string') return 'Le mot de passe est obligatoire.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`;
  }
  return null;
}
