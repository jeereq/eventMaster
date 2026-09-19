-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "sms" BOOLEAN NOT NULL DEFAULT false;
