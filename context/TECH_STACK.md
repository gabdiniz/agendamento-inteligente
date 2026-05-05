# MyAgendix — Documentação de Tecnologias

> Última atualização: Abril de 2026
> Status: Definição inicial — pré-desenvolvimento

---

## 1. Visão Geral da Arquitetura

MyAgendix é um **SaaS Multi-Tenant** de agendamento inteligente para clínicas e negócios baseados em atendimento. Toda decisão arquitetural deve considerar o isolamento entre tenants, escalabilidade horizontal e segurança por design.

```
┌──────────────────────────────────────────────────────────┐
│                    MYAGENDIX SAAS                        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  Web App                        │    │
│  │  (Clínica: Gestor, Profissional, Recepção)       │    │
│  │  (Paciente: Página Pública de Agendamento)       │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│                    ┌─────┘                               │
│                    │  API (Backend)                      │
│                    └─────────────────────┐               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PostgreSQL  │  Redis  │  MinIO  │  BullMQ        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Docker Compose — Linux Server           │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Papéis e plataformas

| Papel         | Plataforma              | Observação                                          |
|---------------|-------------------------|-----------------------------------------------------|
| Paciente      | Web (Página Pública)    | Agendamento via `myagendix.com/{clinica}`, sem app  |
| Gestor        | Web App                 | Painel administrativo da clínica                    |
| Profissional  | Web App (responsivo)    | Acesso via browser, inclusive no celular            |
| Recepção      | Web App                 | Operação diária de agendamentos                     |
| Super Admin   | Web App                 | Gestão da plataforma                                |

> **Nota:** Aplicativo mobile não está no escopo atual. Poderá ser considerado em fase futura.

---

## 2. Estrutura do Monorepo

Toda a base de código reside em um único repositório gerenciado com **Turborepo**.

```
myagendix/
├── apps/
│   ├── api/          # Backend Fastify
│   └── web/          # Web App React + Vite (clínica + página pública)
├── packages/
│   ├── shared/       # Tipos TypeScript, schemas Zod, utilitários
│   ├── database/     # Prisma schema, migrations, client
│   └── config/       # ESLint, TypeScript, Tailwind configs compartilhados
├── docker/
│   ├── docker-compose.yml
│   └── configs/      # nginx.conf, etc.
├── turbo.json
└── package.json
```

**Vantagem central:** os schemas Zod definidos em `packages/shared` são reutilizados tanto na validação do backend quanto nos formulários da web. Um único source of truth para contratos de dados.

---

## 3. Backend (`apps/api`)

### Stack principal

| Tecnologia   | Versão alvo | Papel                                           |
|--------------|-------------|-------------------------------------------------|
| Node.js      | 22 LTS      | Runtime                                         |
| TypeScript   | 5.x         | Linguagem                                       |
| Fastify      | 5.x         | Framework HTTP — alta performance, schema-first  |
| Prisma       | 6.x         | ORM — queries type-safe, migrations automáticas  |
| Zod          | 3.x         | Validação de schemas — compartilhado com frontend|
| Redis        | 7.x         | Cache, sessões, rate limiting, broker de filas  |
| BullMQ       | 5.x         | Filas de jobs assíncronos                       |
| Socket.io    | 4.x         | WebSockets — atualizações em tempo real         |
| JWT          | —           | Autenticação stateless com refresh tokens       |

### Princípios de arquitetura

O backend segue **SOLID** e **Clean Architecture**, organizando o código em camadas bem definidas:

```
apps/api/src/
├── domain/           # Entidades e regras de negócio puras (sem dependências externas)
├── application/      # Use Cases — orquestram as entidades e repositórios
├── infrastructure/   # Implementações concretas: Prisma, Redis, BullMQ, APIs externas
└── presentation/     # Controllers Fastify, rotas, schemas de request/response
```

- **Single Responsibility:** cada use case é uma classe com uma única responsabilidade.
- **Dependency Inversion:** use cases dependem de interfaces (repositórios abstratos), não de implementações concretas.
- **Repository Pattern:** toda interação com o banco passa por repositórios, nunca diretamente nos controllers.

### Multi-Tenancy — Estratégia de isolamento

**Abordagem: Schema-per-Tenant no PostgreSQL**

Cada cliente (tenant) possui seu próprio schema dentro do mesmo banco de dados PostgreSQL. O schema público (`public`) contém apenas as tabelas globais da plataforma (tenants, planos, billing).

```
PostgreSQL
├── schema: public        → tenants, plans, subscriptions, billing
├── schema: clinica_abc   → appointments, patients, professionals, ...
├── schema: clinica_xyz   → appointments, patients, professionals, ...
└── schema: ...
```

O `tenant_id` é resolvido no início de cada request (via path ou JWT) e o Prisma client é instanciado com o schema correto para aquela requisição.

### Filas assíncronas (BullMQ)

| Fila                   | Responsabilidade                                              |
|------------------------|---------------------------------------------------------------|
| `notifications`        | Envio de WhatsApp, SMS e email                                |
| `ai-assistant`         | Chamadas à API do Gemini (MVP2)                               |
| `scheduler`            | Lembretes automáticos de consulta, sugestões de retorno       |
| `waitlist`             | Processamento de vagas liberadas e notificação da fila espera |
| `campaigns`            | Disparo de campanhas e promoções da clínica (MVP2)            |

---

## 4. Web App (`apps/web`)

Única interface web do produto. Serve dois contextos distintos dentro da mesma aplicação:

- **Painel da Clínica** — Gestor, Profissional, Recepção (autenticado)
- **Página Pública de Agendamento** — Paciente (`/[slug]`, sem autenticação)

### Stack principal

| Tecnologia         | Papel                                                     |
|--------------------|-----------------------------------------------------------|
| React 19           | UI framework                                              |
| Vite 6             | Build tool e dev server                                   |
| TypeScript 5.x     | Linguagem                                                 |
| TanStack Router    | Roteamento type-safe, com suporte a nested layouts        |
| TanStack Query     | Server state — fetch, cache, sync, invalidação            |
| React Hook Form    | Gerenciamento de formulários                              |
| Zod                | Validação (compartilhado via `packages/shared`)           |
| Tailwind CSS 4.x   | Estilização utility-first                                 |
| Shadcn/ui          | Componentes headless — customizáveis por tenant           |
| Zustand            | Estado global leve (session, tenant ativo, preferências)  |
| Socket.io Client   | WebSockets — atualizações em tempo real                   |
| Axios              | HTTP client com interceptors para auth e multi-tenancy    |
| FullCalendar       | Componente de agenda (views diária, semanal, drag & drop) |

### Observações relevantes

- A **Página Pública** (`/[slug]`) é acessível sem autenticação e renderiza os procedimentos, profissionais e horários disponíveis do tenant identificado pelo slug.
- O **tema visual por tenant** (logo, cores) é configurável via tokens de design no Tailwind.
- O design é **responsivo** — profissionais podem acessar a agenda pelo celular via browser sem necessidade de app nativo.

---

## 5. Banco de Dados

### PostgreSQL 16

| Aspecto              | Decisão                                                      |
|----------------------|--------------------------------------------------------------|
| Estratégia           | Schema-per-tenant                                            |
| ORM                  | Prisma (schema e migrations centralizados em `packages/database`) |
| Migrations           | Prisma Migrate — versionadas e reproduzíveis                |
| Backups              | Volume Docker + script de dump agendado via cron            |
| Extensões            | `uuid-ossp` (UUIDs), `pg_trgm` (busca textual por paciente) |

### Redis 7

| Uso                  | Detalhes                                                     |
|----------------------|--------------------------------------------------------------|
| Cache               | Respostas de queries frequentes (agenda do dia, configs de tenant) |
| Sessões / Auth       | Refresh tokens, blacklist de tokens revogados                |
| Rate limiting        | Por tenant e por IP                                          |
| Broker BullMQ        | Fila de jobs assíncronos                                     |
| Pub/Sub              | Eventos internos entre serviços                              |

---

## 6. Infraestrutura

### Ambiente

Toda a stack roda em **Docker Compose** numa única máquina Linux já disponível.

### Containers previstos

| Container        | Imagem base              | Responsabilidade                                |
|------------------|--------------------------|-------------------------------------------------|
| `nginx`          | nginx:alpine             | Reverse proxy, SSL termination, roteamento      |
| `api`            | node:22-alpine           | Backend Fastify                                 |
| `web`            | nginx:alpine             | Servir o build estático da web app              |
| `postgres`       | postgres:16-alpine       | Banco de dados principal                        |
| `redis`          | redis:7-alpine           | Cache e broker de filas                         |
| `minio`          | minio/minio              | Armazenamento de arquivos (S3-compatible)       |
| `worker`         | node:22-alpine           | Processador de filas BullMQ (processo separado) |

### Rede e SSL

- **Nginx** como reverse proxy único — todo tráfego externo passa por ele.
- **Let's Encrypt + Certbot** para certificados SSL automáticos e gratuitos.
- Containers internos se comunicam via rede Docker privada.

### Armazenamento de arquivos (MinIO)

MinIO roda como container Docker com API 100% compatível com S3. Uso previsto:

- Logos e assets de clínicas (tenants)
- Imagens de procedimentos
- Assets do assistente IA por clínica (MVP2)

A compatibilidade S3 garante migração transparente para AWS S3 ou Cloudflare R2 sem alteração de código.

---

## 7. Integrações Externas

| Serviço                         | Finalidade                                            | MVP  |
|---------------------------------|-------------------------------------------------------|------|
| **Z-API**                       | Envio de mensagens WhatsApp (lembretes, convites)     | MVP1 |
| **Twilio**                      | SMS como canal de fallback                            | MVP1 |
| **Resend**                      | Emails transacionais (confirmações, onboarding)       | MVP1 |
| **Google Gemini API**           | Assistente IA por tenant (chat, sugestões, retenção)  | MVP2 |
| **Stripe / Pagar.me / Asaas**   | Billing — planos e assinaturas recorrentes            | MVP2 |

---

## 8. CI/CD — Planejado para o futuro

Não será implementado na fase inicial. Quando for adotado, a recomendação é:

- **GitHub Actions** como plataforma de CI/CD
- **Pipeline por app** com Turborepo detectando apenas o que mudou
- Stages previstos: lint → type-check → testes → build → deploy

---

## 9. Resumo executivo do stack

```
BACKEND        Node.js 22 + TypeScript + Fastify + Prisma + Zod
               Redis + BullMQ + Socket.io + JWT

WEB APP        React 19 + Vite + TanStack Router/Query
               Tailwind CSS + Shadcn/ui + Zustand + FullCalendar

BANCO          PostgreSQL 16 (schema-per-tenant) + Redis 7

FILES          MinIO (S3-compatible, self-hosted)

INFRA          Docker Compose + Nginx + Let's Encrypt — Linux Server

MONOREPO       Turborepo

EXTERNAL       Z-API + Twilio + Resend
               Gemini API + Billing/Stripe (MVP2)

ARQUITETURA    SOLID + Clean Architecture + Repository Pattern

MOBILE         Não previsto no escopo atual (possível fase futura)
```
