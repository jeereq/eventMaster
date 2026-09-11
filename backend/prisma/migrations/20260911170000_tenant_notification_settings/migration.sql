-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "notificationSettings" JSONB;
