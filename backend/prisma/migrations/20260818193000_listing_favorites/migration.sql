-- CreateTable
CREATE TABLE "ListingFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingFavorite_userId_idx" ON "ListingFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingFavorite_userId_kind_slug_key" ON "ListingFavorite"("userId", "kind", "slug");

-- AddForeignKey
ALTER TABLE "ListingFavorite" ADD CONSTRAINT "ListingFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
