# MyAgendix — Status do MVP1

> Comparação entre o escopo definido em `context/SCOPE.md` e o que está implementado.  
> Atualizado em: Abril de 2026

---

## Progresso geral

```
████████████████████░░░░░░░  67%
```

**30 de 45 funcionalidades concluídas** (2 parciais contadas como 0.5 cada)

---

## Legenda

| Símbolo | Significado |
|---|---|
| ✅ | Implementado (back + front) |
| 🔧 | Backend implementado, frontend faltando |
| ⚠️ | Parcialmente implementado |
| ❌ | Não implementado |

---

## 1. Autenticação e Multi-Tenancy

| Funcionalidade | Status | Observação |
|---|---|---|
| Login para todos os papéis (Gestor, Profissional, Recepção) | ✅ | JWT + refresh token, roles completas |
| Isolamento completo de dados por tenant | ✅ | Schema PostgreSQL separado por clínica |
| Link de convite com vínculo automático ao tenant | ❌ | Não existe sistema de convite. Usuários só são criados pelo onboarding do Super Admin |

---

## 2. Super Admin

| Funcionalidade | Status | Observação |
|---|---|---|
| Cadastro de nova clínica na plataforma | ✅ | Cria tenant + schema + Gestor inicial |
| Criação do usuário Gestor inicial | ✅ | Incluído no fluxo de criação do tenant |
| Listagem e ativação/desativação de clínicas | ✅ | Com busca e paginação |
| Ativação de contrato (plano BASIC / PRO) | ✅ | Campo `planType` no tenant, selecionável na criação e edição |

---

## 3. Gestão da Clínica (Gestor)

| Funcionalidade | Status | Observação |
|---|---|---|
| Cadastro e gestão de profissionais | ✅ | Nome, especialidade, bio, cor, procedimentos vinculados |
| Cadastro e gestão de procedimentos | ✅ | Nome, descrição, duração, preço, cor, profissionais habilitados |
| Configuração de agenda (horários, intervalos, dias) | ✅ | WorkSchedule por profissional com activate/deactivate por dia |
| Gestão de usuários da clínica (convidar, listar, desativar) | ❌ | Não há como o Gestor criar novos usuários pelo painel |

---

## 4. Agendamento

| Funcionalidade | Status | Observação |
|---|---|---|
| Agendamento manual pela recepção | ✅ | Com validação de slots, conflito e duração |
| Agendamento self-service pelo paciente (página pública) | ✅ | Fluxo completo em 4 etapas |
| Cancelamento pela recepção | ✅ | Com motivo opcional e trigger automático da waitlist |
| Cancelamento pelo paciente na página pública | ❌ | A `BookingPage` não tem botão de cancelar agendamento existente |

---

## 5. Página Pública de Agendamento

| Funcionalidade | Status | Observação |
|---|---|---|
| URL exclusiva por clínica (`/{slug}`) | ✅ | |
| Exibição de profissionais disponíveis | ✅ | Com foto/avatar, nome e especialidade |
| Exibição de procedimentos disponíveis | ✅ | Com duração e preço |
| Seleção de data e horário | ✅ | Slots calculados em tempo real |
| Cadastro rápido do paciente | ✅ | Nome, telefone, e-mail opcional. Find-or-create |
| Confirmação de agendamento | ✅ | Tela de sucesso com resumo |

---

## 6. Agenda

| Funcionalidade | Status | Observação |
|---|---|---|
| Visualização semanal (calendário) | ✅ | FullCalendar com navegação por semana |
| Visualização em lista (diária) | ✅ | Com filtros de data, status e profissional |
| Registro de chegada do paciente (recepção) | ✅ | Status `PATIENT_PRESENT` |
| Confirmação de início de atendimento (profissional) | ✅ | Status `IN_PROGRESS` |
| Confirmação de finalização (profissional) | ✅ | Status `COMPLETED` |

---

## 7. Status do Atendimento

| Funcionalidade | Status | Observação |
|---|---|---|
| `Agendado` → `Paciente Presente` → `Em Atendimento` → `Concluído` → `Cancelado` | ✅ | Máquina de estados com transições validadas no backend |

---

## 8. Lista de Espera

| Funcionalidade | Status | Observação |
|---|---|---|
| Paciente entra na fila (página pública ou recepção) | ✅ | Endpoint público + painel interno |
| Definição de antecedência mínima | ✅ | Campo `minAdvanceMinutes` |
| Definição de período preferido | ✅ | `preferredDateFrom` / `preferredDateTo` |
| Notificação automática quando vaga é liberada | ✅ | Disparada ao cancelar agendamento (back). Adaptadores são stubs |
| Confirmação da vaga pelo paciente | ✅ | Via painel pela staff (confirmação manual) |
| Recusa/saída da fila pelo paciente | ⚠️ | Existe `REMOVE`, mas feito pela staff — não há link/tela para o paciente recusar sozinho |
| Expiração automática de notificações (TTL 24h) | ⚠️ | TTL calculado e salvo no banco, mas o job de expiração automática não existe (falta o worker do scheduler) |

---

## 9. Notificações

| Funcionalidade | Status | Observação |
|---|---|---|
| Notificação de vaga liberada (lista de espera) | ✅ | Estrutura completa, disparada automaticamente |
| Canal WhatsApp | ⚠️ | Adapter implementado mas é stub (sem provider real conectado) |
| Canal SMS | ⚠️ | Adapter implementado mas é stub |
| Confirmação de agendamento (envio automático ao criar) | ❌ | Nenhum envio automático ao criar agendamento |
| Lembrete de consulta (ex: 24h antes) | ❌ | Depende do worker de scheduler, que não existe |

---

## 10. Sistema de Convite de Pacientes

| Funcionalidade | Status | Observação |
|---|---|---|
| Geração de link de convite/acesso da clínica | ❌ | |
| Envio do link via WhatsApp | ❌ | |
| Envio do link via SMS | ❌ | |
| Geração de QR Code | ❌ | |

> ⚠️ Este módulo **não foi iniciado**. Nenhuma parte está implementada.

---

## 11. Avaliação de Atendimento (pelo Paciente)

| Funcionalidade | Status | Observação |
|---|---|---|
| Rating de 1 a 5 estrelas + comentário | 🔧 | Modelo `AppointmentEvaluation` no banco, sem endpoints nem frontend |
| Registro vinculado ao atendimento | 🔧 | Relação existe no schema |
| Visível para Gestor e Profissional | ❌ | Sem endpoint de leitura |

---

## 12. Avaliação de Paciente (pelo Profissional)

| Funcionalidade | Status | Observação |
|---|---|---|
| Observações internas sobre o paciente | 🔧 | Modelo `PatientEvaluation` no banco, sem endpoints nem frontend |
| Visível apenas internamente | ❌ | Sem endpoint nem tela |

---

## 13. Histórico de Atendimentos

| Funcionalidade | Status | Observação |
|---|---|---|
| Registro de mudanças de status (quem, quando, de/para) | 🔧 | `AppointmentStatusHistory` gravado automaticamente a cada transição |
| Exibição do histórico no painel | ❌ | Sem endpoint de leitura nem tela no frontend |
| Histórico por paciente | ❌ | Sem endpoint nem tela |

---

## 14. Dashboard Básico

| Funcionalidade | Status | Observação |
|---|---|---|
| Total de consultas agendadas | ✅ | Stat card com delta vs ontem |
| Total de consultas realizadas (concluídas) | ✅ | Stat card com delta vs ontem |
| Total de cancelamentos | ✅ | Visível no donut de status dos últimos 7 dias |
| Taxa de ocupação da agenda | ❌ | Não calculada nem exibida |

---

## Resumo por módulo

| Módulo | Concluído | Total | % |
|---|---|---|---|
| Autenticação e Multi-Tenancy | 2 | 3 | 67% |
| Super Admin | 4 | 4 | 100% |
| Gestão da Clínica | 3 | 4 | 75% |
| Agendamento | 3 | 4 | 75% |
| Página Pública | 6 | 6 | 100% |
| Agenda | 5 | 5 | 100% |
| Status do Atendimento | 1 | 1 | 100% |
| Lista de Espera | 5 + 2×0.5 | 7 | 86% |
| Notificações | 1 + 2×0.5 | 5 | 40% |
| Sistema de Convite | 0 | 4 | 0% |
| Avaliação de Atendimento | 0 | 3 | 0% |
| Avaliação de Paciente | 0 | 2 | 0% |
| Histórico de Atendimentos | 0 | 3 | 0% |
| Dashboard Básico | 3 | 4 | 75% |
| **TOTAL** | **~30** | **45** | **~67%** |

---

## ✨ Extras implementados (não estavam no MVP1)

Funcionalidades que construímos além do escopo original — elevam a qualidade do produto:

| Funcionalidade | Onde aparece |
|---|---|
| **Drag-to-reschedule** — arrastar agendamento no calendário para reagendar | `AppointmentsPage` (calendário) |
| **Upload de logo do tenant** — preview imediato + upload eager | `NewTenantPage` (Super Admin) |
| **Gráfico de barras 7 dias** — volume de agendamentos por dia | `DashboardPage` |
| **Gráfico donut de status** — distribuição de status nos últimos 7 dias | `DashboardPage` |
| **Stat cards com delta vs ontem** — mostra variação em relação ao dia anterior | `DashboardPage` |
| **Override de duração por agendamento** — sobrescreve a duração padrão do procedimento | `NewAppointmentPage` |
| **Contagem de profissionais por procedimento** — badge com total na listagem | `ProceduresPage` |
| **Filtros avançados de agendamento** — por profissional, status e intervalo de datas | `AppointmentsPage` |
| **Skeleton loaders e animações** — em todas as listagens e cards | Global |

---

## O que falta para fechar o MVP1

Em ordem de impacto:

1. **Workers de fila** — notificações, waitlist e scheduler (bloqueia: lembretes, expiração automática de waitlist)
2. **Canais reais** — conectar WhatsApp (Z-API) e SMS (Twilio)
3. **Envio automático de confirmação** ao criar agendamento
4. **Lembrete automático** 24h antes (depende do scheduler worker)
5. **Avaliação de atendimento** — endpoints + tela do paciente
6. **Avaliação de paciente** — endpoints + tela interna
7. **Histórico de atendimentos** — endpoint de leitura + tela
8. **Taxa de ocupação** no dashboard
9. **Sistema de convite** — link + QR Code + envio via WhatsApp/SMS
10. **Cancelamento pelo paciente** na página pública
11. **Gestão de usuários** — Gestor convidar Recepção e Profissional pelo painel
