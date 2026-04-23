-- Migration: add PasswordResetToken to each tenant schema
--
-- Esta tabela existe em cada schema de tenant, não no schema público.
-- Para tenants já existentes, execute este SQL substituindo <schema> pelo
-- nome do schema do tenant (ex: tenant_clinica_demo):
--
--   SET search_path TO tenant_clinica_demo;
--   -- (cole o CREATE TABLE abaixo)
--
-- Para novos tenants, o prisma db push já cria a tabela automaticamente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID        NOT NULL,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key"
  ON "password_reset_tokens"("tokenHash");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx"
  ON "password_reset_tokens"("userId");
