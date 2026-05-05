-- Migration: add WhatsApp / Z-API fields to tenants (public schema)
-- Run via: prisma migrate deploy

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "whatsappEnabled"     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "zApiInstanceId"      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "zApiToken"           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24;
