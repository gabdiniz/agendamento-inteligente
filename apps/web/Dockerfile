# ─── Dockerfile — MyAgendix Web ──────────────────────────────────────────────
#
# Build multi-stage: Vite build + nginx para servir arquivos estáticos.
# Contexto de build deve ser a raiz do monorepo:
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_API_URL="" \
#     -t myagendix-web .
#
# VITE_API_URL vazio → axios usa URLs relativas (/t/:slug/...).
# Nginx faz o proxy para a API nas rotas dinâmicas.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build Vite ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN npm install -g pnpm@9.15.0 --quiet

# Manifests do workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/config/eslint/package.json      ./packages/config/eslint/
COPY packages/config/tailwind/package.json    ./packages/config/tailwind/
COPY packages/config/typescript/package.json  ./packages/config/typescript/
COPY packages/shared/package.json             ./packages/shared/
COPY packages/database/package.json           ./packages/database/
COPY apps/web/package.json                    ./apps/web/

RUN pnpm install --frozen-lockfile

# Código-fonte
COPY packages/config/eslint      ./packages/config/eslint
COPY packages/config/tailwind    ./packages/config/tailwind
COPY packages/config/typescript  ./packages/config/typescript
COPY packages/shared             ./packages/shared
COPY apps/web                    ./apps/web

# Build
RUN pnpm --filter @myagendix/web run build

# ── Stage 2: Nginx ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove config default do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Config para SPA (React Router / TanStack Router)
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/app.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
