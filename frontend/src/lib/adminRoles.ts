export function platformRoleLabel(role?: string | null): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'COMMERCIAL') return 'Commercial plateforme';
  if (role === 'USER') return 'Membre organisation';
  return role || '—';
}

export function orgRoleLabel(orgRole?: string | null, isOwner?: boolean): string {
  if (isOwner) return 'Propriétaire';
  if (orgRole === 'MANAGER') return 'Manager';
  if (orgRole === 'PROTOCOL') return 'Protocole';
  if (orgRole === 'COMMERCIAL') return 'Commercial org.';
  return '';
}

export function accountKindShortLabel(kind?: string | null): string {
  if (kind === 'ORGANIZER') return 'Organisateur';
  if (kind === 'VENDOR') return 'Prestataire';
  if (kind === 'BOTH') return 'Les deux';
  if (kind === 'CLIENT') return 'Client catalogue';
  return '';
}

export function formatCommissionPercent(rate?: number | null): string | null {
  if (rate == null || Number.isNaN(Number(rate))) return null;
  return `${Math.round(Number(rate) * 1000) / 10} %`;
}

export function formatAdminDate(value?: string | null, withTime = false): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(
    'fr-FR',
    withTime
      ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: 'numeric' },
  );
}
