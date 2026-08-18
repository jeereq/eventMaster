import type { PrismaClient, RoomType, ServiceCategory, VenuePriceUnit } from '@prisma/client';
import { addDays, licenseKey } from './helpers';
import { seedRoomBlueprint } from './roomBlueprints';

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

const ROOM_TYPES: RoomType[] = ['BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];
const PRICE_UNITS: VenuePriceUnit[] = ['EVENT', 'DAY', 'HOUR', 'PERSON', 'QUOTA'];
const SERVICE_CATEGORIES: ServiceCategory[] = [
  'CATERING', 'PHOTOGRAPHY', 'VIDEO', 'DJ', 'DECORATION', 'SECURITY', 'FLORIST', 'TRANSPORT', 'MC', 'OTHER',
];

const VENUE_ORGS = [
  'Palais du Fleuve', 'Halls Prestige Gombe', 'Espaces Binza Events', 'Domaine Texas',
  'Villa Lumière', 'Salons de la Victoire', 'Terrasses Ngaliema', 'Lofts Limete',
  'Résidences Karavia', 'Jardins du Cuivre',
];

const SERVICE_ORGS = [
  'Saveurs de Kin', 'Studio Mwinda', 'Djembé Sound', 'Fleurs du Pool',
  'Protocole Royal', 'Lens & Light', 'Traiteur Maman Léonie', 'Sécurité Baobab',
  'Déco Kuba', 'Navettes Hewa Bora',
];

const MANAGERS = [
  'Amina Tshibanda', 'Patrick Kalala', 'Grace Mujinga', 'David Mutombo',
  'Sarah Ngalula', 'Jean-Bosco Ilunga', 'Chantal Mpunga', 'Olivier Kabongo',
  'Mireille Kasongo', 'Héritier Mbuyi',
];

const ROOM_LABELS: Record<RoomType, string[]> = {
  SIMPLE: ['Salle polyvalente'],
  BANQUET: ['Grande salle de bal', 'Salon de réception', 'Salle de mariage', 'Hall banquet'],
  CONFERENCE: ['Salle de conférence', 'Salle boardroom', 'Espace séminaire'],
  AMPHITHEATER: ['Amphithéâtre', 'Auditorium', 'Salle plénière'],
  TENT: ['Chapiteau jardin', 'Tente pagode', 'Espace plein air'],
  CUSTOM: ['Loft événementiel', 'Rooftop', 'Cour intérieure'],
};

const SERVICE_TITLES: Record<ServiceCategory, string[]> = {
  CATERING: ['Buffet cocktail', 'Menu mariage 3 services', 'Coffee break entreprise', 'Grillade événementielle'],
  PHOTOGRAPHY: ['Reportage mariage', 'Portrait corporate', 'Couverture gala', 'Studio + drone'],
  VIDEO: ['Film de cérémonie', 'Aftermovie événement', 'Captation live', 'Clip institutionnel'],
  DJ: ['DJ mariage', 'Sono + éclairage', 'Animation soirée', 'Set live & karaoke'],
  DECORATION: ['Scénographie mariage', 'Arche florale', 'Décor gala', 'Backdrop photo'],
  SECURITY: ['Agent d’accueil', 'Dispositif VIP', 'Contrôle accès', 'Sécurité parking'],
  FLORIST: ['Bouquet de mariée', 'Centres de table', 'Décor église', 'Composition tropicale'],
  TRANSPORT: ['Navette invités', 'Cortège mariage', 'Minibus VIP', 'Transfert aéroport'],
  MC: ['Maître de cérémonie', 'Animation protocole', 'Présentation gala', 'Host bilingue'],
  OTHER: ['Location mobilier', 'Générateur de secours', 'Photobooth', 'Coordination jour J'],
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

export function marketplacePlaceFor(index: number) {
  return placeFor(index);
}

function placeFor(index: number): { city: City; commune: Commune; neighborhood: string; lat: number; lng: number } {
  const city = index % 10 < 7 ? CITIES[0] : CITIES[1];
  const commune = pick(city.communes, index * 3 + city.communes.length);
  const neighborhood = pick(commune.neighborhoods, index);
  const latRaw = commune.center.lat + ((index % 7) - 3) * 0.0035 + ((index % 3) - 1) * 0.0008;
  const lngRaw = commune.center.lng + ((index % 5) - 2) * 0.0038;
  const lat = Math.min(city.bounds.north - 0.01, Math.max(city.bounds.south + 0.01, latRaw));
  const lng = Math.min(city.bounds.east - 0.01, Math.max(city.bounds.west + 0.01, lngRaw));
  return { city, commune, neighborhood, lat, lng };
}

function photos(kind: 'salle' | 'presta', index: number): string[] {
  return [1, 2, 3].map((n) => `https://picsum.photos/seed/em-${kind}-${index}-${n}/1200/800`);
}

function blockedDates(index: number): string[] {
  const start = new Date();
  start.setDate(start.getDate() + 10 + (index % 12));
  const second = new Date(start);
  second.setDate(start.getDate() + 7);
  return [start.toISOString().slice(0, 10), second.toISOString().slice(0, 10)];
}

async function createVendorTenant(
  prisma: PrismaClient,
  opts: {
    name: string;
    email: string;
    managerName: string;
    plan: 'VENUE' | 'SERVICE' | 'CATALOG';
    accountKind?: 'VENDOR' | 'BOTH';
    passwordHash: string;
    city: string;
  },
) {
  const tenant = await prisma.tenant.create({
    data: {
      name: opts.name,
      plan: opts.plan,
      accountKind: opts.accountKind || 'VENDOR',
      licenseActive: true,
      licenseExpiresAt: addDays(365),
      licenseKey: licenseKey(),
    },
  });
  const user = await prisma.user.create({
    data: {
      email: opts.email,
      name: opts.managerName,
      phone: `+24381${String(2000000 + Math.abs(opts.name.length * 97)).slice(0, 7)}`,
      phoneCountryCode: '+243',
      passwordHash: opts.passwordHash,
      role: 'USER',
      orgRole: 'MANAGER',
      tenantId: tenant.id,
      isEmailVerified: true,
    },
  });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { managerId: user.id } });
  return tenant;
}

export async function seedMarketplaceCatalog(
  prisma: PrismaClient,
  passwordHash: string,
) {
  console.log('Catalogue public — 100 salles + 100 prestataires…');
  const publishedAt = new Date();

  for (let orgIndex = 0; orgIndex < 10; orgIndex++) {
    const orgPlace = placeFor(orgIndex * 10);
    const tenant = await createVendorTenant(prisma, {
      name: VENUE_ORGS[orgIndex],
      email: `salles${orgIndex + 1}@eventmaster.cd`,
      managerName: MANAGERS[orgIndex],
      plan: 'VENUE',
      passwordHash,
      city: orgPlace.city.name,
    });

    await Promise.all(Array.from({ length: 10 }, async (_, n) => {
      const index = orgIndex * 10 + n;
      const place = placeFor(index);
      const roomType = pick(ROOM_TYPES, index);
      const roomName = `${pick(ROOM_LABELS[roomType], index)} ${n + 1}`;
      const headline = `${tenant.name} — ${roomName}`;
      const priceUnit = pick(PRICE_UNITS, index);
      const capacity = 80 + (index % 12) * 40;
      const avenue = pick(AVENUES, index);
      const room = await prisma.organizationRoom.create({
        data: {
          tenantId: tenant.id,
          name: roomName,
          description: `${roomName} à ${place.commune.name} (${place.city.name}), idéal pour mariages, galas et séminaires. Scène, sono et parking.`,
          capacity,
          floor: n % 3 === 0 ? 'RDC' : `Niveau ${n % 3}`,
          location: `${place.neighborhood}, ${place.commune.name}`,
          roomType,
          layoutBlueprint: seedRoomBlueprint(roomType, index),
        },
      });
      await prisma.venueListing.create({
        data: {
          tenantId: tenant.id,
          roomId: room.id,
          slug: `${slugify(headline)}-${String(index + 1).padStart(3, '0')}`,
          isPublic: true,
          headline,
          city: place.city.name,
          commune: place.commune.name,
          neighborhood: place.neighborhood,
          address: `${12 + (index % 80)} ${avenue}`,
          latitude: place.lat,
          longitude: place.lng,
          priceFromFc: 180_000 + (index % 25) * 120_000,
          priceUnit,
          quotaMin: priceUnit === 'QUOTA' ? 50 : null,
          quotaMax: priceUnit === 'QUOTA' ? capacity : null,
          photos: photos('salle', index),
          blockedDates: blockedDates(index),
          publishedAt,
        },
      });
    }));
  }

  for (let orgIndex = 0; orgIndex < 10; orgIndex++) {
    const orgPlace = placeFor(orgIndex * 10 + 5);
    const tenant = await createVendorTenant(prisma, {
      name: SERVICE_ORGS[orgIndex],
      email: `prestas${orgIndex + 1}@eventmaster.cd`,
      managerName: MANAGERS[(orgIndex + 3) % MANAGERS.length],
      plan: 'SERVICE',
      passwordHash,
      city: orgPlace.city.name,
    });
    const profile = await prisma.vendorProfile.create({
      data: {
        tenantId: tenant.id,
        slug: `${slugify(tenant.name)}-${orgIndex + 1}`,
        displayName: tenant.name,
        city: orgPlace.city.name,
        bio: `${tenant.name} intervient à ${orgPlace.city.name} et dans les communes voisines pour vos événements privés et corporate.`,
      },
    });

    await Promise.all(Array.from({ length: 10 }, async (_, n) => {
      const index = orgIndex * 10 + n;
      const place = placeFor(index + 17);
      const category = pick(SERVICE_CATEGORIES, index);
      const title = `${pick(SERVICE_TITLES[category], index)} — ${tenant.name}`;
      const priceUnit = pick(['EVENT', 'DAY', 'HOUR', 'PERSON', 'QUOTA'] as VenuePriceUnit[], index + 2);
      await prisma.serviceOffering.create({
        data: {
          tenantId: tenant.id,
          vendorProfileId: profile.id,
          slug: `${slugify(title)}-${String(index + 1).padStart(3, '0')}`,
          category,
          title,
          description: `${title}. Prestation complète à ${place.city.name} (${place.commune.name} / ${place.neighborhood}), matériel inclus, équipe sur place.`,
          city: place.city.name,
          commune: place.commune.name,
          neighborhood: place.neighborhood,
          coverageRadiusKm: index % 3 === 0 ? null : 8 + (index % 6) * 4,
          travels: index % 3 !== 0,
          latitude: place.lat,
          longitude: place.lng,
          priceFromFc: 45_000 + (index % 20) * 35_000,
          priceUnit,
          quotaMin: priceUnit === 'QUOTA' || priceUnit === 'PERSON' ? 20 : null,
          quotaMax: priceUnit === 'QUOTA' || priceUnit === 'PERSON' ? 300 : null,
          photos: photos('presta', index),
          blockedDates: blockedDates(index + 3),
          isPublic: true,
          publishedAt,
        },
      });
    }));
  }

  const venues = await prisma.venueListing.count({ where: { isPublic: true } });
  const services = await prisma.serviceOffering.count({ where: { isPublic: true } });
  console.log(`  → ${venues} salles publiques, ${services} prestataires publics`);
}
