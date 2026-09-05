-- CreateTable
CREATE TABLE "AiRoomPlanComposeRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "source" TEXT NOT NULL,
    "prompt" TEXT,
    "imageUrl" TEXT,
    "roomType" TEXT,
    "widthM" DOUBLE PRECISION,
    "heightM" DOUBLE PRECISION,
    "draft" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRoomPlanComposeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRoomPlanComposeRun_userId_createdAt_idx" ON "AiRoomPlanComposeRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRoomPlanComposeRun_deviceId_createdAt_idx" ON "AiRoomPlanComposeRun"("deviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiRoomPlanComposeRun" ADD CONSTRAINT "AiRoomPlanComposeRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
