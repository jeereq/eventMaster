-- OTP verification for user registration
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "otpHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT;
