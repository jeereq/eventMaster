import type { BeverageKind, BeverageSaleUnit, PrismaClient } from '@prisma/client';

/** Catalogue boissons présent en base au 24 septembre 2026. */
const BEVERAGE_BRANDS: Array<{
  kind: BeverageKind;
  name: string;
  producer: string | null;
  country: string | null;
  volumeLabel: string | null;
}> = [
  { kind: 'BEER', name: 'Castel', producer: 'Castel', country: 'RDC', volumeLabel: '65 cl' },
  { kind: 'BEER', name: 'Heineken', producer: 'Heineken', country: 'Pays-Bas', volumeLabel: '33 cl' },
  { kind: 'BEER', name: 'Primus', producer: 'Bralima', country: 'RDC', volumeLabel: '65 cl' },
  { kind: 'BEER', name: 'Skol', producer: 'Bralima', country: 'RDC', volumeLabel: '65 cl' },
  { kind: 'BEER', name: 'Tembo(Grande)', producer: 'Bracongo', country: 'RDC', volumeLabel: '65cl' },
  { kind: 'BEER', name: 'Turbo King', producer: 'Bralima', country: 'RDC', volumeLabel: '50 cl' },
  { kind: 'DRINK', name: 'Coca-Cola', producer: 'Coca-Cola', country: null, volumeLabel: '33 cl' },
  { kind: 'DRINK', name: 'Eau minérale', producer: null, country: null, volumeLabel: '50 cl' },
  { kind: 'DRINK', name: 'Fanta', producer: 'Coca-Cola', country: null, volumeLabel: '33 cl' },
  { kind: 'DRINK', name: 'Sprite', producer: 'Coca-Cola', country: null, volumeLabel: '33 cl' },
  { kind: 'DRINK', name: 'Vitalo', producer: null, country: 'RDC', volumeLabel: '33 cl' },
  { kind: 'WINE', name: 'Vin blanc', producer: null, country: null, volumeLabel: '75 cl' },
  { kind: 'WINE', name: 'Vin rosé', producer: null, country: null, volumeLabel: '75 cl' },
  { kind: 'WINE', name: 'Vin rouge', producer: null, country: null, volumeLabel: '75 cl' },
  { kind: 'CHAMPAGNE', name: 'Moët & Chandon', producer: 'Moët & Chandon', country: 'France', volumeLabel: '75 cl' },
  { kind: 'CHAMPAGNE', name: 'Veuve Clicquot', producer: 'Veuve Clicquot', country: 'France', volumeLabel: '75 cl' },
];

const CASTEL_CRATE_OFFER: {
  unitKind: BeverageSaleUnit;
  quantity: number;
  unitLabel: string;
  priceFc: number;
  promoPriceFc: number;
} = {
  unitKind: 'CRATE',
  quantity: 24,
  unitLabel: 'casier',
  priceFc: 24_000,
  promoPriceFc: 22_000,
};

export async function seedBeverageBrands(prisma: PrismaClient) {
  console.log('Catalogue boissons…');
  for (const brand of BEVERAGE_BRANDS) {
    await prisma.beverageBrand.upsert({
      where: { kind_name: { kind: brand.kind, name: brand.name } },
      create: { ...brand, isActive: true },
      update: {
        producer: brand.producer,
        country: brand.country,
        volumeLabel: brand.volumeLabel,
        isActive: true,
      },
    });
  }

  const castel = await prisma.beverageBrand.findUnique({
    where: { kind_name: { kind: 'BEER', name: 'Castel' } },
  });
  const caterer = await prisma.user.findUnique({
    where: { email: 'prestas1@eventmaster.cd' },
    select: { tenantId: true },
  });
  if (!castel || !caterer?.tenantId) return;

  await prisma.vendorBeveragePrice.upsert({
    where: {
      tenantId_brandId_unitKind_unitLabel: {
        tenantId: caterer.tenantId,
        brandId: castel.id,
        unitKind: CASTEL_CRATE_OFFER.unitKind,
        unitLabel: CASTEL_CRATE_OFFER.unitLabel,
      },
    },
    create: {
      tenantId: caterer.tenantId,
      brandId: castel.id,
      priceFc: CASTEL_CRATE_OFFER.priceFc,
      promoPriceFc: CASTEL_CRATE_OFFER.promoPriceFc,
      unitKind: CASTEL_CRATE_OFFER.unitKind,
      quantity: CASTEL_CRATE_OFFER.quantity,
      unitLabel: CASTEL_CRATE_OFFER.unitLabel,
      isAvailable: true,
    },
    update: {
      priceFc: CASTEL_CRATE_OFFER.priceFc,
      promoPriceFc: CASTEL_CRATE_OFFER.promoPriceFc,
      quantity: CASTEL_CRATE_OFFER.quantity,
      isAvailable: true,
    },
  });
}
