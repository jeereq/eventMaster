/** Chemin interne sûr pour les redirections post-auth (`?next=`). */
export function safeAppPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return null;
  return path;
}

export function isClientReturnPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return (
    path.startsWith('/evenements')
    || path.startsWith('/marketplace')
    || path.startsWith('/dashboard/catalogue')
    || path.startsWith('/dashboard/tickets')
    || path.startsWith('/dashboard/bookings')
  );
}

export function clientLoginHref(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function clientRegisterHref(nextPath: string) {
  return `/register?kind=CLIENT&next=${encodeURIComponent(nextPath)}`;
}

export function eventPublicHref(slug: string) {
  return `/marketplace/evenements/${slug}`;
}

export function eventPublicListHref() {
  return '/marketplace/evenements';
}
