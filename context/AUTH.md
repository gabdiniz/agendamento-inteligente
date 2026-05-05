# MyAgendix — Autenticação

> Última atualização: Abril de 2026

---

## 1. Visão Geral

O sistema de autenticação do MyAgendix é **multi-tenant** e **stateless** (via JWT), com refresh tokens armazenados no banco para controle de sessão e revogação.

Existem dois escopos de autenticação:

| Escopo        | Prefixo               | Schema DB         | Contexto                             |
|---------------|-----------------------|-------------------|--------------------------------------|
| Tenant        | `/t/:slug/auth/`      | `tenant_{slug}`   | Usuários da clínica (Gestor, Profissional, Recepção) |
| Super Admin   | `/super-admin/auth/`  | `public`          | Administradores da plataforma        |

> Ambos os escopos estão implementados.

---

## 2. Fluxo de Autenticação

### 2.1 Login

```
POST /t/:slug/auth/login
Body: { email, password }

1. TenantPlugin resolve o tenant via :slug
2. LoginUseCase:
   a. Busca user por email no schema do tenant
   b. Valida isActive e compara senha (bcrypt)
   c. Gera JWT (15 min) + refresh token (random hex 64 bytes)
   d. Armazena hash SHA-256 do refresh token no banco
3. Retorna: { accessToken, refreshToken, user: { id, name, email, roles } }
```

### 2.2 Renovação de Token (Token Rotation)

```
POST /t/:slug/auth/refresh
Body: { refreshToken }

1. Hash SHA-256 do token recebido
2. Busca no banco pelo hash
3. Validações: token não revogado + não expirado + usuário ativo
4. Revoga o token antigo (rotation — cada token é de uso único)
5. Gera novo par (access + refresh)
6. Retorna: { accessToken, refreshToken }

DETECÇÃO DE ROUBO: se o token já está revogado e alguém tenta reutilizá-lo,
TODAS as sessões do usuário são revogadas imediatamente.
```

### 2.3 Logout

```
POST /t/:slug/auth/logout
Headers: Authorization: Bearer <accessToken>
Body: { refreshToken }

1. requireAuth verifica e decodifica o JWT
2. Revoga o refresh token no banco
3. Operação idempotente (não lança erro se token não existir)
```

### 2.4 Dados do Usuário Logado

```
GET /t/:slug/auth/me
Headers: Authorization: Bearer <accessToken>

Retorna: { id, name, email, phone, avatarUrl, roles[] }
```

### 2.5 Super Admin Login

```
POST /super-admin/auth/login
Body: { email, password }

1. SuperAdminLoginUseCase:
   a. Busca super admin por email no schema `public`
   b. Valida isActive e compara senha (bcrypt)
   c. Gera JWT com scope 'super-admin' (15 min) + refresh token (random hex)
   d. Armazena hash SHA-256 do refresh token na tabela super_admin_refresh_tokens
2. Retorna: { accessToken, refreshToken, user: { id, name, email } }
```

### 2.6 Super Admin Refresh / Logout

Mesma lógica dos endpoints de tenant (token rotation, detecção de roubo, logout idempotente), mas operando na tabela `super_admin_refresh_tokens` do schema `public`.

### 2.7 Super Admin — Dados do Admin Logado

```
GET /super-admin/auth/me
Headers: Authorization: Bearer <accessToken>

Retorna: { id, name, email, scope: 'super-admin' }
```

---

## 3. Estrutura de Arquivos

```
apps/api/src/
├── domain/
│   ├── repositories/
│   │   ├── user.repository.ts                      IUserRepository (tenant)
│   │   ├── refresh-token.repository.ts             IRefreshTokenRepository (tenant)
│   │   ├── super-admin.repository.ts               ISuperAdminRepository
│   │   └── super-admin-refresh-token.repository.ts ISuperAdminRefreshTokenRepository
│   └── services/
│       ├── hash.service.ts                         IHashService
│       └── token.service.ts                        ITokenService (tenant + super admin)
│
├── application/use-cases/
│   ├── auth/                               ← Tenant auth
│   │   ├── login.use-case.ts
│   │   ├── refresh-token.use-case.ts
│   │   └── logout.use-case.ts
│   └── super-admin-auth/                   ← Super Admin auth
│       ├── login.use-case.ts
│       ├── refresh-token.use-case.ts
│       └── logout.use-case.ts
│
└── infrastructure/
    ├── database/repositories/
    │   ├── prisma-user.repository.ts                       (tenant)
    │   ├── prisma-refresh-token.repository.ts              (tenant)
    │   ├── prisma-super-admin.repository.ts                (public)
    │   └── prisma-super-admin-refresh-token.repository.ts  (public)
    ├── services/
    │   ├── hash.service.ts                 bcrypt + SHA-256
    │   └── token.service.ts                JWT (tenant + super admin) + randomBytes
    └── http/
        ├── app.ts                          Estrutura de rotas encapsulada
        ├── middlewares/
        │   ├── tenant.middleware.ts         Resolve tenant do :slug
        │   ├── auth.middleware.ts           requireAuth + requireRoles (tenant)
        │   └── super-admin-auth.middleware.ts  requireSuperAdmin
        └── routes/
            ├── auth.routes.ts              /t/:slug/auth/*
            └── super-admin-auth.routes.ts  /super-admin/auth/*
```

---

## 4. JWT — Payload

### Tenant Token

```typescript
{
  sub: string          // userId (UUID)
  tenantId: string     // UUID do tenant
  tenantSlug: string   // slug original com hífens (ex: "clinica-abc")
  roles: string[]      // ["GESTOR", "PROFISSIONAL", ...]
  iat: number          // issued at (gerado pelo jsonwebtoken)
  exp: number          // expiration
}
```

### Super Admin Token

```typescript
{
  sub: string          // superAdminUserId (UUID)
  scope: 'super-admin' // distingue de tokens de tenant
  iat: number
  exp: number
}
```

O campo `scope: 'super-admin'` garante que um token de tenant nunca seja aceito como Super Admin e vice-versa.

**Variáveis de ambiente:**

| Variável                  | Padrão | Descrição                              |
|---------------------------|--------|----------------------------------------|
| `JWT_SECRET`              | —      | Chave de assinatura do access token    |
| `JWT_EXPIRES_IN`          | `15m`  | Duração do access token                |
| `JWT_REFRESH_SECRET`      | —      | Não utilizado (refresh é hash no DB)   |
| `JWT_REFRESH_EXPIRES_IN`  | `7d`   | Duração do refresh token               |

> O refresh token NÃO é um JWT — é um `randomBytes(64).toString('hex')` armazenado como SHA-256 no banco.

---

## 5. Segurança

### Refresh Token

- **Armazenamento:** apenas o hash SHA-256 é salvo no banco. O token em texto plano nunca persiste.
- **Unicidade:** campo `tokenHash` tem constraint `@unique` na tabela `refresh_tokens`.
- **Rotation:** cada uso gera um novo par e revoga o token usado.
- **Detecção de roubo:** tentativa de reusar um token já revogado → revogação de TODAS as sessões do usuário.
- **Expiração:** configurável via `JWT_REFRESH_EXPIRES_IN`. A duração é lida pelo `TokenService` e propagada para os use cases via `refreshExpiresInMs`.

### Tenant Isolation

- O access token carrega `tenantId`. O `requireAuth` verifica que o `tenantId` do token coincide com o tenant resolvido na URL.
- Um token de tenant A não funciona em rotas de tenant B.

### Encapsulamento de Rotas

- O `tenantPlugin` (que resolve o tenant e cria o `tenantPrisma`) roda APENAS dentro do scope `/t/:slug/`.
- Rotas de `/health` e `/super-admin/` nunca passam pelo tenant plugin.
- `tenantPlugin` não usa `fastify-plugin` (`fp()`) — permanece encapsulado no scope.

---

## 6. Proteção de Rotas

### Tenant — `requireAuth` e `requireRoles`

```typescript
// Apenas autenticado (tenant)
app.get('/profile', { preHandler: [requireAuth] }, handler)

// Autenticado + role específica
app.post('/professionals', {
  preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')]
}, handler)
```

O `requireAuth` popula `request.currentUser: JwtPayload` com os dados do token decodificado.

### Super Admin — `requireSuperAdmin`

```typescript
// Apenas super admin autenticado
app.get('/tenants', { preHandler: [requireSuperAdmin] }, handler)
```

O `requireSuperAdmin` popula `request.currentSuperAdmin: SuperAdminJwtPayload`. Verifica que o token tem `scope === 'super-admin'` — rejeita tokens de tenant.

---

## 7. Estrutura de Rotas da API

```
GET  /health                          → sem tenant, sem auth
GET  /super-admin/health              → sem auth

── Tenant Auth ──
POST /t/:slug/auth/login              → sem auth (pré-autenticação)
POST /t/:slug/auth/refresh            → sem auth (renovação)
POST /t/:slug/auth/logout             → requireAuth
GET  /t/:slug/auth/me                 → requireAuth

── Super Admin Auth ──
POST /super-admin/auth/login          → sem auth (pré-autenticação)
POST /super-admin/auth/refresh        → sem auth (renovação)
POST /super-admin/auth/logout         → requireSuperAdmin
GET  /super-admin/auth/me             → requireSuperAdmin
```

---

## 8. Banco de Dados — Tabelas Relevantes

### Tenant Schema

**`users`** — Acesso ao painel da clínica. Campos relevantes para auth: `email`, `password_hash`, `is_active`.

**`user_roles`** — PK composta `(user_id, role)`. Um usuário pode ter múltiplos roles.

**`refresh_tokens`** — SHA-256 do token (UNIQUE), expires_at, revoked_at.

### Public Schema

**`super_admin_users`** — Administradores da plataforma. Campos: `email` (UNIQUE), `password_hash`, `is_active`. Sem roles (modelo plano).

**`super_admin_refresh_tokens`** — Mesma estrutura da `refresh_tokens` de tenant: SHA-256 do token (UNIQUE), expires_at, revoked_at. FK para `super_admin_users`.

---

## 9. Dependências

| Pacote           | Uso                                           |
|------------------|-----------------------------------------------|
| `jsonwebtoken`   | Assinar e verificar access tokens             |
| `bcryptjs`       | Hash de senhas (12 rounds)                    |
| `node:crypto`    | SHA-256 para refresh tokens + randomBytes     |

> `@fastify/jwt` permanece no `package.json` mas não é utilizado. Pode ser removido com `pnpm remove @fastify/jwt --filter @myagendix/api` na máquina local.

---

## 10. O Que Ainda Não Foi Implementado

- ~~**Super Admin Auth**~~ ✓ Implementado
- ~~**Seed de dados**~~ ✓ Implementado (ver SEED.md)
- ~~**Tenant Management**~~ ✓ Implementado (ver TENANT_MANAGEMENT.md)
- **Invalidação de token no onError** — se o handler lançar erro após criar o tenantPrisma, o `onResponse` cuida do disconnect (testado via hook)
- **Rate limiting por rota** — o rate limit global (100 req/min) é aplicado a todas as rotas. Rate limit específico para `/login` pode ser adicionado para mitigar brute force
