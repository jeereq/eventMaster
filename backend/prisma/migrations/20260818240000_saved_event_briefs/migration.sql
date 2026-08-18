-- CreateTable
CREATE TABLE "SavedEventBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedEventBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedEventBrief_userId_idx" ON "SavedEventBrief"("userId");

-- AddForeignKey
ALTER TABLE "SavedEventBrief" ADD CONSTRAINT "SavedEventBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
