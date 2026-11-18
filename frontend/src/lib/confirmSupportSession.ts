/**
 * Confirmation avant d’ouvrir l’espace d’une organisation en session support (Super Admin).
 * L’action agit au nom du client : on la demande explicitement à chaque fois.
 */
export function confirmSupportSession(tenantName?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const target = tenantName ? `l’espace « ${tenantName} »` : 'l’espace de cette organisation';
  return window.confirm(`Ouvrir ${target} en session support ? Vos modifications seront visibles par le client.`);
}
