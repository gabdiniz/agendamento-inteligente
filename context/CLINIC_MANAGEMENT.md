# Clinic Management — Grupo 1: Professionals + Procedures + Work Schedule

> Passo implementado: módulos de gestão da clínica (recursos do tenant).
> Data: 2026-04-08

---

## Visão Geral

Este passo implementa os três módulos que formam o núcleo operacional de um tenant clínica:

- **Professional** — profissionais de saúde que realizam atendimentos
- **Procedure** — procedimentos/serviços oferecidos pela clínica
- **Work Schedule** — grade de horários de trabalho por profissional e dia da semana

Os três módulos são fortemente acoplados: profissionais realizam procedimentos, e a grade de horários define quando cada profissional está disponível para ser agendado.

---

## Arquitetura Geral

Todos os módulos seguem a Clean Architecture:

```
domain/repositories/          → interfaces + tipos (sem lógica)
application/use-cases/        → regras de negócio
infrastructure/database/      → repositórios Prisma
infrastructure/http/routes/   → endpoints Fastify
```

Cada request de tenant tem acesso a `request.tenantPrisma` — o cliente Prisma apontando para o schema isolado do tenant.

---

## Module: Professional

### Domain

**`domain/repositories/professional.repository.ts`**

```typescript
interface ProfessionalRecord {
  id, name, specialty, bio, color, isActive, userId, createdAt, updatedAt
}

interface ProfessionalWithProcedures extends ProfessionalRecord {
  procedures: Array<{ id, name, durationMinutes, color }>
}

interface IProfessionalRepository {
  create(data): Promise<ProfessionalWithProcedures>
  findById(id): Promise<ProfessionalWithProcedures | null>
  list(params): Promise<PaginatedResult<ProfessionalWithProcedures>>
  update(id, data): Promise<ProfessionalWithProcedures>
  setActive(id, isActive): Promise<ProfessionalRecord>
  linkProcedures(professionalId, procedureIds): Promise<void>
  unlinkProcedure(professionalId, procedureId): Promise<void>
}
```

A maioria dos métodos retorna `ProfessionalWithProcedures` (inclui array de procedures). `setActive` é exceção — retorna apenas o registro base para eficiência.

### Repositório Prisma

**`infrastructure/database/repositories/prisma-professional.repository.ts`**

- `professionalWithProceduresSelect` — objeto select compartilhado entre create, findById, list, update (evita duplicação)
- `linkProcedures`: usa `createMany({ skipDuplicates: true })` — **idempotente** (pode reenviar os mesmos IDs sem erro)
- `unlinkProcedure`: delete por chave composta `professionalId_procedureId`

### Use Cases

| Use Case | Input | Notas |
|----------|-------|-------|
| `CreateProfessionalUseCase` | `CreateProfessionalInput` | Direto, sem validações especiais |
| `ListProfessionalsUseCase` | `{ page, limit, search?, isActive? }` | Busca em `name` e `specialty` |
| `GetProfessionalUseCase` | `professionalId` | NotFoundError se não existe |
| `UpdateProfessionalUseCase` | `{ professionalId, ...partial }` | NotFoundError se não existe |
| `ToggleProfessionalActiveUseCase` | `{ professionalId, isActive }` | NotFoundError se não existe |
| `LinkProceduresUseCase` | `{ professionalId, procedureIds[] }` | Valida que todos os procedures existem e são ativos antes de linkar |
| `UnlinkProcedureUseCase` | `{ professionalId, procedureId }` | NotFoundError para professional ou procedure |

**Detalhe importante — `LinkProceduresUseCase`**: valida `procedureId` um por um antes de criar o link, garantindo que não se adiciona procedure inexistente ou inativo.

### Rotas

Prefixo: `/t/:slug/professionals`

```
GET    /                              → listar (requireAuth)
GET    /:id                           → buscar por ID (requireAuth)
POST   /                              → criar (GESTOR)
PATCH  /:id                           → editar (GESTOR)
PATCH  /:id/activate                  → ativar (GESTOR)
PATCH  /:id/deactivate                → desativar (GESTOR)
POST   /:id/procedures                → linkar procedures (GESTOR) — body: { procedureIds: uuid[] }
DELETE /:id/procedures/:procedureId   → deslinkar procedure (GESTOR)
```

---

## Module: Procedure

### Domain

**`domain/repositories/procedure.repository.ts`**

```typescript
interface ProcedureRecord {
  id, name, description, durationMinutes, color, isActive, createdAt, updatedAt
}

interface IProcedureRepository {
  create(data): Promise<ProcedureRecord>
  findById(id): Promise<ProcedureRecord | null>
  list(params): Promise<PaginatedResult<ProcedureRecord>>
  update(id, data): Promise<ProcedureRecord>
  setActive(id, isActive): Promise<ProcedureRecord>
}
```

### Use Cases

| Use Case | Input | Notas |
|----------|-------|-------|
| `CreateProcedureUseCase` | `CreateProcedureInput` | Direto |
| `ListProceduresUseCase` | `{ page, limit, search?, isActive? }` | Busca em `name` e `description` |
| `GetProcedureUseCase` | `procedureId` | NotFoundError se não existe |
| `UpdateProcedureUseCase` | `{ procedureId, ...partial }` | NotFoundError se não existe |
| `ToggleProcedureActiveUseCase` | `procedureId, isActive` | NotFoundError se não existe |

### Rotas

Prefixo: `/t/:slug/procedures`

```
GET    /                  → listar (requireAuth)
GET    /:id               → buscar por ID (requireAuth)
POST   /                  → criar (GESTOR)
PATCH  /:id               → editar (GESTOR)
PATCH  /:id/activate      → ativar (GESTOR)
PATCH  /:id/deactivate    → desativar (GESTOR)
```

---

## Module: Work Schedule

### Conceito

Cada profissional pode ter até 7 entradas de `WorkSchedule` (uma por dia da semana). A grade define o horário de início, fim e o intervalo de slots para geração de disponibilidade de agendamento.

### Domain

**`domain/repositories/work-schedule.repository.ts`**

```typescript
interface WorkScheduleRecord {
  id, professionalId,
  dayOfWeek: number,  // 0=Dom, 1=Seg, ..., 6=Sab
  startTime: string,  // "HH:MM" no domínio
  endTime: string,    // "HH:MM" no domínio
  slotIntervalMinutes: number,
  isActive: boolean,
  createdAt, updatedAt
}

interface IWorkScheduleRepository {
  upsert(data): Promise<WorkScheduleRecord>
  findByProfessional(professionalId): Promise<WorkScheduleRecord[]>
  deleteByDay(professionalId, dayOfWeek): Promise<void>
  setActive(professionalId, dayOfWeek, isActive): Promise<WorkScheduleRecord>
}
```

**Representação de tempo**: o domínio usa `string "HH:MM"`. O banco armazena `@db.Time` (mapeado para `DateTime` pelo Prisma). A conversão ocorre **no repositório** com:

```typescript
// string → Date (para persistir)
new Date(`1970-01-01T${time}:00.000Z`)

// Date → string (para o domínio)
date.toISOString().slice(11, 16)  // "HH:MM"
```

Essa mesma estratégia é usada no seed do tenant.

### Repositório Prisma

**`infrastructure/database/repositories/prisma-work-schedule.repository.ts`**

- `upsert`: usa `professionalId_dayOfWeek` como chave composta (`@@unique` no schema Prisma)
  - On update: atualiza horários, reativa o dia (`isActive: true`)
  - On create: define `slotIntervalMinutes` default 30
- `findByProfessional`: ordena por `dayOfWeek asc` (Dom → Sab)
- `deleteByDay`: usa `deleteMany` (seguro mesmo se o dia não existir — zero linhas deletadas)

### Use Cases

| Use Case | Input | Notas |
|----------|-------|-------|
| `UpsertWorkScheduleUseCase` | `UpsertWorkScheduleData` | Valida professional exists + dayOfWeek 0-6 + formato HH:MM + startTime < endTime |
| `ListWorkScheduleUseCase` | `professionalId` | Valida professional exists |
| `DeleteWorkScheduleDayUseCase` | `professionalId, dayOfWeek` | Valida professional exists + dayOfWeek range |
| `ToggleWorkScheduleDayUseCase` | `professionalId, dayOfWeek, isActive` | Valida professional exists + dayOfWeek range |

**Validações no `UpsertWorkScheduleUseCase`**:
- Professional deve existir
- `dayOfWeek` entre 0 e 6
- `startTime` e `endTime` no formato `HH:MM` (`/^([01]\d|2[0-3]):([0-5]\d)$/`)
- `startTime < endTime` (string comparison é válida aqui pois ambas têm mesmo formato)

### Rotas

Prefixo: `/t/:slug/professionals/:professionalId/schedule`

Registrado **separadamente** em `app.ts` (não como sub-plugin de `professionalRoutes`) para manter os plugins desacoplados. O Fastify herda o parâmetro `:professionalId` da URL.

```
GET    /                    → listar grade (requireAuth)
PUT    /:day                → upsert dia (GESTOR) — :day = 0-6
DELETE /:day                → remover dia (GESTOR) — 204 No Content
PATCH  /:day/activate       → ativar dia (GESTOR)
PATCH  /:day/deactivate     → desativar dia (GESTOR)
```

O `:day` é parsado com `z.coerce.number().int().min(0).max(6)` — aceita string numérica da URL.

---

## Registro em app.ts

```typescript
// Tenant-scoped routes
await tenantScope.register(professionalRoutes, { prefix: '/professionals' })
await tenantScope.register(procedureRoutes, { prefix: '/procedures' })
await tenantScope.register(workScheduleRoutes, { prefix: '/professionals/:professionalId/schedule' })
```

O work schedule é registrado com o prefixo completo aninhado, sem ser sub-plugin de `professionalRoutes`.

---

## Controle de Acesso

| Operação | Role mínima |
|----------|-------------|
| Listar / buscar | Qualquer usuário autenticado (`requireAuth`) |
| Criar / editar / ativar / desativar / linkar | `GESTOR` |

---

## Schemas Compartilhados (packages/shared)

```typescript
createProfessionalSchema   → name, specialty?, bio?, color?, userId?
updateProfessionalSchema   → createProfessionalSchema.partial()

createProcedureSchema      → name, description?, durationMinutes, color?
updateProcedureSchema      → createProcedureSchema.partial()

workScheduleSchema         → dayOfWeek, startTime, endTime, slotIntervalMinutes (default 30)
```

Os schemas de work schedule são validados localmente nas rotas (dayOfWeek vem da URL, não do body).

---

## Coupling Map

```
Professional ──── ProfessionalProcedure (join) ──── Procedure
     │
     └──── WorkSchedule (1:N, por dayOfWeek)
     └──── Appointment (1:N)
```

**ProfessionalProcedure** é a tabela de junção M:N entre `Professional` e `Procedure`:
- `linkProcedures`: `createMany({ skipDuplicates: true })` — idempotente
- `unlinkProcedure`: delete por `professionalId_procedureId`

---

## Próximos módulos previstos

- **Patients** — cadastro de pacientes do tenant
- **Appointments** — agendamentos (usa professional + procedure + work schedule para validar disponibilidade)
- **Waitlist** — fila de espera
- **Public Booking** — página pública de agendamento sem autenticação
