import { Prisma } from '@prisma/client';
import { prisma } from '../db';
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

export async function listPublicBeverageOffers() {
  const rows = await prisma.vendorBeveragePrice.findMany({
    where: { isAvailable: true, brand: { isActive: true } },
    orderBy: [{ brand: { kind: 'asc' } }, { brand: { name: 'asc' } }, { priceFc: 'asc' }],
    select: {
      id: true,
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
      vendorName: row.tenant.vendorProfile?.displayName || row.tenant.name,
      vendorSlug: row.tenant.vendorProfile?.slug || null,
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
