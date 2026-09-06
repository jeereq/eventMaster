export type PromptCategory = 'clone' | 'wedding' | 'gala' | 'birthday';

export interface PromptModel {
  id: string;
  title: string;
  category: PromptCategory;
  badge: string;
  summary: string;
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
      'Copier fidèlement l’invitation fournie : reproduire à l’identique la mise en page, les bordures ornementales dorées, la texture du fond, la hiérarchie visuelle et le style typographique de la carte de référence. Rendu ultra-net de qualité impression prestige.',
    isClone: true,
  },
  {
    id: 'clone-faces',
    title: 'Cloner le design & intégrer mes photos réelles',
    category: 'clone',
    badge: 'Clonage + Visages',
    summary: 'Duplique le cadre et le décor de l’invitation en intégrant vos photos telles quelles, sans embellir les visages.',
    prompt:
      'Cloner la composition et les ornements de l’invitation de référence en y intégrant les personnes de mes photos telles qu’elles apparaissent — visages honnêtes, sans embellissement ni lissage. Rendu 35mm, carnation, sourire et cheveux identiques aux photos, fondu dans le cadre doré.',
    isClone: true,
  },
  {
    id: 'clone-modernize',
    title: 'Moderniser une invitation existante',
    category: 'clone',
    badge: 'Modernisation',
    summary: 'Conserve la disposition et les informations, en modernisant les bordures avec un or brossé contemporain.',
    prompt:
      'Reprendre la structure et l’esprit de cette invitation en la modernisant : cadre aux lignes épurées en or brossé, fond texturé ivoire haut de gamme, fleurs discrètes et typographie contemporaine raffinée.',
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
      'Mariage d’exception à Kinshasa : photo ultra-réaliste des mariés avec texture de peau naturelle et mélanine éclatante, éclairage chaud cinématographique, arche florale blanche et or, pagne wax royal de prestige brodé.',
  },
  {
    id: 'wedding-dot-kuba',
    title: 'Dot coutumière & moderne',
    category: 'wedding',
    badge: 'Tradition & Luxe',
    summary: 'Motifs géométriques Kuba raffinés, teintes chaudes ocre, cuivre et or, visages fidèles à 100%.',
    prompt:
      'Dot traditionnelle et moderne : motifs géométriques Kuba raffinés, tons ocre chaud, cuivre et touches dorées, visages fidèles à 100%, tenues d’apparat en velours du Kasaï et ambiance feutrée et authentique.',
  },
  {
    id: 'wedding-romantic-floral',
    title: 'Mariage romantique & floral féerique',
    category: 'wedding',
    badge: 'Romantique',
    summary: 'Lumière naturelle dorée, arche de roses blanches et eucalyptus, reflets dorés délicats.',
    prompt:
      'Mariage romantique féerique : couple noir africain (homme et femme, carnation mélanée naturelle), douce lumière de fin d’après-midi, arche de roses blanches et d’eucalyptus, reflets dorés délicats, rendu photo pur sans lissage artificiel.',
  },

  // --- Catégorie : Galas & Entreprises ---
  {
    id: 'gala-gombe-prestige',
    title: 'Gala prestige Gombe (Noir & Champagne)',
    category: 'gala',
    badge: 'Business VIP',
    summary: 'Noir satiné profond, typographie serif élégante, accents champagne pétillant, minimaliste.',
    prompt:
      'Soirée gala prestige à Gombe : hôtes et invités noirs africains en tenue de soirée, fond noir satiné profond, typographie serif élégante, accents champagne pétillant, design minimaliste et luxueux.',
  },
  {
    id: 'gala-diplomatic',
    title: 'Cocktail officiel & remise de prix',
    category: 'gala',
    badge: 'Institutionnel',
    summary: 'Bleu nuit impérial, double filet d’or brossé, texture papier coton et typographie majestueuse.',
    prompt:
      'Cocktail officiel et remise de prix : bleu nuit impérial, double filet d’or brossé, texture papier coton luxueux, typographie classique majestueuse et mise en page équilibrée.',
  },

  // --- Catégorie : Anniversaires & Soirées ---
  {
    id: 'birthday-vip-cocktail',
    title: 'Anniversaire VIP & cocktail champagne',
    category: 'birthday',
    badge: 'Festif VIP',
    summary: 'Portrait photo éclatant et réaliste de l’hôte, ambiance cocktail avec lumières bokeh scintillantes.',
    prompt:
      'Anniversaire VIP chic : portrait photo éclatant et ultra-réaliste d’un hôte ou d’une hôtesse noire africaine (carnation mélanée naturelle), ambiance cocktail champagne avec lumières bokeh scintillantes, teintes or rose et noir profond.',
  },
  {
    id: 'birthday-royal-jubilee',
    title: 'Jubilé royal & grande fête',
    category: 'birthday',
    badge: 'Grandeur',
    summary: 'Fond vert émeraude riche, volutes dorées baroques ciselées, arche florale tropicale somptueuse.',
    prompt:
      'Célébration royale de jubilé : fond vert émeraude riche, volutes dorées baroques ciselées, arche florale tropicale somptueuse, atmosphère festive prestigieuse et chaleureuse.',
  },
];
