import type { RoomType, ServiceCategory, VenuePriceUnit } from '@prisma/client';

function unsplash(id: string, w = 1200): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

const VENUE_IDS = [
  '1519167758481-83f550bb49b3',
  '1464366400600-7168b8af9bc3',
  '1511795409834-ef04bbd61622',
  '1478144592103-25e22a2d05cd',
  '1431540012810-d8a4d07cd684',
  '1505373877841-8d25f7d46678',
  '1540575467063-178a50c2df87',
  '1414235077428-338989a2e8c0',
  '1551882547-ff40c63fe5fa',
  '1566073771259-6a8506099945',
  '1571896349842-33c89424de2d',
  '1519671482745-a381467c0b11',
  '1492684223066-81342ee5ff30',
  '1522775533890-2aa89c59b92d',
  '1530103862676-de8c9debad1d',
  '1464366400600-7168b8af9bc3',
  '1470337458703-46ad1756a187',
  '1514525253161-7a46d19cd819',
  '1480714378408-67cf0d13bc1b',
  '1507003211169-0a1dd7228f2d',
];

const EVENT_IDS = [
  '1470229722913-7c0e2dbbafd3',
  '1501281668745-f2f9c2d5b3c8',
  '1429962714451-31699ea2aba9',
  '1493225457124-a3eb161ffa5f',
  '1514525253161-7a46d19cd819',
  '1470225620780-dba8ba36b745',
  '1459749418947-5b9e6371d7e0',
  '1485875437342-1b21e4be8311',
  '1464375117522-72ca1162fad0',
  '1540039155733-5bb30b81c21f',
  '1506157782160-1e60873d0e71',
  '1516450360452-9312f5e86fc7',
];

const SERVICE_IDS: Record<string, string[]> = {
  CATERING: ['1414235077428-338989a2e8c0', '1555939594-58d7cb561ad1', '1504674900247-0877df9cc836', '1476224203421-9ac39bcb3327'],
  PHOTOGRAPHY: ['1452587925148-ce544e77a403', '1492693421137-3d6562f0820e', '1516035069371-29a1b244cc32', '1542038784456-1ea8e935640e'],
  VIDEO: ['1492619373891-b6c4b636098b', '1492693421137-3d6562f0820e', '1574717024653-61fd2cf4d44d', '1478720568477-152d9b164e26'],
  DJ: ['1571266028243-d220c6c2d3d0', '1470229722913-7c0e2dbbafd3', '1514525253161-7a46d19cd819', '1470225620780-dba8ba36b745'],
  DECORATION: ['1464366400600-7168b8af9bc3', '1519222970733-f546218fa6d7', '1478146898786-ae58f7cb1b2b', '1465495976277-4387d4b0b4a6'],
  SECURITY: ['1557597774-9d113df170cb', '1521791136064-7986c2920216', '1560250097-0b93528c311a', '1551836022-d5d88e9218df'],
  FLORIST: ['1487530811176-3780de880c2d', '1455659817273-fdf4978e6d1e', '1490750967868-88aa4a6b0ea3', '1468328062028-1a6a37984688'],
  TRANSPORT: ['1449965408869-eaa3f722e40d', '1503376780353-7e6692767b70', '1492144534655-ae79c964c9d7', '1485291571150-772bcfc10da5'],
  MC: ['1475724017904-b55baab89c80', '1507003211169-0a1dd7228f2d', '1516280440510-42924dca0477', '1529626455594-4ff0802cfb7e'],
  OTHER: ['1492684223066-81342ee5ff30', '1511795409834-ef04bbd61622', '1464366400600-7168b8af9bc3', '1505373877841-8d25f7d46678'],
  RENTAL_CLOTHING_MEN: ['1507679799987-c73779587ccf', '1617137968427-85924c800a22', '1593030761757-71fae45fa0e7', '1617127365659-c47ba3cb7e1f'],
  RENTAL_CLOTHING_WOMEN: ['1515372039744-b8f02a3ae446', '1566174053879-31528523f8ae', '1595777457583-95e059d581b8', '1496747612048-0da371b66d34'],
  RENTAL_CLOTHING_CHILD: ['1503454537195-1dcabb73ffb9', '1516627145497-ae6968895b74', '1471286174890-9c926d3471c0', '1503919545889-aef636e10ad4'],
  RENTAL_CAR: ['1503376780353-7e6692767b70', '1492144534655-ae79c964c9d7', '1549317661-bd32c8ce0db2', '1485291571150-772bcfc10da5'],
  RENTAL_MOTO: ['1558981403-c5f9899a28bc', '1558981354-503b923c7575', '1449426468159-d96dbf6434c1', '1508357941501-2565bb1c77fe'],
  RENTAL_EQUIPMENT: ['1505373877841-8d25f7d46678', '1470229722913-7c0e2dbbafd3', '1540575467063-178a50c2df87', '1431540012810-d8a4d07cd684'],
};

const PRESTIGE_COMMUNES = new Set([
  'Gombe', 'Ngaliema', 'Kintambo', 'Lingwala', 'Lubumbashi',
]);
const BUDGET_COMMUNES = new Set([
  'Kimbanseke', 'Masina', 'Ndjili', 'Selembao', 'Bumbu', 'Kisenso', 'Makala',
  'Katuba', 'Kenya', 'Rwashi', 'Ngaba', 'Ngiri-Ngiri',
]);

function roundFc(value: number, step = 5000): number {
  return Math.max(step, Math.round(value / step) * step);
}

function communeFactor(city: string, commune: string): number {
  if (PRESTIGE_COMMUNES.has(commune) || (city === 'Lubumbashi' && commune === 'Lubumbashi')) return 2.2;
  if (BUDGET_COMMUNES.has(commune)) return 0.68;
  return 1;
}

const PEOPLE_IDS = [
  '1507003211169-0a1dd7228f2d',
  '1494790108377-be9c29b29330',
  '1500648767791-00dcc994a43e',
  '1531123897727-8f129e1688ce',
  '1524504388940-b1c452add0af',
  '1506794778202-cad84cf45f1d',
  '1544005313-94ddf0286df2',
  '1539571696357-5a69c17a67c6',
];

export function personPhoto(index: number): string {
  return unsplash(PEOPLE_IDS[index % PEOPLE_IDS.length], 400);
}

export function venuePhotos(index: number): string[] {
  return [0, 1, 2, 3].map((n) => unsplash(VENUE_IDS[(index + n * 5) % VENUE_IDS.length]));
}

export function servicePhotos(category: ServiceCategory, index: number): string[] {
  const pool = SERVICE_IDS[category] || SERVICE_IDS.OTHER;
  return [0, 1, 2].map((n) => unsplash(pool[(index + n) % pool.length]));
}

export function eventPhotos(index: number): string[] {
  return [0, 1, 2].map((n) => unsplash(EVENT_IDS[(index + n * 4) % EVENT_IDS.length]));
}

export function rdcVenuePriceFc(opts: {
  roomType: RoomType;
  capacity: number;
  city: string;
  commune: string;
  priceUnit: VenuePriceUnit;
}): number {
  const perGuest: Record<string, number> = {
    BANQUET: 4500,
    CONFERENCE: 2800,
    AMPHITHEATER: 3200,
    TENT: 3800,
    CUSTOM: 5500,
    SIMPLE: 3000,
  };
  const rate = perGuest[opts.roomType] ?? 3500;
  let eventPrice = opts.capacity * rate * communeFactor(opts.city, opts.commune);
  eventPrice = Math.min(5_000_000, Math.max(150_000, eventPrice));
  eventPrice = roundFc(eventPrice);

  if (opts.priceUnit === 'HOUR') return Math.max(25_000, roundFc(eventPrice / 8, 1000));
  if (opts.priceUnit === 'PERSON') return Math.max(8_000, roundFc(rate * communeFactor(opts.city, opts.commune), 500));
  if (opts.priceUnit === 'QUOTA') return roundFc(eventPrice * 0.85);
  return eventPrice;
}

const SERVICE_RANGE: Record<string, [number, number]> = {
  CATERING: [15_000, 80_000],
  PHOTOGRAPHY: [200_000, 1_500_000],
  VIDEO: [250_000, 1_800_000],
  DJ: [150_000, 800_000],
  DECORATION: [300_000, 2_000_000],
  SECURITY: [80_000, 400_000],
  FLORIST: [80_000, 600_000],
  TRANSPORT: [50_000, 250_000],
  MC: [100_000, 500_000],
  OTHER: [80_000, 450_000],
  RENTAL_CLOTHING_MEN: [25_000, 250_000],
  RENTAL_CLOTHING_WOMEN: [40_000, 400_000],
  RENTAL_CLOTHING_CHILD: [15_000, 80_000],
  RENTAL_CAR: [80_000, 350_000],
  RENTAL_MOTO: [15_000, 50_000],
  RENTAL_EQUIPMENT: [200_000, 1_200_000],
};

export function rdcServicePriceFc(opts: {
  category: ServiceCategory;
  city: string;
  commune: string;
  index: number;
  priceUnit: VenuePriceUnit;
}): number {
  const [min, max] = SERVICE_RANGE[opts.category] ?? [80_000, 400_000];
  const t = ((opts.index * 17) % 100) / 100;
  let price = min + (max - min) * t;
  price *= communeFactor(opts.city, opts.commune) > 1.5 ? 1.35 : communeFactor(opts.city, opts.commune) < 0.8 ? 0.8 : 1;
  if (opts.priceUnit === 'HOUR' && (opts.category === 'DJ' || opts.category === 'MC')) {
    price = Math.max(40_000, price / 5);
  }
  if (opts.priceUnit === 'PERSON' && opts.category === 'CATERING') {
    price = Math.min(80_000, Math.max(15_000, price));
  }
  return roundFc(price, opts.category === 'RENTAL_MOTO' || opts.category === 'CATERING' ? 1000 : 5000);
}

export function rdcTicketPriceFc(kind: string, index: number): number {
  const k = kind.toLowerCase();
  if (k.includes('gala') || k.includes('charité') || k.includes('remise')) {
    return roundFc(50_000 + (index % 10) * 20_000, 5000);
  }
  if (k.includes('concert') || k.includes('festival') || k.includes('showcase') || k.includes('open mic')) {
    return roundFc(10_000 + (index % 9) * 8_000, 1000);
  }
  if (k.includes('conférence') || k.includes('forum') || k.includes('masterclass') || k.includes('séminaire')) {
    return roundFc(15_000 + (index % 8) * 8_000, 1000);
  }
  if (k.includes('défilé') || k.includes('lancement')) {
    return roundFc(25_000 + (index % 7) * 10_000, 1000);
  }
  return roundFc(12_000 + (index % 8) * 6_000, 1000);
}

export function venueDetails(opts: {
  description: string;
  roomType: RoomType;
  capacity: number;
  phone: string;
  index: number;
}) {
  const banquet = ['wifi', 'parking', 'ac', 'generator', 'sound', 'stage', 'toilets', 'lighting', 'security'] as const;
  const conference = ['wifi', 'ac', 'projector', 'sound', 'parking', 'toilets'] as const;
  const tent = ['parking', 'generator', 'garden', 'lighting', 'toilets'] as const;
  const amenities =
    opts.roomType === 'CONFERENCE' || opts.roomType === 'AMPHITHEATER'
      ? conference
      : opts.roomType === 'TENT'
        ? tent
        : banquet;
  return {
    description: opts.description,
    amenities: [...amenities],
    eventTypes: ['wedding', 'birthday', 'corporate', 'gala', 'private'],
    contactPhone: opts.phone,
    contactWhatsapp: opts.phone,
    included: 'Sono de base, éclairage, tables et chaises selon le plan 2D.',
    parking: true,
    languages: 'Français, lingala',
    minNoticeHours: String(24 + (opts.index % 3) * 24),
    openingHours: '08:00',
    closingHours: '02:00',
    surfaceM2: String(80 + (opts.index % 20) * 15),
    parkingNote: 'Gardiennage sur place',
    houseRules: 'Pas de feux d’artifice sans accord. Musique jusqu’à 2 h.',
    cancellation: 'Acompte 30 % non remboursable à moins de 7 jours.',
    extraFees: 'Groupe électrogène de secours sur devis.',
    depositPercent: '30',
    accessNotes: 'Accès véhicules jusqu’à l’entrée principale.',
  };
}

export function serviceDetails(opts: {
  description: string;
  category: ServiceCategory;
  phone: string;
  index: number;
}) {
  const rental = opts.category.startsWith('RENTAL_');
  const amenities = rental
    ? opts.category === 'RENTAL_CAR'
      ? ['driver', 'fuel', 'delivery']
      : opts.category === 'RENTAL_MOTO'
        ? ['helmet', 'delivery']
        : opts.category.startsWith('RENTAL_CLOTHING')
          ? ['sizes', 'fitting', 'trial']
          : ['delivery', 'install', 'gear']
    : ['assistant', 'backup'];
  return {
    description: opts.description,
    amenities,
    eventTypes: ['wedding', 'birthday', 'corporate', 'gala', 'private'],
    contactPhone: opts.phone,
    contactWhatsapp: opts.phone,
    included: rental ? 'Remise sur place ou livraison selon le devis.' : 'Équipe et matériel de base inclus.',
    languages: 'Français, lingala',
    minNoticeHours: String(12 + (opts.index % 4) * 12),
    teamSize: String(2 + (opts.index % 6)),
    experienceYears: String(3 + (opts.index % 12)),
    cancellation: 'Acompte 30 % à la confirmation.',
    depositPercent: '30',
  };
}
