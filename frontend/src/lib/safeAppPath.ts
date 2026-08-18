/** Chemin interne sûr pour les redirections post-auth (`?next=`). */
export function safeAppPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return null;
  return path;
}
