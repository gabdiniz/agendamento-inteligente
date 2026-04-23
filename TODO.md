# MyAgendix — Backlog de Implementação

> Organizado por área e prioridade sugerida.  
> **P1** = essencial para funcionar em produção · **P2** = importante mas não bloqueia · **P3** = roadmap / MVP2

---

## ✅ Concluído (sessões anteriores)

- [x] **Gestão de Usuários da Clínica** — backend (GET/POST/PATCH/toggle) + `UsersPage` completa com convite por e-mail, roles e ativar/desativar
- [x] **Toggle ativar/desativar paciente** — `PatientsPage` (botão + filtro Ativo/Inativo/Todos) e `PatientProfilePage` (badge + botão no header)
- [x] **Bloqueios de Agenda (ScheduleBlock)** — `GET/POST/DELETE /professionals/:id/schedule/blocks` + seção integrada ao `WorkSchedulePage` com modal de criação e lista com badges de status
- [x] **Rate limiting** — global 100 req/min; login 10/15min; booking público 60/30/5/5 req/min por rota, com mensagens de erro em pt-BR
- [x] **WhatsApp real (Z-API)** — credenciais por clínica, 4 eventos (confirmação, lembrete, cancelamento, reagendamento), templates editáveis, worker assíncrono com retry/backoff, scheduler de lembretes, página de configuração completa
- [x] **Logo de clínica** — upload no super admin (criação + edição), exibição na tabela de tenants e na sidebar da clínica
- [x] **Copiar URL de login da clínica** — botão no super admin com feedback "Copiado!" que usa `window.location` (funciona em dev e prod)
- [x] **Procedimentos** — CRUD completo, vínculo profissional↔procedimento, preço opcional em centavos
- [x] **Horários de trabalho** — 7 dias configuráveis por profissional, ativar/pausar sem remover
- [x] **FullCalendar com drag-to-reschedule** — arrastar evento reagenda diretamente
- [x] **Lista de espera** — fluxo WAITING → NOTIFIED → CONFIRMED / EXPIRED / REMOVED com modal de convite

---

## 🔴 P1 — Essencial para produção

### Infraestrutura

- [ ] **Configurar variáveis de ambiente de produção** no servidor — ver seção detalhada abaixo

- [ ] **Docker Compose de produção** para API  
  Hoje o `docker-compose.yml` é só dev. Não usar BullMQ/Redis até confirmar necessidade — WhatsApp usa worker próprio.

- [ ] **Configurar HTTPS / SSL** no nginx do servidor newronix  
  Certificados Let's Encrypt via certbot.

- [ ] **Testar criação de tenant em produção**  
  O `execSync` do `prisma db push` está corrigido para Linux, mas precisa ser validado no servidor.

- [x] **Recuperação de senha** — `POST /auth/forgot-password` + `POST /auth/reset-password`, token SHA-256 com 1h de validade, Resend como provedor de e-mail (fallback SMTP), `ForgotPasswordPage` + `ResetPasswordPage`, link "Esqueceu a senha?" na LoginPage.

---

### 🔑 Variáveis de ambiente — checklist de produção

Criar o arquivo `.env` em `/opt/apps/myagendix/prod/` com as variáveis abaixo.

#### Banco de dados (obrigatório)
```
DATABASE_URL=postgresql://user:password@localhost:5432/myagendix
```

#### Segurança JWT (obrigatório — gerar valores aleatórios longos)
```
JWT_SECRET=<random 64+ chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```
> Gerar: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

#### Servidor
```
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
APP_URL=https://seudominio.com.br   # URL do frontend — usada nos links de e-mail
```

#### E-mail — Resend (obrigatório para recuperação de senha)
```
RESEND_API_KEY=re_xxxx              # criar conta em resend.com (grátis: 3k/mês)
RESEND_FROM=MyAgendix <noreply@seudominio.com.br>
```
- [ ] Criar conta no Resend → [resend.com](https://resend.com)
- [ ] Verificar domínio remetente no painel Resend (adicionar registros DNS)
- [ ] Gerar API Key e copiar para o `.env`

#### E-mail — SMTP alternativo (opcional, fallback se RESEND_API_KEY ausente)
```
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=seuemail@gmail.com
# SMTP_PASS=xxxx xxxx xxxx xxxx    # App Password do Gmail
# SMTP_FROM=MyAgendix <seuemail@gmail.com>
```

#### Redis (opcional — só necessário se BullMQ for usado no futuro)
```
# REDIS_URL=redis://localhost:6379
```
> Hoje o WhatsApp usa worker próprio sem Redis. Deixar comentado.

#### SMS — Twilio (opcional — SmsAdapter ainda é stub)
```
# TWILIO_SID=xxx
# TWILIO_TOKEN=xxx
# SMS_FROM=+55119...
```

---

### Canais de Notificação

- [ ] **Implementar SMS real** (Twilio ou AWS SNS) — `SmsAdapter` ainda é stub.

---

## 🟡 P2 — Importante, não bloqueia o lançamento

### Backend — Endpoints faltando

- [ ] **Histórico de status do agendamento** — `GET /appointments/:id/history` (modelo `AppointmentStatusHistory` já existe no banco)
- [ ] **Avaliações de agendamento** (`AppointmentEvaluation`) — `POST/GET /appointments/:id/evaluation` (rating 1-5 + comentário)
- [ ] **Avaliações internas de paciente** (`PatientEvaluation`) — `POST/GET /patients/:id/evaluations` (notas clínicas + tags)

### Frontend — Telas faltando

- [ ] **Tela de histórico de status** — timeline visual das transições dentro do agendamento
- [ ] **Tela de avaliações de agendamento** — rating + comentário no perfil do paciente
- [ ] **Tela de avaliações internas de paciente** — notas clínicas dentro do `PatientProfilePage`
- [ ] **Perfil do paciente mais completo** — métricas (total de visitas, última visita, LTV básico)
- [ ] **Expiração automática visível na waitlist** — mostrar `expiresAt` na linha do candidato NOTIFIED

### Segurança e Qualidade

- [ ] **Validação de slug único case-insensitive** — `clinica-demo` e `CLINICA-DEMO` são slugs diferentes hoje
- [ ] **Paginação do calendário** — hoje busca até 1000 agendamentos de uma vez; implementar busca por intervalo visível
- [ ] **Refresh token rotation + detecção de reuse** — token roubado não invalida a sessão hoje

---

## 🟢 P3 — Roadmap / MVP2

### Avaliações e CRM

- [ ] **`PatientCrmMetrics`** — LTV, frequência, churn risk, dias desde última visita
- [ ] **`PatientInterest`** — tags de interesse para segmentação de campanhas
- [ ] **Dashboard CRM** — visão agregada da base de pacientes

### Campanhas

- [ ] **`Campaign` + `CampaignRecipient`** — disparos em massa segmentados por tags, procedimento, última visita
- [ ] **Worker `campaigns`** — processamento assíncrono com controle de rate por tenant
- [ ] **Tela de campanhas** no frontend

### Assistente IA

- [ ] **`AiConfig` / `Conversation` / `Message`** — configuração de agente IA por tenant
- [ ] **Worker `ai-assistant`** — processamento de mensagens e respostas (Gemini API)
- [ ] **Chat IA** integrado ao painel e/ou à página pública de agendamento

### Financeiro

- [ ] **`Plan` / `Subscription` / `PaymentMethod` / `Invoice`** — infraestrutura de cobrança no schema, sem endpoints ainda
- [ ] **Integração com gateway** (Stripe, Asaas ou PagSeguro)
- [ ] **Portal de faturamento** no Super Admin

### Melhorias de produto

- [ ] **Link de confirmação/cancelamento por WhatsApp** — paciente confirma ou cancela pelo link sem ligar
- [ ] **Página pública de avaliação pós-atendimento** — link enviado após status `COMPLETED`
- [ ] **Relatórios e exportação** — agendamentos, pacientes, receita estimada em CSV/PDF
- [ ] **Multi-idioma** — suporte além de pt-BR
