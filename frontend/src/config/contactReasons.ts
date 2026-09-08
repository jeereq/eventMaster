export const CONTACT_REASON_IDS = [
  'demo',
  'pricing',
  'support',
  'billing',
  'refund',
  'ticketing',
  'marketplace',
  'account',
  'other',
] as const;

export type ContactReasonId = (typeof CONTACT_REASON_IDS)[number];

export interface ContactReason {
  id: ContactReasonId;
  label: string;
  defaultSubject: string;
  messagePlaceholder: string;
}

export const CONTACT_REASONS: ContactReason[] = [
  {
    id: 'demo',
    label: 'Démonstration',
    defaultSubject: 'Demande de démonstration',
    messagePlaceholder: 'Date, ville, nombre d’invités, et ce que vous souhaitez voir dans EventMaster.',
  },
  {
    id: 'pricing',
    label: 'Forfaits et tarifs',
    defaultSubject: 'Question sur les forfaits',
    messagePlaceholder: 'Le forfait qui vous intéresse, le volume d’événements, et vos questions tarifaires.',
  },
  {
    id: 'support',
    label: 'Support technique',
    defaultSubject: 'Demande de support technique',
    messagePlaceholder: 'La page ou l’action concernée, ce que vous attendiez, et ce qui s’affiche.',
  },
  {
    id: 'billing',
    label: 'Facturation et abonnement',
    defaultSubject: 'Question de facturation',
    messagePlaceholder: 'Forfait, date de paiement, et la question (facture, renouvellement, justificatif).',
  },
  {
    id: 'refund',
    label: 'Remboursement',
    defaultSubject: 'Demande de remboursement',
    messagePlaceholder:
      'Type (billet, abonnement, jetons IA, acompte), date, montant, numéro de transaction FlexPay, et e-mail du compte.',
  },
  {
    id: 'ticketing',
    label: 'Billet ou accueil QR',
    defaultSubject: 'Question billetterie ou scan QR',
    messagePlaceholder: 'Nom de l’événement, e-billet ou scan, et le problème rencontré.',
  },
  {
    id: 'marketplace',
    label: 'Salle, prestataire ou devis',
    defaultSubject: 'Question marketplace',
    messagePlaceholder: 'La salle ou le prestataire, la date, et votre question (devis, fiche, réservation).',
  },
  {
    id: 'account',
    label: 'Compte et accès',
    defaultSubject: 'Question sur mon compte',
    messagePlaceholder: 'L’e-mail du compte et le besoin (connexion, type de compte, accès organisation).',
  },
  {
    id: 'other',
    label: 'Autre',
    defaultSubject: 'Prise de contact',
    messagePlaceholder: 'Décrivez votre besoin en détail.',
  },
];

export function isContactReasonId(value: string): value is ContactReasonId {
  return (CONTACT_REASON_IDS as readonly string[]).includes(value);
}

export function getContactReason(id: ContactReasonId): ContactReason {
  return CONTACT_REASONS.find((reason) => reason.id === id) ?? CONTACT_REASONS[CONTACT_REASONS.length - 1];
}
