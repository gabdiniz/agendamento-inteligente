# Deploy MyAgendix

Guia rápido para subir o projeto no servidor Newronix.

## Pré-requisitos (máquina do Gabriel)

- Docker Desktop rodando
- SSH key em `~/.ssh/gabriel`
- Servidor acessível em `192.168.15.232`

## 1. Configurar variáveis de ambiente

```bash
cp deploy/dev/.env.example deploy/dev/.env
```

Edite `deploy/dev/.env` com as senhas e secrets JWT.

**Gerar secrets JWT** (rode 3x no PowerShell ou terminal):
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 2. Rodar o deploy

Na **raiz do projeto**:

```bash
bash deploy/deploy-dev.sh
```

O script faz tudo automaticamente:
1. Verifica SSH e docker
2. Builda as imagens API e Web
3. Exporta e envia para o servidor
4. Sobe os containers
5. Instala config do nginx
6. Registra no catálogo

## 3. Acessar

- **App:** http://dev.myagendix.com.br
- **Super Admin:** http://dev.myagendix.com.br/super-admin/login
- **API direta:** http://192.168.15.232:3334/health

## Comandos úteis no servidor

```bash
ssh -i ~/.ssh/gabriel newronix@192.168.15.232

# Ver status
sudo docker compose -f /opt/apps/myagendix/dev/docker-compose.yml ps

# Ver logs da API
sudo docker compose -f /opt/apps/myagendix/dev/docker-compose.yml logs -f api

# Reiniciar um serviço
sudo docker compose -f /opt/apps/myagendix/dev/docker-compose.yml restart api
```

## Re-deploy (após atualizações)

```bash
git pull
bash deploy/deploy-dev.sh
```

Para pular o build e só reiniciar os containers:
```bash
bash deploy/deploy-dev.sh --skip-build
```
