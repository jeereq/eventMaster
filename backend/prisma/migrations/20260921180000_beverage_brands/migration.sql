CREATE TYPE "BeverageKind" AS ENUM ('BEER', 'DRINK', 'WINE', 'CHAMPAGNE');

CREATE TABLE "BeverageBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "BeverageKind" NOT NULL,
    "producer" TEXT,
    "country" TEXT,
    "volumeLabel" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BeverageBrand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorBeveragePrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "priceFc" INTEGER NOT NULL,
    "unitLabel" TEXT NOT NULL DEFAULT 'bouteille',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorBeveragePrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BeverageBrand_kind_name_key" ON "BeverageBrand"("kind", "name");
CREATE INDEX "BeverageBrand_kind_isActive_idx" ON "BeverageBrand"("kind", "isActive");
CREATE UNIQUE INDEX "VendorBeveragePrice_tenantId_brandId_key" ON "VendorBeveragePrice"("tenantId", "brandId");
CREATE INDEX "VendorBeveragePrice_brandId_idx" ON "VendorBeveragePrice"("brandId");
CREATE INDEX "VendorBeveragePrice_tenantId_isAvailable_idx" ON "VendorBeveragePrice"("tenantId", "isAvailable");

ALTER TABLE "VendorBeveragePrice" ADD CONSTRAINT "VendorBeveragePrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorBeveragePrice" ADD CONSTRAINT "VendorBeveragePrice_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "BeverageBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "BeverageBrand" ("id", "name", "kind", "producer", "country", "volumeLabel", "description", "isActive", "updatedAt")
VALUES
  ('bb-seed-primus', 'Primus', 'BEER', 'Bralima', 'RDC', '65 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-turbo-king', 'Turbo King', 'BEER', 'Bralima', 'RDC', '50 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-castel', 'Castel', 'BEER', 'Castel', 'RDC', '65 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-skol', 'Skol', 'BEER', 'Bralima', 'RDC', '65 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-heineken', 'Heineken', 'BEER', 'Heineken', 'Pays-Bas', '33 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-coca', 'Coca-Cola', 'DRINK', 'Coca-Cola', NULL, '33 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-fanta', 'Fanta', 'DRINK', 'Coca-Cola', NULL, '33 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-sprite', 'Sprite', 'DRINK', 'Coca-Cola', NULL, '33 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-vitalo', 'Vitalo', 'DRINK', NULL, 'RDC', '33 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-eau', 'Eau minérale', 'DRINK', NULL, NULL, '50 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-vin-rouge', 'Vin rouge', 'WINE', NULL, NULL, '75 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-vin-blanc', 'Vin blanc', 'WINE', NULL, NULL, '75 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-vin-rose', 'Vin rosé', 'WINE', NULL, NULL, '75 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-moet', 'Moët & Chandon', 'CHAMPAGNE', 'Moët & Chandon', 'France', '75 cl', NULL, true, CURRENT_TIMESTAMP),
  ('bb-seed-veuve', 'Veuve Clicquot', 'CHAMPAGNE', 'Veuve Clicquot', 'France', '75 cl', NULL, true, CURRENT_TIMESTAMP)
ON CONFLICT ("kind", "name") DO NOTHING;
