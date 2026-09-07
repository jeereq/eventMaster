export type PromptCategory = 'clone' | 'wedding' | 'gala' | 'birthday';

export interface PromptModel {
  id: string;
  title: string;
  category: PromptCategory;
  badge: string;
  summary: string;
  /** Brief envoyé au modèle — anglais narratif (recommandations Nano Banana). */
  prompt: string;
  isClone?: boolean;
}

export const PROMPT_CATEGORIES: Array<{ id: PromptCategory; label: string; iconName?: string }> = [
  { id: 'clone', label: 'Copier une invitation' },
  { id: 'wedding', label: 'Mariages & Dots' },
  { id: 'gala', label: 'Galas & Entreprises' },
  { id: 'birthday', label: 'Anniversaires & Soirées' },
];

export const INVITATION_PROMPT_MODELS: PromptModel[] = [
  // --- Catégorie : Copie & Clonage d'invitation ---
  {
    id: 'clone-exact',
    title: 'Copier fidèlement cette invitation',
    category: 'clone',
    badge: 'Clonage exact',
    summary: 'Reproduit la mise en page, les bordures ornementales dorées et le style typographique de l’image fournie.',
    prompt:
      'Clone faithfully the attached invitation card. [Subject] A vertical prestige stationery piece matching the reference. [Action] Reproduce the exact layout, ornamental gold borders, paper texture, visual hierarchy and typographic style of the reference card. [Location/context] Print-ready invitation for a Central African celebration. [Composition] Tall 9:16 frame, centered ceremonial focus, generous margins. [Style] Ultra-sharp prestige print look, cotton paper grain, gold foil accents, photoreal stationery photography.',
    isClone: true,
  },
  {
    id: 'clone-faces',
    title: 'Cloner le design & intégrer mes photos réelles',
    category: 'clone',
    badge: 'Clonage + Visages',
    summary: 'Duplique le cadre et le décor de l’invitation en intégrant vos photos telles quelles, sans embellir les visages.',
    prompt:
      'Clone the composition and ornaments of the reference invitation while integrating the people from my photos exactly as photographed. [Subject] Luxury invitation card with the real hosts from the attached portraits. [Action] Place those exact individuals inside the cloned gold frame without beautifying faces. [Location/context] Prestige printed card for a Kinshasa / RDC event. [Composition] 9:16 portrait, hosts centered in the ornamental frame, décor around them. [Style] 35mm photoreal print, natural skin texture and hair matching the photos, soft gold foil blend — faces remain completely unchanged.',
    isClone: true,
  },
  {
    id: 'clone-modernize',
    title: 'Moderniser une invitation existante',
    category: 'clone',
    badge: 'Modernisation',
    summary: 'Conserve la disposition et les informations, en modernisant les bordures avec un or brossé contemporain.',
    prompt:
      'Modernize this invitation while keeping its structure and spirit. [Subject] A refined contemporary invitation card. [Action] Refresh the borders into clean brushed-gold lines, keep the information hierarchy readable. [Location/context] High-end stationery for a Central African celebration. [Composition] Tall 9:16, balanced margins, discreet florals. [Style] Ivory textured paper, contemporary refined typography, soft luxury lighting, photoreal print finish.',
    isClone: true,
  },

  // --- Catégorie : Mariages & Dots ---
  {
    id: 'wedding-kinshasa-royal',
    title: 'Mariage princier à Kinshasa',
    category: 'wedding',
    badge: 'Ultra-réaliste',
    summary: 'Photo ultra-réaliste des mariés, éclairage chaud naturel, ivoire, or et pagne wax royal brodé.',
    prompt:
      'Compose a princely Kinshasa wedding invitation. [Subject] A Black African bride and groom with rich natural melanin. [Action] Standing together in ceremonial elegance beneath a white-and-gold floral arch. [Location/context] Prestige celebration in Kinshasa. [Composition] Vertical 9:16 medium-full shot, couple centered, generous lower margin for lettering. [Style] Warm cinematic daylight, ivory and gold palette, royal embroidered wax pagne, authentic 35mm skin texture — no airbrush.',
  },
  {
    id: 'wedding-dot-kuba',
    title: 'Dot coutumière & moderne',
    category: 'wedding',
    badge: 'Tradition & Luxe',
    summary: 'Motifs géométriques Kuba raffinés, teintes chaudes ocre, cuivre et or, visages fidèles à 100%.',
    prompt:
      'Design a traditional-meets-modern Dot invitation. [Subject] Black African hosts in Kasai velvet ceremonial attire. [Action] Presented within a refined Kuba geometric frame as honored couple of the Dot. [Location/context] Congolese customary celebration with contemporary luxury. [Composition] Tall 9:16, ornamental border focus, soft atmospheric depth. [Style] Warm ochre, copper and gold accents, authentic faces at 100% fidelity, hushed intimate lighting, photoreal print.',
  },
  {
    id: 'wedding-romantic-floral',
    title: 'Mariage romantique & floral féerique',
    category: 'wedding',
    badge: 'Romantique',
    summary: 'Lumière naturelle dorée, arche de roses blanches et eucalyptus, reflets dorés délicats.',
    prompt:
      'Compose a romantic floral wedding invitation. [Subject] A Black African couple with natural melanin complexions. [Action] Standing gently beneath an arch of white roses and eucalyptus. [Location/context] Fairy-tale garden ceremony mood. [Composition] Soft 9:16 portrait, couple mid-frame, floral arch framing the edges. [Style] Late-afternoon golden light, delicate gold reflections, pure photographic finish without artificial smoothing.',
  },

  // --- Catégorie : Galas & Entreprises ---
  {
    id: 'gala-gombe-prestige',
    title: 'Gala prestige Gombe (Noir & Champagne)',
    category: 'gala',
    badge: 'Business VIP',
    summary: 'Noir satiné profond, typographie serif élégante, accents champagne pétillant, minimaliste.',
    prompt:
      'Design a prestige Gombe gala invitation. [Subject] Black African hosts and guests in evening formalwear. [Action] Arriving into a champagne-accent VIP evening atmosphere. [Location/context] Upscale business gala in Gombe, Kinshasa. [Composition] Minimal tall 9:16 layout, deep negative space, centered ceremonial focus. [Style] Deep satin black, elegant serif hierarchy, sparkling champagne accents, luxurious minimal print photography.',
  },
  {
    id: 'gala-diplomatic',
    title: 'Cocktail officiel & remise de prix',
    category: 'gala',
    badge: 'Institutionnel',
    summary: 'Bleu nuit impérial, double filet d’or brossé, texture papier coton et typographie majestueuse.',
    prompt:
      'Compose an official awards cocktail invitation. [Subject] A vertical institutional stationery card. [Action] Presenting a formal ceremony mood with balanced ceremonial hierarchy. [Location/context] Diplomatic cocktail and prize evening. [Composition] Tall 9:16, double brushed-gold fillet frame, generous centered margins. [Style] Imperial midnight blue, luxurious cotton-paper texture, majestic classical typography, photoreal print finish.',
  },

  // --- Catégorie : Anniversaires & Soirées ---
  {
    id: 'birthday-vip-cocktail',
    title: 'Anniversaire VIP & cocktail champagne',
    category: 'birthday',
    badge: 'Festif VIP',
    summary: 'Portrait photo éclatant et réaliste de l’hôte, ambiance cocktail avec lumières bokeh scintillantes.',
    prompt:
      'Compose a VIP birthday cocktail invitation. [Subject] A Black African host or hostess with natural melanin complexion. [Action] Celebrating under sparkling champagne bokeh lights. [Location/context] Chic evening cocktail party. [Composition] Tall 9:16 portrait focus, soft bokeh background, lower third clear for type. [Style] Rose-gold and deep black palette, ultra-real photographic portrait, festive prestige lighting — no plastic beauty filter.',
  },
  {
    id: 'birthday-royal-jubilee',
    title: 'Jubilé royal & grande fête',
    category: 'birthday',
    badge: 'Grandeur',
    summary: 'Fond vert émeraude riche, volutes dorées baroques ciselées, arche florale tropicale somptueuse.',
    prompt:
      'Design a royal jubilee celebration invitation. [Subject] A sumptuous vertical stationery card. [Action] Opening onto a grand festive tropical floral arch. [Location/context] Prestigious jubilee party atmosphere. [Composition] Tall 9:16, ornate baroque gold scrollwork framing a rich emerald field. [Style] Deep emerald, chiseled gold volutes, tropical floral abundance, warm prestigious print photography.',
  },
];
