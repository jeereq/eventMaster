import type { Prisma, PrismaClient, ServiceCategory } from '@prisma/client';
import { venuePhotos, servicePhotos } from './rdcMedia';

const VENUE_CAPTIONS = [
  'Nouvelle décoration florale pour les réceptions de saison — visitez-nous à Gombe.',
  'Notre salle vient d’être équipée d’un nouvel éclairage scène. Réservez votre date.',
  'Weekend portes ouvertes : venez tester l’acoustique et le plan de table en 3D.',
  'Mariages & galas : packs clé en main avec traiteur partenaire.',
  'Capacité élargie ce mois-ci — idéal pour les conférences d’entreprise.',
  'Rooftop disponible le soir : vue ville, DJ booth et coin photo.',
  'Rénovation terminée : nouveaux salons VIP et parking sécurisé.',
  'Promo semaine : tarif préférentiel pour les événements en semaine.',
];

const SERVICE_CAPTIONS = [
  'Portfolio du mois : shooting mariage à Limete — dispo pour vos dates 2026.',
  'Menu dégustation mis à jour : plats locaux & options végétariennes.',
  'Sono 4 points + éclairage LED — parfait pour réceptions jusqu’à 300 invités.',
  'Équipe complète prête à se déplacer à Kinshasa et Lubumbashi.',
  'Nouveaux costumes et robes de cérémonie en location — essayage sur rendez-vous.',
  'Navettes climatisées pour vos invités : flotte renforcée ce trimestre.',
  'Backstage beauté : coiffure & maquillage jour J, forfaits duo mariés.',
  'Chapiteaux et mobilier design — montage sous 48 h selon disponibilité.',
];

const COMMENT_SNIPPETS = [
  'Super rendu, on a hâte de voir ça en vrai !',
  'Est-ce disponible un samedi en décembre ?',
  'Très pro, merci pour le partage.',
  'Le style correspond exactement à ce qu’on cherche.',
  'Pouvez-vous envoyer un devis pour 150 personnes ?',
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + (n % 8), (n * 7) % 60, 0, 0);
  return d;
}

function photoUrls(photos: Prisma.JsonValue | null | undefined, fallback: string[]): string[] {
  if (Array.isArray(photos)) {
    const urls = photos
      .map((p) => {
        if (typeof p === 'string' && p.trim()) return p.trim();
        if (p && typeof p === 'object' && 'url' in p && typeof (p as { url: unknown }).url === 'string') {
          return (p as { url: string }).url.trim();
        }
        return null;
      })
      .filter((u): u is string => Boolean(u));
    if (urls.length) return urls;
  }
  return fallback;
}

function toMedia(urls: string[]): Array<{ url: string; type: 'IMAGE' }> {
  return urls.slice(0, 3).map((url) => ({ url, type: 'IMAGE' as const }));
}

/**
 * Seed du fil Publications (MarketplacePost) lié aux salles et prestations publiques.
 */
export async function seedMarketplaceActivity(prisma: PrismaClient) {
  console.log('Publications marketplace (grille salles & prestations)…');

  const venues = await prisma.venueListing.findMany({
    where: { isPublic: true, isBlockedByAdmin: false },
    select: {
      id: true,
      tenantId: true,
      photos: true,
      city: true,
    },
    take: 40,
    orderBy: { publishedAt: 'desc' },
  });

  const services = await prisma.serviceOffering.findMany({
    where: { isPublic: true, isBlockedByAdmin: false },
    select: {
      id: true,
      tenantId: true,
      vendorProfileId: true,
      photos: true,
      category: true,
      city: true,
    },
    take: 40,
    orderBy: { publishedAt: 'desc' },
  });

  const interactors = await prisma.user.findMany({
    where: {
      role: 'USER',
      OR: [{ tenant: { accountKind: 'CLIENT' } }, { orgRole: 'MANAGER' }, { email: { contains: '@tickets.demo.cd' } }],
    },
    select: { id: true, name: true, email: true },
    take: 40,
  });

  let created = 0;
  const postIds: string[] = [];

  for (let i = 0; i < Math.min(venues.length, 24); i++) {
    const venue = venues[i];
    const caption = VENUE_CAPTIONS[i % VENUE_CAPTIONS.length];
    const media = toMedia(photoUrls(venue.photos, venuePhotos(i)));
    const likeUsers = interactors.slice(0, (i % 5) + 1);
    const post = await prisma.marketplacePost.create({
      data: {
        tenantId: venue.tenantId,
        venueListingId: venue.id,
        content: `${caption}${venue.city ? ` (${venue.city})` : ''}`,
        mediaUrls: media,
        likes: likeUsers.map((u) => `user_${u.id}`),
        isPublished: true,
        createdAt: daysAgo(i + 1),
      },
    });
    postIds.push(post.id);
    created += 1;
  }

  for (let i = 0; i < Math.min(services.length, 24); i++) {
    const service = services[i];
    const caption = SERVICE_CAPTIONS[i % SERVICE_CAPTIONS.length];
    const media = toMedia(
      photoUrls(service.photos, servicePhotos(service.category as ServiceCategory, i)),
    );
    const likeUsers = interactors.slice(0, (i % 4) + 1);
    const post = await prisma.marketplacePost.create({
      data: {
        tenantId: service.tenantId,
        serviceOfferingId: service.id,
        vendorProfileId: service.vendorProfileId,
        content: `${caption}${service.city ? ` — ${service.city}` : ''}`,
        mediaUrls: media,
        likes: likeUsers.map((u) => `user_${u.id}`),
        isPublished: true,
        createdAt: daysAgo(i + 2),
      },
    });
    postIds.push(post.id);
    created += 1;
  }

  const vendors = await prisma.vendorProfile.findMany({
    where: { isBlockedByAdmin: false },
    select: { id: true, tenantId: true, displayName: true, city: true },
    take: 8,
  });
  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    const post = await prisma.marketplacePost.create({
      data: {
        tenantId: vendor.tenantId,
        vendorProfileId: vendor.id,
        content: `${vendor.displayName} : nouvelle saison d’événements${vendor.city ? ` à ${vendor.city}` : ''}. Suivez nos réalisations !`,
        mediaUrls: toMedia(venuePhotos(i + 80)),
        likes: [],
        isPublished: true,
        createdAt: daysAgo(i + 3),
      },
    });
    postIds.push(post.id);
    created += 1;
  }

  let comments = 0;
  if (interactors.length > 0) {
    for (let i = 0; i < Math.min(postIds.length, 36); i++) {
      const postId = postIds[i];
      const n = 1 + (i % 3);
      for (let c = 0; c < n; c++) {
        const author = interactors[(i * 3 + c) % interactors.length];
        await prisma.marketplaceComment.create({
          data: {
            postId,
            userId: author.id,
            authorName: (author.name || author.email || 'Invité').slice(0, 120),
            content: COMMENT_SNIPPETS[(i + c) % COMMENT_SNIPPETS.length],
            createdAt: daysAgo(Math.max(0, i - c)),
          },
        });
        comments += 1;
      }
    }
  }

  console.log(`  → ${created} publications, ${comments} commentaires`);
}
