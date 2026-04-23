# Integração WhatsApp — MyAgendix
> Arquitetura, modelo de dados, eventos e checklist de implementação

---

## 1. Visão Geral

O MyAgendix utiliza a **Z-API** para envio de mensagens WhatsApp, com modelo **por clínica**: cada tenant conecta seu próprio número do WhatsApp via Z-API. As mensagens são enviadas de forma **assíncrona** por uma fila persistida em banco de dados, sem dependência de Redis ou qualquer infraestrutura adicional.

### Fluxo de alto nível

```
Evento (agendamento criado/cancelado/etc.)
    │
    ▼
Rota HTTP (Fastify)
    │
    ├── Cria registro na tabela whatsapp_jobs (status: PENDING)
    │
    └── Retorna resposta ao frontend imediatamente ✓

Background Worker (polling a cada 30s)
    │
    ├── Busca jobs PENDING com scheduledAt <= now()
    │
    ├── Chama Z-API (POST /send-text)
    │
    ├── Sucesso → status: SENT, sentAt: now()
    │
    └── Falha  → status: FAILED, retries++
                 (máx. 3 tentativas, backoff exponencial)
```

---

## 2. Decisões de Arquitetura

| Decisão | Escolha | Motivo |
|---|---|---|
| Provedor WhatsApp | Z-API | Mais simples no Brasil, API REST, sem aprovação Meta |
| Modelo de conta | Por clínica (per-tenant) | Mensagem sai do número da própria clínica |
| Envio | Assíncrono (fila no banco) | Não bloqueia criação do agendamento; sobrevive a restart |
| Fila | DB-backed (`whatsapp_jobs`) | Zero infra extra, confiável, auditável |
| Retry | 3 tentativas, backoff 5/15/60 min | Cobre instabilidades temporárias da Z-API |
| Templates | Configuráveis por clínica | Cada clínica personaliza o texto |
| Lembrete | Configurável (padrão: 24h antes) | Flexível por clínica |

---

## 3. Mudanças no Banco de Dados

### 3.1 Schema público — tabela `tenants`

Adicionar colunas de configuração Z-API ao model `Tenant`:

```prisma
model Tenant {
  // ... campos existentes ...

  // ─── WhatsApp / Z-API ────────────────────────
  whatsappEnabled      Boolean  @default(false)
  zApiInstanceId       String?  @db.VarChar(255)
  zApiToken            String?  @db.VarChar(255)
  reminderHoursBefore  Int      @default(24)   // horas antes do agendamento
}
```

### 3.2 Schema de tenant — novas tabelas (migration dinâmica)

#### `whatsapp_templates` — templates de mensagem por evento

```prisma
model WhatsappTemplate {
  id        String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  event     WhatsappEvent       // enum: CONFIRMATION, REMINDER, CANCELLATION, RESCHEDULE
  body      String              // texto com variáveis: {{nome_paciente}}, {{data}}, etc.
  isActive  Boolean             @default(true)
  createdAt DateTime            @default(now()) @db.Timestamptz
  updatedAt DateTime            @updatedAt @db.Timestamptz

  @@map("whatsapp_templates")
}

enum WhatsappEvent {
  CONFIRMATION   // agendamento criado
  REMINDER       // lembrete X horas antes
  CANCELLATION   // agendamento cancelado
  RESCHEDULE     // agendamento reagendado
}
```

#### `whatsapp_jobs` — fila de envio

```prisma
model WhatsappJob {
  id          String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  event       WhatsappEvent
  phone       String          @db.VarChar(20)   // número formatado: 5511999999999
  message     String          // texto já resolvido (variáveis substituídas)
  status      WhatsappJobStatus @default(PENDING)
  retries     Int             @default(0)
  scheduledAt DateTime        @db.Timestamptz   // quando deve ser enviado
  sentAt      DateTime?       @db.Timestamptz
  errorLog    String?         // último erro registrado
  // referência ao agendamento (para rastreabilidade)
  appointmentId String        @db.Uuid
  patientName   String        @db.VarChar(255)
  createdAt   DateTime        @default(now()) @db.Timestamptz
  updatedAt   DateTime        @updatedAt @db.Timestamptz

  @@index([status, scheduledAt])   // índice para o worker
  @@map("whatsapp_jobs")
}

enum WhatsappJobStatus {
  PENDING    // aguardando envio
  SENDING    // sendo processado (evita duplo processamento)
  SENT       // enviado com sucesso
  FAILED     // falhou após todas as tentativas
  CANCELED   // cancelado manualmente
}
```

---

## 4. Templates Padrão

Criados automaticamente quando a clínica ativa o WhatsApp pela primeira vez.

### CONFIRMATION — Confirmação de agendamento

```
Olá, {{nome_paciente}}! 👋

Seu agendamento na *{{clinica}}* foi confirmado:

📅 *Data:* {{data}}
🕐 *Horário:* {{hora}}
👨‍⚕️ *Profissional:* {{profissional}}
💼 *Procedimento:* {{procedimento}}

Em caso de dúvidas ou cancelamento, entre em contato conosco.
```

### REMINDER — Lembrete (padrão: 24h antes)

```
Olá, {{nome_paciente}}! ⏰

Lembrando que amanhã você tem consulta na *{{clinica}}*:

📅 *Data:* {{data}}
🕐 *Horário:* {{hora}}
👨‍⚕️ *Profissional:* {{profissional}}

Até amanhã! 😊
```

### CANCELLATION — Cancelamento

```
Olá, {{nome_paciente}}.

Seu agendamento na *{{clinica}}* foi *cancelado*:

📅 *Data:* {{data}}
🕐 *Horário:* {{hora}}

Para remarcar, entre em contato conosco.
```

### RESCHEDULE — Reagendamento

```
Olá, {{nome_paciente}}! 🔄

Seu agendamento na *{{clinica}}* foi *remarcado*:

📅 *Nova data:* {{data}}
🕐 *Novo horário:* {{hora}}
👨‍⚕️ *Profissional:* {{profissional}}

Em caso de dúvidas, entre em contato conosco.
```

### Variáveis disponíveis

| Variável | Descrição |
|---|---|
| `{{nome_paciente}}` | Nome completo do paciente |
| `{{clinica}}` | Nome da clínica |
| `{{data}}` | Data formatada: "Segunda, 21 de Abril" |
| `{{hora}}` | Horário: "14:30" |
| `{{profissional}}` | Nome do profissional |
| `{{procedimento}}` | Nome do procedimento |

---

## 5. Integração Z-API

### Credenciais por tenant

Cada clínica gera suas credenciais no painel Z-API e configura no MyAgendix:
- **Instance ID**: identificador da instância WhatsApp
- **Token**: token de autenticação da instância

### Endpoint de envio

```
POST https://api.z-api.io/instances/{instanceId}/token/{token}/send-text
Content-Type: application/json

{
  "phone": "5511999999999",
  "message": "Texto da mensagem"
}
```

### Formatação do número de telefone

O Z-API exige o número no formato internacional sem `+` e sem espaços/traços.

Regras de normalização (Brasil):
1. Remover tudo que não for dígito
2. Se começar com `0`, remover o zero inicial
3. Se tiver 10–11 dígitos (DDD + número), prefixar com `55`
4. Resultado esperado: `5511999999999` (13 dígitos) ou `551199999999` (12 dígitos)

### Tratamento de erros Z-API

| Código HTTP | Situação | Ação |
|---|---|---|
| 200 | Enviado | Marcar `SENT` |
| 4xx | Número inválido / conta desconectada | Marcar `FAILED` sem retry |
| 5xx / timeout | Erro temporário Z-API | Retry com backoff |

---

## 6. Worker de Envio (Background Job)

Roda dentro do processo da API. Inicia junto com o servidor Fastify.

### Ciclo de execução

```
A cada 30 segundos:

1. SELECT jobs WHERE status = 'PENDING' AND scheduledAt <= NOW()
   ORDER BY scheduledAt ASC LIMIT 50

2. Para cada job:
   a. UPDATE status = 'SENDING'  ← evita duplo processamento
   b. Buscar config Z-API do tenant (cache em memória, TTL 5min)
   c. Se whatsappEnabled = false → UPDATE status = 'CANCELED', skip
   d. Chamar Z-API
   e. Sucesso → UPDATE status = 'SENT', sentAt = NOW()
   f. Falha   → retries++
      - retries < 3  → UPDATE status = 'PENDING', scheduledAt = NOW() + backoff
      - retries >= 3 → UPDATE status = 'FAILED', errorLog = mensagem
```

### Backoff por tentativa

| Tentativa | Aguarda |
|---|---|
| 1ª falha | 5 minutos |
| 2ª falha | 15 minutos |
| 3ª falha | 60 minutos → `FAILED` definitivo |

---

## 7. Eventos e Gatilhos

### Quando cada job é criado

| Evento | Gatilho | `scheduledAt` |
|---|---|---|
| `CONFIRMATION` | `POST /appointments` (criação) | `now()` |
| `REMINDER` | `POST /appointments` (criação) | `appointmentDate - reminderHoursBefore` |
| `CANCELLATION` | `PATCH /appointments/:id/cancel` | `now()` |
| `RESCHEDULE` | `PATCH /appointments/:id/reschedule` | `now()` |

### Casos especiais

- **Cancelamento antes do lembrete**: ao cancelar, buscar job `REMINDER` com status `PENDING` do mesmo agendamento e marcar como `CANCELED`.
- **Reagendamento**: cancelar jobs `REMINDER` pendentes do agendamento original e criar novos para a nova data.
- **Paciente sem telefone**: logar e pular silenciosamente (não bloquear a operação).
- **Clínica sem Z-API configurada**: job criado normalmente, mas worker pula (`CANCELED`). Quando a clínica configurar, os novos agendamentos já funcionam.

---

## 8. Novos Endpoints

### Configuração WhatsApp (GESTOR)

```
GET  /t/:slug/whatsapp/config          → retorna config atual
PUT  /t/:slug/whatsapp/config          → salva instanceId, token, enabled, reminderHours

GET  /t/:slug/whatsapp/templates       → lista templates
PUT  /t/:slug/whatsapp/templates/:event → atualiza body do template

POST /t/:slug/whatsapp/test            → envia mensagem de teste para número informado
```

### Histórico de envios (GESTOR)

```
GET /t/:slug/whatsapp/jobs             → lista jobs com filtro: status, evento, data
                                          útil para auditoria e troubleshooting
```

---

## 9. Frontend — Telas Necessárias

### Configurações → WhatsApp (nova seção no sidebar)

1. **Aba Conexão**
   - Toggle "Ativar envio de WhatsApp"
   - Campos: Instance ID, Token
   - Botão "Testar conexão" → envia mensagem de teste
   - Status da conexão (conectado / desconectado / não configurado)
   - Campo: "Lembrete com X horas de antecedência" (default: 24)

2. **Aba Templates**
   - Um card por evento (Confirmação, Lembrete, Cancelamento, Reagendamento)
   - Textarea editável com preview ao lado
   - Variáveis disponíveis como chips clicáveis que inserem no texto
   - Botão salvar por template

3. **Aba Histórico**
   - Tabela: paciente, evento, status, data de envio
   - Filtros por status e evento
   - Útil para troubleshooting

---

## 10. Checklist de Implementação

### Backend

- [ ] **Migration 1**: Adicionar campos Z-API ao model `Tenant` (schema público)
- [ ] **Migration 2**: Criar tabelas `whatsapp_templates` e `whatsapp_jobs` nas migrations de tenant
- [ ] **`WhatsappService`**: classe responsável por montar mensagens e enfileirar jobs
  - `enqueueConfirmation(appointment, tenantId)`
  - `enqueueReminder(appointment, tenantId)`
  - `enqueueCancellation(appointment, tenantId)`
  - `enqueueReschedule(appointment, tenantId)`
- [ ] **`ZApiClient`**: classe HTTP wrapper para chamar a API do Z-API
  - `sendText(instanceId, token, phone, message)`
  - Tratamento de erros por código HTTP
- [ ] **`WhatsappWorker`**: polling loop com `setInterval`
  - Inicia em `buildApp()` após servidor pronto
  - Busca e processa jobs pendentes a cada 30s
  - Cache de config Z-API por tenantId (TTL 5min)
- [ ] **`PhoneFormatter`**: utilitário para normalizar números brasileiros para formato Z-API
- [ ] **Hooks nos appointment routes**: chamar `WhatsappService` em criação, cancelamento, reagendamento
- [ ] **Rotas WhatsApp**: config, templates, test, jobs
- [ ] **Criação de templates padrão**: ao ativar WhatsApp pela primeira vez, inserir os 4 templates padrão

### Frontend

- [ ] Seção "WhatsApp" no sidebar de Configurações (visível apenas para GESTOR)
- [ ] Página de Conexão (toggle + campos Z-API + teste + lembrete)
- [ ] Página de Templates (4 cards editáveis com preview)
- [ ] Página de Histórico (tabela de jobs)
- [ ] API client: `whatsappApi` com os endpoints acima

### Infra / Ops

- [ ] Variável de ambiente: nenhuma nova necessária (credenciais ficam no banco)
- [ ] Garantir que `uploads/` e restarts do processo não perdem jobs (banco garante isso)

---

## 11. Estrutura de Arquivos Novos

```
apps/api/src/
├── application/
│   ├── services/
│   │   ├── whatsapp.service.ts       ← orquestra enfileiramento
│   │   └── phone-formatter.service.ts
│   └── workers/
│       └── whatsapp.worker.ts        ← polling loop
├── infrastructure/
│   ├── external/
│   │   └── zapi.client.ts            ← HTTP wrapper Z-API
│   └── http/
│       └── routes/
│           └── whatsapp.routes.ts    ← config, templates, test, jobs

apps/web/src/
├── features/
│   └── clinic/
│       └── pages/
│           └── whatsapp/
│               ├── WhatsappPage.tsx           ← layout com abas
│               ├── WhatsappConnectionTab.tsx
│               ├── WhatsappTemplatesTab.tsx
│               └── WhatsappHistoryTab.tsx
└── lib/
    └── api/
        └── whatsapp.api.ts
```

---

*Documento gerado em: Abril 2026*
*Próximo passo: implementar na ordem do checklist — migrations primeiro, depois WhatsappService + Worker, depois rotas, depois frontend.*
