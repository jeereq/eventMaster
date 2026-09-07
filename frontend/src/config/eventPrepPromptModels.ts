import type { ListingEventTypeId } from '@/lib/listingDetails';

export type EventPrepPromptModel = {
  id: string;
  title: string;
  badge: string;
  summary: string;
  prompt: string;
  eventType: ListingEventTypeId;
  city?: string;
  guestCount?: number;
  budgetMaxUsd?: number;
};

export const EVENT_PREP_PROMPT_MODELS: EventPrepPromptModel[] = [
  {
    id: 'wedding-gombe',
    title: 'Mariage chic à Gombe',
    badge: 'Mariage',
    summary: '150 convives, salle + traiteur + photo + DJ.',
    prompt:
      'Mariage élégant pour 150 convives à Gombe, Kinshasa. Ambiance chic, besoin salle, traiteur, photographe, DJ et décoration dans un budget de 8 500 000 FC.',
    eventType: 'wedding',
    city: 'Kinshasa',
    guestCount: 150,
    budgetMaxUsd: 3000,
  },
  {
    id: 'birthday-lushi',
    title: 'Anniversaire à Lubumbashi',
    badge: 'Fête',
    summary: '80 personnes, cocktail, DJ et photo.',
    prompt:
      'Anniversaire / soirée pour 80 personnes à Lubumbashi. Ambiance festive, cocktail, DJ et photo, budget 3 800 000 FC.',
    eventType: 'birthday',
    city: 'Lubumbashi',
    guestCount: 80,
    budgetMaxUsd: 1400,
  },
  {
    id: 'gala-kin',
    title: 'Gala d’entreprise',
    badge: 'Gala',
    summary: '250 invités, dîner assis, scénographie.',
    prompt:
      'Gala d’entreprise pour 250 invités à Kinshasa. Dîner assis, maître de cérémonie, photo/vidéo et scénographie, budget 16 000 000 FC.',
    eventType: 'gala',
    city: 'Kinshasa',
    guestCount: 250,
    budgetMaxUsd: 5700,
  },
  {
    id: 'coutumier-kongo',
    title: 'Mariage coutumier Kongo',
    badge: 'Kongo',
    summary: 'Dot Bakongo, familles, pagne et palabre.',
    prompt:
      'Mariage coutumier Kongo (Bakongo) pour 180 personnes à Matadi / Kongo Central. Cérémonie de présentation et de dot, familles élargies, pagne, vin de palme, salle + traiteur + photo + décor raphia et vert forêt. Budget 7 000 000 FC.',
    eventType: 'wedding',
    city: 'Kinshasa',
    guestCount: 180,
    budgetMaxUsd: 2500,
  },
  {
    id: 'coutumier-luba',
    title: 'Mariage coutumier Luba',
    badge: 'Luba',
    summary: 'Tshibilu au Kasaï, velours et honneur.',
    prompt:
      'Mariage coutumier Luba (Baluba) pour 200 personnes à Mbuji-Mayi. Tshibilu tshia dibaka, velours du Kasaï, familles et honneur, salle + traiteur + photo + décor ocre et or. Budget 8 000 000 FC.',
    eventType: 'wedding',
    city: 'Kinshasa',
    guestCount: 200,
    budgetMaxUsd: 2800,
  },
  {
    id: 'coutumier-mongo',
    title: 'Mariage coutumier Mongo',
    badge: 'Mongo',
    summary: 'Bonkoko, libota, fleuve et forêt.',
    prompt:
      'Mariage coutumier Mongo pour 160 personnes à Mbandaka / Équateur. Cérémonie de bonkoko avec le libota, ambiance fleuve et forêt, salle + traiteur + photo + décor terracotta et raphia. Budget 6 200 000 FC.',
    eventType: 'wedding',
    city: 'Kinshasa',
    guestCount: 160,
    budgetMaxUsd: 2200,
  },
  {
    id: 'coutumier-lunda',
    title: 'Mariage coutumier Lunda',
    badge: 'Lunda',
    summary: 'Prestige Katanga, cuivre et ivoire.',
    prompt:
      'Mariage coutumier Lunda pour 170 personnes à Lubumbashi / Lualaba. Cérémonie d’alliance des familles, prestige cuivre et ivoire, salle + traiteur + photo + décor rouge cuivre et or. Budget 7 500 000 FC.',
    eventType: 'wedding',
    city: 'Lubumbashi',
    guestCount: 170,
    budgetMaxUsd: 2700,
  },
];
