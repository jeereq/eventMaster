-- AlterTable
ALTER TABLE "Event" ADD COLUMN "endsAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "eventKind" TEXT;
ALTER TABLE "Event" ADD COLUMN "clientName" TEXT;
ALTER TABLE "Event" ADD COLUMN "estimatedGuests" INTEGER;
ALTER TABLE "Event" ADD COLUMN "dayOfContactName" TEXT;
ALTER TABLE "Event" ADD COLUMN "dayOfContactPhone" TEXT;
