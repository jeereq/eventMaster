-- AlterEnum
ALTER TYPE "EventTaskStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "EventTaskStatus" ADD VALUE 'BLOCKED';

-- CreateEnum
CREATE TYPE "EventTaskKind" AS ENUM ('GENERAL', 'VENUE', 'VENDOR', 'GUESTS', 'PROTOCOL', 'LOGISTICS', 'COMMUNICATION', 'FINANCE');

-- AlterTable
ALTER TABLE "EventTask" ADD COLUMN "kind" "EventTaskKind" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "EventTask" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EventTask" ADD COLUMN "blockedById" TEXT;

CREATE INDEX "EventTask_blockedById_idx" ON "EventTask"("blockedById");

ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "EventTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
