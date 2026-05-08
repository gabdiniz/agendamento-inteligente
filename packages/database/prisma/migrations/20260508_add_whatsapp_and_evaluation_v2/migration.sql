-- ─── Migration: add_whatsapp_and_evaluation_v2 ───────────────────────────────
-- Cobre três lacunas que existiam no schema.prisma mas não tinham migration:
--
--   1. ENUMs ausentes: QuickRating, WhatsappEvent, WhatsappJobStatus
--   2. Tabelas ausentes: whatsapp_templates, whatsapp_jobs
--   3. appointment_evaluations desatualizado: colunas de avaliação rápida
--      (quickRating, quickRatingReasons, detailedRatingRequestedAt),
--      coluna updatedAt e rating tornado nullable
--
-- Roda no schema público (public). Todos os comandos são idempotentes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. ENUMs ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "QuickRating" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhatsappEvent" AS ENUM ('CONFIRMATION', 'REMINDER', 'CANCELLATION', 'RESCHEDULE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhatsappJobStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. appointment_evaluations — colunas novas ───────────────────────────────

-- rating: era NOT NULL no init, agora é nullable (avaliação detalhada é opcional)
ALTER TABLE "appointment_evaluations"
  ALTER COLUMN "rating" DROP NOT NULL;

-- updatedAt: estava no schema.prisma mas faltava na migration inicial
ALTER TABLE "appointment_evaluations"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();

-- Campos de avaliação rápida (Momento 1 — emoji)
ALTER TABLE "appointment_evaluations"
  ADD COLUMN IF NOT EXISTS "quickRating"               "QuickRating",
  ADD COLUMN IF NOT EXISTS "quickRatingReasons"        TEXT[]       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "detailedRatingRequestedAt" TIMESTAMPTZ;

-- Índices
CREATE INDEX IF NOT EXISTS "appointment_evaluations_quickRating_idx"
  ON "appointment_evaluations"("quickRating");

-- ─── 3. whatsapp_templates ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
  "id"        UUID           NOT NULL DEFAULT gen_random_uuid(),
  "event"     "WhatsappEvent" NOT NULL,
  "body"      TEXT           NOT NULL,
  "isActive"  BOOLEAN        NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ    NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_templates_event_key"
  ON "whatsapp_templates"("event");

-- ─── 4. whatsapp_jobs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "whatsapp_jobs" (
  "id"            UUID               NOT NULL DEFAULT gen_random_uuid(),
  "event"         "WhatsappEvent"    NOT NULL,
  "phone"         VARCHAR(20)        NOT NULL,
  "message"       TEXT               NOT NULL,
  "status"        "WhatsappJobStatus" NOT NULL DEFAULT 'PENDING',
  "retries"       INTEGER            NOT NULL DEFAULT 0,
  "scheduledAt"   TIMESTAMPTZ        NOT NULL,
  "sentAt"        TIMESTAMPTZ,
  "errorLog"      TEXT,
  "appointmentId" UUID               NOT NULL,
  "patientName"   VARCHAR(255)       NOT NULL,
  "createdAt"     TIMESTAMPTZ        NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ        NOT NULL DEFAULT now(),

  CONSTRAINT "whatsapp_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whatsapp_jobs_status_scheduledAt_idx"
  ON "whatsapp_jobs"("status", "scheduledAt");
