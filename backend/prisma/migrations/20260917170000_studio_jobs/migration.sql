-- CreateTable
CREATE TABLE "StudioJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "error" TEXT,
    "historyId" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioJob_deviceId_updatedAt_idx" ON "StudioJob"("deviceId", "updatedAt");

-- CreateIndex
CREATE INDEX "StudioJob_userId_updatedAt_idx" ON "StudioJob"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "StudioJob_status_updatedAt_idx" ON "StudioJob"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "StudioJob" ADD CONSTRAINT "StudioJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
