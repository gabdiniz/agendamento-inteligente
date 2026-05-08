-- ─── Migration: add_patient_otp_code ─────────────────────────────────────────
-- Cria a tabela patient_otp_codes no schema público.
-- O model existia apenas em tenant-schema.prisma, causando
-- "Cannot read properties of undefined (reading 'create')" no endpoint
-- /patient-auth/send-otp porque o PrismaClient (gerado do schema.prisma)
-- não reconhecia patientOtpCode.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "patient_otp_codes" (
  "id"        UUID          NOT NULL DEFAULT gen_random_uuid(),
  "phone"     VARCHAR(20)   NOT NULL,
  "codeHash"  VARCHAR(255)  NOT NULL,
  "expiresAt" TIMESTAMPTZ   NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "attempts"  INTEGER       NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT "patient_otp_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "patient_otp_codes_phone_createdAt_idx"
  ON "patient_otp_codes"("phone", "createdAt");
