-- CreateTable
CREATE TABLE "SavedEventPack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "budgetFc" INTEGER NOT NULL,
    "city" TEXT,
    "guestCount" INTEGER,
    "eventDate" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'search',
    "styleLabel" TEXT,
    "totalFc" INTEGER NOT NULL,
    "leftoverFc" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedEventPack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedEventPack_userId_idx" ON "SavedEventPack"("userId");

-- AddForeignKey
ALTER TABLE "SavedEventPack" ADD CONSTRAINT "SavedEventPack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
