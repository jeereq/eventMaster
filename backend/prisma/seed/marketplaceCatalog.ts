import type { PrismaClient, RoomType, ServiceCategory, VenuePriceUnit } from '@prisma/client';
import { addDays, licenseKey } from './helpers';
import { seedRoomBlueprint } from './roomBlueprints';
import {
  personPhoto,
  rdcServicePriceFc,
  rdcVenuePriceFc,
  serviceDetails,
  servicePhotos,
  venueDetails,
  venuePhotos,
} from './rdcMedia';

type CityName = 'Kinshasa' | 'Lubumbashi';

type Commune = {
  name: string;
  center: { lat: number; lng: number };
  neighborhoods: string[];
};

type City = {
  name: CityName;
  bounds: { south: number; west: number; north: number; east: number };
  communes: Commune[];
};

/** Aligné sur frontend/src/lib/rdcCities.ts — obligatoire pour publier une fiche. */
const CITIES: City[] = [
  {
    name: 'Kinshasa',
    bounds: { south: -4.55, west: 15.12, north: -4.18, east: 16.32 },
    communes: [
      { name: 'Bandalungwa', center: { lat: -4.345, lng: 15.285 }, neighborhoods: ['Makelele', 'Salongo', 'Adoula', 'Kasa-Vubu II'] },
      { name: 'Barumbu', center: { lat: -4.318, lng: 15.328 }, neighborhoods: ['Barumbu', 'Télécom', 'Tshimanga'] },
      { name: 'Bumbu', center: { lat: -4.365, lng: 15.305 }, neighborhoods: ['Bumbu', 'Matadi-Kibala', 'Salongo'] },
      { name: 'Gombe', center: { lat: -4.305, lng: 15.313 }, neighborhoods: ['Gombe', 'Batetela', 'Golf', 'Premier Mai', 'Kinshasa'] },
      { name: 'Kalamu', center: { lat: -4.338, lng: 15.312 }, neighborhoods: ['Matonge', 'Yolo-Nord', 'Yolo-Sud', 'Kalamu'] },
      { name: 'Kasa-Vubu', center: { lat: -4.335, lng: 15.295 }, neighborhoods: ['Kasa-Vubu', 'Yolo', 'Onatra'] },
      { name: 'Kimbanseke', center: { lat: -4.445, lng: 15.390 }, neighborhoods: ['Kimbanseke', 'Kingasani', 'Mokali', 'Ngampani'] },
      { name: 'Kinshasa', center: { lat: -4.352, lng: 15.355 }, neighborhoods: ['Kinshasa', '17 Mai', 'Kingabwa-PE'] },
      { name: 'Kintambo', center: { lat: -4.322, lng: 15.268 }, neighborhoods: ['Kintambo', 'Camp Kokolo', 'Nganda', 'Salongo'] },
      { name: 'Kisenso', center: { lat: -4.430, lng: 15.340 }, neighborhoods: ['Kisenso', 'Mission', 'Libération'] },
      { name: 'Lemba', center: { lat: -4.405, lng: 15.310 }, neighborhoods: ['Righini', 'Livulu', 'Commercial', 'Mbanza-Lemba', 'Échangeur'] },
      { name: 'Limete', center: { lat: -4.365, lng: 15.345 }, neighborhoods: ['Kingabwa', '7e Rue', 'Résidentiel', 'Industriel', 'Salongo'] },
      { name: 'Lingwala', center: { lat: -4.325, lng: 15.305 }, neighborhoods: ['Lingwala', 'Marché', 'Victoire'] },
      { name: 'Makala', center: { lat: -4.375, lng: 15.295 }, neighborhoods: ['Makala', 'Kimbangu', 'Salongo'] },
      { name: 'Maluku', center: { lat: -4.250, lng: 16.050 }, neighborhoods: ['Maluku', 'Kingankati', 'Mbankana'] },
      { name: 'Masina', center: { lat: -4.390, lng: 15.390 }, neighborhoods: ['Sans Fil', 'Peloustore', 'Mandiangu', 'Masina 1', 'Masina 2'] },
      { name: 'Matete', center: { lat: -4.385, lng: 15.355 }, neighborhoods: ['Matete', 'Salongo', 'Debonhomme'] },
      { name: 'Mont-Ngafula', center: { lat: -4.445, lng: 15.270 }, neighborhoods: ['Kimwenza', 'Mitendi', 'Matadi-Kibala', 'Righini', 'Cité Verte'] },
      { name: 'Ndjili', center: { lat: -4.385, lng: 15.375 }, neighborhoods: ['Ndjili', 'Quartier 1', 'Quartier 7', 'Quartier 13', 'Brasserie'] },
      { name: 'Ngaba', center: { lat: -4.395, lng: 15.325 }, neighborhoods: ['Ngaba', 'Salongo', 'Mukulua'] },
      { name: 'Ngaliema', center: { lat: -4.335, lng: 15.245 }, neighborhoods: ['Ma Campagne', 'Binza Ozone', 'Binza Pigeon', 'Delvaux', 'Kinsuka', 'Mont Fleury'] },
      { name: 'Ngiri-Ngiri', center: { lat: -4.355, lng: 15.300 }, neighborhoods: ['Ngiri-Ngiri', 'Diulu', 'Salongo'] },
      { name: 'Nsele', center: { lat: -4.280, lng: 15.530 }, neighborhoods: ['Nsele', 'Kingabwa-PE', 'Mikonga'] },
      { name: 'Selembao', center: { lat: -4.385, lng: 15.270 }, neighborhoods: ['Selembao', 'Salongo', 'Kitega'] },
    ],
  },
  {
    name: 'Lubumbashi',
    bounds: { south: -11.82, west: 27.32, north: -11.52, east: 27.62 },
    communes: [
      { name: 'Lubumbashi', center: { lat: -11.664, lng: 27.479 }, neighborhoods: ['Centre-ville', 'Golf', 'Bel-Air', 'La Gavioua', 'Kalubwe'] },
      { name: 'Kenya', center: { lat: -11.678, lng: 27.455 }, neighborhoods: ['Kenya', 'Kigoma', 'Kigoma-Mission'] },
      { name: 'Kamalondo', center: { lat: -11.670, lng: 27.490 }, neighborhoods: ['Kamalondo', 'Gambela'] },
      { name: 'Katuba', center: { lat: -11.710, lng: 27.470 }, neighborhoods: ['Katuba', 'Kasapa', 'Karavia'] },
      { name: 'Kampemba', center: { lat: -11.650, lng: 27.510 }, neighborhoods: ['Kampemba', 'Hewa Bora', 'Kigoma'] },
      { name: 'Annexe', center: { lat: -11.640, lng: 27.430 }, neighborhoods: ['Kasapa', 'Karavia', 'Kalebuka', 'Kipushi-route'] },
      { name: 'Rwashi', center: { lat: -11.630, lng: 27.530 }, neighborhoods: ['Rwashi', 'Kawama', 'Kigoma'] },
    ],
  },
];

/** Forfait Salle = 5 salles max → 20 orgs × 5 = 100 salles / ville. */
const ROOMS_PER_ORG = 5;
const VENUE_ORGS_PER_CITY = 20;
const TRADE_ORG_COUNT = 10;
const TRADE_PER_ORG = 10;
const RENTAL_ORG_COUNT = 10;
const RENTAL_PER_ORG = 10;
const STAFF_ORG_LIMIT = 5;

const ROOM_TYPES: RoomType[] = ['BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];
const TRADE_CATEGORIES: ServiceCategory[] = [
  'CATERING', 'PHOTOGRAPHY', 'VIDEO', 'DJ', 'DECORATION', 'SECURITY', 'FLORIST', 'TRANSPORT', 'MC', 'OTHER',
];
const RENTAL_CATEGORIES: ServiceCategory[] = [
  'RENTAL_CLOTHING_MEN', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CLOTHING_CHILD',
  'RENTAL_CAR', 'RENTAL_MOTO', 'RENTAL_EQUIPMENT',
];

const VENUE_PREFIXES = [
  'Palais', 'Halls', 'Domaine', 'Villa', 'Salons', 'Terrasses', 'Lofts', 'Jardins', 'Cours', 'Résidences',
  'Espace', 'Maison', 'Hôtel', 'Patio', 'Rooftop', 'Club', 'Forum', 'Atrium', 'Studio', 'Chapiteaux',
];
const SERVICE_PREFIXES = [
  'Saveurs', 'Studio', 'Djembé', 'Fleurs', 'Protocole', 'Lens', 'Traiteur', 'Sécurité', 'Déco', 'Navettes',
];
const RENTAL_PREFIXES = [
  'Atelier', 'Auto', 'Sono', 'Chapiteau', 'Costumes', 'Motos', 'Galerie', 'Flotte', 'Dressing', 'Park',
];

const MANAGERS = [
  'Amina Tshibanda', 'Patrick Kalala', 'Grace Mujinga', 'David Mutombo',
  'Sarah Ngalula', 'Jean-Bosco Ilunga', 'Chantal Mpunga', 'Olivier Kabongo',
  'Mireille Kasongo', 'Héritier Mbuyi', 'Rachel Lwamba', 'Alain Kapinga',
  'Fanny Nzuzi', 'Jonathan Mukendi', 'Solange Kalonji', 'Didier Bemba',
  'Carine Ilunga', 'Bruno Mwamba', 'Léa Kapend', 'Serge Tshilombo',
];

const ROOM_LABELS: Record<RoomType, string[]> = {
  SIMPLE: ['Salle polyvalente'],
  BANQUET: ['Grande salle de bal', 'Salon de réception', 'Salle de mariage', 'Hall banquet'],
  CONFERENCE: ['Salle de conférence', 'Salle boardroom', 'Espace séminaire'],
  AMPHITHEATER: ['Amphithéâtre', 'Auditorium', 'Salle plénière'],
  TENT: ['Chapiteau jardin', 'Tente pagode', 'Espace plein air'],
  CUSTOM: ['Loft événementiel', 'Rooftop', 'Cour intérieure'],
};

const SERVICE_TITLES: Record<string, string[]> = {
  CATERING: ['Buffet cocktail', 'Menu mariage 3 services', 'Coffee break entreprise', 'Grillade événementielle'],
  PHOTOGRAPHY: ['Reportage mariage', 'Portrait corporate', 'Couverture gala', 'Studio + drone'],
  VIDEO: ['Film de cérémonie', 'Aftermovie événement', 'Captation live', 'Clip institutionnel'],
  DJ: ['DJ mariage', 'Sono + éclairage', 'Animation soirée', 'Set live & karaoke'],
  DECORATION: ['Scénographie mariage', 'Arche florale', 'Décor gala', 'Backdrop photo'],
  SECURITY: ['Agent d’accueil', 'Dispositif VIP', 'Contrôle accès', 'Sécurité parking'],
  FLORIST: ['Bouquet de mariée', 'Centres de table', 'Décor église', 'Composition tropicale'],
  TRANSPORT: ['Navette invités', 'Cortège mariage', 'Minibus VIP', 'Transfert aéroport'],
  MC: ['Maître de cérémonie', 'Animation protocole', 'Présentation gala', 'Host bilingue'],
  OTHER: ['Coordination jour J', 'Photobooth', 'Générateur de secours', 'Wedding planner'],
  RENTAL_CLOTHING_MEN: ['Costume mariage', 'Smoking gala', 'Tenue traditionnelle homme', 'Costume témoin'],
  RENTAL_CLOTHING_WOMEN: ['Robe de soirée', 'Robe de mariée', 'Tenue traditionnelle femme', 'Cocktail gala'],
  RENTAL_CLOTHING_CHILD: ['Costume cortège', 'Robe demoiselle d’honneur', 'Tenue baptême', 'Habits cérémonie enfant'],
  RENTAL_CAR: ['Berline mariage', '4x4 cortège', 'Limousine gala', 'Voiture avec chauffeur'],
  RENTAL_MOTO: ['Moto cortège', 'Scooter staff', 'Moto avec casques', 'Deux-roues événement'],
  RENTAL_EQUIPMENT: ['Chapiteau + chaises', 'Tables banquet', 'Sono mobile', 'Groupe électrogène'],
};

const AVENUES = [
  'avenue de la Libération', 'boulevard du 30 Juin', 'avenue Tombalbaye',
  'avenue de l’Université', 'boulevard Lumumba', 'avenue Sendwe',
  'avenue Kasa-Vubu', 'route de Matadi', 'avenue Mwepu', 'avenue Kapenda',
];

function pick<T>(list: T[], index: number): T {
  return list[index % list.length];
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'fiche';
}

function placeInCity(city: City, index: number) {
  const commune = pick(city.communes, index);
  const neighborhood = pick(commune.neighborhoods, index * 3 + 1);
  const latRaw = commune.center.lat + ((index % 7) - 3) * 0.0035 + ((index % 3) - 1) * 0.0008;
  const lngRaw = commune.center.lng + ((index % 5) - 2) * 0.0038;
  const lat = Math.min(city.bounds.north - 0.01, Math.max(city.bounds.south + 0.01, latRaw));
  const lng = Math.min(city.bounds.east - 0.01, Math.max(city.bounds.west + 0.01, lngRaw));
  return { city, commune, neighborhood, lat, lng };
}

export function marketplacePlaceFor(index: number) {
  return placeInCity(CITIES[index % 2], Math.floor(index / 2));
}

function blockedDates(index: number): string[] {
  const start = new Date();
  start.setDate(start.getDate() + 10 + (index % 12));
  const second = new Date(start);
  second.setDate(start.getDate() + 7);
  return [start.toISOString().slice(0, 10), second.toISOString().slice(0, 10)];
}

function venuePriceUnit(roomType: RoomType, index: number): VenuePriceUnit {
  if (roomType === 'CONFERENCE' && index % 6 === 0) return 'HOUR';
  if (roomType === 'TENT' && index % 2 === 0) return 'DAY';
  if (index % 13 === 0) return 'QUOTA';
  return 'EVENT';
}

function servicePriceUnit(category: ServiceCategory, index: number): VenuePriceUnit {
  const byCategory: Record<string, VenuePriceUnit[]> = {
    CATERING: ['PERSON', 'EVENT', 'QUOTA'],
    PHOTOGRAPHY: ['EVENT', 'HOUR', 'DAY'],
    VIDEO: ['EVENT', 'HOUR', 'DAY'],
    DJ: ['EVENT', 'HOUR', 'DAY'],
    DECORATION: ['EVENT', 'DAY'],
    SECURITY: ['DAY', 'EVENT', 'HOUR'],
    FLORIST: ['EVENT', 'PERSON'],
    TRANSPORT: ['DAY', 'EVENT', 'HOUR'],
    MC: ['EVENT', 'HOUR'],
    OTHER: ['EVENT', 'DAY', 'HOUR'],
    RENTAL_CLOTHING_MEN: ['EVENT', 'DAY'],
    RENTAL_CLOTHING_WOMEN: ['EVENT', 'DAY'],
    RENTAL_CLOTHING_CHILD: ['EVENT', 'DAY'],
    RENTAL_CAR: ['DAY', 'HOUR', 'EVENT'],
    RENTAL_MOTO: ['DAY', 'HOUR'],
    RENTAL_EQUIPMENT: ['DAY', 'EVENT', 'HOUR'],
  };
  const units = byCategory[category] || ['EVENT'];
  return units[index % units.length];
}

function orgPhone(seed: number): string {
  return `+24381${String(2000000 + Math.abs(seed)).slice(0, 7)}`;
}

async function mapInBatches<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    await Promise.all(slice.map((item, j) => fn(item, i + j)));
  }
}

async function createVendorTenant(
  prisma: PrismaClient,
  opts: {
    name: string;
    email: string;
    managerName: string;
    plan: 'VENUE' | 'SERVICE' | 'CATALOG';
    passwordHash: string;
  },
) {
  const tenant = await prisma.tenant.create({
    data: {
      name: opts.name,
      plan: opts.plan,
      accountKind: 'VENDOR',
      licenseActive: true,
      licenseExpiresAt: addDays(365),
      licenseKey: licenseKey(),
    },
  });
  const user = await prisma.user.create({
    data: {
      email: opts.email,
      name: opts.managerName,
      phone: orgPhone(opts.name.length * 97 + opts.email.length),
      phoneCountryCode: '+243',
      passwordHash: opts.passwordHash,
      role: 'USER',
      orgRole: 'MANAGER',
      tenantId: tenant.id,
      isEmailVerified: true,
      avatarUrl: personPhoto(opts.name.length),
    },
  });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { managerId: user.id } });
  return tenant;
}

async function addOrgRoleUsers(
  prisma: PrismaClient,
  opts: { tenantId: string; kind: string; orgIndex: number; passwordHash: string },
) {
  if (opts.orgIndex >= STAFF_ORG_LIMIT) return;
  const n = opts.orgIndex + 1;
  await prisma.user.create({
    data: {
      email: `protocole.${opts.kind}${n}@eventmaster.cd`,
      name: `Protocole ${opts.kind} ${n}`,
      phone: orgPhone(4100000 + n * 17 + opts.kind.length),
      phoneCountryCode: '+243',
      passwordHash: opts.passwordHash,
      role: 'USER',
      orgRole: 'PROTOCOL',
      tenantId: opts.tenantId,
      isEmailVerified: true,
      avatarUrl: personPhoto(600 + opts.orgIndex),
    },
  });
  await prisma.user.create({
    data: {
      email: `commercial.${opts.kind}${n}@eventmaster.cd`,
      name: `Commercial ${opts.kind} ${n}`,
      phone: orgPhone(4200000 + n * 19 + opts.kind.length),
      phoneCountryCode: '+243',
      passwordHash: opts.passwordHash,
      role: 'USER',
      orgRole: 'COMMERCIAL',
      tenantId: opts.tenantId,
      isEmailVerified: true,
      avatarUrl: personPhoto(700 + opts.orgIndex),
      referralCode: `EM-${opts.kind.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}${n}`,
      commissionRate: 0.25,
      renewalCommissionRate: 0.15,
    },
  });
}

async function seedVenuesForCity(
  prisma: PrismaClient,
  passwordHash: string,
  city: City,
  cityKey: 'kin' | 'lshi',
) {
  console.log(`  Salles ${city.name} — ${VENUE_ORGS_PER_CITY * ROOMS_PER_ORG} fiches (plan 2D + GPS)…`);
  const publishedAt = new Date();

  for (let orgIndex = 0; orgIndex < VENUE_ORGS_PER_CITY; orgIndex++) {
    const orgName = `${pick(VENUE_PREFIXES, orgIndex)} ${city.name} ${orgIndex + 1}`;
    const tenant = await createVendorTenant(prisma, {
      name: orgName,
      email: `salles.${cityKey}${orgIndex + 1}@eventmaster.cd`,
      managerName: pick(MANAGERS, orgIndex + (cityKey === 'lshi' ? 7 : 0)),
      plan: 'VENUE',
      passwordHash,
    });
    await addOrgRoleUsers(prisma, {
      tenantId: tenant.id,
      kind: `salles.${cityKey}`,
      orgIndex,
      passwordHash,
    });

    await mapInBatches(Array.from({ length: ROOMS_PER_ORG }, (_, n) => n), 5, async (n) => {
      const index = orgIndex * ROOMS_PER_ORG + n;
      const place = placeInCity(city, index);
      const roomType = pick(ROOM_TYPES, index);
      const roomName = `${pick(ROOM_LABELS[roomType], index)} ${n + 1}`;
      const headline = `${tenant.name} — ${roomName}`;
      const priceUnit = venuePriceUnit(roomType, index);
      const capacity = 60 + (index % 16) * 30;
      const avenue = pick(AVENUES, index);
      const description = `${roomName} à ${place.neighborhood}, ${place.commune.name} (${place.city.name}). Plan 2D inclus. Capacité ${capacity} places. Sono, scène et parking selon la fiche.`;
      const phone = orgPhone(3000000 + index + (cityKey === 'lshi' ? 50000 : 0));
      const room = await prisma.organizationRoom.create({
        data: {
          tenantId: tenant.id,
          name: roomName,
          description,
          capacity,
          floor: n % 3 === 0 ? 'RDC' : `Niveau ${(n % 3) + 1}`,
          location: `${place.neighborhood}, ${place.commune.name}, ${place.city.name}`,
          roomType,
          layoutBlueprint: seedRoomBlueprint(roomType, index + (cityKey === 'lshi' ? 100 : 0)),
        },
      });
      await prisma.venueListing.create({
        data: {
          tenantId: tenant.id,
          roomId: room.id,
          slug: `${slugify(headline)}-${cityKey}-${String(index + 1).padStart(3, '0')}`,
          isPublic: true,
          headline,
          city: place.city.name,
          commune: place.commune.name,
          neighborhood: place.neighborhood,
          address: `${12 + (index % 80)} ${avenue}`,
          latitude: place.lat,
          longitude: place.lng,
          priceFromFc: rdcVenuePriceFc({
            roomType,
            capacity,
            city: place.city.name,
            commune: place.commune.name,
            priceUnit,
          }),
          priceUnit,
          quotaMin: priceUnit === 'QUOTA' ? 50 : null,
          quotaMax: priceUnit === 'QUOTA' ? capacity : null,
          photos: venuePhotos(index),
          details: venueDetails({ description, roomType, capacity, phone, index }),
          blockedDates: blockedDates(index),
          publishedAt,
        },
      });
    });
  }
}

async function seedOfferings(
  prisma: PrismaClient,
  passwordHash: string,
  opts: {
    kind: 'prestas' | 'locations';
    orgCount: number;
    perOrg: number;
    categories: ServiceCategory[];
    prefixes: string[];
  },
) {
  const label = opts.kind === 'locations' ? 'Locations' : 'Prestataires métiers';
  console.log(`  ${label} — ${opts.orgCount * opts.perOrg} fiches publiques…`);
  const publishedAt = new Date();

  for (let orgIndex = 0; orgIndex < opts.orgCount; orgIndex++) {
    const city = CITIES[orgIndex % 2];
    const orgName = `${pick(opts.prefixes, orgIndex)} ${city.name} ${orgIndex + 1}`;
    const tenant = await createVendorTenant(prisma, {
      name: orgName,
      email: `${opts.kind}${orgIndex + 1}@eventmaster.cd`,
      managerName: pick(MANAGERS, orgIndex + 4),
      plan: 'SERVICE',
      passwordHash,
    });
    await addOrgRoleUsers(prisma, {
      tenantId: tenant.id,
      kind: opts.kind,
      orgIndex,
      passwordHash,
    });
    const orgPlace = placeInCity(city, orgIndex * 3);
    const profile = await prisma.vendorProfile.create({
      data: {
        tenantId: tenant.id,
        slug: `${slugify(tenant.name)}-${opts.kind}-${orgIndex + 1}`,
        displayName: tenant.name,
        city: orgPlace.city.name,
        bio:
          opts.kind === 'locations'
            ? `${tenant.name} loue habits, véhicules et matériel à ${orgPlace.city.name}.`
            : `${tenant.name} intervient à ${orgPlace.city.name} : métiers d’événement (traiteur, photo, DJ, déco…).`,
      },
    });

    await mapInBatches(Array.from({ length: opts.perOrg }, (_, n) => n), 5, async (n) => {
      const index = orgIndex * opts.perOrg + n;
      const place = placeInCity(CITIES[index % 2], index + 11);
      const category = pick(opts.categories, n);
      const title = `${pick(SERVICE_TITLES[category], index)} — ${tenant.name}`;
      const priceUnit = servicePriceUnit(category, index);
      const description = `${title}. Prestation à ${place.city.name} (${place.commune.name} / ${place.neighborhood}). Photos, tarif indicatif en FC, matériel selon devis.`;
      const phone = orgPhone(3500000 + index + (opts.kind === 'locations' ? 80000 : 0));
      await prisma.serviceOffering.create({
        data: {
          tenantId: tenant.id,
          vendorProfileId: profile.id,
          slug: `${slugify(title)}-${opts.kind.slice(0, 3)}-${String(index + 1).padStart(3, '0')}`,
          category,
          title,
          description,
          city: place.city.name,
          commune: place.commune.name,
          neighborhood: place.neighborhood,
          coverageRadiusKm: index % 3 === 0 ? null : 8 + (index % 6) * 4,
          travels: index % 3 !== 0,
          latitude: place.lat,
          longitude: place.lng,
          priceFromFc: rdcServicePriceFc({
            category,
            city: place.city.name,
            commune: place.commune.name,
            index,
            priceUnit,
          }),
          priceUnit,
          quotaMin: priceUnit === 'QUOTA' || priceUnit === 'PERSON' ? 20 : null,
          quotaMax: priceUnit === 'QUOTA' || priceUnit === 'PERSON' ? 300 : null,
          photos: servicePhotos(category, index),
          details: serviceDetails({ description, category, phone, index }),
          blockedDates: blockedDates(index + 3),
          isPublic: true,
          publishedAt,
        },
      });
    });
  }
}

export async function seedMarketplaceCatalog(
  prisma: PrismaClient,
  passwordHash: string,
) {
  console.log('Catalogue public RDC — 100 salles/ville, 100 métiers, 100 locations…');
  await seedVenuesForCity(prisma, passwordHash, CITIES[0], 'kin');
  await seedVenuesForCity(prisma, passwordHash, CITIES[1], 'lshi');
  await seedOfferings(prisma, passwordHash, {
    kind: 'prestas',
    orgCount: TRADE_ORG_COUNT,
    perOrg: TRADE_PER_ORG,
    categories: TRADE_CATEGORIES,
    prefixes: SERVICE_PREFIXES,
  });
  await seedOfferings(prisma, passwordHash, {
    kind: 'locations',
    orgCount: RENTAL_ORG_COUNT,
    perOrg: RENTAL_PER_ORG,
    categories: RENTAL_CATEGORIES,
    prefixes: RENTAL_PREFIXES,
  });

  const venuesKin = await prisma.venueListing.count({ where: { isPublic: true, city: 'Kinshasa' } });
  const venuesLshi = await prisma.venueListing.count({ where: { isPublic: true, city: 'Lubumbashi' } });
  const trades = await prisma.serviceOffering.count({
    where: { isPublic: true, category: { in: TRADE_CATEGORIES } },
  });
  const rentals = await prisma.serviceOffering.count({
    where: { isPublic: true, category: { in: RENTAL_CATEGORIES } },
  });
  console.log(`  → ${venuesKin} salles Kinshasa, ${venuesLshi} salles Lubumbashi, ${trades} métiers, ${rentals} locations`);
}
