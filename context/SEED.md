# SEED — Dados de Demonstração (MyAgendix)

> Contexto para IA: este documento descreve a arquitetura do seed de desenvolvimento do MyAgendix, os dados que ele cria, como executá-lo e as decisões técnicas relevantes. Leia antes de modificar qualquer arquivo em `packages/database/src/`.

---

## Visão Geral

O seed cria um ambiente de demonstração completo e auto-suficiente para desenvolvimento local. Ele é **idempotente** — pode ser executado múltiplas vezes sem duplicar dados nem lançar erros.

Arquivo principal: `packages/database/src/seed.ts`
Utilitário de criação de schema: `packages/database/src/create-tenant-schema.ts`

---

## Como Executar

```bash
# Na raiz do monorepo
pnpm db:seed

# Ou diretamente no package
pnpm --filter @myagendix/database db:seed
```

O script `db:seed` é configurado no `turbo.json` com `cache: false` e `dependsOn: ["db:generate"]`, garantindo que o Prisma Client esteja gerado antes de executar.

**Pré-requisitos:**
- `DATABASE_URL` definida no `.env` de `packages/database`
- `prisma generate` já executado (`pnpm db:generate`)
- `prisma migrate deploy` já executado (`pnpm db:migrate`)

---

## Credenciais de Acesso

| Papel       | Email                       | Senha          | Rota de acesso         |
|-------------|-----------------------------|----------------|------------------------|
| Super Admin | admin@myagendix.com         | Admin@123456   | `/super-admin/auth/login` |
| Gestor      | gestor@clinica-demo.com     | Gestor@123456  | `/t/clinica-demo/auth/login` |

> **ATENÇÃO:** Estas credenciais são apenas para desenvolvimento local. Jamais usar em produção.

---

## Dados Criados pelo Seed

### Passo 1 — Super Admin (schema `public`)

Cria um `SuperAdminUser` com senha hasheada via bcrypt (12 rounds):

```
admin@myagendix.com / Admin@123456
```

Usa `upsert` com `where: { email }`, portanto idempotente.

---

### Passo 2 — Tenant Demo (schema `public`)

Cria um `Tenant` no schema público:

| Campo    | Valor                                   |
|----------|-----------------------------------------|
| name     | Clínica Demo                            |
| slug     | clinica-demo                            |
| email    | contato@clinicademo.com                 |
| phone    | +5511999990000                          |
| address  | Rua das Acácias, 123 — São Paulo, SP    |
| planType | BASIC                                   |

---

### Passo 3 — Schema + Tabelas do Tenant

Chama `createTenantSchema('clinica-demo')`, que:

1. Executa `CREATE SCHEMA IF NOT EXISTS "tenant_clinica_demo"` via `$executeRawUnsafe`
2. Executa `prisma db push` apontando `DATABASE_URL` para `?schema=tenant_clinica_demo`

O slug `clinica-demo` é convertido para `tenant_clinica_demo` (hífens → underscores).

---

### Passo 4 — Dados do Tenant (schema `tenant_clinica_demo`)

Todos os dados abaixo são criados via `createTenantClient('tenant_clinica_demo')`.

#### Usuário Gestor
```
gestor@clinica-demo.com / Gestor@123456
role: GESTOR
```

#### Profissional
```
Dra. Ana Lima
Especialidade: Dermatologia
Bio: "Especialista em dermatologia clínica e estética com 10 anos de experiência."
Cor: #6366f1
Vinculado ao userId do Gestor (relação 1:1 User ↔ Professional)
```

#### Procedimentos (4)
| Nome                    | Duração | Cor     |
|-------------------------|---------|---------|
| Consulta Dermatológica  | 30 min  | #3b82f6 |
| Limpeza de Pele         | 60 min  | #10b981 |
| Aplicação de Botox      | 45 min  | #f59e0b |
| Peeling Químico         | 45 min  | #ec4899 |

Todos vinculados à Dra. Ana Lima via `ProfessionalProcedure`.

#### Grade de Horários
```
Segunda a Sexta (dayOfWeek: 1–5)
09h00 às 18h00
Intervalo entre slots: 30 minutos
```

#### Pacientes (3)
| Nome           | Telefone         | Email                      | Source      |
|----------------|------------------|----------------------------|-------------|
| Carlos Mendes  | +5511988881111   | carlos.mendes@email.com    | MANUAL      |
| Fernanda Costa | +5511988882222   | fernanda.costa@email.com   | PUBLIC_PAGE |
| Roberto Alves  | +5511988883333   | (sem email)                | MANUAL      |

---

## Arquitetura: `createTenantSchema`

Arquivo: `packages/database/src/create-tenant-schema.ts`

### Responsabilidades
- Criar o schema PostgreSQL para um novo tenant (`CREATE SCHEMA IF NOT EXISTS`)
- Aplicar todas as tabelas do schema tenant via `prisma db push`
- Ser **idempotente** — seguro chamar múltiplas vezes

### Uso
```typescript
import { createTenantSchema } from '@myagendix/database'

// Desenvolvimento (seed)
await createTenantSchema('clinica-demo')

// Produção (ao criar novo tenant via Super Admin)
await createTenantSchema(tenant.slug)
```

### Variável de Ambiente Opcional
```
PRISMA_BIN=/caminho/customizado/para/prisma
```
Se não definida, usa `node_modules/.bin/prisma` relativo à raiz do package.

### Tratamento de Erros
O `execSync` está envolto em `try/catch`. Em caso de falha, o `stderr` do processo Prisma é capturado e relançado como `Error` legível — evitando que mensagens de erro sejam silenciadas pela flag `stdio: 'pipe'`.

---

## Decisões Técnicas

### Por que `findFirst + create` para Procedures?
O modelo `Procedure` não possui constraint `@@unique` no campo `name` no schema Prisma. Para evitar criar um índice único que poderia conflitar com dados reais em produção (clínicas diferentes poderiam ter procedimentos com o mesmo nome), optou-se pelo padrão `findFirst` (busca por nome) + `create` (cria se não existir) em vez de `upsert`.

### Por que `execSync` e não a Prisma API diretamente?
O Prisma não expõe uma API programática para `db push`. A alternativa seria manter um schema Prisma separado para o tenant e fazer migrate programaticamente, o que adicionaria complexidade desnecessária no MVP. O `execSync` com `stdio: 'pipe'` é a abordagem recomendada pela comunidade Prisma para automação.

### Por que o schema do tenant é isolado no PostgreSQL?
Isolamento por schema (schema-per-tenant) oferece:
- Separação física dos dados entre clínicas
- Possibilidade de backup/restore por tenant
- Row-level security simplificada (por schema, não por `WHERE tenant_id`)
- Sem risco de "data leak" entre tenants por query errada

### Por que bcrypt 12 rounds?
Equilíbrio entre segurança (dificulta brute-force) e performance (≈ 250ms por hash em hardware moderno). Valor padrão da indústria para aplicações de saúde.

---

## Exportações do Package

`packages/database/src/index.ts` exporta:

```typescript
export const prisma           // PrismaClient global (schema public)
export function createTenantClient(schema: string): PrismaClient
export function createTenantSchema(tenantSlug: string): Promise<string>
export { PrismaClient }
export * from '@prisma/client' // todos os tipos gerados pelo Prisma
```

### Estrutura de Arquivos Internos

```
packages/database/src/
├── prisma-client.ts      ← singleton prisma (schema public) — leaf node, sem deps internas
├── index.ts              ← barrel: re-exporta tudo; importa de prisma-client.ts
├── create-tenant-schema.ts ← importa de prisma-client.ts (não de index.ts — evita ciclo)
└── seed.ts               ← importa de index.ts e create-tenant-schema.ts
```

**Por que `prisma-client.ts` separado?**
`index.ts` re-exporta `createTenantSchema`, que por sua vez precisa do singleton `prisma`. Se `create-tenant-schema.ts` importasse de `index.ts`, haveria uma dependência circular (`index → create-tenant-schema → index`) que em ESM causaria TDZ (Temporal Dead Zone). O `prisma-client.ts` é um "leaf node" sem dependências internas, quebrando o ciclo.

---

## O que o Seed NÃO cria (intencional)

- Agendamentos (`Appointment`) — sem dados históricos no demo
- Anamneses (`Anamnesis`) — sem dados clínicos no demo
- Interesses do paciente (`PatientInterest`) — MVP2, não implementado ainda
- Métricas CRM (`PatientCrmMetrics`) — MVP2, não implementado ainda
- Faturamento / pagamentos — fora do escopo atual

---

## Próximos Passos Esperados

Após o seed estar funcionando, o próximo módulo a implementar é:

1. **Super Admin Auth** — `POST /super-admin/auth/login` (sem multi-tenant, schema `public`)
2. **Tenant Management** — `POST /super-admin/tenants` (cria tenant + chama `createTenantSchema`)
