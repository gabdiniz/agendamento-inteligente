# Módulo: Notifications (Notificações)

## Visão Geral

Envia notificações para pacientes e usuários internos via três canais: **WhatsApp**, **SMS** e **Email**. O email é funcional via SMTP (nodemailer); WhatsApp e SMS são stubs aguardando integração com provedores externos (MVP2).

---

## Fluxo de Status

```
PENDING → SENT
        → FAILED  (retry disponível → cria nova notificação)
SENT    → READ    (PATCH /:id/read)
```

---

## Endpoints

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| `GET` | `/t/:slug/notifications` | GESTOR, RECEPCAO | Lista com filtros paginados |
| `POST` | `/t/:slug/notifications` | GESTOR, RECEPCAO | Envia notificação manual |
| `POST` | `/t/:slug/notifications/:id/retry` | GESTOR | Reenvio de FAILED |
| `PATCH` | `/t/:slug/notifications/:id/read` | requireAuth | Marca como lida |

### POST `/notifications` — body

```json
{
  "type": "APPOINTMENT_CONFIRMATION",
  "channel": "EMAIL",
  "recipient": "paciente@email.com",
  "content": "Seu agendamento foi confirmado...",
  "subject": "Confirmação de consulta",       // EMAIL only, opcional
  "htmlContent": "<p>...</p>",                // EMAIL only, opcional
  "patientId": "uuid",                        // opcional
  "appointmentId": "uuid"                     // opcional
}
```

**Tipos disponíveis:** `APPOINTMENT_CONFIRMATION | APPOINTMENT_REMINDER | WAITLIST_VACANCY | CAMPAIGN | RETENTION_SUGGESTION | CUSTOM`

**Canais:** `WHATSAPP | SMS | EMAIL`

---

## Arquitetura

```
domain/repositories/notification.repository.ts         ← contratos + tipos
application/use-cases/notification/
  send-notification.use-case.ts                        ← cria PENDING → dispatch → SENT|FAILED
  list-notifications.use-case.ts                       ← listagem paginada
  retry-notification.use-case.ts                       ← FAILED → novo registro → dispatch
infrastructure/notifications/
  notification.dispatcher.ts                           ← roteador de canais
  channels/
    email.adapter.ts                                   ← SMTP via nodemailer (funcional)
    whatsapp.adapter.ts                                ← STUB (MVP2)
    sms.adapter.ts                                     ← STUB (MVP2)
infrastructure/database/repositories/
  prisma-notification.repository.ts                    ← DB: Notification model
infrastructure/http/routes/
  notification.routes.ts                               ← 4 endpoints
```

---

## Integração com Waitlist

O `CheckVacanciesUseCase` recebe `INotificationRepository` como segundo argumento (opcional). Quando injetado (na rota `POST /waitlist/check-vacancies`), cada candidato que muda para `NOTIFIED` recebe também uma notificação real:

- Canal determinado por `patient.preferredContactChannel` (ou WhatsApp como fallback)
- Recipient: telefone para WhatsApp/SMS, email para EMAIL
- Falha no envio não bloqueia a atualização da waitlist (catch silencioso com log)

---

## Configuração por Canal

### Email (funcional)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxx
SMTP_FROM=noreply@myclinix.com.br
```

Sem `SMTP_HOST`: modo dry-run — loga o e-mail no console, não envia.

### WhatsApp (stub — MVP2)

```env
WHATSAPP_API_URL=https://api.z-api.io/instances/XXXX/token/YYYY
```

### SMS (stub — MVP2)

```env
SMS_API_URL=https://api.twilio.com/...
```

---

## Notas Técnicas

- `retry` não reutiliza o registro original — cria um novo. O registro FAILED fica como histórico.
- O dispatcher tem exhaustiveness check no `switch`: adicionar novo canal sem implementar o `case` gera erro de compilação.
- `markRead` é direto no repositório (sem use case próprio) — operação simples sem lógica de negócio.

---

## Débito Técnico

- **WhatsApp e SMS reais:** stubs aguardando escolha de provedor (Z-API, Twilio, AWS SNS).
- **Templates de mensagem:** conteúdo hardcoded no `CheckVacanciesUseCase`. MVP2 deve ter sistema de templates com variáveis (Handlebars ou similar).
- **Job de envio em lote:** campanhas e lembretes de agendamento precisam de um job scheduler (Bull/BullMQ). Infraestrutura de fila (`queue/queues.ts`) já está no projeto mas ainda não conectada.
- **Webhook de status:** provedores como Twilio e Z-API enviam callbacks para confirmar entrega. Necessita endpoint `/notifications/webhook/:provider`.
