-- M10: Gamificação básica — pontos e tiers
-- Roda por tenant schema.

-- Novo enum PointsReason
CREATE TYPE "PointsReason" AS ENUM (
  'APPOINTMENT_COMPLETED',
  'FIRST_APPOINTMENT',
  'QUICK_RATING_SUBMITTED'
);

-- Novos campos de pontos em patient_crm_metrics
ALTER TABLE "patient_crm_metrics"
  ADD COLUMN IF NOT EXISTS "loyaltyPoints"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lifetimePoints" INTEGER NOT NULL DEFAULT 0;

-- Nova tabela points_transactions
CREATE TABLE IF NOT EXISTS "points_transactions" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "patientId"     UUID        NOT NULL,
  "points"        INTEGER     NOT NULL,
  "reason"        "PointsReason" NOT NULL,
  "appointmentId" UUID,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "fk_pt_patient"     FOREIGN KEY ("patientId")     REFERENCES "patients"("id")      ON DELETE CASCADE,
  CONSTRAINT "fk_pt_appointment" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id")  ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_points_transactions_patient"  ON "points_transactions" ("patientId");
CREATE INDEX IF NOT EXISTS "idx_points_transactions_created"  ON "points_transactions" ("createdAt");
