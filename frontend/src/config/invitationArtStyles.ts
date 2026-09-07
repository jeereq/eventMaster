export type InvitationArtStyleId =
  | 'realiste'
  | 'dessin-anime'
  | 'illustration'
  | 'aquarelle'
  | 'stylise-3d';

export const DEFAULT_INVITATION_ART_STYLE: InvitationArtStyleId = 'realiste';

export const INVITATION_ART_STYLES: Array<{
  id: InvitationArtStyleId;
  label: string;
  summary: string;
}> = [
  {
    id: 'realiste',
    label: 'Réaliste',
    summary: 'Photo 85 mm : pores, or, lumière Kinshasa.',
  },
  {
    id: 'dessin-anime',
    label: 'Dessin animé',
    summary: 'Long métrage 2D, plans, lumière unique.',
  },
  {
    id: 'illustration',
    label: 'Illustration',
    summary: 'Affiche peinte, clair-obscur, volume.',
  },
  {
    id: 'aquarelle',
    label: 'Aquarelle',
    summary: 'Lavis en profondeur, pigment et or.',
  },
  {
    id: 'stylise-3d',
    label: '3D stylisé',
    summary: 'Cinéma 3D, halo, ombres au sol.',
  },
];

const STYLE_IDS = new Set(INVITATION_ART_STYLES.map((item) => item.id));

export function parseInvitationArtStyle(raw: unknown): InvitationArtStyleId {
  if (typeof raw !== 'string') return DEFAULT_INVITATION_ART_STYLE;
  const id = raw.trim().toLowerCase() as InvitationArtStyleId;
  return STYLE_IDS.has(id) ? id : DEFAULT_INVITATION_ART_STYLE;
}

const STORAGE_KEY = 'em-invitation-art-style';

export function readStoredInvitationArtStyle(): InvitationArtStyleId {
  if (typeof window === 'undefined') return DEFAULT_INVITATION_ART_STYLE;
  try {
    return parseInvitationArtStyle(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_INVITATION_ART_STYLE;
  }
}

export function persistInvitationArtStyle(id: InvitationArtStyleId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* quota / private */
  }
}
