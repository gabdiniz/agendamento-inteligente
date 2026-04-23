# MyAgendix — Funcionalidades Implementadas no Frontend

> Documento gerado automaticamente com base nos arquivos de `apps/web/src/features/`.  
> Cobre as áreas `/app/t/:slug/*`, `/super-admin/*` e a página pública de agendamento.

---

## 🏥 Área da Clínica — `/app/t/:slug/`

### Dashboard (`/dashboard`)
- Saudação personalizada com nome do usuário e hora do dia (Bom dia / Boa tarde / Boa noite)
- Data atual formatada em pt-BR
- **4 stat cards** com valores e delta (vs. ontem):
  - Agendamentos hoje
  - Concluídos hoje
  - Total de pacientes
  - Pacientes aguardando vaga na lista de espera
- **Gráfico de barras** — agendamentos dos últimos 7 dias
- **Gráfico donut** — distribuição de status nos últimos 7 dias com legenda colorida
- **Tabela "Agenda de hoje"** — horário, paciente, profissional, procedimento e status de cada agendamento do dia
- Skeleton loaders em todos os dados assíncronos
- Layout responsivo: gráficos empilham em tela pequena

---

### Agendamentos (`/appointments`)

#### Visualização em lista
- Filtro por data (padrão: hoje), status e profissional
- Paginação
- Cada linha mostra: horário, paciente, profissional, procedimento, duração, status e ações
- **Mudança de status inline** com botões contextuais por status atual:
  - `SCHEDULED` → Chegou, Em atendimento, Cancelar
  - `PATIENT_PRESENT` → Em atendimento, Cancelar
  - `IN_PROGRESS` → Concluído, Cancelar
- **Cancelamento** com modal de confirmação e campo de motivo (opcional)
- Botão para editar agendamento (redireciona para página de edição)

#### Visualização em calendário (FullCalendar)
- Alternância entre modo lista e calendário via toggle
- Navegação por semana com setas e botão "Hoje"
- Filtro por profissional compartilhado com a lista
- Eventos coloridos por status
- **Drag-to-reschedule**: arrastar evento reagenda diretamente (apenas SCHEDULED e PATIENT_PRESENT)
  - Reverte automaticamente se o backend rejeitar
  - Banner de erro flutuante em caso de falha
- **Modal de detalhe** ao clicar no evento: informações completas, ações de status, editar e cancelar

#### Criar agendamento (`/appointments/new`)
- Busca de paciente por nome (search com debounce)
- Seleção de profissional com avatar colorido
- Seleção de procedimento com duração padrão exibida
- **Override de duração**: campo editável pré-preenchido com o padrão do procedimento
  - Badge âmbar + botão "Restaurar padrão" quando alterado
- Seleção de data com navegação
- Slots de horário disponíveis gerados automaticamente com base na agenda do profissional
- Campo de observações (opcional)
- Resumo visual antes de confirmar

#### Editar agendamento (`/appointments/:id/edit`)
- Carrega dados do agendamento existente
- Permite reagendar (nova data + slot)
- Permite editar observações
- Botão de salvar com feedback de loading

---

### Pacientes (`/patients`)

#### Lista de pacientes
- Busca por nome com debounce
- Paginação
- Cada card/linha: nome, telefone, e-mail, cidade, data de cadastro
- Link para o perfil completo do paciente

#### Perfil do paciente (`/patients/:id`)
- Exibição de todos os dados cadastrais
- Histórico de agendamentos do paciente

#### Cadastrar paciente (`/patients/new`)
- Campos: nome*, telefone*, e-mail, data de nascimento, gênero, cidade, observações
- Validação com Zod + react-hook-form
- Feedback de erro por campo e erro de servidor

#### Editar paciente (`/patients/:id/edit`)
- Mesmos campos do cadastro, pré-preenchidos
- Validação idêntica ao cadastro

---

### Profissionais (`/professionals`)

#### Lista de profissionais
- Cards com avatar colorido, nome, especialidade e status (ativo/inativo)
- **Toggle ativo/inativo** diretamente na lista
- Paginação
- Botão para cadastrar novo

#### Cadastrar profissional (`/professionals/new`)
- Campos: nome*, especialidade, bio, cor (seletor com paleta de cores predefinidas)
- **Vínculo com procedimentos**: checkbox list dos procedimentos ativos disponíveis
- Validação e feedback de erro

#### Editar profissional (`/professionals/:id/edit`)
- Mesmos campos do cadastro, pré-preenchidos
- Atualização dos procedimentos vinculados

---

### Procedimentos (`/procedures`)

#### Lista de procedimentos
- Tabela com: nome, duração, preço, cor, profissionais vinculados (contagem com badge), status
- **Toggle ativo/inativo** inline
- **Excluir** com modal de confirmação
- Paginação

#### Cadastrar procedimento (`/procedures/new`)
- Campos: nome*, descrição, duração (minutos)*, preço (R$ — armazenado em centavos), cor
- Seletor de cor com paleta predefinida
- Validação e feedback de erro

#### Editar procedimento (`/procedures/:id/edit`)
- Mesmos campos do cadastro, pré-preenchidos

---

### Agenda de Trabalho (`/work-schedule`)
- Seleção de profissional
- **7 cards de dias da semana** — cada um com toggle ativo/inativo
- Para cada dia ativo: horário de início, horário de fim, intervalo de slots (minutos)
- Salvar/remover por dia individualmente
- Mutations separadas para upsert, remoção e ativação
- Skeleton loader enquanto carrega

---

### Lista de Espera (`/waitlist`)
- Tabela com: paciente, procedimento, profissional preferido, período preferido, tempo na fila, status e ações
- **Filtro por status** via pills: Todos / Aguardando / Notificado / Confirmado / Expirado / Removido
- Paginação
- **Ações por status**:
  - `WAITING` → Confirmar vaga | Remover
  - `NOTIFIED` → Confirmar vaga | Expirar | Remover
- **Modal "Adicionar à lista"**: telefone*, nome*, e-mail, procedimento*, profissional preferido, período preferido (de/até)
- **Modal "Confirmar vaga"**: permite vincular ID de agendamento (opcional)
- **Modal "Remover"**: confirmação com texto descritivo
- Expirar disponível direto na linha (sem modal)
- Legenda de status colorida no rodapé

---

### Notificações (`/notifications`)
- Tabela com: destinatário, canal (WhatsApp/SMS/Email com ícone), tipo, conteúdo (preview), status, data
- Filtro por status e canal
- Paginação
- **Ações por linha**: reenviar (retry) e marcar como lida
- **Modal "Enviar notificação manual"**: canal, destinatário, tipo, conteúdo
- Badge de alerta quando há notificações com falha
- Skeleton loader

---

### Perfil do Usuário (`/profile`)
- Exibição dos dados do usuário logado (nome, e-mail, papel)

### Alterar Senha (`/change-password`)
- Formulário com: senha atual, nova senha, confirmar nova senha
- Toggle mostrar/ocultar senha em cada campo
- Validação com Zod
- Feedback de sucesso e erro

---

## 🔐 Autenticação — `/app/t/:slug/login`
- Login com e-mail e senha
- Redirecionamento automático para o dashboard após autenticação
- Mensagem de erro inline

---

## 👑 Super Admin — `/super-admin/`

### Login (`/super-admin/login`)
- Tela de login exclusiva para super admin
- Separada do login da clínica

### Lista de Tenants (`/super-admin/tenants`)
- Tabela com: logo, nome, slug, e-mail, telefone, plano, status (ativo/inativo), data de criação
- Busca por nome com debounce
- Paginação
- **Toggle ativo/inativo** inline
- **Modal de edição inline**: nome, e-mail, telefone, endereço, plano (BASIC/PRO), logo URL
- **Modal de exclusão** com confirmação

### Criar Tenant (`/super-admin/tenants/new`)
- Campos: nome*, slug* (gerado automaticamente a partir do nome, editável), e-mail*, telefone, endereço, plano (BASIC/PRO)
- **Upload de logo**:
  - Área de upload com drag visual
  - Preview imediato via `URL.createObjectURL()`
  - Upload eager para o backend (`/super-admin/upload/logo`)
  - Validação de tipo (PNG/JPG/WebP/SVG/GIF) e tamanho (máx 5 MB) no frontend
  - Badge de sucesso / spinner de upload / botão de remover
- Dados do Gestor inicial: nome*, e-mail*, senha*, telefone
- Validação completa com Zod
- Feedback de erro de servidor

---

## 🌐 Página Pública de Agendamento — `/booking/:slug`

Fluxo em 4 etapas (step bar visual):

### Etapa 1 — Profissional e Procedimento
- Cards de profissionais ativos com avatar colorido, nome e especialidade
- Ao selecionar um profissional, exibe os procedimentos disponíveis para ele
- Cards de procedimento com nome, duração e preço

### Etapa 2 — Data e Horário
- Seletor de data (próximos dias com agenda ativa)
- Slots de horário disponíveis carregados dinamicamente
- Indicação visual do slot selecionado

### Etapa 3 — Dados do Paciente
- Campos: nome*, telefone*, e-mail
- Validação inline com feedback visual

### Etapa 4 — Confirmação
- Tela de sucesso com resumo do agendamento (profissional, procedimento, data, horário)
- Instruções para o paciente

---

## 📌 Observações gerais

- Todas as páginas têm **skeleton loaders** durante o carregamento
- Animações de entrada (`fadeUp`) em cards e tabelas
- Layout responsivo com breakpoint em 768px
- Feedback de loading em todos os botões de ação (disabled + texto alternativo)
- Mensagens de erro de servidor exibidas inline (sem alert nativo)
- Navegação com TanStack Router (sem reload de página)
