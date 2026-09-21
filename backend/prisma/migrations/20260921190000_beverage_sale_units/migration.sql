CREATE TYPE "BeverageSaleUnit" AS ENUM ('BOTTLE', 'CRATE', 'PACK', 'OTHER');

ALTER TABLE "VendorBeveragePrice" ADD COLUMN "unitKind" "BeverageSaleUnit" NOT NULL DEFAULT 'BOTTLE';
ALTER TABLE "VendorBeveragePrice" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

UPDATE "VendorBeveragePrice"
SET
  "unitKind" = CASE
    WHEN lower("unitLabel") IN ('caisse', 'casier') THEN 'CRATE'::"BeverageSaleUnit"
    WHEN lower("unitLabel") = 'pack' THEN 'PACK'::"BeverageSaleUnit"
    WHEN lower("unitLabel") IN ('bouteille', 'verre', 'magnum') THEN 'BOTTLE'::"BeverageSaleUnit"
    ELSE 'OTHER'::"BeverageSaleUnit"
  END,
  "unitLabel" = CASE
    WHEN lower("unitLabel") IN ('caisse', 'casier') THEN 'casier'
    WHEN lower("unitLabel") = 'pack' THEN 'pack'
    WHEN lower("unitLabel") IN ('bouteille', 'verre') THEN 'bouteille'
    ELSE "unitLabel"
  END,
  "quantity" = CASE
    WHEN lower("unitLabel") IN ('caisse', 'casier') THEN 12
    WHEN lower("unitLabel") = 'pack' THEN 6
    ELSE 1
  END;

DROP INDEX "VendorBeveragePrice_tenantId_brandId_key";

CREATE UNIQUE INDEX "VendorBeveragePrice_tenantId_brandId_unitKind_unitLabel_key"
  ON "VendorBeveragePrice"("tenantId", "brandId", "unitKind", "unitLabel");
