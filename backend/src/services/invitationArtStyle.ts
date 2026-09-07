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

const DEPTH_IMMERSE =
  'deep spatial immersion: clear foreground / midground / background, atmospheric perspective, overlapping planes, volumetric light shafts, soft far haze, camera depth of field so the card feels walk-into, not flat';

const CRAFT_FINISH =
  'CRAFT FINISH: museum-grade 9:16 print still. One coherent light direction. Color-graded (warm African golds, never grey sludge). Sharp where it must be, soft where it recedes. No extra fingers, no melted ornaments, no duplicate faces, no watermark, no UI chrome, no stock-template look.';

const MATERIALS_RDC =
  'MATERIALS: tactile cotton or laid paper; anisotropic gold foil; fresh tropical florals (not plastic roses); authentic wax, kasai velvet or raffia only when the brief asks — never generic European ballroom stock.';

/** Clause [Style] pour le scaffold Nano Banana. */
export function invitationArtStyleScaffoldLine(id: InvitationArtStyleId): string {
  switch (id) {
    case 'dessin-anime':
      return `premium 2D animated-feature still with multiplane camera depth, ${DEPTH_IMMERSE}, painted backgrounds behind crisp character cels, warm African palette; stylized likeness if people appear — no photoreal pores, no airbrush beauty, no sticker-flat cutouts`;
    case 'illustration':
      return `immersive painted illustration with real pictorial depth, ${DEPTH_IMMERSE}, visible brushwork, rich inks, prestige poster finish; faithful likeness if people appear — not photoreal, not cartoon gag, not a flat graphic`;
    case 'aquarelle':
      return `immersive watercolor and gouache on cotton paper, wet-in-wet depth, receding washes, pigment blooms, paper tooth; keep identity if people appear — no plastic skin, no CGI, no postcard-flat wash`;
    case 'stylise-3d':
      return `immersive cinema 3D still with real volume, ${DEPTH_IMMERSE}, subsurface skin, crafted materials, anamorphic bokeh, warm key and rim light; same people if referenced — not live-action photoreal, no Caucasian default, no toy-flat render`;
    default:
      return 'ultra-photoreal 35mm / 85mm editorial print: tactile cotton paper grain, real gold-foil specularity, fresh florals with dew and pollen, true melanin, pores and fabric weave, warm volumetric daylight; no CGI, no cartoon, no airbrushed beauty faces';
  }
}

/** Bloc imposé au modèle image. */
export function invitationArtStyleImageDirective(id: InvitationArtStyleId): string {
  switch (id) {
    case 'dessin-anime':
      return [
        'ART STYLE — DESSIN ANIMÉ IMMERSIF (MANDATORY): A prestige 2D animated-feature still, not a flat sticker. Multiplane camera: sharp character cels in the midground, painted environment receding behind them, a few overlapping foreground leaves / foil / petals to create parallax.',
        `${DEPTH_IMMERSE}. Atmospheric perspective: distant ornaments cooler and softer; near gold and wax more saturated and detailed. Soft cinematic depth of field on far florals. Volumetric god-rays through the frame.`,
        'Clean feature-animation line, dimensional cel-shading (form shadows, bounce light, specular on satin and gold), expressive but controlled faces, designed fabrics (wax, satin, gold as painted materials with thickness).',
        'If reference photos exist: keep EACH person as the same individual (bone structure, eyes, smile, cheeks, skin tone, hair) but draw them as animated characters standing in real space. Do not stay photoreal. Do not caricature ethnicity or lighten skin.',
        'Light: upper-left cinematic key, warm bounce from gold, painted god-rays, form shadows that turn the face. Line weight varies (thicker in shade). Eyes catch a drawn highlight.',
        'Forbidden: live-action photography, plastic 3D, airbrush beauty, Caucasian stock faces, flat graphic icons, empty white backdrop, paper-cut silhouettes without depth.',
      ].join(' ');
    case 'illustration':
      return [
        'ART STYLE — ILLUSTRATION IMMERSIVE (MANDATORY): Prestige painted invitation that you can step into — not a flat poster graphic. Build pictorial depth: foreground ornament, hosts in the mid-plane, receding floral architecture and paper atmosphere behind.',
        `${DEPTH_IMMERSE}. Overlapping brush masses, aerial perspective, warm near / cooler far, a narrow depth of field as if a painter staged a scene.`,
        'Visible brush or ink, rich editorial color, tactile paper and foil as painted matter, print-ready 9:16.',
        'If reference photos exist: paint the same people (identity locked) occupying volume in the scene, without turning the image into a photograph.',
        'Light: poster chiaroscuro — warm key, cooler receding air, foil as painted metal with a single hard glint. Faces have painted planes, not smudge.',
        'Forbidden: photoreal 35mm, cheap clipart, airbrush beauty, Caucasian stock faces, sticker collage, single flat layer.',
      ].join(' ');
    case 'aquarelle':
      return [
        'ART STYLE — AQUARELLE IMMERSIVE (MANDATORY): Watercolor and gouache on cotton paper with real wet depth — receding washes, granulation in the distance, sharper pigment and gold gouache in the foreground.',
        `${DEPTH_IMMERSE}. Wet-in-wet atmosphere behind the couple or décor; dry-brush detail only on near faces, foil and flowers.`,
        'If reference photos exist: watercolor the same faces (identity locked), never a photo collage.',
        'Light: north-window diffusion; wet bloom in far shadows; dry-brush sparkle on near gold and petals. Skin as layered transparent pigment, not a photo tint.',
        'Forbidden: photoreal pores, CGI, cartoon slapstick, Caucasian stock faces, postcard-flat single wash.',
      ].join(' ');
    case 'stylise-3d':
      return [
        'ART STYLE — 3D CINÉMA IMMERSIF (MANDATORY): A crafted cinema 3D still with real volume and spatial staging — wide-ish 50–85mm feel, hosts occupying a measurable room, not floating on a card.',
        `${DEPTH_IMMERSE}. Strong foreground occlusion (petals, foil edge, fabric), midground figures, deep background architecture. Anamorphic bokeh, rim light separating bodies from the set, contact shadows on the paper plane, subsurface scattering on melanin skin, micro-scratches on gold.`,
        'Rounded but believable forms, designed cloth with thickness and fold weight, prestige lighting (warm key, cool fill, practicals).',
        'If reference photos exist: sculpt the same people (identity locked) as volumetric characters in the set, not a photographed double glued on a render.',
        'Light: three-point prestige (warm key, cool fill, tight rim), practicals in the set, anamorphic highlights. Skin SSS on melanin; gold micro-scratches; cloth gravity.',
        'Forbidden: raw live-action photoreal, ugly game-engine look, Caucasian default avatars, toy-flat orthographic, empty studio infinity backdrop.',
      ].join(' ');
    default:
      return [
        'ART STYLE — RÉALISTE ULTRA (MANDATORY): Authentic 35mm / 85mm editorial photography of a real printed invitation held in space — cotton-paper tooth, deckled edges if fitting, gold foil catching a true specular, wax and satin with weave and drape, fresh florals with pollen and dew.',
        'Skin: real melanin, visible pores, peach fuzz, natural oil sheen, no airbrush. Eyes wet, lashes individual, smile muscles working. Volumetric daylight or tungsten with catchlights and true contact shadows.',
        'Optics: 85mm feel, f/2-ish, real chromatic fringe at foil edges, true contact shadows. The card sits in shallow space — table or linen implied, background softly out of focus.',
        'No CGI, no cartoon, no wax-doll faces, no plastic beauty filter.',
      ].join(' ');
  }
}

/** Règles injectées dans le system prompt de structure JSON. */
export function invitationArtStyleStructureRules(id: InvitationArtStyleId): string {
  const depth = `- backgroundPrompt [Composition] MUST stage foreground / midground / background, atmospheric perspective and volumetric light so the card feels immersive, never a flat graphic.
- backgroundPrompt [Style] MUST name a single light direction, tactile paper/foil, and a print-sharp 9:16 finish (no watermark, no extra limbs).`;
  switch (id) {
    case 'dessin-anime':
      return `Chosen art style: DESSIN ANIMÉ IMMERSIF (multiplane 2D).
${depth}
- [Style] = animated-feature still with painted deep backgrounds and dimensional cel-shading — not photography, not a flat sticker.
- People from photos: same identity, drawn as animated characters occupying space (eyes, smile, cheeks locked).
- Forbidden: photoreal pores, CGI beauty, invented Caucasian faces, empty flat backdrop.`;
    case 'illustration':
      return `Chosen art style: ILLUSTRATION IMMERSIVE (pictorial depth).
${depth}
- [Style] = painted scene you can step into — overlapping brush planes, aerial perspective.
- People from photos: painted likeness in volume, identity locked.
- Forbidden: photoreal 35mm, clipart, invented Caucasian faces, single flat layer.`;
    case 'aquarelle':
      return `Chosen art style: AQUARELLE IMMERSIVE.
${depth}
- [Style] = watercolor / gouache with receding washes and sharper near pigment.
- People from photos: watercolor likeness, identity locked.
- Forbidden: photo collage, CGI, invented Caucasian faces, postcard-flat wash.`;
    case 'stylise-3d':
      return `Chosen art style: 3D CINÉMA IMMERSIF (real volume).
${depth}
- [Style] = cinema 3D still with lens depth, bokeh, rim light, contact shadows — not live-action, not a toy render.
- People from photos: sculpted likeness in a measurable set, identity locked.
- Forbidden: raw photoreal, Caucasian default avatars, orthographic flatness.`;
    default:
      return `Chosen art style: RÉALISTE ULTRA (tactile photography).
- People and décor must read as authentic 35mm photography: visible fine pores, natural melanin undertones, true foil specularity, paper tooth, volumetric shadows, shallow real depth of field.
- Forbidden: plastic skin, airbrush beauty, wax-doll faces, CGI / cartoon looks.`;
  }
}

/** Composition imposée après le style, pour tous les rendus immersifs. */
export function invitationArtStyleCompositionNote(id: InvitationArtStyleId): string {
  if (id === 'realiste') {
    return 'COMPOSITION: Photograph the invitation in real space — slight paper perspective, tactile near-field foil or florals, background falling out of focus. Ultra-real materials, never a CG flatbed scan.';
  }
  return 'COMPOSITION — IMMERSION: Stage three readable planes (near ornament, hosts, receding décor). Overlap silhouettes. Use atmospheric perspective and a hint of camera depth of field. The viewer stands inside the fête, not in front of a sticker.';
}

export function invitationArtStyleCraftNotes(): string {
  return `${CRAFT_FINISH} ${MATERIALS_RDC}`;
}

export function invitationArtStyleLightNote(id: InvitationArtStyleId): string {
  switch (id) {
    case 'dessin-anime':
      return 'LIGHT RIG: multiplane key from upper-left, gold bounce, painted shafts — one sun, no random glow.';
    case 'illustration':
      return 'LIGHT RIG: poster key + cooler air behind; one foil glint; painted planes on the face.';
    case 'aquarelle':
      return 'LIGHT RIG: soft north-window; wet far, dry-brush near; no harsh CGI spotlight.';
    case 'stylise-3d':
      return 'LIGHT RIG: warm key, cool fill, rim separating heads from the set; practicals; real contact shadows.';
    default:
      return 'LIGHT RIG: single window or late-afternoon Kinshasa daylight, warm bounce, 85mm shallow focus, true specular on foil.';
  }
}

export function invitationArtStyleFaceLockNote(id: InvitationArtStyleId): string {
  if (id === 'realiste') {
    return 'Keep faces photoreal and completely unchanged, with real pores, wet eyes and working smile muscles.';
  }
  return `Stylize the SAME people into ${invitationArtStyleLabel(id)} occupying real depth (feet grounded, overlapping décor, light wrapping the form) — do not change identity, skin tone, eyes, smile or cheeks.`;
}
