CREATE TABLE IF NOT EXISTS "PlatformNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformNotification_userId_readAt_idx" ON "PlatformNotification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "PlatformNotification_userId_createdAt_idx" ON "PlatformNotification"("userId", "createdAt");

ALTER TABLE "PlatformNotification"
  ADD CONSTRAINT "PlatformNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
