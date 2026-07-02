-- Guest phone + legal acceptances
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE INDEX IF NOT EXISTS "Guest_phone_idx" ON "Guest"("phone");

UPDATE "Guest"
SET "phone" = regexp_replace(COALESCE("preferences"->>'phone', "preferences"->>'telephone', ''), '[^0-9+]', '', 'g')
WHERE "phone" IS NULL
  AND (
    ("preferences"->>'phone') IS NOT NULL AND ("preferences"->>'phone') <> ''
    OR ("preferences"->>'telephone') IS NOT NULL AND ("preferences"->>'telephone') <> ''
  );

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyVersion" TEXT;

CREATE TABLE IF NOT EXISTS "LegalAcceptance" (
  "id" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "userId" TEXT,
  "guestId" TEXT,
  "normalizedEmail" TEXT,
  "normalizedPhone" TEXT,
  "documentType" TEXT NOT NULL,
  "documentVersion" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LegalAcceptance_normalizedEmail_idx" ON "LegalAcceptance"("normalizedEmail");
CREATE INDEX IF NOT EXISTS "LegalAcceptance_normalizedPhone_idx" ON "LegalAcceptance"("normalizedPhone");
CREATE INDEX IF NOT EXISTS "LegalAcceptance_userId_idx" ON "LegalAcceptance"("userId");
CREATE INDEX IF NOT EXISTS "LegalAcceptance_guestId_idx" ON "LegalAcceptance"("guestId");
CREATE INDEX IF NOT EXISTS "LegalAcceptance_subjectType_documentType_documentVersion_idx" ON "LegalAcceptance"("subjectType", "documentType", "documentVersion");

ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
