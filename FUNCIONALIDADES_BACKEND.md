# MyAgendix — Funcionalidades Implementadas no Backend (API)

> Cobre todos os endpoints e use-cases implementados em `apps/api/src/`.  
> Indica claramente quando uma funcionalidade **não possui integração com o frontend**.

---

## Convenções de acesso

| Símbolo | Significado |
|---|---|
| 🔓 | Público — sem autenticação |
| 🔐 | Requer token de clínica (qualquer role) |
| 👔 | Requer role `GESTOR` |
| 🧑‍💼 | Requer role `GESTOR` ou `RECEPCAO` |
| 🩺 | Requer role `GESTOR`, `RECEPCAO` ou `PROFISSIONAL` |
| 👑 | Requer token de Super Admin |

---

## 🔐 Autenticação da Clínica — `/t/:slug/auth`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/login` | 🔓 | Login com e-mail + senha. Retorna `accessToken` + `refreshToken`. |
| POST | `/refresh` | 🔓 | Renova o access token via refresh token. |
| POST | `/logout` | 🔐 | Invalida o refresh token atual. |
| GET | `/me` | 🔐 | Retorna dados do usuário logado (id, nome, e-mail, roles, avatarUrl). |
| PATCH | `/password` | 🔐 | Altera a senha do usuário logado (requer senha atual). |

**Detalhe:** tokens JWT com expiração curta + refresh token armazenado no banco com rotação. Senha armazenada com bcrypt.

✅ Todos integrados ao frontend.

---

## 🗓️ Agendamentos — `/t/:slug/appointments`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/` | 🔐 | Lista agendamentos com filtros: data exata, intervalo de datas, profissional, paciente, status. Paginado. |
| GET | `/:id` | 🔐 | Busca um agendamento por ID com relações (paciente, profissional, procedimento). |
| POST | `/` | 🧑‍💼 | Cria agendamento com validação completa (ver abaixo). |
| PATCH | `/:id` | 🧑‍💼 | Reagenda (nova data/horário) e/ou edita observações. Recalcula `endTime` automaticamente. |
| PATCH | `/:id/status` | 🩺 | Muda o status respeitando máquina de estados. Dispara check da waitlist se `→ CANCELED`. |
| POST | `/:id/cancel` | 🧑‍💼 | Cancela com motivo opcional. Dispara check da waitlist automaticamente. |

**Validações no `CreateAppointmentUseCase`:**
- Profissional e procedimento devem estar ativos
- Procedimento deve estar vinculado ao profissional
- Profissional deve ter grade de trabalho no dia da semana solicitado
- Slot deve estar dentro do horário de trabalho
- Verificação de conflito de horário com outros agendamentos não-cancelados

**Máquina de estados:**
```
SCHEDULED → PATIENT_PRESENT → IN_PROGRESS → COMPLETED
     ↓               ↓               ↓
  CANCELED        CANCELED        CANCELED
```

**AppointmentStatusHistory:** cada mudança de status é registrada em tabela separada (quem mudou, quando, status anterior/novo). ⚠️ **Não há endpoint de leitura do histórico exposto — e não há integração no frontend.**

✅ Todos integrados ao frontend.

---

## 👤 Pacientes — `/t/:slug/patients`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/` | 🔐 | Lista pacientes com busca por nome. Paginado. |
| GET | `/:id` | 🔐 | Busca paciente por ID. |
| POST | `/` | 🧑‍💼 | Cria paciente. Valida unicidade de telefone por tenant. |
| PATCH | `/:id` | 🧑‍💼 | Atualiza dados do paciente. |
| PATCH | `/:id/activate` | 👔 | Reativa um paciente inativo. |
| PATCH | `/:id/deactivate` | 👔 | Desativa um paciente (não exclui). |

**Campos suportados:** nome, telefone, e-mail, data de nascimento, gênero, cidade, canal de notificação preferido, opt-in de marketing, observações, source (INTERNAL / PUBLIC_PAGE).

⚠️ **Ativar/desativar paciente: backend implementado, frontend não tem essa ação.**

✅ CRUD básico integrado ao frontend.

---

## 👩‍⚕️ Profissionais — `/t/:slug/professionals`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/` | 🔐 | Lista profissionais. Paginado. |
| GET | `/:id` | 🔐 | Busca profissional por ID com procedimentos vinculados. |
| POST | `/` | 👔 | Cria profissional com cor e vínculos de procedimentos. |
| PATCH | `/:id` | 👔 | Atualiza dados do profissional. |
| PATCH | `/:id/activate` | 👔 | Reativa um profissional inativo. |
| PATCH | `/:id/deactivate` | 👔 | Desativa um profissional. |
| POST | `/:id/procedures` | 👔 | Vincula um procedimento ao profissional. |
| DELETE | `/:id/procedures/:procedureId` | 👔 | Remove vínculo de um procedimento. |

✅ Todos integrados ao frontend.

---

## 🧪 Procedimentos — `/t/:slug/procedures`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/` | 🔐 | Lista procedimentos. Inclui `professionalsCount`. Paginado. |
| GET | `/:id` | 🔐 | Busca procedimento por ID. |
| POST | `/` | 👔 | Cria procedimento (nome, duração, preço em centavos, cor, descrição). |
| PATCH | `/:id` | 👔 | Atualiza procedimento. |
| PATCH | `/:id/activate` | 👔 | Reativa procedimento. |
| PATCH | `/:id/deactivate` | 👔 | Desativa procedimento. |
| DELETE | `/:id` | 👔 | Exclui procedimento permanentemente. |

✅ Todos integrados ao frontend.

---

## 📅 Agenda de Trabalho — `/t/:slug/professionals/:professionalId/schedule`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/` | 🔐 | Lista todos os dias da semana configurados para o profissional. |
| PUT | `/:day` | 👔 | Cria ou atualiza (upsert) a configuração de um dia (0=Dom..6=Sáb): horário início/fim, intervalo de slots. |
| DELETE | `/:day` | 👔 | Remove a configuração de um dia. |
| PATCH | `/:day/activate` | 👔 | Ativa um dia sem alterar horários. |
| PATCH | `/:day/deactivate` | 👔 | Desativa um dia sem excluir. |

**Modelo `ScheduleBlock`** está definido no schema (bloqueios pontuais de horário, ex: férias, feriados). ⚠️ **Nenhum endpoint de ScheduleBlock foi implementado — e não há integração no frontend.**

✅ Grade básica integrada ao frontend.

---

## ⏳ Lista de Espera — `/t/:slug/waitlist`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/` | 🧑‍💼 | Lista entradas com filtros: status, procedimento, profissional, paciente. Paginado. |
| GET | `/:id` | 🧑‍💼 | Busca entrada por ID. |
| POST | `/` | 🔓 | Adiciona paciente à lista. Cria paciente automaticamente se não existir. |
| POST | `/check-vacancies` | 🧑‍💼 | Busca candidatos elegíveis para uma vaga e envia notificações. |
| PATCH | `/:id/confirm` | 🧑‍💼 | Marca entrada como CONFIRMED. Aceita ID de agendamento opcional. |
| PATCH | `/:id/expire` | 🧑‍💼 | Marca entrada como EXPIRED. |
| PATCH | `/:id/remove` | 🧑‍💼 | Marca entrada como REMOVED. |

**Fluxo de status:** `WAITING → NOTIFIED → CONFIRMED | EXPIRED | REMOVED`

**Integração automática com cancelamento:** ao cancelar um agendamento (via `POST /:id/cancel` ou `PATCH /:id/status` com `CANCELED`), o `CheckVacanciesUseCase` é disparado automaticamente em background (fire-and-forget).

**Critérios de elegibilidade no `findCandidates`:** status WAITING, mesmo procedimento, profissional compatível (ou "qualquer"), data dentro do intervalo preferido, `minAdvanceMinutes` satisfeito.

**TTL de notificação:** 24 horas — candidatos notificados têm até 24h para confirmar.

✅ Todos integrados ao frontend.

---

## 🔔 Notificações — `/t/:slug/notifications`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/` | 🧑‍💼 | Lista notificações com filtros: status, canal, tipo, paciente. Paginado. |
| POST | `/` | 🧑‍💼 | Envia notificação manual (canal, destinatário, tipo, conteúdo). |
| POST | `/:id/retry` | 👔 | Reenvio de notificação com status FAILED. Cria novo registro preservando o histórico de falha. |
| PATCH | `/:id/read` | 🔐 | Marca notificação como lida. |

**Canais implementados (adapters):**
- **WhatsApp** — adapter criado, provider configurável via env
- **SMS** — adapter criado, provider configurável via env
- **Email** — adapter criado, provider configurável via env (suporta HTML)

**Tipos de notificação definidos:** `APPOINTMENT_REMINDER`, `APPOINTMENT_CONFIRMATION`, `WAITLIST_VACANCY`, `CAMPAIGN`, `SYSTEM`

**Status de notificação:** `PENDING → SENT | FAILED`, podendo ser marcada como `READ`

⚠️ **Os adapters de canal estão estruturados mas dependem de providers externos configurados via variáveis de ambiente. Em desenvolvimento, os envios reais podem não estar ativos.**

✅ Todos integrados ao frontend.

---

## 🌐 Agendamento Público — `/public/:slug/booking`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/professionals` | 🔓 | Lista profissionais ativos com seus procedimentos vinculados. |
| GET | `/slots` | 🔓 | Retorna slots disponíveis para profissional + procedimento + data. |
| POST | `/book` | 🔓 | Cria agendamento público. Find-or-create do paciente por telefone. |
| POST | `/waitlist` | 🔓 | Adiciona paciente à lista de espera pela página pública. |

✅ Todos integrados ao frontend (BookingPage).

---

## 📁 Upload de Arquivos — `/super-admin/upload`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/logo` | 👑 | Upload de logo do tenant. Valida MIME (PNG/JPG/WebP/SVG/GIF) e tamanho (máx 5 MB). Salva em `uploads/logos/`. |
| GET | `/uploads/logos/:filename` | 🔓 | Serve os arquivos de logo com cache imutável. Protegido contra path traversal. |

✅ Integrado ao frontend (NewTenantPage).

---

## 👑 Super Admin — Autenticação — `/super-admin/auth`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/login` | 🔓 | Login do super admin com e-mail + senha. |
| POST | `/refresh` | 🔓 | Renova access token via refresh token. |
| POST | `/logout` | 👑 | Invalida refresh token. |
| GET | `/me` | 👑 | Dados do super admin logado. |

✅ Todos integrados ao frontend.

---

## 👑 Super Admin — Gestão de Tenants — `/super-admin/tenants`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/` | 👑 | Cria tenant completo: schema PostgreSQL, tabelas, usuário Gestor inicial. |
| GET | `/` | 👑 | Lista tenants com busca por nome. Paginado. |
| GET | `/:id` | 👑 | Busca tenant por ID. |
| PATCH | `/:id` | 👑 | Atualiza dados do tenant (nome, e-mail, plano, logo, etc.). |
| PATCH | `/:id/activate` | 👑 | Reativa tenant. |
| PATCH | `/:id/deactivate` | 👑 | Desativa tenant (clínica perde acesso). |
| DELETE | `/:id` | 👑 | Exclui tenant permanentemente. |

**`CreateTenantUseCase` — fluxo completo:**
1. Verifica unicidade do slug
2. Cria registro no schema `public`
3. Cria schema PostgreSQL isolado (`tenant_{slug}`) via `prisma db push`
4. Cria usuário Gestor inicial com senha hash no schema do tenant
5. Retorna tenant + credenciais do gestor

✅ Todos integrados ao frontend.

---

## 🗄️ Modelos no banco SEM endpoints implementados

Os modelos abaixo existem no schema Prisma (tenant) mas **não têm rotas nem use-cases criados ainda**. São sinalizadores do roadmap de produto.

| Modelo | Descrição |
|---|---|
| `AppointmentEvaluation` | Avaliação do paciente sobre o atendimento (1-5 estrelas + comentário) |
| `PatientEvaluation` | Avaliação interna da clínica sobre o paciente (notas + tags) |
| `AppointmentStatusHistory` | Histórico de mudanças de status (gravado, sem endpoint de leitura) |
| `ScheduleBlock` | Bloqueios pontuais de agenda (férias, feriados, indisponibilidades) |
| `PatientInterest` | Interesses/tags do paciente para CRM |
| `PatientCrmMetrics` | Métricas CRM por paciente (LTV, frequência, etc.) |
| `AiConfig` | Configuração do assistente IA por tenant |
| `Conversation` / `Message` | Chat IA com pacientes |
| `Campaign` / `CampaignRecipient` | Campanhas de marketing em massa |

---

## 🔁 Infraestrutura de Filas (BullMQ + Redis)

Filas definidas em `infrastructure/queue/queues.ts`:

| Fila | Status | Descrição |
|---|---|---|
| `notifications` | ⚠️ Definida, sem worker ativo | Processamento assíncrono de notificações |
| `scheduler` | ⚠️ Definida, sem worker ativo | Jobs agendados (lembretes, expirações) |
| `waitlist` | ⚠️ Definida, sem worker ativo | Processamento de verificação de vagas em lote |
| `campaigns` | 🚧 MVP2 | Disparos de campanhas em massa |
| `ai-assistant` | 🚧 MVP2 | Processamento de mensagens do assistente IA |

> As filas estão estruturadas mas os workers não foram implementados. Notificações e check de waitlist rodam de forma síncrona por enquanto.

---

## 🔑 Papéis de usuário (Roles)

| Role | Permissões |
|---|---|
| `GESTOR` | Acesso total à clínica: gerencia profissionais, procedimentos, usuários, agenda, waitlist, notificações |
| `RECEPCAO` | Agendamentos, pacientes, waitlist, notificações — sem gestão de profissionais/procedimentos |
| `PROFISSIONAL` | Somente mudança de status de agendamentos |
| `SuperAdmin` | Token separado — gestão de tenants via painel próprio |
