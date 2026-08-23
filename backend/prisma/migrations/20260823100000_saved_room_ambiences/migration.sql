-- CreateTable
CREATE TABLE "SavedRoomAmbience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preset" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedRoomAmbience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedRoomAmbience_userId_idx" ON "SavedRoomAmbience"("userId");

-- AddForeignKey
ALTER TABLE "SavedRoomAmbience" ADD CONSTRAINT "SavedRoomAmbience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
