-- ─── Plans & Features ────────────────────────────────────────────────────────
-- Substitui o modelo Plan MVP2 por um sistema real de planos + features.
-- Executar no banco global (schema public).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remover coluna features Json da tabela plans (era placeholder)
ALTER TABLE plans DROP COLUMN IF EXISTS features;
ALTER TABLE plans DROP COLUMN IF EXISTS "maxProfessionals";
ALTER TABLE plans DROP COLUMN IF EXISTS "maxMonthlyAppointments";

-- 2. Tornar colunas de preço opcionais (eram NOT NULL)
ALTER TABLE plans ALTER COLUMN "priceMonthyCents" DROP NOT NULL;
ALTER TABLE plans ALTER COLUMN "priceYearlyCents" DROP NOT NULL;

-- 3. Criar tabela de features
CREATE TABLE IF NOT EXISTS features (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        VARCHAR(100) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  category    VARCHAR(100) NOT NULL,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT features_slug_key UNIQUE (slug)
);

-- 4. Criar join table plan_features
CREATE TABLE IF NOT EXISTS plan_features (
  "planId"    UUID NOT NULL,
  "featureId" UUID NOT NULL,
  CONSTRAINT plan_features_pkey PRIMARY KEY ("planId", "featureId"),
  CONSTRAINT plan_features_plan_fk    FOREIGN KEY ("planId")    REFERENCES plans(id)    ON DELETE CASCADE,
  CONSTRAINT plan_features_feature_fk FOREIGN KEY ("featureId") REFERENCES features(id) ON DELETE CASCADE
);

-- 5. Adicionar planId ao tenant (nullable — tenants existentes ficam sem plano até seed)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "planId" UUID REFERENCES plans(id);
CREATE INDEX IF NOT EXISTS tenants_plan_id_idx ON tenants("planId");

-- ─── Seed: Features ──────────────────────────────────────────────────────────

INSERT INTO features (slug, name, description, category) VALUES
  -- Core (disponível em todos os planos ativos)
  ('waitlist',                'Lista de Espera',              'Fila de espera inteligente com convites automáticos', 'core'),
  ('public_booking',          'Agendamento Público',          'Página pública para pacientes agendarem online',      'core'),
  ('professionals_unlimited', 'Profissionais Ilimitados',     'Sem limite de profissionais cadastrados',             'core'),

  -- Comunicação
  ('whatsapp',                'WhatsApp / Notificações',      'Envio de confirmações e lembretes via WhatsApp',      'communication'),

  -- CRM
  ('crm',                     'CRM Completo',                 'Histórico, classificação e métricas de pacientes',   'crm'),
  ('campaigns',               'Campanhas e Automações',       'Disparos segmentados por tags, procedimento e data', 'crm'),
  ('gamification',            'Gamificação e Ranking',        'Ranking e classificação de pacientes por engajamento','crm'),
  ('segmentation_advanced',   'Segmentação Avançada',         'Filtros avançados para segmentar a base',            'crm'),
  ('retention',               'Retenção Automática',          'Fluxos automáticos para reter pacientes inativos',   'crm'),

  -- Financeiro
  ('payments',                'Cobranças e Pagamentos',       'Cobrança antecipada e gestão de pagamentos',         'billing'),
  ('payment_page',            'Página de Pagamento',          'Página personalizada para recebimento online',        'billing'),

  -- Relatórios
  ('reports_advanced',        'Relatórios Avançados',         'Análises detalhadas de receita, retenção e demanda', 'reports'),

  -- IA
  ('ai_assistant',            'Assistente de IA',             'IA configurável para atender pacientes',             'ai'),
  ('ai_chat',                 'Chat Inteligente',             'Chat com pacientes via IA integrada ao painel',      'ai'),
  ('ai_scheduling',           'Sugestão de Horários (IA)',    'IA sugere melhores horários com base em padrões',    'ai'),
  ('ai_behavior',             'Análise de Comportamento',     'IA analisa padrões de comportamento dos pacientes',  'ai'),
  ('ai_predictions',          'Previsão de Retornos',         'IA prevê cancelamentos e retornos prováveis',        'ai'),

  -- Suporte
  ('integrations_advanced',   'Integrações Avançadas',        'Conectores com sistemas externos via API',           'integrations'),
  ('priority_support',        'Suporte Prioritário',          'Canal de suporte dedicado com SLA garantido',        'support')
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: Planos ────────────────────────────────────────────────────────────

INSERT INTO plans (id, name, slug, description, "isActive", "createdAt", "updatedAt") VALUES
  ('00000000-0000-0000-0000-000000000001', 'Free',   'free',   'Plano gratuito com funcionalidades essenciais', true, now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'Pro',    'pro',    'Plataforma de crescimento para clínicas',       true, now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'Growth', 'growth', 'Automação inteligente com IA',                  true, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: Features por plano ─────────────────────────────────────────────────

-- FREE: agenda básica + lista de espera + agendamento público + whatsapp
INSERT INTO plan_features ("planId", "featureId")
SELECT p.id, f.id FROM plans p, features f
WHERE p.slug = 'free'
  AND f.slug IN ('waitlist', 'public_booking', 'whatsapp')
ON CONFLICT DO NOTHING;

-- PRO: FREE + profissionais ilimitados + CRM + campanhas + gamificação + pagamentos + relatórios avançados + retenção + página pagamento + segmentação
INSERT INTO plan_features ("planId", "featureId")
SELECT p.id, f.id FROM plans p, features f
WHERE p.slug = 'pro'
  AND f.slug IN (
    'waitlist', 'public_booking', 'whatsapp',
    'professionals_unlimited',
    'crm', 'campaigns', 'gamification', 'retention', 'segmentation_advanced',
    'payments', 'payment_page',
    'reports_advanced'
  )
ON CONFLICT DO NOTHING;

-- GROWTH: PRO + tudo de IA + integrações + suporte prioritário
INSERT INTO plan_features ("planId", "featureId")
SELECT p.id, f.id FROM plans p, features f
WHERE p.slug = 'growth'
  AND f.slug IN (
    'waitlist', 'public_booking', 'whatsapp',
    'professionals_unlimited',
    'crm', 'campaigns', 'gamification', 'retention', 'segmentation_advanced',
    'payments', 'payment_page',
    'reports_advanced',
    'ai_assistant', 'ai_chat', 'ai_scheduling', 'ai_behavior', 'ai_predictions',
    'integrations_advanced', 'priority_support'
  )
ON CONFLICT DO NOTHING;

-- ─── Atribuir plano FREE a todos os tenants existentes ────────────────────────

UPDATE tenants
SET "planId" = '00000000-0000-0000-0000-000000000001'
WHERE "planId" IS NULL;
