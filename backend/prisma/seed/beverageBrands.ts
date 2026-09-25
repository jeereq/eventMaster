import type { BeverageKind, PrismaClient } from '@prisma/client';

/** Catalogue de référence des boissons (marques proposées aux traiteurs). */
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

export async function seedBeverageBrands(prisma: PrismaClient) {
  console.log('Catalogue boissons…');
  for (const brand of BEVERAGE_BRANDS) {
    await prisma.beverageBrand.upsert({
      where: { kind_name: { kind: brand.kind, name: brand.name } },
      create: { ...brand, isActive: true },
      // Ne pas écraser les corrections faites par l’admin (nom, volume, désactivation).
      update: {},
    });
  }
}
