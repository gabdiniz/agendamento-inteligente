# Portal do Paciente — Especificação Técnica

> Última atualização: Abril de 2026
> Status: Planejado — pronto para implementação

---

## Visão Geral

O Portal do Paciente é uma área autenticada disponível em `/:slug` que permite ao paciente gerenciar sua relação com a clínica de forma autônoma. Cada clínica tem seu próprio portal isolado: um paciente que frequenta duas clínicas diferentes terá duas contas independentes, cada uma vinculada ao tenant correspondente.

O fluxo de criação de conta é **passivo e automático**: ocorre no momento do agendamento público. O paciente informa nome, telefone e e-mail, e o sistema cria (ou vincula) a conta, enviando um e-mail com a senha gerada aleatoriamente. O agendamento é concluído independentemente de o paciente confirmar o e-mail ou fazer login.

---

## Princípios de Design

- **Sem atrito no agendamento**: o paciente nunca é bloqueado por conta ou e-mail para agendar. O agendamento sempre ocorre.
- **Conta criada silenciosamente**: a conta existe assim que o e-mail é fornecido. O paciente descobre a conta pelo e-mail de confirmação.
- **Escopo por tenant**: contas de pacientes são isoladas por clínica, assim como todas as outras entidades do sistema.
- **E-mail obrigatório no front, opcional no back**: a interface exige e-mail, mas o backend aceita agendamentos sem e-mail para permitir flexibilização futura sem breaking change.
- **Separação de autenticação**: pacientes usam um sistema de auth próprio (`/patient-auth/`) completamente separado do auth de usuários da clínica (`/auth/`). JWTs têm payloads distintos.

---

## Impacto no Modelo de Dados

### Alterações no modelo `Patient`

Campos a adicionar no schema Prisma:

```prisma
model Patient {
  // --- campos existentes ---
  id        String   @id
  name      String
  phone     String   @unique
  email     String?  // continua opcional no banco

  // --- NOVOS campos ---
  passwordHash      String?   // null = conta ainda não ativada / criada sem e-mail
  emailVerifiedAt   DateTime? @db.Timestamptz  // null = e-mail ainda não confirmado
  lastLoginAt       DateTime? @db.Timestamptz
  passwordResetToken      String?   @unique  // token SHA-256
  passwordResetExpiresAt  DateTime? @db.Timestamptz
  // ... resto dos campos existentes
}
```

**Observações:**
- `passwordHash` nulo significa "paciente existe mas não tem conta ativa". Isso acontece com pacientes criados manualmente pela recepção ou importados sem e-mail.
- `email` continua `String?` no banco (nullable). O frontend exige, mas o back não quebra se vier nulo — garante compatibilidade futura.
- `phone @unique` permanece como chave de deduplicação por tenant.

### Nova entidade: `ClinicPatientConfig` (configuração de cancelamento)

Cada clínica pode definir suas próprias regras de cancelamento pelo paciente:

```prisma
model ClinicPatientConfig {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String  @unique @db.Uuid

  // Regras de cancelamento pelo paciente
  cancellationAllowed            Boolean  @default(true)
  cancellationMinHoursInAdvance  Int      @default(2)   // 0 = sem restrição de antecedência
  cancellationAllowedStatuses    String[] // ex: ["SCHEDULED", "CONFIRMED"]

  createdAt  DateTime  @default(now()) @db.Timestamptz
  updatedAt  DateTime  @updatedAt @db.Timestamptz

  tenant  Tenant  @relation(fields: [tenantId], references: [id])
  @@map("clinic_patient_configs")
}
```

**Valores padrão sugeridos** (aplicados quando a clínica ainda não configurou):
- `cancellationAllowed: true`
- `cancellationMinHoursInAdvance: 2`
- `cancellationAllowedStatuses: ["SCHEDULED"]`

---

## Fluxo de Criação de Conta (Booking Público)

```
Paciente preenche formulário (nome + telefone + e-mail)
  ↓
POST /t/:slug/public/book
  ↓
Find-or-create patient by phone (lógica existente)
  ↓
[SE e-mail fornecido]
  ├─ [SE patient.passwordHash == null]  →  Gera senha aleatória (12 chars)
  │                                     →  Salva passwordHash (bcrypt)
  │                                     →  Envia e-mail de boas-vindas + senha
  │
  └─ [SE patient.passwordHash != null]  →  Não altera senha (conta já existe)
                                        →  Envia apenas confirmação do agendamento
  ↓
Agendamento criado normalmente
  ↓
Retorna sucesso (independente do e-mail)
```

**E-mail de boas-vindas contém:**
- Nome da clínica
- Link para `/:slug/entrar`
- Senha temporária gerada
- Orientação para trocar a senha após o primeiro acesso
- Resumo do agendamento realizado

---

## Backend — Rotas de Autenticação do Paciente

Prefixo: `/t/:slug/patient-auth/`

| Método | Rota | Descrição | Rate Limit |
|--------|------|-----------|------------|
| `POST` | `/login` | Login com e-mail + senha | 10/15min |
| `POST` | `/refresh` | Renovar access token | — |
| `POST` | `/logout` | Revogar tokens | — |
| `GET`  | `/me` | Dados do paciente autenticado | — |
| `POST` | `/forgot-password` | Solicitar reset de senha | 5/15min |
| `POST` | `/reset-password` | Resetar senha com token | 5/15min |
| `PATCH`| `/password` | Trocar senha (autenticado) | — |

### JWT do Paciente

Payload distinto do JWT de usuário da clínica:

```typescript
interface PatientJwtPayload {
  sub: string        // patient.id
  tenantId: string
  tenantSlug: string
  role: 'PATIENT'    // constante — sem roles variáveis
}
```

O middleware de autenticação de paciente (`patient-auth.middleware.ts`) valida o `role: 'PATIENT'` e popula `request.currentPatient` (análogo ao `request.currentUser` existente).

---

## Backend — Rotas do Portal do Paciente

Prefixo: `/t/:slug/patient/` — todas exigem autenticação de paciente.

### Perfil

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`  | `/profile` | Retorna dados do paciente autenticado |
| `PATCH`| `/profile` | Atualiza nome, telefone, e-mail, birthDate, gender, city |

**Campos editáveis pelo paciente:** `name`, `phone`, `email`, `birthDate`, `gender`, `city`.
Campos como `notes`, `isActive`, `source`, `marketingOptIn` são somente staff.

### Agendamentos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`  | `/appointments` | Lista agendamentos (histórico + futuros) com paginação |
| `GET`  | `/appointments/:id` | Detalhe de um agendamento |
| `POST` | `/appointments` | Novo agendamento (fluxo autenticado) |
| `POST` | `/appointments/:id/cancel` | Cancelar agendamento (respeita config da clínica) |

#### `GET /appointments`

Query params:
- `status`: filtro por status (`SCHEDULED`, `COMPLETED`, `CANCELED`, etc.)
- `upcoming`: boolean — apenas agendamentos futuros
- `page`, `limit`: paginação

#### `POST /appointments` (novo agendamento autenticado)

Recebe os mesmos campos do booking público, mas o `patientId` vem do JWT (não precisa de nome/telefone no payload).

```typescript
{
  professionalId: string
  procedureId: string
  scheduledDate: string   // "YYYY-MM-DD"
  startTime: string       // "HH:MM"
  notes?: string
}
```

Internamente reutiliza o `CreateAppointmentUseCase` existente.

#### `POST /appointments/:id/cancel`

Use case `CancelAppointmentByPatientUseCase`:

1. Carrega o agendamento. Verifica que pertence ao paciente autenticado.
2. Carrega `ClinicPatientConfig` do tenant (ou usa defaults se não configurado).
3. Valida `cancellationAllowed == true`.
4. Valida que `status` está em `cancellationAllowedStatuses`.
5. Calcula diferença entre `now()` e `scheduledDate + startTime`.
6. Valida que a diferença é `>= cancellationMinHoursInAdvance`.
7. Chama `CancelAppointmentUseCase` existente com `canceledBy: 'PATIENT'`.

**Erros específicos:**
- `CANCELLATION_NOT_ALLOWED` — clínica desativou cancelamento pelo paciente
- `CANCELLATION_TOO_LATE` — fora da janela de antecedência mínima (inclui quantas horas faltam)
- `CANCELLATION_STATUS_NOT_ALLOWED` — status atual não permite cancelamento

### Booking Público (dados para o fluxo autenticado)

O paciente logado precisa das mesmas listas do booking público. Para evitar duplicação, o portal pode reutilizar as rotas públicas existentes:

- `GET /t/:slug/public/professionals` — já existe
- `GET /t/:slug/public/slots` — já existe

---

## Frontend — Rotas do Portal

As rotas do portal ficam dentro de `/:slug/` mas em sub-paths, convivendo com o booking público na raiz `/:slug`.

```
/:slug                    →  BookingPage (existente, sem alteração estrutural)
/:slug/entrar             →  PatientLoginPage (nova)
/:slug/esqueci-senha      →  PatientForgotPasswordPage (nova)
/:slug/redefinir-senha    →  PatientResetPasswordPage (nova)
/:slug/minha-conta        →  PatientPortalLayout (nova, rotas protegidas)
/:slug/minha-conta/       →  PatientDashboardPage (visão geral)
/:slug/minha-conta/agendamentos         →  PatientAppointmentsPage
/:slug/minha-conta/agendamentos/novo    →  PatientNewAppointmentPage
/:slug/minha-conta/perfil               →  PatientProfilePage
/:slug/minha-conta/seguranca            →  PatientSecurityPage (troca de senha)
```

### Componentes e Comportamento

**`BookingPage` (alterações):**
- Campo `email` passa a ser obrigatório na validação do Step 3 (mantendo a schema Zod)
- Botão "Já tenho conta — Entrar" no header/footer da página de booking
- Mensagem de sucesso exibe: *"Enviamos sua senha de acesso para [email]. Acesse Minha Conta para acompanhar seus agendamentos."*

**`PatientLoginPage`:**
- E-mail + senha
- Link "Esqueci minha senha"
- Link "Voltar ao agendamento" (→ `/:slug`)
- Exibe nome/logo da clínica (já disponível via `GET /t/:slug/public/info` ou equivalente)

**`PatientPortalLayout`:**
- Sidebar/navbar com: Início, Meus Agendamentos, Novo Agendamento, Meu Perfil, Segurança, Sair
- Exibe nome do paciente e nome da clínica
- Guarda tokens em `localStorage` (chave separada da auth de staff: `patient_access_token_<slug>`)

**`PatientDashboardPage`:**
- Próximo agendamento (destaque)
- Histórico resumido (últimos 3)
- Atalho para novo agendamento

**`PatientAppointmentsPage`:**
- Tabs: Próximos / Histórico
- Card por agendamento: data, horário, profissional, procedimento, status
- Botão "Cancelar" visível apenas para agendamentos canceláveis (validação visual baseada nos parâmetros da clínica)
- Modal de confirmação de cancelamento

**`PatientNewAppointmentPage`:**
- Reusa o wizard de 3 steps do booking público (seleção de profissional/procedimento → data/horário → confirmação)
- Step 3 simplificado: sem campos de nome/telefone/e-mail (já vêm do JWT)
- Usa `POST /t/:slug/patient/appointments`

**`PatientProfilePage`:**
- Formulário com campos editáveis: nome, telefone, e-mail, data de nascimento, gênero, cidade
- Salva via `PATCH /t/:slug/patient/profile`

**`PatientSecurityPage`:**
- Formulário: senha atual + nova senha + confirmação
- Salva via `PATCH /t/:slug/patient-auth/password`

---

## Configuração de Cancelamento (Gestor)

Na área administrativa da clínica, o Gestor pode configurar as regras de cancelamento pelo paciente. Localização sugerida: **Configurações → Portal do Paciente**.

**Campos configuráveis:**
- `cancellationAllowed`: toggle "Permitir que pacientes cancelem pelo portal"
- `cancellationMinHoursInAdvance`: número inteiro (horas). Ex: 0 = sem limite, 2 = mínimo 2h de antecedência, 24 = mínimo 24h
- `cancellationAllowedStatuses`: checkboxes com os status que permitem cancelamento (SCHEDULED, CONFIRMED, etc.)

**Rota backend (staff):**
- `GET /t/:slug/clinic/patient-config` — lê configuração atual
- `PUT /t/:slug/clinic/patient-config` — salva configuração (cria se não existir, upsert)

---

## Use Cases Novos

| Use Case | Responsabilidade |
|----------|-----------------|
| `PatientLoginUseCase` | Verifica e-mail + senha, gera JWT de paciente |
| `PatientRefreshTokenUseCase` | Renova access token via refresh token |
| `PatientForgotPasswordUseCase` | Gera token de reset, envia e-mail |
| `PatientResetPasswordUseCase` | Valida token, atualiza senha |
| `PatientChangePasswordUseCase` | Troca senha (autenticado, valida senha atual) |
| `GetPatientProfileUseCase` | Retorna dados do paciente autenticado |
| `UpdatePatientProfileUseCase` | Atualiza campos editáveis pelo paciente |
| `ListPatientAppointmentsUseCase` | Lista agendamentos do paciente com filtros |
| `PatientCreateAppointmentUseCase` | Wrapper do CreateAppointmentUseCase para contexto autenticado |
| `CancelAppointmentByPatientUseCase` | Cancelamento com validação das regras da clínica |
| `GetOrCreateClinicPatientConfigUseCase` | Lê config ou retorna defaults |
| `UpsertClinicPatientConfigUseCase` | Cria ou atualiza config de cancelamento |

---

## E-mails Transacionais (via Resend)

| Evento | Template | Conteúdo |
|--------|----------|----------|
| Conta criada | `patient-welcome` | Nome, clínica, link de acesso, senha temporária, resumo do agendamento |
| Reset de senha | `patient-reset-password` | Nome, clínica, link de reset (válido 1h) |

Ambos seguem o mesmo padrão já implementado para recuperação de senha de usuários da clínica.

---

## Plano de Implementação — Tarefas

As tarefas seguem ordem de dependência. Cada bloco pode ser desenvolvido de forma isolada após o bloco anterior estar completo.

---

### Bloco 1 — Banco de Dados

**Tarefa 1.1 — Migração do modelo Patient**
Adicionar campos: `passwordHash`, `emailVerifiedAt`, `lastLoginAt`, `passwordResetToken`, `passwordResetExpiresAt` ao modelo `Patient`.

**Tarefa 1.2 — Novo modelo ClinicPatientConfig**
Criar modelo com campos de configuração de cancelamento e relação com `Tenant`.

**Tarefa 1.3 — Gerar e revisar migration SQL**
Rodar `prisma migrate dev --name add_patient_portal` e revisar o SQL gerado antes de aplicar em produção.

---

### Bloco 2 — Backend: Auth do Paciente

**Tarefa 2.1 — PatientTokenService**
Service dedicado para geração e verificação de JWTs de paciente (payload com `role: 'PATIENT'`). Pode ser uma instância configurada diferentemente do `TokenService` existente, ou uma subclasse.

**Tarefa 2.2 — Patient auth middleware**
`patient-auth.middleware.ts`: valida JWT de paciente, popula `request.currentPatient`.

**Tarefa 2.3 — Use cases de autenticação do paciente**
Implementar: `PatientLoginUseCase`, `PatientRefreshTokenUseCase`, `PatientForgotPasswordUseCase`, `PatientResetPasswordUseCase`, `PatientChangePasswordUseCase`.

**Tarefa 2.4 — Rotas `/t/:slug/patient-auth/`**
Registrar as rotas de login, refresh, logout, me, forgot-password, reset-password, password. Com rate limiting adequado.

---

### Bloco 3 — Backend: Criação de Conta no Booking

**Tarefa 3.1 — Atualizar `POST /t/:slug/public/book`**
Após criar/encontrar o paciente: se e-mail fornecido e `passwordHash` nulo, gerar senha aleatória, hashear, salvar e enviar e-mail de boas-vindas. Lógica encapsulada em `CreatePatientAccountIfNeededUseCase` (ou service auxiliar).

**Tarefa 3.2 — Template de e-mail `patient-welcome`**
Criar template Resend para o e-mail de boas-vindas com senha. Seguir o padrão visual dos templates existentes.

---

### Bloco 4 — Backend: Portal do Paciente

**Tarefa 4.1 — Use cases de perfil**
`GetPatientProfileUseCase`, `UpdatePatientProfileUseCase`.

**Tarefa 4.2 — Use cases de agendamentos**
`ListPatientAppointmentsUseCase`, `PatientCreateAppointmentUseCase`.

**Tarefa 4.3 — CancelAppointmentByPatientUseCase**
Com todas as validações: allowed, status, antecedência mínima.

**Tarefa 4.4 — Use cases de configuração da clínica**
`GetOrCreateClinicPatientConfigUseCase`, `UpsertClinicPatientConfigUseCase`.

**Tarefa 4.5 — Rotas `/t/:slug/patient/`**
Registrar todas as rotas do portal (profile, appointments, appointments/:id/cancel).

**Tarefa 4.6 — Rotas `/t/:slug/clinic/patient-config`**
Rotas para o gestor ler e salvar as configurações de cancelamento.

---

### Bloco 5 — Frontend: Auth do Paciente

**Tarefa 5.1 — Store de auth do paciente**
Zustand store para tokens do paciente (`patient_access_token_<slug>`). Separado do store de auth de staff.

**Tarefa 5.2 — PatientLoginPage (`/:slug/entrar`)**
Formulário email + senha, links para esqueci/booking, exibe logo/nome da clínica.

**Tarefa 5.3 — PatientForgotPasswordPage (`/:slug/esqueci-senha`)**
Formulário de e-mail, feedback de sucesso.

**Tarefa 5.4 — PatientResetPasswordPage (`/:slug/redefinir-senha`)**
Formulário nova senha + confirmação, lê token da query string.

**Tarefa 5.5 — Proteção de rotas do portal**
HOC ou loader que redireciona para `/:slug/entrar` se não autenticado.

---

### Bloco 6 — Frontend: Portal do Paciente

**Tarefa 6.1 — PatientPortalLayout**
Layout com sidebar/nav, nome do paciente, nome da clínica, botão sair.

**Tarefa 6.2 — PatientDashboardPage**
Próximo agendamento em destaque, histórico resumido, atalho para novo agendamento.

**Tarefa 6.3 — PatientAppointmentsPage**
Tabs Próximos/Histórico, cards de agendamento, botão cancelar com modal de confirmação.

**Tarefa 6.4 — PatientNewAppointmentPage**
Wizard reutilizando lógica do booking público, mas sem campos de identificação (Step 3 simplificado).

**Tarefa 6.5 — PatientProfilePage**
Formulário de edição de dados pessoais.

**Tarefa 6.6 — PatientSecurityPage**
Formulário de troca de senha.

---

### Bloco 7 — Frontend: Alterações no Booking Público

**Tarefa 7.1 — E-mail obrigatório no Step 3**
Atualizar validação Zod do BookingPage para tornar `email` obrigatório.

**Tarefa 7.2 — Botão "Já tenho conta" no BookingPage**
Link discreto para `/:slug/entrar` na página de booking.

**Tarefa 7.3 — Mensagem de sucesso atualizada**
Exibir mensagem mencionando o e-mail de acesso ao portal após booking bem-sucedido.

---

### Bloco 8 — Configuração da Clínica (Gestor)

**Tarefa 8.1 — Página de configuração do portal**
Nova seção em Configurações da clínica: toggle de cancelamento, horas mínimas, status permitidos.

---

### Bloco 9 — Qualidade

**Tarefa 9.1 — Testes dos use cases críticos**
Cobrir com testes unitários: `PatientLoginUseCase`, `CancelAppointmentByPatientUseCase` (todas as variações de regra).

**Tarefa 9.2 — Revisão de segurança**
Verificar que nenhuma rota `/patient/` aceita JWT de staff (e vice-versa). Revisar rate limits.

---

## Dependências entre Blocos

```
Bloco 1 (banco)
  → Bloco 2 (auth backend)
  → Bloco 3 (booking → criação de conta)
  → Bloco 4 (portal backend)
    → Bloco 5 (auth frontend)
      → Bloco 6 (portal frontend)
    → Bloco 7 (booking frontend)
    → Bloco 8 (config clínica frontend)
```

Os blocos 5, 7 e 8 podem ser desenvolvidos em paralelo após o Bloco 4 estar completo.

---

## Considerações de Segurança

- Senhas temporárias geradas com `crypto.randomBytes` (não Math.random)
- Tokens de reset: SHA-256 de 32 bytes, expiram em 1h, uso único
- JWTs de paciente têm `role: 'PATIENT'` — middleware de staff rejeita esses tokens
- `passwordHash` usa bcrypt (custo 10, padrão já adotado no projeto)
- E-mail de reset não confirma se o endereço existe (evita user enumeration)
- Rate limiting dedicado em todas as rotas públicas de auth do paciente

---

## Decisões Documentadas

| Decisão | Alternativa considerada | Motivo da escolha |
|---------|------------------------|-------------------|
| Conta criada no booking, sem etapa extra | Cadastro separado pré-agendamento | Menor atrito, mais conversões |
| E-mail obrigatório no front, opcional no back | Obrigatório em ambos | Flexibilidade futura sem breaking change |
| Conta por tenant (não global) | Conta única cross-tenant | Consistência com isolamento multi-tenant do produto |
| Senha temporária enviada por e-mail | Link de ativação sem senha | Mais simples; paciente pode usar imediatamente |
| Booking continua público (sem exigir login) | Exigir login para agendar | Menos abandono; acesso ao portal é valor adicional, não barreira |
| Config de cancelamento por clínica | Regra global da plataforma | Cada clínica tem suas políticas; é um diferencial do produto |
