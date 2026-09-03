import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';

const FEED_PAGE_SIZE = 20;
const PREVIEW_LIMIT = 3;
const MAX_MEDIA = 8;
const MAX_CONTENT = 4000;
const MAX_COMMENT = 2000;

type MediaItem = { url: string; type: 'IMAGE' | 'VIDEO' };

function likeKey(userId: string) {
  return `user_${userId}`;
}

function parseLikes(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
}

function normalizeMediaUrls(raw: unknown): MediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MediaItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const url = String((item as any).url || '').trim();
    if (!url || url.startsWith('data:')) continue;
    const type = String((item as any).type || '').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE';
    out.push({ url: url.slice(0, 2048), type });
    if (out.length >= MAX_MEDIA) break;
  }
  return out;
}

function serializePost(post: {
  id: string;
  content: string | null;
  mediaUrls: unknown;
  likes: unknown;
  isPublished: boolean;
  createdAt: Date;
  venueListingId: string | null;
  vendorProfileId: string | null;
  serviceOfferingId?: string | null;
  comments?: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: Date;
    userId: string;
  }>;
}) {
  const likes = parseLikes(post.likes);
  return {
    id: post.id,
    content: post.content,
    mediaUrls: normalizeMediaUrls(post.mediaUrls),
    likes,
    likeCount: likes.length,
    isPublished: post.isPublished,
    createdAt: post.createdAt,
    venueListingId: post.venueListingId,
    vendorProfileId: post.vendorProfileId,
    serviceOfferingId: post.serviceOfferingId ?? null,
    comments: (post.comments || []).map((c) => ({
      id: c.id,
      authorName: c.authorName,
      content: c.content,
      createdAt: c.createdAt,
      userId: c.userId,
    })),
  };
}

const postInclude = {
  comments: {
    orderBy: { createdAt: 'asc' as const },
    take: 50,
    select: {
      id: true,
      authorName: true,
      content: true,
      createdAt: true,
      userId: true,
    },
  },
};

const publicFeedInclude = {
  ...postInclude,
  venueListing: {
    select: {
      slug: true,
      headline: true,
      city: true,
      photos: true,
      isPublic: true,
      isBlockedByAdmin: true,
      room: { select: { name: true } },
    },
  },
  vendorProfile: {
    select: {
      slug: true,
      displayName: true,
      city: true,
      isBlockedByAdmin: true,
      offerings: {
        where: { isPublic: true, isBlockedByAdmin: false },
        select: { slug: true, photos: true, title: true },
        orderBy: { publishedAt: 'desc' as const },
        take: 1,
      },
    },
  },
  serviceOffering: {
    select: {
      slug: true,
      title: true,
      city: true,
      photos: true,
      category: true,
      isPublic: true,
      isBlockedByAdmin: true,
    },
  },
};

function coverFromPhotos(photos: unknown): string | null {
  if (!Array.isArray(photos)) return null;
  const first = photos.find((p) => typeof p === 'string' && p.trim());
  return typeof first === 'string' ? first : null;
}

async function assertVenueOwner(userId: string, tenantId: string, listingId: string) {
  const access = await resolveOrgAccess(userId, tenantId);
  if (!access.canManageRooms) return null;
  const listing = await prisma.venueListing.findFirst({
    where: { id: listingId, tenantId },
  });
  return listing;
}

async function assertVendorOwner(userId: string, tenantId: string) {
  const access = await resolveOrgAccess(userId, tenantId);
  if (!access.canManageRooms) return null;
  return prisma.vendorProfile.findUnique({ where: { tenantId } });
}

function serializePublicFeedPost(post: {
  id: string;
  content: string | null;
  mediaUrls: unknown;
  likes: unknown;
  isPublished: boolean;
  createdAt: Date;
  venueListingId: string | null;
  vendorProfileId: string | null;
  serviceOfferingId?: string | null;
  comments?: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: Date;
    userId: string;
  }>;
  venueListing?: {
    slug: string;
    headline: string | null;
    city: string | null;
    photos: unknown;
    isPublic: boolean;
    isBlockedByAdmin: boolean;
    room: { name: string };
  } | null;
  vendorProfile?: {
    slug: string;
    displayName: string;
    city: string | null;
    isBlockedByAdmin: boolean;
    offerings: Array<{ slug: string; photos: unknown; title: string }>;
  } | null;
  serviceOffering?: {
    slug: string;
    title: string;
    city: string | null;
    photos: unknown;
    category: string;
    isPublic: boolean;
    isBlockedByAdmin: boolean;
  } | null;
}) {
  const base = serializePost(post);
  if (post.venueListingId && post.venueListing) {
    const listing = post.venueListing;
    return {
      ...base,
      author: {
        kind: 'venue' as const,
        name: listing.headline || listing.room.name,
        slug: listing.slug,
        city: listing.city,
        coverUrl: coverFromPhotos(listing.photos),
        href: `/marketplace/salles/${listing.slug}`,
      },
    };
  }
  if (post.serviceOfferingId && post.serviceOffering) {
    const offering = post.serviceOffering;
    const isRental = String(offering.category || '').startsWith('RENTAL_');
    return {
      ...base,
      author: {
        kind: 'service' as const,
        name: offering.title,
        slug: offering.slug,
        city: offering.city,
        coverUrl: coverFromPhotos(offering.photos),
        href: isRental
          ? `/marketplace/locations/${offering.slug}`
          : `/marketplace/prestataires/${offering.slug}`,
      },
    };
  }
  if (post.vendorProfileId && post.vendorProfile) {
    const vendor = post.vendorProfile;
    const offering = vendor.offerings[0];
    return {
      ...base,
      author: {
        kind: 'vendor' as const,
        name: vendor.displayName,
        slug: vendor.slug,
        city: vendor.city,
        coverUrl: coverFromPhotos(offering?.photos),
        href: offering ? `/marketplace/prestataires/${offering.slug}` : null,
      },
    };
  }
  return { ...base, author: null };
}

/** Fil global marketplace (salles + prestataires). */
export async function getPublicMarketplaceFeed(req: Request, res: Response) {
  try {
    const kindRaw = String(req.query.kind || 'all').trim().toLowerCase();
    const kind = kindRaw === 'venue' || kindRaw === 'vendor' ? kindRaw : 'all';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';

    const where: Record<string, unknown> = {
      isPublished: true,
      OR: [
        {
          venueListingId: { not: null },
          venueListing: { isPublic: true, isBlockedByAdmin: false },
        },
        {
          serviceOfferingId: { not: null },
          serviceOffering: { isPublic: true, isBlockedByAdmin: false },
        },
        {
          vendorProfileId: { not: null },
          vendorProfile: { isBlockedByAdmin: false },
        },
      ],
    };

    if (kind === 'venue') {
      where.OR = [
        {
          venueListingId: { not: null },
          venueListing: { isPublic: true, isBlockedByAdmin: false },
        },
      ];
    } else if (kind === 'vendor') {
      where.OR = [
        {
          serviceOfferingId: { not: null },
          serviceOffering: { isPublic: true, isBlockedByAdmin: false },
        },
        {
          vendorProfileId: { not: null },
          vendorProfile: { isBlockedByAdmin: false },
        },
      ];
    }

    if (q) {
      where.AND = [
        {
          OR: [
            { content: { contains: q, mode: 'insensitive' } },
            { venueListing: { headline: { contains: q, mode: 'insensitive' } } },
            { venueListing: { room: { name: { contains: q, mode: 'insensitive' } } } },
            { serviceOffering: { title: { contains: q, mode: 'insensitive' } } },
            { vendorProfile: { displayName: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const posts = await prisma.marketplacePost.findMany({
      where: where as any,
      include: publicFeedInclude,
      orderBy: { createdAt: 'desc' },
      take: FEED_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = posts.length > FEED_PAGE_SIZE;
    const page = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;
    return res.json({
      posts: page.map(serializePublicFeedPost),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    });
  } catch (error) {
    console.error('getPublicMarketplaceFeed:', error);
    return res.status(500).json({ error: 'Impossible de charger le fil d’activité.' });
  }
}

export async function getPublicVenueFeed(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug requis.' });

    const listing = await prisma.venueListing.findFirst({
      where: { slug, isPublic: true, isBlockedByAdmin: false },
      select: { id: true },
    });
    if (!listing) return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const posts = await prisma.marketplacePost.findMany({
      where: { venueListingId: listing.id, isPublished: true },
      include: postInclude,
      orderBy: { createdAt: 'desc' },
      take: FEED_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = posts.length > FEED_PAGE_SIZE;
    const page = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;
    return res.json({
      posts: page.map(serializePost),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    });
  } catch (error) {
    console.error('getPublicVenueFeed:', error);
    return res.status(500).json({ error: 'Impossible de charger le fil d’activité.' });
  }
}

export async function getPublicVendorFeed(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug requis.' });

    const profile = await prisma.vendorProfile.findFirst({
      where: { slug, isBlockedByAdmin: false },
      select: { id: true },
    });
    if (!profile) return res.status(404).json({ error: 'Prestataire introuvable.' });

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const posts = await prisma.marketplacePost.findMany({
      where: { vendorProfileId: profile.id, isPublished: true },
      include: postInclude,
      orderBy: { createdAt: 'desc' },
      take: FEED_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = posts.length > FEED_PAGE_SIZE;
    const page = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;
    return res.json({
      posts: page.map(serializePost),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    });
  } catch (error) {
    console.error('getPublicVendorFeed:', error);
    return res.status(500).json({ error: 'Impossible de charger le fil d’activité.' });
  }
}

export async function listVenueFeedOwner(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const listingId = String(req.params.listingId || '').trim();
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié.' });
    if (!listingId) return res.status(400).json({ error: 'Listing requis.' });

    const listing = await assertVenueOwner(userId, tenantId, listingId);
    if (!listing) return res.status(403).json({ error: 'Accès refusé.' });

    const posts = await prisma.marketplacePost.findMany({
      where: { venueListingId: listing.id },
      include: postInclude,
      orderBy: { createdAt: 'desc' },
      take: FEED_PAGE_SIZE,
    });
    return res.json(posts.map(serializePost));
  } catch (error) {
    console.error('listVenueFeedOwner:', error);
    return res.status(500).json({ error: 'Impossible de charger le fil.' });
  }
}

export async function createVenueFeedPost(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const listingId = String(req.params.listingId || '').trim();
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const listing = await assertVenueOwner(userId, tenantId, listingId);
    if (!listing) return res.status(403).json({ error: 'Accès refusé.' });
    if (listing.isBlockedByAdmin) {
      return res.status(403).json({ error: 'Cette fiche est bloquée par l’administration.' });
    }
    if (!listing.isPublic) {
      return res.status(400).json({
        error: 'Publiez d’abord la fiche salle sur le marketplace pour partager des activités.',
      });
    }

    const content = String(req.body?.content || '').trim().slice(0, MAX_CONTENT);
    const mediaUrls = normalizeMediaUrls(req.body?.mediaUrls);
    if (!content && mediaUrls.length === 0) {
      return res.status(400).json({ error: 'Ajoutez un texte ou au moins un média.' });
    }

    const post = await prisma.marketplacePost.create({
      data: {
        tenantId,
        venueListingId: listing.id,
        content: content || null,
        mediaUrls: mediaUrls.length ? mediaUrls : undefined,
        likes: [],
        isPublished: true,
      },
      include: postInclude,
    });
    return res.status(201).json(serializePost(post));
  } catch (error) {
    console.error('createVenueFeedPost:', error);
    return res.status(500).json({ error: 'Impossible de publier le post.' });
  }
}

export async function listVendorFeedOwner(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const profile = await assertVendorOwner(userId, tenantId);
    if (!profile) {
      return res.status(404).json({ error: 'Créez d’abord votre profil prestataire (une offre publique).' });
    }

    const posts = await prisma.marketplacePost.findMany({
      where: { vendorProfileId: profile.id },
      include: postInclude,
      orderBy: { createdAt: 'desc' },
      take: FEED_PAGE_SIZE,
    });
    return res.json(posts.map(serializePost));
  } catch (error) {
    console.error('listVendorFeedOwner:', error);
    return res.status(500).json({ error: 'Impossible de charger le fil.' });
  }
}

export async function createVendorFeedPost(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const profile = await assertVendorOwner(userId, tenantId);
    if (!profile) {
      return res.status(404).json({ error: 'Créez d’abord votre profil prestataire (une offre publique).' });
    }
    if (profile.isBlockedByAdmin) {
      return res.status(403).json({ error: 'Ce profil est bloqué par l’administration.' });
    }

    const content = String(req.body?.content || '').trim().slice(0, MAX_CONTENT);
    const mediaUrls = normalizeMediaUrls(req.body?.mediaUrls);
    if (!content && mediaUrls.length === 0) {
      return res.status(400).json({ error: 'Ajoutez un texte ou au moins un média.' });
    }

    const post = await prisma.marketplacePost.create({
      data: {
        tenantId,
        vendorProfileId: profile.id,
        content: content || null,
        mediaUrls: mediaUrls.length ? mediaUrls : undefined,
        likes: [],
        isPublished: true,
      },
      include: postInclude,
    });
    return res.status(201).json(serializePost(post));
  } catch (error) {
    console.error('createVendorFeedPost:', error);
    return res.status(500).json({ error: 'Impossible de publier le post.' });
  }
}

export async function deleteMarketplaceFeedPost(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const postId = String(req.params.postId || '').trim();
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });

    const post = await prisma.marketplacePost.findFirst({
      where: { id: postId, tenantId },
    });
    if (!post) return res.status(404).json({ error: 'Publication introuvable.' });

    await prisma.marketplacePost.delete({ where: { id: post.id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('deleteMarketplaceFeedPost:', error);
    return res.status(500).json({ error: 'Impossible de supprimer la publication.' });
  }
}

export async function toggleMarketplaceFeedLike(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Connectez-vous pour aimer cette publication.' });

    const postId = String(req.params.postId || '').trim();
    const post = await prisma.marketplacePost.findFirst({
      where: { id: postId, isPublished: true },
      include: {
        venueListing: { select: { isPublic: true, isBlockedByAdmin: true } },
        vendorProfile: { select: { isBlockedByAdmin: true } },
        serviceOffering: { select: { isPublic: true, isBlockedByAdmin: true } },
      },
    });
    if (!post) return res.status(404).json({ error: 'Publication introuvable.' });

    if (post.venueListingId) {
      if (!post.venueListing?.isPublic || post.venueListing.isBlockedByAdmin) {
        return res.status(404).json({ error: 'Publication introuvable.' });
      }
    }
    if (post.serviceOfferingId) {
      if (!post.serviceOffering?.isPublic || post.serviceOffering.isBlockedByAdmin) {
        return res.status(404).json({ error: 'Publication introuvable.' });
      }
    }
    if (post.vendorProfileId && post.vendorProfile?.isBlockedByAdmin) {
      return res.status(404).json({ error: 'Publication introuvable.' });
    }

    const key = likeKey(userId);
    const likes = parseLikes(post.likes);
    const next = likes.includes(key) ? likes.filter((x) => x !== key) : [...likes, key];

    const updated = await prisma.marketplacePost.update({
      where: { id: post.id },
      data: { likes: next },
      include: postInclude,
    });
    return res.json(serializePost(updated));
  } catch (error) {
    console.error('toggleMarketplaceFeedLike:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour le like.' });
  }
}

export async function createMarketplaceFeedComment(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Connectez-vous pour commenter.' });

    const postId = String(req.params.postId || '').trim();
    const content = String(req.body?.content || '').trim().slice(0, MAX_COMMENT);
    if (!content) return res.status(400).json({ error: 'Le commentaire est requis.' });

    const post = await prisma.marketplacePost.findFirst({
      where: { id: postId, isPublished: true },
      include: {
        venueListing: { select: { isPublic: true, isBlockedByAdmin: true } },
        vendorProfile: { select: { isBlockedByAdmin: true } },
        serviceOffering: { select: { isPublic: true, isBlockedByAdmin: true } },
      },
    });
    if (!post) return res.status(404).json({ error: 'Publication introuvable.' });
    if (post.venueListingId) {
      if (!post.venueListing?.isPublic || post.venueListing.isBlockedByAdmin) {
        return res.status(404).json({ error: 'Publication introuvable.' });
      }
    }
    if (post.serviceOfferingId) {
      if (!post.serviceOffering?.isPublic || post.serviceOffering.isBlockedByAdmin) {
        return res.status(404).json({ error: 'Publication introuvable.' });
      }
    }
    if (post.vendorProfileId && post.vendorProfile?.isBlockedByAdmin) {
      return res.status(404).json({ error: 'Publication introuvable.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const authorName = (user?.name || user?.email || 'Utilisateur').trim().slice(0, 120);

    const comment = await prisma.marketplaceComment.create({
      data: {
        postId: post.id,
        userId,
        authorName,
        content,
      },
    });

    return res.status(201).json({
      id: comment.id,
      authorName: comment.authorName,
      content: comment.content,
      createdAt: comment.createdAt,
      userId: comment.userId,
    });
  } catch (error) {
    console.error('createMarketplaceFeedComment:', error);
    return res.status(500).json({ error: 'Impossible d’ajouter le commentaire.' });
  }
}

/** Cibles disponibles pour créer une publication (salles + prestations du tenant). */
export async function listFeedTargets(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });

    const [venues, services] = await Promise.all([
      prisma.venueListing.findMany({
        where: { tenantId, isBlockedByAdmin: false },
        select: {
          id: true,
          slug: true,
          headline: true,
          isPublic: true,
          photos: true,
          city: true,
          room: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.serviceOffering.findMany({
        where: { tenantId, isBlockedByAdmin: false },
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          isPublic: true,
          photos: true,
          city: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return res.json({
      venues: venues.map((v) => ({
        id: v.id,
        kind: 'venue' as const,
        label: v.headline || v.room.name,
        slug: v.slug,
        city: v.city,
        isPublic: v.isPublic,
        coverUrl: coverFromPhotos(v.photos),
      })),
      services: services.map((s) => ({
        id: s.id,
        kind: 'service' as const,
        label: s.title,
        slug: s.slug,
        city: s.city,
        isPublic: s.isPublic,
        category: s.category,
        coverUrl: coverFromPhotos(s.photos),
      })),
    });
  } catch (error) {
    console.error('listFeedTargets:', error);
    return res.status(500).json({ error: 'Impossible de charger les cibles.' });
  }
}

/** Création unifiée liée à une salle ou une prestation. */
export async function createLinkedFeedPost(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });

    const targetKind = String(req.body?.targetKind || '').trim();
    const targetId = String(req.body?.targetId || '').trim();
    const content = String(req.body?.content || '').trim().slice(0, MAX_CONTENT);
    const mediaUrls = normalizeMediaUrls(req.body?.mediaUrls);

    if (!content && mediaUrls.length === 0) {
      return res.status(400).json({ error: 'Ajoutez un texte ou au moins un média.' });
    }
    if (!targetId || (targetKind !== 'venue' && targetKind !== 'service')) {
      return res.status(400).json({ error: 'Choisissez une salle ou une prestation.' });
    }

    if (targetKind === 'venue') {
      const listing = await prisma.venueListing.findFirst({
        where: { id: targetId, tenantId },
      });
      if (!listing) return res.status(404).json({ error: 'Salle introuvable.' });
      if (listing.isBlockedByAdmin) {
        return res.status(403).json({ error: 'Cette fiche est bloquée par l’administration.' });
      }
      if (!listing.isPublic) {
        return res.status(400).json({
          error: 'Publiez d’abord la fiche salle sur le marketplace.',
        });
      }
      const post = await prisma.marketplacePost.create({
        data: {
          tenantId,
          venueListingId: listing.id,
          content: content || null,
          mediaUrls: mediaUrls.length ? mediaUrls : undefined,
          likes: [],
          isPublished: true,
        },
        include: publicFeedInclude,
      });
      return res.status(201).json(serializePublicFeedPost(post));
    }

    const offering = await prisma.serviceOffering.findFirst({
      where: { id: targetId, tenantId },
    });
    if (!offering) return res.status(404).json({ error: 'Prestation introuvable.' });
    if (offering.isBlockedByAdmin) {
      return res.status(403).json({ error: 'Cette fiche est bloquée par l’administration.' });
    }
    if (!offering.isPublic) {
      return res.status(400).json({
        error: 'Publiez d’abord la fiche prestation sur le marketplace.',
      });
    }
    const post = await prisma.marketplacePost.create({
      data: {
        tenantId,
        serviceOfferingId: offering.id,
        vendorProfileId: offering.vendorProfileId,
        content: content || null,
        mediaUrls: mediaUrls.length ? mediaUrls : undefined,
        likes: [],
        isPublished: true,
      },
      include: publicFeedInclude,
    });
    return res.status(201).json(serializePublicFeedPost(post));
  } catch (error) {
    console.error('createLinkedFeedPost:', error);
    return res.status(500).json({ error: 'Impossible de publier.' });
  }
}

export async function listMyFeedPosts(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) return res.status(403).json({ error: 'Accès refusé.' });

    const posts = await prisma.marketplacePost.findMany({
      where: { tenantId },
      include: publicFeedInclude,
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    return res.json(posts.map(serializePublicFeedPost));
  } catch (error) {
    console.error('listMyFeedPosts:', error);
    return res.status(500).json({ error: 'Impossible de charger vos publications.' });
  }
}

/** Aperçu pour enrichir getPublicVenue / getPublicVendor. */
export async function fetchActivityPreview(where: {
  venueListingId?: string;
  vendorProfileId?: string;
  serviceOfferingId?: string;
}) {
  const posts = await prisma.marketplacePost.findMany({
    where: { ...where, isPublished: true },
    orderBy: { createdAt: 'desc' },
    take: PREVIEW_LIMIT,
    select: {
      id: true,
      content: true,
      mediaUrls: true,
      likes: true,
      createdAt: true,
      _count: { select: { comments: true } },
    },
  });
  return posts.map((p) => {
    const likes = parseLikes(p.likes);
    return {
      id: p.id,
      content: p.content,
      mediaUrls: normalizeMediaUrls(p.mediaUrls),
      likeCount: likes.length,
      commentCount: p._count.comments,
      createdAt: p.createdAt,
    };
  });
}
