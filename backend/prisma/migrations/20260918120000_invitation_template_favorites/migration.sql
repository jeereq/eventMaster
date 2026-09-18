CREATE TABLE "InvitationTemplateFavorite" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationTemplateFavorite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvitationTemplateFavorite_userId_templateId_idx" ON "InvitationTemplateFavorite"("userId", "templateId");

CREATE INDEX "InvitationTemplateFavorite_deviceId_templateId_idx" ON "InvitationTemplateFavorite"("deviceId", "templateId");

CREATE INDEX "InvitationTemplateFavorite_templateId_idx" ON "InvitationTemplateFavorite"("templateId");

ALTER TABLE "InvitationTemplateFavorite" ADD CONSTRAINT "InvitationTemplateFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
