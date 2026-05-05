# MyAgendix — Tenant Management

> Contexto para IA: este documento descreve o módulo de gerenciamento de tenants (clínicas) via Super Admin. Leia antes de modificar qualquer arquivo em `tenant-management/` ou `tenant-management.routes.ts`.
>
> Última atualização: Abril de 2026

---

## 1. Visão Geral

O Tenant Management é o CRUD completo de clínicas, operado exclusivamente por Super Admins autenticados. O endpoint de criação (`POST /super-admin/tenants`) faz onboarding completo: cria o registro do tenant, o schema PostgreSQL, as tabelas, e o primeiro usuário Gestor.

Todas as rotas requerem `requireSuperAdmin` (JWT com `scope: 'super-admin'`).

---

## 2. Rotas

```
POST   /super-admin/tenants              → Criar tenant + schema + gestor
GET    /super-admin/tenants              → Listar tenants (paginado, busca, filtro)
GET    /super-admin/tenants/:id          → Detalhes de um tenant
PATCH  /super-admin/tenants/:id          → Atualizar dados (nome, email, plano, etc.)
PATCH  /super-admin/tenants/:id/activate    → Reativar tenant
PATCH  /super-admin/tenants/:id/deactivate  → Desativar tenant
```

Todas protegidas por `requireSuperAdmin` via `addHook('preHandler')` no plugin.

---

## 3. Fluxo de Criação (POST)

```
POST /super-admin/tenants
Body: {
  name: "Clínica ABC",
  slug: "clinica-abc",
  email: "contato@clinicaabc.com",
  phone: "+5511999990000",       // opcional
  address: "Rua X, 123",        // opcional
  gestor: {
    name: "Dr. João",
    email: "joao@clinicaabc.com",
    password: "Senha@123456",
    phone: "+5511988880000"      // opcional
  }
}
```

### Passos internos:

1. **Validação** — `createTenantWithGestorSchema` (Zod): slug regex, email válido, senha min 8 chars
2. **Unicidade do slug** — `findBySlug()` no schema public. Se já existe → `ConflictError 409`
3. **Cria tenant** — `INSERT INTO tenants` no schema public
4. **Cria schema** — `createTenantSchema(slug)`:
   - `CREATE SCHEMA IF NOT EXISTS "tenant_clinica_abc"`
   - `prisma db push` para criar todas as tabelas do tenant
5. **Cria Gestor** — `createTenantClient(schema)` → `user.create` com `role: GESTOR`
6. **Disconnect** — `tenantPrisma.$disconnect()` no bloco `finally`

### Response 201:

```json
{
  "success": true,
  "data": {
    "tenant": { "id": "uuid", "name": "...", "slug": "...", ... },
    "gestor": { "id": "uuid", "name": "...", "email": "..." },
    "tenantSchema": "tenant_clinica_abc"
  }
}
```

---

## 4. Listagem (GET)

```
GET /super-admin/tenants?page=1&limit=20&search=demo&isActive=true
```

| Query Param | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| page | int | 1 | Página (min: 1) |
| limit | int | 20 | Por página (min: 1, max: 100) |
| search | string | — | Busca por nome, slug ou email (case insensitive) |
| isActive | 'true'/'false' | — | Filtra por status |

### Response:

```json
{
  "success": true,
  "data": [ { ... }, { ... } ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

## 5. Estrutura de Arquivos

```
apps/api/src/
├── domain/repositories/
│   └── tenant.repository.ts
│       ├── ITenantRepository { create, findById, findBySlug, list, update, setActive }
│       ├── TenantRecord, CreateTenantData, UpdateTenantData
│       ├── ListTenantsParams, PaginatedResult<T>
│       └── (opera no schema public)
│
├── application/use-cases/tenant-management/
│   ├── create-tenant.use-case.ts    → CreateTenantUseCase
│   ├── list-tenants.use-case.ts     → ListTenantsUseCase
│   ├── get-tenant.use-case.ts       → GetTenantUseCase
│   ├── update-tenant.use-case.ts    → UpdateTenantUseCase
│   └── toggle-tenant-active.use-case.ts → ToggleTenantActiveUseCase
│
└── infrastructure/
    ├── database/repositories/
    │   └── prisma-tenant.repository.ts → PrismaTenantRepository
    └── http/routes/
        └── tenant-management.routes.ts
            └── registrado em app.ts: adminScope.register(tenantManagementRoutes, { prefix: '/tenants' })
```

---

## 6. Schemas de Validação (Zod)

Definidos em `packages/shared/src/schemas/index.ts`:

```typescript
// Criação com Gestor (usado no POST /super-admin/tenants)
createTenantWithGestorSchema = createTenantSchema.extend({
  gestor: z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().optional(),
  }),
})

// Atualização parcial (usado no PATCH /super-admin/tenants/:id)
updateTenantSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  planType: z.enum(['BASIC', 'PRO']).optional(),
})

// Paginação (reusado do paginationSchema existente)
paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

---

## 7. Decisões Arquiteturais

### Por que injetar `createTenantSchema` e `createTenantClient` como funções?

O `CreateTenantUseCase` recebe as funções de criação de schema e client como dependências do construtor, não as importa diretamente. Isso:
- Mantém o use case testável (mock das funções)
- Segue o princípio de inversão de dependência
- Permite trocar a estratégia de criação de schema sem alterar o use case

### Por que não usar transaction para o fluxo completo de criação?

O fluxo de criação cruza **dois schemas** (public + tenant) e **dois prisma clients** (global + tenant client). Prisma transactions são limitadas a uma única instância. Se a criação do gestor falhar, o tenant e o schema já foram criados — mas `createTenantSchema` é idempotente, então basta re-executar o endpoint.

### Por que `slug` não é editável no PATCH?

O slug define o schema PostgreSQL (`tenant_{slug}`). Alterar o slug exigiria renomear o schema no PostgreSQL, o que é uma operação perigosa e não suportada pelo Prisma. O slug é imutável após criação.

### Por que ativar/desativar em endpoints separados?

Endpoints explícitos (`/activate`, `/deactivate`) são mais legíveis do que `PATCH { isActive: true/false }`. Evitam confusão sobre a intenção e facilitam logging/audit trail.

---

## 8. Wiring & Dependency Injection

No arquivo `tenant-management.routes.ts`:

```typescript
// Singletons (stateless, schema public)
const tenantRepo = new PrismaTenantRepository(prisma)
const hashService = new HashService()

// Por request (use case com dependências injetadas)
const useCase = new CreateTenantUseCase(
  tenantRepo,        // [1] ITenantRepository
  hashService,       // [2] IHashService
  createTenantSchema, // [3] (slug) => Promise<string>
  createTenantClient, // [4] (schema) => PrismaClient
)
```

---

## 9. Efeito no Tenant Middleware

Após a desativação de um tenant, o `tenantPlugin` em `tenant.middleware.ts` rejeita requests para esse slug:

```typescript
const tenant = await prisma.tenant.findUnique({
  where: { slug, isActive: true }, // ← filtra por isActive
})

if (!tenant) {
  throw new NotFoundError('Clínica não encontrada ou inativa')
}
```

Portanto, desativar um tenant efetivamente bloqueia todo acesso ao painel daquela clínica.

---

## 10. O Que Vem a Seguir

Com autenticação (tenant + super admin) e tenant management implementados, os próximos módulos são CRUD de recursos dentro do tenant:

1. **Professional Management** — CRUD de profissionais vinculados à clínica
2. **Procedure Management** — CRUD de procedimentos
3. **Schedule Management** — Grade de horários dos profissionais
4. **Patient Management** — CRUD de pacientes
5. **Appointment Management** — Agendamento, confirmação, cancelamento
