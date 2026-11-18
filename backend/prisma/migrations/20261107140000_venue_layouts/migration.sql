-- Dispositions nommées d'une salle (en plus du plan principal OrganizationRoom.layoutBlueprint)
CREATE TABLE "VenueLayout" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "blueprint" JSONB NOT NULL,
    "capacityMax" INTEGER,
    "areaM2" DOUBLE PRECISION,
    "thumbnailUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueLayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VenueLayout_roomId_sortOrder_idx" ON "VenueLayout"("roomId", "sortOrder");
CREATE INDEX "VenueLayout_tenantId_idx" ON "VenueLayout"("tenantId");

ALTER TABLE "VenueLayout" ADD CONSTRAINT "VenueLayout_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OrganizationRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
