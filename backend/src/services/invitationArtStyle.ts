export type InvitationArtStyleId =
  | 'realiste'
  | 'dessin-anime'
  | 'illustration'
  | 'aquarelle'
  | 'stylise-3d';

export const DEFAULT_INVITATION_ART_STYLE: InvitationArtStyleId = 'realiste';

const ALIASES: Record<string, InvitationArtStyleId> = {
  realiste: 'realiste',
  realistic: 'realiste',
  photoreal: 'realiste',
  'dessin-anime': 'dessin-anime',
  cartoon: 'dessin-anime',
  animation: 'dessin-anime',
  illustration: 'illustration',
  painted: 'illustration',
  aquarelle: 'aquarelle',
  watercolor: 'aquarelle',
  'stylise-3d': 'stylise-3d',
  '3d': 'stylise-3d',
  pixar: 'stylise-3d',
};

export function parseInvitationArtStyle(raw: unknown): InvitationArtStyleId {
  if (typeof raw !== 'string') return DEFAULT_INVITATION_ART_STYLE;
  const key = raw.trim().toLowerCase();
  return ALIASES[key] || DEFAULT_INVITATION_ART_STYLE;
}

export function invitationArtStyleLabel(id: InvitationArtStyleId): string {
  if (id === 'dessin-anime') return 'dessin animé';
  if (id === 'illustration') return 'illustration';
  if (id === 'aquarelle') return 'aquarelle';
  if (id === 'stylise-3d') return '3D stylisé';
  return 'réaliste';
}

/** Clause [Style] pour le scaffold Nano Banana. */
export function invitationArtStyleScaffoldLine(id: InvitationArtStyleId): string {
  switch (id) {
    case 'dessin-anime':
      return '2D animated-feature look, clean cel-shading, bold readable shapes, warm African palette; stylized likeness if people appear — no photoreal pores, no airbrush beauty';
    case 'illustration':
      return 'editorial painted illustration, visible brushwork, rich inks, prestige poster finish; faithful likeness if people appear — not photoreal, not cartoon gag';
    case 'aquarelle':
      return 'watercolor and gouache stationery, pigment blooms, paper tooth, soft edges; keep identity if people appear — no plastic skin, no CGI';
    case 'stylise-3d':
      return 'stylized cinema 3D, soft subsurface skin, crafted materials, warm key light; same people if referenced — not live-action photoreal, no Caucasian default';
    default:
      return 'photoreal 35mm editorial print look; natural materials (cotton paper, gold foil, fresh florals); warm volumetric light; no CGI, no cartoon, no airbrushed beauty faces';
  }
}

/** Bloc imposé au modèle image. */
export function invitationArtStyleImageDirective(id: InvitationArtStyleId): string {
  switch (id) {
    case 'dessin-anime':
      return [
        'ART STYLE — DESSIN ANIMÉ (MANDATORY): Render the whole card as a 2D animated feature still — clean line, cel-shading, expressive but controlled faces, designed fabrics (wax, satin, gold as painted materials).',
        'If reference photos exist: keep EACH person as the same individual (bone structure, eyes, smile, cheeks, skin tone, hair) but draw them as animated characters. Do not stay photoreal. Do not caricature ethnicity or lighten skin.',
        'Forbidden: live-action photography, plastic 3D, airbrush beauty, Caucasian stock faces.',
      ].join(' ');
    case 'illustration':
      return [
        'ART STYLE — ILLUSTRATION (MANDATORY): Prestige painted illustration / poster — visible brush or ink, designed ornaments, editorial color, print-ready 9:16.',
        'If reference photos exist: paint the same people (identity locked) without turning the image into a photograph.',
        'Forbidden: photoreal 35mm, cheap clipart, airbrush beauty, Caucasian stock faces.',
      ].join(' ');
    case 'aquarelle':
      return [
        'ART STYLE — AQUARELLE (MANDATORY): Watercolor and gouache on cotton paper — pigment blooms, granulation, soft edges, gold as watercolor metallic.',
        'If reference photos exist: watercolor the same faces (identity locked), never a photo collage.',
        'Forbidden: photoreal pores, CGI, cartoon slapstick, Caucasian stock faces.',
      ].join(' ');
    case 'stylise-3d':
      return [
        'ART STYLE — 3D STYLISÉ (MANDATORY): Crafted cinema 3D still — rounded forms, soft subsurface skin, designed cloth, studio lighting, prestige render.',
        'If reference photos exist: sculpt the same people (identity locked), not a photographed double.',
        'Forbidden: raw live-action photoreal, ugly game-engine look, Caucasian default avatars.',
      ].join(' ');
    default:
      return 'ART STYLE — RÉALISTE (MANDATORY): Photoreal 35mm / 85mm portrait language: natural pores, real fabric drape, soft volumetric light. No CGI, cartoon, or airbrushed beauty faces.';
  }
}

/** Règles injectées dans le system prompt de structure JSON. */
export function invitationArtStyleStructureRules(id: InvitationArtStyleId): string {
  switch (id) {
    case 'dessin-anime':
      return `Chosen art style: DESSIN ANIMÉ (2D animation).
- backgroundPrompt [Style] must request a 2D animated-feature invitation, not photography.
- People from photos: same identity, drawn as animated characters (eyes, smile, cheeks locked).
- Forbidden: photoreal pores, CGI beauty, invented Caucasian faces.`;
    case 'illustration':
      return `Chosen art style: ILLUSTRATION.
- backgroundPrompt [Style] must request painted editorial illustration / prestige poster.
- People from photos: painted likeness, identity locked.
- Forbidden: photoreal 35mm, clipart, invented Caucasian faces.`;
    case 'aquarelle':
      return `Chosen art style: AQUARELLE.
- backgroundPrompt [Style] must request watercolor / gouache on paper.
- People from photos: watercolor likeness, identity locked.
- Forbidden: photo collage, CGI, invented Caucasian faces.`;
    case 'stylise-3d':
      return `Chosen art style: 3D STYLISÉ.
- backgroundPrompt [Style] must request stylized cinema 3D, not live-action.
- People from photos: sculpted likeness, identity locked.
- Forbidden: raw photoreal, Caucasian default avatars.`;
    default:
      return `Chosen art style: RÉALISTE.
- People and décor must read as authentic 35mm photography: visible fine pores, natural melanin undertones, soft specular highlights, volumetric shadows.
- Forbidden: plastic skin, airbrush beauty, wax-doll faces, CGI / cartoon looks.`;
  }
}

export function invitationArtStyleFaceLockNote(id: InvitationArtStyleId): string {
  if (id === 'realiste') {
    return 'Keep faces photoreal and completely unchanged.';
  }
  return `Stylize the SAME people into ${invitationArtStyleLabel(id)} — do not change identity, skin tone, eyes, smile or cheeks.`;
}
