-- Org roles, rooms, event/room staff
CREATE TYPE "OrgRole" AS ENUM ('MANAGER', 'PROTOCOL');
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'PROTOCOL');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "orgRole" "OrgRole";

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "roomId" TEXT;

CREATE TABLE IF NOT EXISTS "OrganizationRoom" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "capacity" INTEGER,
  "floor" TEXT,
  "location" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RoomStaff" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "staffRole" "StaffRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomStaff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventStaff" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "staffRole" "StaffRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventStaff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrganizationRoom_tenantId_idx" ON "OrganizationRoom"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "RoomStaff_roomId_userId_key" ON "RoomStaff"("roomId", "userId");
CREATE INDEX IF NOT EXISTS "RoomStaff_userId_idx" ON "RoomStaff"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "EventStaff_eventId_userId_key" ON "EventStaff"("eventId", "userId");
CREATE INDEX IF NOT EXISTS "EventStaff_userId_idx" ON "EventStaff"("userId");

ALTER TABLE "Event" ADD CONSTRAINT "Event_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OrganizationRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationRoom" ADD CONSTRAINT "OrganizationRoom_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomStaff" ADD CONSTRAINT "RoomStaff_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OrganizationRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomStaff" ADD CONSTRAINT "RoomStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Legacy members without orgRole become MANAGER (except tenant owner)
UPDATE "User" u
SET "orgRole" = 'MANAGER'
WHERE u."tenantId" IS NOT NULL
  AND u."role" = 'USER'
  AND u."orgRole" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Tenant" t WHERE t."id" = u."tenantId" AND t."managerId" = u."id"
  );
