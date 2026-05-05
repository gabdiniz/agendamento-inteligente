# ─── Dockerfile — MyAgendix API ──────────────────────────────────────────────
#
# Build multi-stage para monorepo pnpm + Turborepo.
# Contexto de build deve ser a raiz do monorepo (../../):
#   docker build -f apps/api/Dockerfile -t myagendix-api .
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Instalar dependências ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@9.15.0 --quiet

# Copiar manifests do workspace para cache de layers
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/config/eslint/package.json      ./packages/config/eslint/
COPY packages/config/tailwind/package.json    ./packages/config/tailwind/
COPY packages/config/typescript/package.json  ./packages/config/typescript/
COPY packages/shared/package.json             ./packages/shared/
COPY packages/database/package.json           ./packages/database/
COPY apps/api/package.json                    ./apps/api/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copiar código-fonte
COPY packages/config/eslint      ./packages/config/eslint
COPY packages/config/tailwind    ./packages/config/tailwind
COPY packages/config/typescript  ./packages/config/typescript
COPY packages/shared             ./packages/shared
COPY packages/database           ./packages/database
COPY apps/api                    ./apps/api

# Gerar Prisma client
RUN pnpm --filter @myagendix/database exec prisma generate

# Compilar pacotes internos na ordem correta (shared → database → api)
RUN pnpm --filter @myagendix/shared build
RUN pnpm --filter @myagendix/database build
RUN pnpm --filter @myagendix/api run build

# ── Stage 3: Runtime mínimo ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# pnpm (workspace) + prisma CLI (migrations no runtime)
# Versão pinada em 6 para coincidir com @prisma/client@^6 do projeto
RUN npm install -g pnpm@9.15.0 prisma@6 --quiet

# Copiar setup do workspace
COPY --from=builder /app/package.json          ./
COPY --from=builder /app/pnpm-workspace.yaml   ./
COPY --from=builder /app/node_modules          ./node_modules

# Copiar node_modules da API (pnpm não faz hoist por padrão —
# fastify e demais deps ficam em apps/api/node_modules, não na raiz)
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copiar pacotes compilados
COPY --from=builder /app/packages              ./packages

# Copiar API compilada
COPY --from=builder /app/apps/api/dist         ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Prisma schema (necessário para migrations)
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

EXPOSE 3333

# Roda migrations e inicia a API
CMD ["sh", "-c", "node apps/api/dist/main.js"]
