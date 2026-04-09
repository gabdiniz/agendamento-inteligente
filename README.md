# MyAgendix

SaaS multi-tenant de agendamento para clínicas de saúde.

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/installation) v9+ — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (com o aplicativo aberto e rodando)

---

## Primeira execução

Siga os passos abaixo **na ordem**. Você só precisa fazer isso uma vez.

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

Copie os arquivos de exemplo:

```bash
# Windows (PowerShell)
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

```bash
# Linux / macOS
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Crie também o `.env` do pacote de banco:

```bash
# Windows (PowerShell)
Copy-Item apps/api/.env.example packages/database/.env
```

```bash
# Linux / macOS
cp apps/api/.env.example packages/database/.env
```

> **Atenção:** Se você já tiver um PostgreSQL instalado localmente (comum no Windows), a porta 5432 pode estar em conflito. Nesse caso, altere a porta do container no `docker/docker-compose.dev.yml` de `5432` para `5433` e atualize os três `.env` de `5432` para `5433` na variável `DATABASE_URL`.

### 3. Subir a infraestrutura (Postgres + Redis)

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

Aguarde alguns segundos até os containers ficarem saudáveis.

### 4. Gerar o Prisma Client

```bash
pnpm --filter @myagendix/database db:generate
```

### 5. Criar as tabelas no banco (primeira vez)

```bash
pnpm --filter @myagendix/database db:migrate:dev --name init
```

> Nas próximas vezes que houver mudanças no schema, use `db:migrate:dev --name <descricao>` para criar novas migrations.

### 6. Popular o banco com dados iniciais (seed)

```bash
pnpm --filter @myagendix/database db:seed
```

Isso cria o usuário **Super Admin** padrão:

| Campo | Valor |
|-------|-------|
| E-mail | `admin@myagendix.com` |
| Senha | `change-me-in-production` |

### 7. Iniciar a aplicação

```bash
pnpm dev
```

Isso sobe a API e o Web em paralelo via Turborepo.

| Serviço | URL |
|---------|-----|
| Web (React) | http://localhost:5173 |
| API (Fastify) | http://localhost:3333 |
| Super Admin | http://localhost:5173/super-admin/login |

---

## Uso diário

Na próxima vez que for desenvolver, basta:

```bash
# 1. Subir a infra (se não estiver rodando)
docker compose -f docker/docker-compose.dev.yml up -d

# 2. Iniciar a aplicação
pnpm dev
```

---

## Comandos úteis

### Banco de dados

```bash
# Criar nova migration após alterar o schema Prisma
pnpm --filter @myagendix/database db:migrate:dev --name nome-da-alteracao

# Aplicar migrations existentes (CI/produção)
pnpm --filter @myagendix/database db:migrate

# Abrir o Prisma Studio (interface visual do banco)
pnpm db:studio

# Regenerar o Prisma Client
pnpm --filter @myagendix/database db:generate
```

### Docker

```bash
# Subir a infra
docker compose -f docker/docker-compose.dev.yml up -d

# Derrubar a infra
docker compose -f docker/docker-compose.dev.yml down

# Derrubar e apagar todos os dados (reset completo)
docker compose -f docker/docker-compose.dev.yml down -v
```

### Desenvolvimento

```bash
# Iniciar tudo (API + Web)
pnpm dev

# Checar tipos TypeScript em todos os pacotes
pnpm type-check

# Lint em todos os pacotes
pnpm lint

# Build de produção
pnpm build
```

---

## Estrutura do projeto

```
MyClinix/
├── apps/
│   ├── api/          # Backend — Fastify + Prisma (Clean Architecture)
│   └── web/          # Frontend — React + Vite + TanStack Router
├── packages/
│   ├── database/     # Schema Prisma, migrations e seed
│   ├── shared/       # Tipos e utilitários compartilhados
│   └── config/       # Configurações TypeScript e ESLint
└── docker/
    ├── docker-compose.dev.yml   # Infra local (Postgres + Redis)
    └── docker-compose.yml       # Produção completa
```

---

## Solução de problemas

**`turbo` não reconhecido após `pnpm install`**
> Execute o terminal como Administrador (Windows) ou use `sudo` (Linux/macOS). Um erro de permissão silencioso impede a instalação do Turbo.

**Erro de autenticação no banco (`P1000`)**
> Verifique se há outro PostgreSQL rodando na mesma porta. Siga a instrução da seção "Atenção" no Passo 3 para trocar para a porta 5433.

**`@prisma/client did not initialize yet`**
> Rode `pnpm --filter @myagendix/database db:generate` antes do seed.

**`No migration found in prisma/migrations`**
> Use `db:migrate:dev --name init` na primeira vez em vez de `db:migrate`.
