-- ─── Add Z-API Client-Token ───────────────────────────────────────────────────
-- O Client-Token é o Security Token da conta Z-API, enviado como header
-- "Client-Token" em todas as requisições. Campo separado do token da instância.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "zApiClientToken" VARCHAR(255);
