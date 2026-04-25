-- Migration: add_patient_portal
-- Bloco 1 do Portal do Paciente
--
-- Esta migration adiciona campos de autenticação ao modelo Patient,
-- cria a tabela patient_refresh_tokens e a tabela clinic_patient_configs.
--
-- Todas as tabelas vivem no schema de TENANT (não no public).
-- Para tenants já existentes, execute este SQL substituindo <schema>
-- pelo nome real do schema (ex: tenant_clinica_demo):
--
--   SET search_path TO tenant_clinica_demo;
--   -- (cole os blocos abaixo)
--
-- Para novos tenants criados após esta migration, o prisma db push
-- já aplica o schema atualizado automaticamente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Novos campos de auth no modelo patients
-- -----------------------------------------------------------------------------

ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "passwordHash"           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt"         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "lastLoginAt"             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "passwordResetToken"      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt"  TIMESTAMPTZ;

-- Índice único no token de reset (null-safe: só indexa linhas não-nulas)
CREATE UNIQUE INDEX IF NOT EXISTS "patients_passwordResetToken_key"
  ON "patients"("passwordResetToken")
  WHERE "passwordResetToken" IS NOT NULL;

-- Índice no e-mail para lookup eficiente no login do paciente
CREATE INDEX IF NOT EXISTS "patients_email_idx"
  ON "patients"("email")
  WHERE "email" IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Tabela patient_refresh_tokens
--    Análoga à refresh_tokens dos usuários de clínica
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "patient_refresh_tokens" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "patientId" UUID         NOT NULL,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ  NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "patient_refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_refresh_tokens_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "patient_refresh_tokens_tokenHash_key"
  ON "patient_refresh_tokens"("tokenHash");

CREATE INDEX IF NOT EXISTS "patient_refresh_tokens_patientId_idx"
  ON "patient_refresh_tokens"("patientId");

-- -----------------------------------------------------------------------------
-- 3. Tabela clinic_patient_configs
--    Singleton por tenant — controla regras de cancelamento pelo paciente
--    Valores padrão: cancelamento permitido, mínimo 2h de antecedência,
--    apenas agendamentos com status SCHEDULED podem ser cancelados
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "clinic_patient_configs" (
  "id"                            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "cancellationAllowed"           BOOLEAN      NOT NULL DEFAULT true,
  "cancellationMinHoursInAdvance" INTEGER      NOT NULL DEFAULT 2,
  "cancellationAllowedStatuses"   TEXT[]       NOT NULL DEFAULT ARRAY['SCHEDULED'],
  "createdAt"                     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"                     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "clinic_patient_configs_pkey" PRIMARY KEY ("id")
);
