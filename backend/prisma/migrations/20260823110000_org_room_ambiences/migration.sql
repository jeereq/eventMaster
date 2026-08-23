-- CreateTable
CREATE TABLE "OrgRoomAmbience" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "preset" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgRoomAmbience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgRoomAmbience_tenantId_idx" ON "OrgRoomAmbience"("tenantId");
CREATE INDEX "OrgRoomAmbience_createdById_idx" ON "OrgRoomAmbience"("createdById");

-- AddForeignKey
ALTER TABLE "OrgRoomAmbience" ADD CONSTRAINT "OrgRoomAmbience_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgRoomAmbience" ADD CONSTRAINT "OrgRoomAmbience_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
