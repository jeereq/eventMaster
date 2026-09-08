export const CONTACT_REASON_LABELS: Record<string, string> = {
  demo: 'Démonstration',
  pricing: 'Forfaits et tarifs',
  support: 'Support technique',
  billing: 'Facturation et abonnement',
  refund: 'Remboursement',
  ticketing: 'Billet ou accueil QR',
  marketplace: 'Salle, prestataire ou devis',
  account: 'Compte et accès',
  other: 'Autre',
};

export function resolveContactReason(raw: unknown): { id: string; label: string } | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim();
  const label = CONTACT_REASON_LABELS[id];
  if (!label) return null;
  return { id, label };
}
