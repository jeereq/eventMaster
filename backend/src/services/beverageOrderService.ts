import { prisma } from '../db';
import { activePromoPrice } from './offerPromotion';

const MAX_BEVERAGE_ORDER_LINES = 20;
const MAX_BEVERAGE_PACKS = 500;

export type BeverageOrderLineInput = {
  priceId: string;
  packCount: number;
};

export type ResolvedBeverageLine = {
  id: string;
  brandName: string;
  unitLabel: string;
  packCount: number;
  payableFc: number;
};

type StoredBeverageLine = {
  packCount: number;
  unitLabel: string;
  brandName: string;
};

export function parseBeverageOrderLines(value: unknown): BeverageOrderLineInput[] {
  if (!Array.isArray(value)) return [];
  const lines: BeverageOrderLineInput[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const priceId = typeof row.priceId === 'string' ? row.priceId.trim() : '';
    const packCount = Math.round(Number(row.packCount));
    if (!priceId || seen.has(priceId) || !Number.isFinite(packCount) || packCount < 1) continue;
    seen.add(priceId);
    lines.push({ priceId, packCount: Math.min(MAX_BEVERAGE_PACKS, packCount) });
    if (lines.length >= MAX_BEVERAGE_ORDER_LINES) break;
  }
  return lines;
}

export function beverageSelectionTitle(lines: StoredBeverageLine[]): string {
  if (lines.length === 0) return 'Boissons';
  if (lines.length === 1) {
    const line = lines[0];
    return `${line.packCount} × ${line.unitLabel} · ${line.brandName}`;
  }
  const names = [...new Set(lines.map((line) => line.brandName))];
  const shown = names.slice(0, 3).join(', ');
  const extra = names.length > 3 ? ` +${names.length - 3}` : '';
  return `${names.length} marques · ${shown}${extra}`;
}

export function beverageInquiryTitle(item: {
  beveragePackCount?: number | null;
  beveragePrice?: { unitLabel: string; brand: { name: string } } | null;
  beverageLines?: StoredBeverageLine[];
}): string | null {
  const lines = item.beverageLines ?? [];
  if (lines.length > 0) return beverageSelectionTitle(lines);
  if (!item.beveragePrice) return null;
  const prefix = item.beveragePackCount && item.beveragePackCount > 0
    ? `${item.beveragePackCount} × ${item.beveragePrice.unitLabel} · `
    : '';
  return `${prefix}${item.beveragePrice.brand.name}`;
}

export function beverageOrderMessage(
  lines: ResolvedBeverageLine[],
  note: string,
  eventDate: string | null,
): string {
  const rows = lines.map((line) => {
    const amount = (line.payableFc * line.packCount).toLocaleString('fr-FR');
    return `- ${line.packCount} × ${line.unitLabel} · ${line.brandName} — ${amount} FC`;
  });
  const total = lines.reduce((sum, line) => sum + line.payableFc * line.packCount, 0);
  return [
    'Commande de boissons :',
    ...rows,
    `Total indicatif : ${total.toLocaleString('fr-FR')} FC`,
    eventDate ? `Date de l’événement : ${eventDate}` : '',
    note,
  ].filter(Boolean).join('\n').slice(0, 4000);
}

export function storedBeverageLineCreates(lines: Array<{
  beveragePriceId: string | null;
  brandName: string;
  unitLabel: string;
  packCount: number;
  unitPriceFc: number;
}>) {
  if (!lines.length) return undefined;
  return {
    create: lines.map((line) => ({
      beveragePriceId: line.beveragePriceId,
      brandName: line.brandName,
      unitLabel: line.unitLabel,
      packCount: line.packCount,
      unitPriceFc: line.unitPriceFc,
    })),
  };
}

export function beverageLineRecords(lines: ResolvedBeverageLine[]) {
  return lines.map((line) => ({
    beveragePriceId: line.id,
    brandName: line.brandName,
    unitLabel: line.unitLabel,
    packCount: line.packCount,
    unitPriceFc: line.payableFc,
  }));
}

type VendorProfilePick = {
  slug: string;
  displayName: string;
  tenantId: string;
  tenant: { id: string; name: string };
};

export type VendorDrinkResolution =
  | { ok: false; error: string; status: number }
  | { ok: true; profile: VendorProfilePick; lines: ResolvedBeverageLine[]; vendorName: string };

export async function resolveVendorDrinkLines(slug: string, rawLines: unknown): Promise<VendorDrinkResolution> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return { ok: false, error: 'Prestataire introuvable.', status: 404 };
  const requested = parseBeverageOrderLines(rawLines);
  if (!requested.length) {
    return { ok: false, error: 'Choisissez au moins une marque et une quantité.', status: 400 };
  }
  const profile = await prisma.vendorProfile.findFirst({
    where: { slug: cleanSlug, isBlockedByAdmin: false },
    select: {
      slug: true,
      displayName: true,
      tenantId: true,
      tenant: { select: { id: true, name: true } },
    },
  });
  if (!profile) return { ok: false, error: 'Ce prestataire est introuvable.', status: 404 };

  const prices = await prisma.vendorBeveragePrice.findMany({
    where: {
      id: { in: requested.map((line) => line.priceId) },
      tenantId: profile.tenantId,
      isAvailable: true,
      brand: { isActive: true },
    },
    select: {
      id: true,
      priceFc: true,
      promoPriceFc: true,
      promoEndsAt: true,
      unitLabel: true,
      brand: { select: { name: true } },
    },
  });
  if (prices.length !== requested.length) {
    return { ok: false, error: 'Une marque choisie n’est plus disponible chez ce prestataire.', status: 400 };
  }
  const byId = new Map(prices.map((price) => [price.id, price]));
  const lines = requested.map((requestedLine) => {
    const price = byId.get(requestedLine.priceId)!;
    const payable = activePromoPrice({
      priceFc: price.priceFc,
      promoPriceFc: price.promoPriceFc,
      promoEndsAt: price.promoEndsAt,
    }) ?? price.priceFc;
    return {
      id: price.id,
      brandName: price.brand.name,
      unitLabel: price.unitLabel,
      packCount: requestedLine.packCount,
      payableFc: payable,
    };
  });
  return {
    ok: true,
    profile,
    lines,
    vendorName: profile.displayName || profile.tenant.name,
  };
}
