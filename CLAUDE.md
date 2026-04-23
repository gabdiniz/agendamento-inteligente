# BRIEFING OPERACIONAL — Newronix Infrastructure
> Leia este documento inteiro antes de executar qualquer ação no servidor.

---

## 🧭 CONTEXTO

Você está na máquina do **Gabriel**, desenvolvedor da Newronix.
Seu papel aqui é **migrar aplicações para o servidor newronix e publicá-las via nginx**.

Este documento define exatamente como fazer isso — sem improvisar, sem inventar.

---

## 🖥️ O SERVIDOR

| Item | Valor |
|---|---|
| IP local | 192.168.15.232 |
| IP público | 177.197.222.116 *(dinâmico — confirmar antes de usar)* |
| Usuário SSH | `newronix` |
| Autenticação | **Chave SSH apenas** — senha não funciona |
| Chave privada | `~/.ssh/gabriel` ou conforme configurado |

**Conectar:**
```bash
ssh -i ~/.ssh/gabriel newronix@192.168.15.232
```

---

## 🔒 PERMISSÕES DO USUÁRIO newronix

O usuário `newronix` tem sudo **restrito**. Só pode:
```
docker
docker compose
nginx (via systemctl: start / stop / reload / restart / status)
```

❌ Não tem sudo geral  
❌ Não pode instalar pacotes  
❌ Não pode mexer em arquivos fora de `/opt/apps/`  

Se precisar de algo fora disso → **parar, reportar ao responsável**.  
Nunca tentar contornar as permissões.

---

## 🗂️ ESTRUTURA DE DIRETÓRIOS

```
/opt/apps/
├── <projeto>/
│   ├── dev/              ← ambiente de desenvolvimento
│   ├── prod/             ← produção
│   ├── shared/           ← configs e assets compartilhados
│   └── docs/             ← documentação
│
├── _infra/
│   ├── nginx/
│   │   ├── sites-available/   ← configs de proxy (criar aqui)
│   │   ├── sites-enabled/     ← symlinks para ativar
│   │   └── ssl/               ← certificados
│   ├── docker/
│   ├── logs/
│   └── scripts/
│
└── _registry/
    └── projetos.json     ← catálogo de projetos
```

**Regra:** cada projeto tem sua própria pasta, segue esse padrão, sem exceção.

---

## 📦 PADRÃO DE PROJETO

Dentro de `dev/` ou `prod/`, todo projeto tem:

```
├── docker-compose.yml
├── .env
└── services/
    ├── frontend/
    ├── backend/
    ├── auth/
    └── db/
```

---

## 🚀 FLUXO DE DEPLOY — passo a passo

### 1. Criar a estrutura do projeto

```bash
mkdir -p /opt/apps/<projeto>/{dev,prod,shared,docs}
mkdir -p /opt/apps/<projeto>/prod/services
```

### 2. Transferir os arquivos

```bash
# Da máquina do Gabriel para o servidor:
scp -i ~/.ssh/gabriel -r ./projeto/ newronix@192.168.15.232:/opt/apps/<projeto>/prod/
```

### 3. Configurar o .env

```bash
# Nunca commitar .env no git
# Criar/editar manualmente no servidor
nano /opt/apps/<projeto>/prod/.env
```

### 4. Subir os containers

```bash
cd /opt/apps/<projeto>/prod
sudo docker compose up -d
sudo docker compose ps   # verificar se subiu
sudo docker compose logs --tail=50  # verificar logs
```

### 5. Criar config do nginx

Criar o arquivo em:
```
/opt/apps/_infra/nginx/sites-available/<projeto>.conf
```

Padrão mínimo:
```nginx
upstream <projeto>_backend {
    server 127.0.0.1:<PORTA_DO_CONTAINER>;
}

server {
    listen 80;
    server_name <dominio>;

    access_log /opt/apps/_infra/logs/<projeto>.access.log;
    error_log  /opt/apps/_infra/logs/<projeto>.error.log warn;

    location / {
        proxy_pass http://<projeto>_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
    }
}
```

### 6. Ativar no nginx

```bash
# Cria symlink para ativar
ln -sf /opt/apps/_infra/nginx/sites-available/<projeto>.conf \
        /opt/apps/_infra/nginx/sites-enabled/<projeto>.conf

# Testa SEMPRE antes de recarregar
sudo nginx -t

# Só recarrega se o teste passar
sudo systemctl reload nginx
```

### 7. Registrar no catálogo

Adicionar entrada em `/opt/apps/_registry/projetos.json`:
```json
{
  "nome": "<projeto>",
  "dominio_dev": "<projeto>-dev.dominio.com",
  "dominio_prod": "<projeto>.dominio.com",
  "owner": "newronix",
  "status": "ativo"
}
```

---

## ✅ CHECKLIST ANTES DE QUALQUER DEPLOY

- [ ] Li este documento
- [ ] Confirmei o IP público atual (pode ter mudado)
- [ ] Tenho o `.env` correto para o ambiente
- [ ] `docker compose config` não retorna erros
- [ ] `nginx -t` passa antes de recarregar

---

## 🚫 PORTAS RESERVADAS — NUNCA USAR NOS CONTAINERS

As portas abaixo estão reservadas para o servidor craueternal (192.168.15.249).
Nenhum container do newronix pode usá-las:

```
5000-5999 → faixa reservada craueternal
3333      → reservada craueternal
```

Portas dos containers **sempre** bind em `127.0.0.1`:
```yaml
ports:
  - "127.0.0.1:3334:3333"   ✅ correto — só localhost
  - "3334:3333"              ❌ errado — expõe para o mundo
```

---

## ✅ O QUE JÁ ESTÁ CONFIGURADO (não reconfigurar)

```
UFW: portas 22, 80, 443, 2222, 8080 já abertas
Port forwarding no roteador: 22, 80, 443, 8080 → 192.168.15.232
Nginx instalado e rodando como proxy reverso
Docker + Docker Compose instalados
Fail2ban ativo
Usuário newronix com sudo restrito
```

---

## ❌ O QUE NUNCA FAZER

- ❌ **Nunca** usar `sudo docker rm -f` em container que não seja do seu projeto
- ❌ **Nunca** editar `/etc/nginx/nginx.conf` diretamente
- ❌ **Nunca** mexer em `/opt/apps/_infra/` sem checar impacto nos outros projetos
- ❌ **Nunca** expor porta de container sem bind em 127.0.0.1
- ❌ **Nunca** usar as portas reservadas 5000-5999 ou 3333 nos containers
- ❌ **Nunca** fazer `ufw allow` ou abrir portas — isso é com o responsável
- ❌ **Nunca** usar `docker compose down -v` sem confirmar backup do banco
- ❌ **Nunca** commitar `.env` ou credenciais no git

---

## ⚠️ SE ALGO DER ERRADO

1. **Para tudo** — não tente consertar na raça
2. Documenta o que aconteceu (comando que rodou, erro que apareceu)
3. Reporta ao responsável antes de qualquer ação corretiva

---

## 📡 PROJETOS ATIVOS NO SERVIDOR

| Projeto | Domínio | Status |
|---|---|---|
| craueternal | crau.online | proxy → 192.168.15.249 |

> Consultar `/opt/apps/_registry/projetos.json` para lista atualizada.

---

*Este documento é a fonte da verdade operacional.*  
*Em caso de dúvida: parar e perguntar.*
