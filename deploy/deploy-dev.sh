#!/usr/bin/env bash
# ─── Deploy MyAgendix DEV ─────────────────────────────────────────────────────
#
# Roda DA MÁQUINA DO GABRIEL (não no servidor).
# Faz o build das imagens Docker localmente e envia para o servidor.
#
# Pré-requisitos na máquina do Gabriel:
#   - Docker Desktop rodando
#   - SSH key em ~/.ssh/gabriel (ou ajuste SSH_KEY abaixo)
#   - pnpm instalado (apenas para validação local)
#
# Uso:
#   bash deploy/deploy-dev.sh
#   bash deploy/deploy-dev.sh --skip-build   # pula build, só envia imagens
# ─────────────────────────────────────────────────────────────────────────────
set -e  # Para na primeira falha

# ── Configurações ─────────────────────────────────────────────────────────────
SSH_KEY="${HOME}/.ssh/gabriel"
REMOTE_USER="newronix"
REMOTE_HOST="192.168.15.232"
REMOTE_DIR="/opt/apps/myagendix/dev"

API_IMAGE="myagendix-api:dev"
WEB_IMAGE="myagendix-web:dev"

APP_DOMAIN="dev.myagendix.com.br"
SKIP_BUILD=false

# ── Cores para output ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }
step()    { echo -e "\n${BOLD}── $* ${NC}"; }

# ── Processar argumentos ──────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    *) warn "Argumento desconhecido: $arg" ;;
  esac
done

# ── Verificações iniciais ─────────────────────────────────────────────────────
step "Verificações pré-deploy"

[ -f "$SSH_KEY" ] || error "Chave SSH não encontrada: $SSH_KEY"
command -v docker &>/dev/null || error "Docker não encontrado. Instale o Docker Desktop."

# Confirmar que está na raiz do projeto
[ -f "package.json" ] && grep -q "myagendix" package.json 2>/dev/null || \
  error "Rode este script da raiz do projeto (onde está package.json)"

# Verificar se .env existe no deploy/dev/
[ -f "deploy/dev/.env" ] || {
  warn "Arquivo deploy/dev/.env não encontrado!"
  echo ""
  echo "  Crie-o a partir do exemplo:"
  echo "  cp deploy/dev/.env.example deploy/dev/.env"
  echo "  Depois edite deploy/dev/.env com os valores reais."
  echo ""
  error "Deploy cancelado — configure o .env primeiro."
}

success "Checks OK"

# ── Conectividade SSH ─────────────────────────────────────────────────────────
step "Testando conexão SSH com o servidor"

ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes \
    "$REMOTE_USER@$REMOTE_HOST" "echo 'SSH OK'" \
  || error "Falha na conexão SSH. Verifique se o servidor está acessível."

success "Servidor acessível"

# ── Build das imagens Docker ──────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  step "Build da imagem da API"
  docker build \
    -f apps/api/Dockerfile \
    -t "$API_IMAGE" \
    --progress=plain \
    . \
    || error "Build da API falhou."
  success "API image OK: $API_IMAGE"

  step "Build da imagem do Web"
  docker build \
    -f apps/web/Dockerfile \
    --build-arg "VITE_API_URL=" \
    -t "$WEB_IMAGE" \
    --progress=plain \
    . \
    || error "Build do Web falhou."
  success "Web image OK: $WEB_IMAGE"
else
  warn "Build pulado (--skip-build)"
fi

# ── Exportar imagens ──────────────────────────────────────────────────────────
step "Exportando imagens Docker"

info "Comprimindo imagem da API..."
docker save "$API_IMAGE" | gzip > /tmp/myagendix-api-dev.tar.gz
success "API exportada: /tmp/myagendix-api-dev.tar.gz ($(du -sh /tmp/myagendix-api-dev.tar.gz | cut -f1))"

info "Comprimindo imagem do Web..."
docker save "$WEB_IMAGE" | gzip > /tmp/myagendix-web-dev.tar.gz
success "Web exportada: /tmp/myagendix-web-dev.tar.gz ($(du -sh /tmp/myagendix-web-dev.tar.gz | cut -f1))"

# ── Preparar estrutura no servidor ────────────────────────────────────────────
step "Preparando estrutura de diretórios no servidor"

ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  mkdir -p $REMOTE_DIR
  mkdir -p /opt/apps/myagendix/{shared,docs}
  mkdir -p /opt/apps/_infra/logs
  echo 'Diretórios OK'
"
success "Estrutura criada"

# ── Enviar imagens para o servidor ────────────────────────────────────────────
step "Enviando imagens para o servidor (pode demorar...)"

info "Enviando imagem da API..."
scp -i "$SSH_KEY" /tmp/myagendix-api-dev.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/"

info "Enviando imagem do Web..."
scp -i "$SSH_KEY" /tmp/myagendix-web-dev.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/"

success "Imagens enviadas"

# ── Enviar arquivos de configuração ──────────────────────────────────────────
step "Enviando arquivos de configuração"

scp -i "$SSH_KEY" deploy/dev/docker-compose.yml \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/docker-compose.yml"

scp -i "$SSH_KEY" deploy/dev/.env \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/.env"

success "Configs enviados"

# ── Enviar nginx config ───────────────────────────────────────────────────────
step "Instalando config do nginx"

scp -i "$SSH_KEY" deploy/dev/nginx-site.conf \
    "$REMOTE_USER@$REMOTE_HOST:/tmp/myagendix-dev.conf"

ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  cp /tmp/myagendix-dev.conf /opt/apps/_infra/nginx/sites-available/myagendix-dev.conf

  # Ativar o site se ainda não estiver ativo
  if [ ! -L /opt/apps/_infra/nginx/sites-enabled/myagendix-dev.conf ]; then
    ln -sf /opt/apps/_infra/nginx/sites-available/myagendix-dev.conf \
           /opt/apps/_infra/nginx/sites-enabled/myagendix-dev.conf
    echo 'Site ativado'
  else
    echo 'Site já ativo'
  fi
"
success "Nginx config instalado"

# ── Carregar imagens no servidor ─────────────────────────────────────────────
step "Carregando imagens Docker no servidor"

ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  echo 'Carregando API...'
  docker load < /tmp/myagendix-api-dev.tar.gz

  echo 'Carregando Web...'
  docker load < /tmp/myagendix-web-dev.tar.gz

  rm -f /tmp/myagendix-api-dev.tar.gz /tmp/myagendix-web-dev.tar.gz
  echo 'Imagens carregadas OK'
"
success "Imagens carregadas"

# ── Subir containers ──────────────────────────────────────────────────────────
step "Subindo containers"

ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  cd $REMOTE_DIR
  sudo docker compose down --remove-orphans 2>/dev/null || true
  sudo docker compose up -d
  sudo docker compose ps
"
success "Containers rodando"

# ── Rodar migrations ──────────────────────────────────────────────────────────
step "Rodando migrations do banco de dados"

ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  cd $REMOTE_DIR
  # Aguarda API ficar healthy (até 60s)
  echo 'Aguardando API subir...'
  for i in \$(seq 1 12); do
    STATUS=\$(sudo docker inspect --format='{{.State.Health.Status}}' myagendix-dev-api 2>/dev/null || echo 'starting')
    echo \"  Tentativa \$i/12: \$STATUS\"
    [ \"\$STATUS\" = 'healthy' ] && break
    sleep 5
  done

  # Rodar migrations via container da API
  sudo docker exec myagendix-dev-api sh -c \
    'cd /app && node -e \"
      const { execSync } = require(\"child_process\");
      execSync(\"npx prisma migrate deploy --schema packages/database/prisma/schema.prisma\", { stdio: \"inherit\" });
    \"' 2>/dev/null || echo 'Migrations: verifique manualmente se necessário'
"

# ── Validar nginx e recarregar ────────────────────────────────────────────────
step "Testando e recarregando nginx"

ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  sudo nginx -t && sudo systemctl reload nginx && echo 'Nginx recarregado OK'
" || warn "Nginx: verifique a configuração manualmente"

# ── Registro no catálogo ──────────────────────────────────────────────────────
step "Registrando projeto no catálogo"

ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  REGISTRY=/opt/apps/_registry/projetos.json
  mkdir -p /opt/apps/_registry

  # Criar ou atualizar entrada
  if [ ! -f \"\$REGISTRY\" ]; then
    echo '[]' > \"\$REGISTRY\"
  fi

  # Adicionar entrada se não existir
  python3 -c \"
import json, sys
with open('\$REGISTRY') as f:
    data = json.load(f)
entry = {
    'nome': 'myagendix',
    'dominio_dev': '$APP_DOMAIN',
    'dominio_prod': 'myagendix.com.br',
    'owner': 'newronix',
    'status': 'ativo',
    'ambiente_atual': 'dev'
}
existing = [i for i, p in enumerate(data) if p.get('nome') == 'myagendix']
if existing:
    data[existing[0]] = entry
else:
    data.append(entry)
with open('\$REGISTRY', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print('Catálogo atualizado')
  \"
"
success "Catálogo atualizado"

# ── Limpeza local ─────────────────────────────────────────────────────────────
rm -f /tmp/myagendix-api-dev.tar.gz /tmp/myagendix-web-dev.tar.gz

# ── Resumo final ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅  Deploy DEV concluído com sucesso!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 URL:   ${BOLD}http://${APP_DOMAIN}${NC}"
echo -e "  🖥  API:   http://192.168.15.232:3334"
echo -e "  🔑 Admin: http://${APP_DOMAIN}/super-admin/login"
echo ""
echo -e "  ${YELLOW}Logs:${NC} ssh -i ~/.ssh/gabriel newronix@192.168.15.232"
echo -e "         sudo docker compose -f $REMOTE_DIR/docker-compose.yml logs -f"
echo ""
