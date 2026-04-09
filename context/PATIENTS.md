# Patients — Grupo 2

> Passo implementado: módulo de gestão de pacientes do tenant.
> Data: 2026-04-09

---

## Visão Geral

O módulo de pacientes é o segundo bloco do core operacional de um tenant. Pacientes são pré-requisito para Appointments — todo agendamento exige um `patientId` válido.

Deduplicação é feita por `phone`, que é `@unique` por tenant schema. Isso permite que dois tenants diferentes tenham o mesmo número (isolamento correto), mas dentro de um tenant o phone é identificador único de paciente.

---

## Domain

**`domain/repositories/patient.repository.ts`**

```typescript
interface PatientRecord {
  id, name, phone, email, birthDate: Date | null,
  gender, city, preferredContactChannel, marketingOptIn,
  notes, source, isActive, createdAt, updatedAt
}

interface IPatientRepository {
  create(data: CreatePatientData): Promise<PatientRecord>
  findById(id): Promise<PatientRecord | null>
  findByPhone(phone): Promise<PatientRecord | null>
  list(params): Promise<PaginatedPatients>
  update(id, data): Promise<PatientRecord>
  setActive(id, isActive): Promise<PatientRecord>
}
```

`birthDate` chega no domínio como `string "YYYY-MM-DD"` — o repositório converte via `new Date(\`${dateStr}T00:00:00.000Z\`)`.

---

## Use Cases

| Use Case | Regra de negócio |
|----------|-----------------|
| `CreatePatientUseCase` | Verifica `phone` único antes de criar → `ConflictError` 409 se já existe |
| `ListPatientsUseCase` | Busca por `name`, `phone`, `email` (insensitive para name/email) |
| `GetPatientUseCase` | `NotFoundError` 404 se não existe |
| `UpdatePatientUseCase` | Verifica que o novo `phone` (se mudou) não pertence a outro paciente |
| `TogglePatientActiveUseCase` | `NotFoundError` 404 se não existe |

---

## Repositório Prisma

**`infrastructure/database/repositories/prisma-patient.repository.ts`**

- `patientSelect` fixo — sem relações aninhadas (appointments, etc. são carregados nos módulos próprios)
- Conversão `birthDate`: `"YYYY-MM-DD"` → `new Date("YYYY-MM-DDT00:00:00.000Z")` para `@db.Date`
- `gender` e `preferredContactChannel` são enums no Prisma — passados como `never` cast via string; o Prisma valida os valores válidos em runtime
- `list` busca em `name` e `email` com `mode: 'insensitive'`; em `phone` sem insensitive (é numérico, case irrelevante)

---

## Rotas

Prefixo: `/t/:slug/patients`

```
GET    /                    → listar pacientes (requireAuth)
GET    /:id                 → buscar por ID (requireAuth)
POST   /                    → criar paciente (GESTOR | RECEPCAO)
PATCH  /:id                 → editar paciente (GESTOR | RECEPCAO)
PATCH  /:id/activate        → ativar (GESTOR)
PATCH  /:id/deactivate      → desativar (GESTOR)
```

**Controle de acesso:**
- Listar/buscar: qualquer usuário autenticado
- Criar/editar: `GESTOR` ou `RECEPCAO` — recepcionistas também gerenciam pacientes
- Ativar/desativar: somente `GESTOR`

---

## Schemas Shared (packages/shared)

```typescript
// createPatientSchema
{
  name: string (min 2, max 255)
  phone: string (10-20 chars, regex /^\+?[\d\s()-]+$/)
  email?: string (email)
  birthDate?: string ("YYYY-MM-DD")
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'
  city?: string (max 255)
  preferredContactChannel?: 'WHATSAPP' | 'SMS' | 'EMAIL'
  marketingOptIn?: boolean
  notes?: string
}

// updatePatientSchema — partial de createPatientSchema com nullable para campos opcionais
// (email, birthDate, gender, city, preferredContactChannel, notes podem ser null para limpar)
```

**Nota**: `source` não está no schema de criação para uso staff — é definido internamente pelo repositório como `MANUAL`. O flow de booking público usa `PUBLIC_PAGE` diretamente.

---

## Próximos módulos

- **Appointments** — usa `patientId` + `professionalId` + `procedureId` + work schedule para validar disponibilidade
