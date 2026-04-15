-- AddColumn: priceCents to procedures
-- Each tenant has its own schema; this migration runs per-tenant schema.

ALTER TABLE "procedures" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER;

