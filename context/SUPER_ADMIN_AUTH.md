# MyAgendix — Super Admin Auth

> Contexto para IA: este documento detalha o módulo de autenticação do Super Admin, implementado após o tenant auth. Leia antes de modificar qualquer arquivo com prefixo `super-admin` em `apps/api/src/`.
>
> Última atualização: Abril de 2026

---

## 1. Visão Geral

O Super Admin opera **exclusivamente no schema `public`** do PostgreSQL. Não há conceito de tenant, slug ou `tenantPrisma` nesse escopo. É o administrador da plataforma que cria e gerencia clínicas.

| Aspecto | Tenant Auth | Super Admin Auth |
|---------|-------------|-----------------|
| Prefixo de rota | `/t/:slug/auth/` | `/super-admin/auth/` |
| Schema de dados | `tenant_{slug}` | `public` |
| Tabela de usuários | `users` | `super_admin_users` |
| Roles | `GESTOR`, `PROFISSIONAL`, `RECEPCAO` | Não existe (modelo plano) |
| Refresh tokens | `refresh_tokens` (tenant schema) | `super_admin_refresh_tokens` (public) |
| JWT scope | nenhum campo `scope` | `scope: 'super-admin'` |
| Middleware de auth | `requireAuth` | `requireSuperAdmin` |

---

## 2. Rotas Implementadas

```
POST /super-admin/auth/login     → sem auth
POST /super-admin/auth/refresh   → sem auth
POST /super-admin/auth/logout    → requireSuperAdmin (Bearer token)
GET  /super-admin/auth/me        → requireSuperAdmin (Bearer token)
```

### Exemplos de Request/Response

**POST /super-admin/auth/login**
```json
// Request
{ "email": "admin@myagendix.com", "password": "Admin@123456" }

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "a1b2c3...",
    "user": { "id": "uuid", "name": "Admin", "email": "admin@myagendix.com" }
  }
}
```

**GET /super-admin/auth/me**
```json
// Response 200
{
  "success": true,
  "data": { "id": "uuid", "name": "Admin", "email": "admin@myagendix.com", "scope": "super-admin" }
}
```

---

## 3. JWT Payload do Super Admin

```typescript
{
  sub: string          // superAdminUserId (UUID)
  scope: 'super-admin' // campo que distingue este token de tokens de tenant
  iat: number
  exp: number
}
```

O campo `scope: 'super-admin'` é verificado explicitamente em `verifySuperAdminAccessToken`. Um token de tenant **nunca** passa nessa verificação — e vice-versa.

---

## 4. Fluxos

### 4.1 Login

```
POST /super-admin/auth/login
Body: { email, password }

SuperAdminLoginUseCase:
  1. findByEmail no schema public
  2. verifica isActive
  3. bcrypt.compare(password, passwordHash)
  4. generateSuperAdminTokenPair({ sub: admin.id, scope: 'super-admin' })
  5. hashToken(refreshToken) → armazena em super_admin_refresh_tokens
  6. retorna { accessToken, refreshToken, user }
```

### 4.2 Refresh (Token Rotation)

```
POST /super-admin/auth/refresh
Body: { refreshToken }

SuperAdminRefreshTokenUseCase:
  1. hashToken(refreshToken) → findByTokenHash
  2. se revokedAt preenchido → revokeAllByUserId + throw (detecção de roubo)
  3. se expiresAt < now() → throw
  4. findById(userId) → verifica isActive
  5. revoke(token.id) — rotation: token de uso único
  6. gera novo par
  7. armazena novo hash
  8. retorna { accessToken, refreshToken }
```

### 4.3 Logout

```
POST /super-admin/auth/logout
Headers: Authorization: Bearer <accessToken>
Body: { refreshToken }

SuperAdminLogoutUseCase:
  1. hashToken(refreshToken) → findByTokenHash
  2. se encontrado e não revogado → revoke(id)
  3. operação idempotente (sem erro se não encontrar)
```

---

## 5. Estrutura de Arquivos

```
apps/api/src/
│
├── domain/
│   ├── repositories/
│   │   ├── super-admin.repository.ts
│   │   │   └── ISuperAdminRepository { findByEmail, findById }
│   │   │       SuperAdminUser { id, name, email, passwordHash, isActive, ... }
│   │   └── super-admin-refresh-token.repository.ts
│   │       └── ISuperAdminRefreshTokenRepository { create, findByTokenHash, revoke, revokeAllByUserId }
│   │           StoredSuperAdminRefreshToken { id, userId, tokenHash, expiresAt, revokedAt, createdAt }
│   └── services/
│       └── token.service.ts  (compartilhado com tenant)
│           ├── SuperAdminJwtPayload { sub, scope: 'super-admin' }
│           ├── ITokenService.generateSuperAdminTokenPair(payload)
│           └── ITokenService.verifySuperAdminAccessToken(token)
│
├── application/use-cases/super-admin-auth/
│   ├── login.use-case.ts          SuperAdminLoginUseCase
│   ├── refresh-token.use-case.ts  SuperAdminRefreshTokenUseCase
│   └── logout.use-case.ts         SuperAdminLogoutUseCase
│
└── infrastructure/
    ├── database/repositories/
    │   ├── prisma-super-admin.repository.ts
    │   │   └── PrismaSuperAdminRepository (usa prisma global — schema public)
    │   └── prisma-super-admin-refresh-token.repository.ts
    │       └── PrismaSuperAdminRefreshTokenRepository (usa prisma global — schema public)
    ├── services/
    │   └── token.service.ts  (TokenService estendido — suporta tenant + super admin)
    └── http/
        ├── middlewares/
        │   └── super-admin-auth.middleware.ts
        │       └── requireSuperAdmin (preHandler)
        │           → verifySuperAdminAccessToken → injeta request.currentSuperAdmin
        └── routes/
            └── super-admin-auth.routes.ts
                └── registrado em app.ts: adminScope.register(superAdminAuthRoutes, { prefix: '/auth' })
```

---

## 6. Banco de Dados — Tabelas

### `super_admin_users` (schema public)

| Campo         | Tipo         | Destrições       |
|---------------|--------------|------------------|
| id            | UUID         | PK               |
| name          | VARCHAR(255) | NOT NULL         |
| email         | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL         |
| is_active     | BOOLEAN      | DEFAULT true     |
| created_at    | TIMESTAMPTZ  |                  |
| updated_at    | TIMESTAMPTZ  |                  |

### `super_admin_refresh_tokens` (schema public)

| Campo      | Tipo         | Restrições       | Detalhe                                   |
|------------|--------------|------------------|-------------------------------------------|
| id         | UUID         | PK               |                                           |
| user_id    | UUID         | FK → super_admin_users (CASCADE) | NOT NULL             |
| token_hash | VARCHAR(255) | **UNIQUE**, NOT NULL | SHA-256 do refresh token            |
| expires_at | TIMESTAMPTZ  | NOT NULL         | `Date.now() + refreshExpiresInMs`         |
| revoked_at | TIMESTAMPTZ  | nullable         | Preenchido ao revogar                     |
| created_at | TIMESTAMPTZ  | DEFAULT now()    |                                           |

Índices: `@@unique([tokenHash])` — necessário para `findUnique`; `@@index([userId])` — necessário para `revokeAllByUserId`.

---

## 7. Segurança

### Isolamento de escopo de token

`verifySuperAdminAccessToken` em `infrastructure/services/token.service.ts`:

```typescript
if (decoded['scope'] !== 'super-admin') {
  throw new UnauthorizedError('Token não é de super admin')
}
```

Tokens de tenant carregam `tenantId`, `tenantSlug`, `roles` — **nunca** o campo `scope`. A verificação é bidirecional:

- Token de tenant → rejeita em `requireSuperAdmin` (sem campo `scope`)
- Token de super admin → rejeita em `requireAuth` de tenant (sem campo `tenantId`)

### Detecção de roubo de refresh token

Se um token **já revogado** for usado em `/refresh`:

```
revokedAt != null → revokeAllByUserId(userId) → throw UnauthorizedError
```

Todas as sessões ativas do admin são encerradas imediatamente.

### Padrão de armazenamento

Idêntico ao tenant auth: o refresh token em texto plano **nunca persiste**. Apenas o SHA-256 é armazenado. O texto plano é enviado ao client e descartado do servidor.

---

## 8. Extensão do `ITokenService`

O `TokenService` é compartilhado entre tenant e super admin. Os métodos de super admin foram **adicionados** ao serviço existente — sem duplicação de configuração (mesmos `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`):

```typescript
// domain/services/token.service.ts
interface ITokenService {
  // tenant
  generateTokenPair(payload: JwtPayload): TokenPair
  verifyAccessToken(token: string): JwtPayload
  // super admin
  generateSuperAdminTokenPair(payload: SuperAdminJwtPayload): TokenPair
  verifySuperAdminAccessToken(token: string): SuperAdminJwtPayload
  // compartilhado
  generateRefreshToken(): string
  readonly refreshExpiresInMs: number
}
```

---

## 9. Padrão de Wiring (Dependency Injection Manual)

Os repositórios são **singletons de módulo** (criados uma vez ao carregar o arquivo de rotas):

```typescript
// super-admin-auth.routes.ts
const superAdminRepo = new PrismaSuperAdminRepository(prisma)     // singleton
const refreshTokenRepo = new PrismaSuperAdminRefreshTokenRepository(prisma)  // singleton
const hashService = new HashService()   // singleton
const tokenService = new TokenService() // singleton
```

Os use cases são criados **por request** dentro dos handlers (mesmo padrão do tenant auth).

---

## 10. Ordem de Construtores (padronizada)

Para evitar bugs ao copiar entre tenant e super admin:

| Use Case | Parâmetro 1 | Parâmetro 2 | Parâmetro 3 | Parâmetro 4 |
|----------|-------------|-------------|-------------|-------------|
| Login | userRepo / superAdminRepo | refreshTokenRepo | hashService | tokenService |
| Refresh | userRepo / superAdminRepo | refreshTokenRepo | hashService | tokenService |
| Logout | refreshTokenRepo | hashService | — | — |

---

## 11. Ação Necessária — Migração de Schema

A tabela `super_admin_refresh_tokens` foi adicionada ao `schema.prisma` mas ainda **não existe no banco de dados**. Antes de usar o módulo, execute na máquina local:

```bash
pnpm db:migrate      # produção: cria e aplica migration
# ou:
pnpm db:push         # dev: aplica schema sem criar migration
```

O seed (`pnpm db:seed`) já cria o usuário `admin@myagendix.com`, mas a tabela de refresh tokens precisa existir antes do primeiro login.

---

## 12. O Que Vem a Seguir

- **Tenant Management** — `POST /super-admin/tenants` (cria tenant + chama `createTenantSchema`)
  - Usar `requireSuperAdmin` como preHandler
  - Importar `createTenantSchema` de `@myagendix/database`
  - Retornar o tenant criado + credenciais iniciais do gestor
