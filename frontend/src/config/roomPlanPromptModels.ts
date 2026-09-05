export type RoomPlanPromptCategory = 'wedding' | 'banquet' | 'pro' | 'cocktail';

export type RoomPlanPromptModel = {
  id: string;
  title: string;
  category: RoomPlanPromptCategory;
  badge: string;
  summary: string;
  prompt: string;
  roomType: 'BANQUET' | 'CONFERENCE' | 'AMPHITHEATER' | 'TENT';
};

export const ROOM_PLAN_PROMPT_CATEGORIES: Array<{ id: RoomPlanPromptCategory; label: string }> = [
  { id: 'wedding', label: 'Mariages' },
  { id: 'banquet', label: 'Banquets' },
  { id: 'pro', label: 'Conférences' },
  { id: 'cocktail', label: 'Cocktails' },
];

export const ROOM_PLAN_PROMPT_MODELS: RoomPlanPromptModel[] = [
  {
    id: 'wedding-honor',
    title: 'Mariage — table d’honneur',
    category: 'wedding',
    badge: 'Allée',
    summary: 'Tables rondes, allée centrale et table d’honneur.',
    prompt:
      'Mariage 120 convives : 12 tables rondes de 10, table d’honneur ovale au fond, allée rouge au centre, arche florale à l’entrée, parquet clair et nappes ivoire.',
    roomType: 'BANQUET',
  },
  {
    id: 'wedding-garden',
    title: 'Cérémonie jardin',
    category: 'wedding',
    badge: 'Rangées',
    summary: 'Rangées face à l’autel, allée nuptiale.',
    prompt:
      'Cérémonie en jardin : 8 rangées de 10 chaises, allée centrale, arche florale face aux invités, pelouse, deux colonnes de fleurs.',
    roomType: 'BANQUET',
  },
  {
    id: 'banquet-gala',
    title: 'Gala — scène et piste',
    category: 'banquet',
    badge: 'Gala',
    summary: 'Banquet, scène et piste de danse.',
    prompt:
      'Gala 80 personnes : 10 tables rondes de 8, scène en fond, piste de danse centrale, régie DJ, lustres, parquet et nappes lin.',
    roomType: 'BANQUET',
  },
  {
    id: 'banquet-ushape',
    title: 'Banquet en U',
    category: 'banquet',
    badge: 'U',
    summary: 'Tables longues en U, buffet et scène.',
    prompt:
      'Banquet en U pour 40 personnes : tables rectangulaires formant un U, buffet le long du mur, petite scène, chaises Napoléon, parquet.',
    roomType: 'BANQUET',
  },
  {
    id: 'conference-rows',
    title: 'Conférence théâtre',
    category: 'pro',
    badge: 'Rangées',
    summary: 'Rangées face à la scène et écran.',
    prompt:
      'Conférence 80 places : 8 rangées de 10 sièges théâtre, scène, écran, podium, allée centrale, moquette grise.',
    roomType: 'CONFERENCE',
  },
  {
    id: 'conference-board',
    title: 'Salle de conseil',
    category: 'pro',
    badge: 'VIP',
    summary: 'Une grande table, fauteuils, écran.',
    prompt:
      'Salle de conseil : une table rectangulaire de 16, fauteuils, écran au bout, buffet discret, parquet noyer.',
    roomType: 'CONFERENCE',
  },
  {
    id: 'cocktail-dance',
    title: 'Cocktail mange-debout',
    category: 'cocktail',
    badge: 'Piste',
    summary: 'Mange-debout, piste et DJ.',
    prompt:
      'Cocktail 60 personnes : 12 mange-debout, piste de danse, régie DJ, buffet, guirlandes Edison, parquet.',
    roomType: 'BANQUET',
  },
  {
    id: 'cocktail-tent',
    title: 'Réception sous tente',
    category: 'cocktail',
    badge: 'Tente',
    summary: 'Tente drapée, tables et fontaine.',
    prompt:
      'Réception sous tente : 8 tables rondes de 8, plafond drapé, fontaine centrale, guirlandes, herbe autour, entrée arche.',
    roomType: 'TENT',
  },
];
