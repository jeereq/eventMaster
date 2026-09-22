import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { uniqueSlug } from '../utils/slug';
import { activePromoPrice } from './offerPromotion';
import {
  BEVERAGE_KIND_LABELS,
  beverageInvitationOption,
  parseBrandDraft,
  parseVendorPriceOffers,
  type BeverageKind,
} from './beverageBrandCatalog.ts';

function brandPublic(brand: {
  id: string;
  name: string;
  kind: BeverageKind;
  producer: string | null;
  country: string | null;
  volumeLabel: string | null;
  description: string | null;
  isActive: boolean;
}) {
  return {
    ...brand,
    kindLabel: BEVERAGE_KIND_LABELS[brand.kind],
    invitationOption: beverageInvitationOption(brand),
  };
}

export async function listBeverageBrands(options?: { includeInactive?: boolean }) {
  const brands = await prisma.beverageBrand.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  });
  const prices = await prisma.vendorBeveragePrice.findMany({
    where: { isAvailable: true },
    select: { brandId: true, priceFc: true, promoPriceFc: true, promoEndsAt: true },
  });
  const floorByBrand = new Map<string, { count: number; priceFromFc: number | null }>();
  for (const row of prices) {
    const current = floorByBrand.get(row.brandId) ?? { count: 0, priceFromFc: null };
    const payable = activePromoPrice({
      priceFc: row.priceFc,
      promoPriceFc: row.promoPriceFc,
      promoEndsAt: row.promoEndsAt,
    }) ?? row.priceFc;
    current.count += 1;
    current.priceFromFc = current.priceFromFc == null ? payable : Math.min(current.priceFromFc, payable);
    floorByBrand.set(row.brandId, current);
  }
  return brands.map((brand) => {
    const stat = floorByBrand.get(brand.id);
    return {
      ...brandPublic(brand),
      vendorCount: stat?.count ?? 0,
      priceFromFc: stat?.priceFromFc ?? null,
    };
  });
}

async function ensureVendorProfile(tenantId: string, displayName: string) {
  const existing = await prisma.vendorProfile.findUnique({ where: { tenantId } });
  if (existing) return existing;
  const name = displayName.trim() || 'Prestataire';
  const slug = await uniqueSlug(name, async (candidate) => {
    const hit = await prisma.vendorProfile.findUnique({ where: { slug: candidate }, select: { id: true } });
    return Boolean(hit);
  });
  try {
    return await prisma.vendorProfile.create({
      data: { tenantId, slug, displayName: name },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const again = await prisma.vendorProfile.findUnique({ where: { tenantId } });
      if (again) return again;
    }
    throw error;
  }
}

export async function listPublicBeverageOffers(tenantId?: string) {
  const rows = await prisma.vendorBeveragePrice.findMany({
    where: {
      isAvailable: true,
      brand: { isActive: true },
      ...(tenantId ? { tenantId } : {}),
    },
    orderBy: [{ brand: { kind: 'asc' } }, { brand: { name: 'asc' } }, { priceFc: 'asc' }],
    select: {
      id: true,
      tenantId: true,
      unitKind: true,
      quantity: true,
      unitLabel: true,
      priceFc: true,
      promoPriceFc: true,
      promoEndsAt: true,
      notes: true,
      brand: {
        select: {
          id: true,
          name: true,
          kind: true,
          producer: true,
          country: true,
          volumeLabel: true,
          description: true,
          imageUrl: true,
        },
      },
      tenant: {
        select: {
          name: true,
          vendorProfile: { select: { displayName: true, slug: true } },
        },
      },
    },
  });
  const profiles = new Map<string, { slug: string; displayName: string }>();
  for (const row of rows) {
    const current = row.tenant.vendorProfile;
    if (current?.slug) {
      profiles.set(row.tenantId, { slug: current.slug, displayName: current.displayName });
      continue;
    }
    if (profiles.has(row.tenantId)) continue;
    const created = await ensureVendorProfile(row.tenantId, row.tenant.name);
    profiles.set(row.tenantId, { slug: created.slug, displayName: created.displayName });
  }
  return rows.map((row) => {
    const payable = activePromoPrice({
      priceFc: row.priceFc,
      promoPriceFc: row.promoPriceFc,
      promoEndsAt: row.promoEndsAt,
    }) ?? row.priceFc;
    return {
      id: row.id,
      brandId: row.brand.id,
      brandName: row.brand.name,
      kind: row.brand.kind,
      kindLabel: BEVERAGE_KIND_LABELS[row.brand.kind],
      imageUrl: row.brand.imageUrl,
      producer: row.brand.producer,
      country: row.brand.country,
      volumeLabel: row.brand.volumeLabel,
      description: row.brand.description,
      vendorName: profiles.get(row.tenantId)?.displayName || row.tenant.name,
      vendorSlug: profiles.get(row.tenantId)?.slug || null,
      unitKind: row.unitKind,
      quantity: row.quantity,
      unitLabel: row.unitLabel,
      priceFc: row.priceFc,
      payableFc: payable,
      promoPriceFc: payable < row.priceFc ? payable : null,
      notes: row.notes,
    };
  });
}

export async function listVendorDrinkPage(slug: string) {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;
  const profile = await prisma.vendorProfile.findFirst({
    where: { slug: cleanSlug, isBlockedByAdmin: false },
    select: { slug: true, displayName: true, city: true, bio: true, tenantId: true },
  });
  if (!profile) return null;
  const offers = await listPublicBeverageOffers(profile.tenantId);
  return {
    vendor: {
      slug: profile.slug,
      displayName: profile.displayName,
      city: profile.city,
      bio: profile.bio,
    },
    offers,
  };
}

export async function createBeverageBrand(body: unknown) {
  const parsed = parseBrandDraft(body);
  if ('error' in parsed) throw new Error(parsed.error);
  const duplicate = await prisma.beverageBrand.findFirst({
    where: { kind: parsed.draft.kind, name: { equals: parsed.draft.name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (duplicate) throw new Error('Cette marque existe déjà dans cette famille.');
  const created = await prisma.beverageBrand.create({ data: parsed.draft });
  return brandPublic(created);
}

export async function updateBeverageBrand(id: string, body: unknown) {
  const parsed = parseBrandDraft(body);
  if ('error' in parsed) throw new Error(parsed.error);
  const current = await prisma.beverageBrand.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw new Error('Marque introuvable.');
  const duplicate = await prisma.beverageBrand.findFirst({
    where: {
      id: { not: id },
      kind: parsed.draft.kind,
      name: { equals: parsed.draft.name, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (duplicate) throw new Error('Cette marque existe déjà dans cette famille.');
  const updated = await prisma.beverageBrand.update({ where: { id }, data: parsed.draft });
  return brandPublic(updated);
}

export async function archiveBeverageBrand(id: string) {
  const current = await prisma.beverageBrand.findUnique({
    where: { id },
    include: { _count: { select: { prices: true } } },
  });
  if (!current) throw new Error('Marque introuvable.');
  if (current._count.prices > 0) {
    const updated = await prisma.beverageBrand.update({
      where: { id },
      data: { isActive: false },
    });
    return { brand: brandPublic(updated), archived: true as const };
  }
  await prisma.beverageBrand.delete({ where: { id } });
  return { brand: brandPublic(current), archived: false as const };
}

export async function listVendorBeverageCatalog(tenantId: string) {
  const brands = await prisma.beverageBrand.findMany({
    where: {
      OR: [{ isActive: true }, { prices: { some: { tenantId } } }],
    },
    include: {
      prices: { where: { tenantId }, orderBy: [{ unitKind: 'asc' }, { unitLabel: 'asc' }] },
    },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  });
  return brands.map((brand) => ({
    ...brandPublic(brand),
    myPrices: brand.prices.map((mine) => ({
      id: mine.id,
      priceFc: mine.priceFc,
      promoPriceFc: mine.promoPriceFc,
      promoLabel: mine.promoLabel,
      promoEndsAt: mine.promoEndsAt,
      unitKind: mine.unitKind,
      quantity: mine.quantity,
      unitLabel: mine.unitLabel,
      isAvailable: mine.isAvailable,
      notes: mine.notes,
    })),
  }));
}

export async function replaceVendorBeveragePrices(tenantId: string, body: unknown) {
  const parsed = parseVendorPriceOffers(body);
  if ('error' in parsed) throw new Error(parsed.error);
  const brandIds = [...new Set(parsed.offers.map((offer) => offer.brandId))];
  if (brandIds.length) {
    const found = await prisma.beverageBrand.findMany({
      where: { id: { in: brandIds }, isActive: true },
      select: { id: true },
    });
    if (found.length !== brandIds.length) {
      throw new Error('Une ou plusieurs marques ne sont plus disponibles au catalogue.');
    }
  }

  if (parsed.offers.length) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    await ensureVendorProfile(tenantId, tenant?.name || 'Prestataire');
  }

  await prisma.$transaction(async (tx) => {
    await tx.vendorBeveragePrice.deleteMany({ where: { tenantId } });
    if (parsed.offers.length) {
      await tx.vendorBeveragePrice.createMany({
        data: parsed.offers.map((offer) => ({
          tenantId,
          brandId: offer.brandId,
          unitKind: offer.unitKind,
          quantity: offer.quantity,
          unitLabel: offer.unitLabel,
          priceFc: offer.priceFc,
          promoPriceFc: offer.promoPriceFc,
          promoLabel: offer.promoLabel,
          promoEndsAt: offer.promoEndsAt,
          isAvailable: offer.isAvailable,
          notes: offer.notes,
        })),
      });
    }
  });

  return listVendorBeverageCatalog(tenantId);
}

export function isUnknownBrandConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
