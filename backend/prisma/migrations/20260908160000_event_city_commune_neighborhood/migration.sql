-- AlterTable
ALTER TABLE "Event" ADD COLUMN "city" TEXT;
ALTER TABLE "Event" ADD COLUMN "commune" TEXT;
ALTER TABLE "Event" ADD COLUMN "neighborhood" TEXT;

-- CreateIndex
CREATE INDEX "Event_city_idx" ON "Event"("city");
CREATE INDEX "Event_commune_idx" ON "Event"("commune");
