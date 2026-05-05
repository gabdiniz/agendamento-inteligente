# Módulo: Waitlist (Lista de Espera)

## Visão Geral

Permite que pacientes aguardem uma vaga quando o profissional não tem horário disponível. Quando um agendamento é cancelado, a staff dispara `check-vacancies` para notificar os candidatos elegíveis. A entrada expira se não houver confirmação dentro de 24 horas.

---

## Fluxo de Status

```
WAITING → NOTIFIED → CONFIRMED
                   → EXPIRED
          REMOVED  (qualquer status não-terminal)
```

- **WAITING** — aguardando vaga
- **NOTIFIED** — vaga encontrada, paciente foi notificado; expira em 24 h
- **CONFIRMED** — paciente confirmou (pode vincular appointmentId)
- **EXPIRED** — prazo de confirmação expirado (job ou manual)
- **REMOVED** — paciente ou staff removeu da lista

---

## Endpoints

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| `GET` | `/t/:slug/waitlist` | GESTOR, RECEPCAO | Lista com filtros paginados |
| `GET` | `/t/:slug/waitlist/:id` | GESTOR, RECEPCAO | Busca por ID |
| `POST` | `/t/:slug/waitlist` | Público | Entra na lista (find-or-create patient) |
| `POST` | `/t/:slug/waitlist/check-vacancies` | GESTOR, RECEPCAO | Notifica candidatos elegíveis |
| `PATCH` | `/t/:slug/waitlist/:id/confirm` | GESTOR, RECEPCAO | Confirma vaga (→ CONFIRMED) |
| `PATCH` | `/t/:slug/waitlist/:id/expire` | GESTOR, RECEPCAO | Expira entrada (→ EXPIRED) |
| `PATCH` | `/t/:slug/waitlist/:id/remove` | GESTOR, RECEPCAO | Remove entrada (→ REMOVED) |

### POST `/waitlist` — body

```json
{
  "patientPhone": "+5511999999999",
  "patientName": "Maria Silva",
  "patientEmail": "maria@email.com",       // opcional
  "professionalId": "uuid",                // opcional (null = qualquer)
  "procedureId": "uuid",
  "preferredDateFrom": "2025-08-01",       // opcional
  "preferredDateTo": "2025-08-31",         // opcional
  "minAdvanceMinutes": 60                  // opcional, default 60
}
```

### POST `/waitlist/check-vacancies` — body

```json
{
  "procedureId": "uuid",
  "professionalId": "uuid",    // opcional
  "vacancyDate": "2025-08-15",
  "vacancyStartTime": "10:00"
}
```

---

## Critérios de Elegibilidade (`findCandidates`)

Para uma vaga aberta (procedureId + data + horário):

1. `status = WAITING`
2. `procedureId` igual
3. `professionalId` igual **ou** entrada sem preferência de profissional
4. `vacancyDate` dentro de `preferredDateFrom..preferredDateTo` (null = sem restrição)
5. Tempo disponível até a vaga ≥ `minAdvanceMinutes`

Ordenação: FIFO (`createdAt ASC`) — quem entrou primeiro tem prioridade.

---

## Arquitetura

```
domain/repositories/waitlist.repository.ts         ← contratos + tipos
application/use-cases/waitlist/
  add-to-waitlist.use-case.ts                      ← find-or-create patient + validações
  list-waitlist.use-case.ts
  get-waitlist-entry.use-case.ts
  check-vacancies.use-case.ts                      ← notifica candidatos → NOTIFIED
  confirm-waitlist-entry.use-case.ts               ← NOTIFIED → CONFIRMED
  expire-waitlist-entry.use-case.ts                ← NOTIFIED → EXPIRED
  remove-from-waitlist.use-case.ts                 ← → REMOVED
infrastructure/database/repositories/
  prisma-waitlist.repository.ts                    ← DB: WaitlistEntry model
infrastructure/http/routes/
  waitlist.routes.ts
```

---

## Notas Técnicas

- `preferredDateFrom` / `preferredDateTo` são `@db.Date` — armazenados como `DateTime` meia-noite UTC; convertidos para `"YYYY-MM-DD"` no domínio.
- O cálculo de `minAdvanceMinutes` é feito **em memória** após o `findMany` (não via SQL), para simplicidade. Para grandes volumes, migrar para `WHERE` calculado no banco.
- `expiresAt` é setado para `now + 24h` no `CheckVacanciesUseCase`. O `ExpireWaitlistEntryUseCase` é chamado manualmente ou por job externo — não há scheduler embutido ainda.
- A rota `POST /waitlist` não exige auth para suportar a página pública de agendamento.
- O `POST /check-vacancies` é manual. Futuramente pode ser chamado automaticamente pelo `CancelAppointmentUseCase` via evento de domínio ou hook.

---

## Débito Técnico

- **Job de expiração automática**: entradas NOTIFIED cujo `expiresAt` passou não são expiradas automaticamente. Necessita de um cron job.
- **Notificação real**: o `CheckVacanciesUseCase` apenas marca como NOTIFIED no banco — não envia WhatsApp/SMS ainda. Integração com o módulo de Notifications é próximo passo.
- **Timezone**: `minAdvanceMinutes` usa UTC para calcular o tempo até a vaga. Para clínicas no fuso BRT (UTC-3), o cálculo pode divergir. Corrigir com `date-fns-tz` quando o tenant armazenar timezone.
