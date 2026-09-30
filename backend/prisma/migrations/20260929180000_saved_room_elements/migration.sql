-- CreateTable
CREATE TABLE "SavedRoomElement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedRoomElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedRoomElement_userId_idx" ON "SavedRoomElement"("userId");

-- AddForeignKey
ALTER TABLE "SavedRoomElement" ADD CONSTRAINT "SavedRoomElement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
