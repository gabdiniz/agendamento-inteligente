-- ─── Migration: add_appointment_rescheduled_to ───────────────────────────────
-- Adiciona rescheduledToId em appointments (schema público).
-- O campo existia apenas em tenant-schema.prisma mas não em schema.prisma,
-- causando "Unknown field rescheduledToId" no PrismaClient.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "rescheduledToId" UUID;

-- Garante unicidade: um agendamento só pode ser o "destino" de um reagendamento
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_rescheduledToId_key"
  ON "appointments"("rescheduledToId")
  WHERE "rescheduledToId" IS NOT NULL;
