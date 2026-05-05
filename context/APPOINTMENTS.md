# Appointments — Grupo 3

> Passo implementado: módulo de agendamentos do tenant.
> Data: 2026-04-09

---

## Visão Geral

O módulo de agendamentos é o núcleo operacional do SaaS. Conecta os quatro módulos anteriores (Professional, Procedure, WorkSchedule, Patient) em uma única operação com validações complexas. É o pré-requisito para Waitlist e Public Booking.

---

## Domain

**`domain/repositories/appointment.repository.ts`**

```typescript
interface AppointmentRecord {           // read model — inclui relações
  id, patientId, professionalId, procedureId,
  scheduledDate: string  // "YYYY-MM-DD"
  startTime: string      // "HH:MM"
  endTime: string        // "HH:MM" — calculado no use case
  status: string         // SCHEDULED|PATIENT_PRESENT|IN_PROGRESS|COMPLETED|CANCELED
  cancellationReason, canceledBy, notes, createdByUserId, createdAt, updatedAt
  patient: { id, name, phone }
  professional: { id, name, specialty }
  procedure: { id, name, durationMinutes, color }
}

interface AppointmentSlim {   // somente para collision check (sem relações)
  id, startTime, endTime, status
}

interface IAppointmentRepository {
  create(data): Promise<AppointmentRecord>
  findById(id): Promise<AppointmentRecord | null>
  list(params): Promise<PaginatedAppointments>
  findByProfessionalAndDate(professionalId, date): Promise<AppointmentSlim[]>
  updateStatus(id, status, changedByUserId?, notes?): Promise<AppointmentRecord>
  cancel(id, reason?, canceledBy, changedByUserId?): Promise<AppointmentRecord>
}
```

---

## Use Cases

### `CreateAppointmentUseCase` — o mais complexo

Recebe `{ patientId, professionalId, procedureId, scheduledDate, startTime, notes?, createdByUserId? }`.

**Ordem de validações:**
1. Carrega patient, professional, procedure em paralelo (`Promise.all`)
2. Valida que todos existem e estão **ativos**
3. Calcula `endTime = startTime + procedure.durationMinutes` (aritmética em minutos)
4. Extrai `dayOfWeek` de `scheduledDate` via `new Date("YYYY-MMT00:00:00.000Z").getUTCDay()`
5. Carrega WorkSchedule do profissional — exige entrada para o `dayOfWeek` e `isActive: true`
6. Valida que `startTime >= schedule.startTime` e `endTime <= schedule.endTime`
7. Carrega todos os agendamentos não-cancelados do profissional na data
8. Detecta colisão: `novo.start < exist.end AND novo.end > exist.start`
9. Cria o appointment + entrada inicial no `AppointmentStatusHistory` (status: SCHEDULED)

**Nota de timezone**: `getUTCDay()` é usado para ser consistente com a anchor `T00:00:00.000Z` usada em toda a camada de persistência. Em produção para clínicas BRT (UTC-3), datas próximas à meia-noite podem ter off-by-one — a solução definitiva é armazenar o timezone do tenant e usar uma lib como `date-fns-tz`. Documentado como débito técnico conhecido.

### `UpdateAppointmentStatusUseCase` — máquina de estados

Transições válidas (terminal = sem saída):
```
SCHEDULED       → PATIENT_PRESENT, CANCELED
PATIENT_PRESENT → IN_PROGRESS, CANCELED
IN_PROGRESS     → COMPLETED, CANCELED
COMPLETED       → (terminal)
CANCELED        → (terminal)
```

### `CancelAppointmentUseCase`

Atalho semântico para cancelamento — evita que a rota precise conhecer a máquina de estados. Rejeita `COMPLETED` e já-`CANCELED`. Aceita `canceledBy: 'PATIENT' | 'STAFF'` (rotas staff sempre passam `STAFF`; public booking passaria `PATIENT`).

---

## Repositório Prisma

**`infrastructure/database/repositories/prisma-appointment.repository.ts`**

Conversões de tipo:
- `scheduledDate`: `"YYYY-MM-DD"` → `new Date("YYYY-MM-DDT00:00:00.000Z")` (`@db.Date`)
- `startTime` / `endTime`: `"HH:MM"` → `new Date("1970-01-01THH:MM:00.000Z")` (`@db.Time`)
- Leitura inversa: `.toISOString().slice(0,10)` para date, `.slice(11,16)` para time

`updateStatus` e `cancel` usam **nested write do Prisma** — criam `AppointmentStatusHistory` no mesmo `update`, garantindo atomicidade sem transação explícita.

`findByProfessionalAndDate` retorna apenas `AppointmentSlim` (sem relações) para minimizar o custo da consulta de collision check.

---

## Rotas

Prefixo: `/t/:slug/appointments`

```
GET    /                     → listar (requireAuth)
                               query: professionalId?, patientId?,
                                      scheduledDate?, status?, page, limit
GET    /:id                  → buscar com relações (requireAuth)
POST   /                     → criar (GESTOR | RECEPCAO)
                               endTime é calculado automaticamente
PATCH  /:id/status           → mudar status (GESTOR | RECEPCAO | PROFISSIONAL)
                               body: { status, notes? }
POST   /:id/cancel           → cancelar (GESTOR | RECEPCAO)
                               body: { reason? }; canceledBy sempre "STAFF"
```

**Controle de acesso:**
- Listar/buscar: qualquer autenticado
- Criar: GESTOR, RECEPCAO
- Mudar status: GESTOR, RECEPCAO, PROFISSIONAL (profissional pode marcar IN_PROGRESS/COMPLETED)
- Cancelar: GESTOR, RECEPCAO

---

## Bug corrigido durante implementação

`request.currentUser.id` → `request.currentUser.sub`. `JwtPayload.sub` é o userId — `id` não existe na interface e sempre retornaria `undefined`, deixando `createdByUserId` e `changedByUserId` sempre `null`.

---

## Próximos módulos

- **Waitlist** — fila de espera que monitora cancelamentos e notifica pacientes
- **Public Booking** — rota pública (sem auth) para pacientes se auto-agendarem
