import type { TenantAccountKind } from '@/lib/marketplace';
import type { VendorRegisterTrack } from '@/lib/registerVendorIntent';

export const REGISTER_KIND_ORDER: TenantAccountKind[] = ['ORGANIZER', 'CLIENT', 'VENDOR'];

export const REGISTER_KIND_TITLES: Record<TenantAccountKind, string> = {
  ORGANIZER: 'J’organise un événement',
  CLIENT: 'Je cherche une salle ou un prestataire',
  VENDOR: 'Je propose une salle ou un service',
  BOTH: 'J’organise et je vends',
};

export const REGISTER_KIND_DESCRIPTIONS: Record<TenantAccountKind, string> = {
  ORGANIZER: 'Invitations, réponses des invités, plan de table et accueil le jour J.',
  CLIENT: 'Compte gratuit : comparez, gardez des favoris, demandez un devis.',
  VENDOR: 'Publiez votre vitrine et recevez des demandes d’organisateurs.',
  BOTH: 'Un seul compte pour vos événements et votre activité.',
};

export function registerAccountSummary(
  kind: TenantAccountKind,
  vendorTrack: VendorRegisterTrack | null,
): string {
  if (vendorTrack === 'venue') {
    return 'Compte salle : vitrine, devis et calendrier de réservation.';
  }
  if (vendorTrack === 'service') {
    return 'Compte prestataire : offre visible, puis réponses aux devis.';
  }
  return REGISTER_KIND_DESCRIPTIONS[kind];
}

export function registerAccountFormTitle(
  kind: TenantAccountKind,
  vendorTrack: VendorRegisterTrack | null,
): string {
  if (vendorTrack === 'venue') return 'Créer le compte salle';
  if (vendorTrack === 'service') return 'Créer le compte prestataire';
  if (kind === 'CLIENT') return 'Créer le compte client';
  if (kind === 'VENDOR') return 'Créer le compte professionnel';
  if (kind === 'BOTH') return 'Créer le compte organisateur et vendeur';
  return 'Créer le compte organisateur';
}

export function registerAccountShortLabel(
  kind: TenantAccountKind,
  vendorTrack: VendorRegisterTrack | null,
): string {
  if (vendorTrack === 'venue') return 'Salle';
  if (vendorTrack === 'service') return 'Prestataire';
  return REGISTER_KIND_TITLES[kind];
}
