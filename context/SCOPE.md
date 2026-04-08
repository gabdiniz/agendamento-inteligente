# MyAgendix — Definição de Escopo

> Última atualização: Abril de 2026
> Status: Aprovado para desenvolvimento

---

## Sobre o Produto

MyAgendix é uma plataforma SaaS multi-tenant de agendamento inteligente para clínicas e outros negócios baseados em atendimento. Cada cliente que adere ao produto opera em um ambiente completamente isolado, com sua própria agenda, profissionais, pacientes e configurações personalizadas.

O produto é composto por:
- Uma **aplicação web** utilizada pelos profissionais e equipe do cliente
- Uma **página pública de agendamento** por clínica acessível via navegador sem autenticação

> **Nota:** Aplicativo mobile não está no escopo atual. Poderá ser considerado em fase futura.

---

## Papéis e Plataformas

| Papel         | Plataforma              | Observação                                          |
|---------------|-------------------------|-----------------------------------------------------|
| Paciente      | Web (Página Pública)    | Agendamento via `myagendix.com/{clinica}`, sem app  |
| Gestor        | Web App                 | Painel administrativo da clínica                    |
| Profissional  | Web App (responsivo)    | Acesso via browser, inclusive no celular            |
| Recepção      | Web App                 | Operação diária de agendamentos                     |
| Super Admin   | Web App                 | Cadastro e gestão de clínicas na plataforma         |

**Flexibilidade de papéis:** o perfil Gestor poderá atuar também como Profissional e Recepção, permitindo que clínicas pequenas utilizem o sistema com equipes reduzidas.

---

## MVP1 — Escopo da Versão 1.0

### Objetivo

Entregar o ciclo central de valor da plataforma de ponta a ponta:
- Clínica cadastrada e configurada na plataforma
- Paciente acessando a página pública e realizando agendamento
- Profissional visualizando sua agenda e gerenciando atendimentos
- Recepção operando o dia a dia de agendamentos manuais e chegada de pacientes
- Coleta inicial de feedback via avaliações de atendimento

---

### Módulos do MVP1

#### Autenticação e Multi-Tenancy
- Login para todos os papéis (Gestor, Profissional, Recepção)
- Isolamento completo de dados por cliente (tenant)
- Link de convite/acesso da clínica com vínculo automático ao tenant

#### Super Admin
- Cadastro de nova clínica na plataforma
- Criação do usuário Gestor inicial da clínica
- Listagem e ativação/desativação de clínicas
- Ativação de contrato (plano básico / Pró)

#### Gestão da Clínica (Gestor)
- Cadastro e gestão de profissionais (nome, especialidade, procedimentos, horários)
- Cadastro e gestão de procedimentos (nome, descrição, duração, profissionais habilitados)
- Configuração básica da agenda (horários de atendimento, intervalos entre consultas, dias não trabalhados)

#### Agendamento
- Agendamento manual pela recepção (profissional, procedimento, data, horário)
- Agendamento self-service pelo paciente via página pública
- Cancelamento de consulta (pelo paciente na página pública ou pela recepção)

#### Página Pública de Agendamento
Cada clínica possui uma página pública para agendamentos sem necessidade de login.

- URL exclusiva por clínica: `myagendix.com/{slug}`
- Exibição de procedimentos disponíveis
- Exibição de profissionais disponíveis
- Seleção de data e horário
- Cadastro rápido do paciente (nome, telefone, e-mail opcional)
- Confirmação de agendamento

#### Agenda
- Visualização diária e semanal (Gestor, Profissional, Recepção)
- Registro de chegada do paciente pela recepção
- Confirmação de início e finalização de atendimento pelo profissional

#### Status do Atendimento
Controle do ciclo completo da consulta:
- `Agendado`
- `Paciente presente`
- `Atendimento iniciado`
- `Atendimento concluído`
- `Cancelado`

#### Lista de Espera
- Paciente entra na fila para procedimento ou profissional desejado
- Definição de antecedência mínima pelo paciente
- Notificação automática quando uma vaga é liberada
- Confirmação ou recusa da vaga pelo paciente

#### Notificações
- Confirmação de agendamento
- Lembrete de consulta
- Notificação de vaga liberada (lista de espera)
- Canais: **WhatsApp** (Z-API) e **SMS** (Twilio fallback)

#### Sistema de Convite de Pacientes
- Geração de link de convite/acesso da clínica
- Envio via WhatsApp
- Envio via SMS
- Geração de QR Code

#### Avaliação de Atendimento (pelo Paciente)
Após a conclusão de um atendimento, o paciente pode registrar uma avaliação:
- Avaliação de 1 a 5 estrelas
- Comentário opcional
- Registro vinculado ao atendimento
- Visível para Gestor e Profissional responsável

#### Avaliação de Paciente (pelo Profissional)
Profissionais podem registrar observações internas sobre pacientes:
- Exemplos: pontualidade, histórico de faltas, perfil de atendimento
- Visível apenas internamente pela clínica

#### Histórico de Atendimentos
Registro completo dos atendimentos realizados:
- Paciente, profissional, procedimento, data, status, observações

#### Dashboard Básico
Painel simples de acompanhamento da agenda:
- Total de consultas agendadas
- Total de consultas realizadas
- Total de cancelamentos
- Taxa de ocupação da agenda

---

## MVP2 — Escopo da Versão 2.0

### Objetivo

Transformar o MyAgendix de um sistema de agendamento em uma **plataforma de relacionamento com pacientes e crescimento da agenda**.

Posicionamento: *"A plataforma que ajuda clínicas a encher a agenda automaticamente."*

### Metas da fase
- Reduzir faltas de pacientes
- Aumentar a taxa de retorno
- Automatizar comunicação com pacientes
- Gerar novos agendamentos
- Permitir contratação automatizada da plataforma (self-service)

---

### Módulos do MVP2

#### Assistente Inteligente da Clínica (IA — Gemini)
Cada clínica terá um assistente virtual configurável via chat na página pública:
- Respostas sobre procedimentos, horários e dúvidas comuns
- Consulta da agenda em tempo real
- Sugestão de horários disponíveis
- Explicação de procedimentos
- Sugestão de promoções da clínica

Configurável pelo Gestor: nome do assistente, tom de comunicação, FAQ, promoções ativas.

#### Chat entre Paciente e Clínica
Sistema de mensagens dentro da plataforma:
- Paciente ↔ Recepção ↔ Profissional
- Envio de lembretes e orientações pós-atendimento

#### Sistema de Campanhas e Promoções
- Criação de campanhas
- Segmentação de pacientes
- Envio de notificações (WhatsApp, push futuro)
- Exemplos: promoções sazonais, procedimentos com desconto, campanhas de retorno

#### Motor de Retenção de Pacientes
Sistema que identifica pacientes que não retornaram após determinado período:
- Identificação automática de pacientes sem retorno
- Envio de notificações automáticas com sugestão de agendamento
- Exemplo: *"Você realizou uma limpeza de pele há 6 meses. Deseja agendar novamente?"*

#### Sugestões Inteligentes de Agendamento
- Sugestão automática de horários baseada na disponibilidade real da agenda
- Redução de fricção no processo de agendamento

#### Dashboard Analítico (Gestor)
- Taxa de ocupação da agenda
- Taxa de faltas
- Número de novos pacientes
- Número de pacientes recorrentes
- Procedimentos mais realizados

#### Integração com Meios de Pagamento (Planos SaaS)
Permite que clínicas adquiram e gerenciem planos diretamente na plataforma:

**Meios de pagamento suportados:** Cartão de crédito, PIX, Boleto bancário

**Gateways previstos:** Stripe, Mercado Pago, Pagar.me, Asaas

**Painel do Gestor:**
- Visualizar plano atual e histórico de pagamentos
- Alterar plano contratado
- Atualizar método de pagamento

**Painel Super Admin:**
- Criação de planos e definição de preços
- Definição de limites por plano
- Visualização de assinaturas ativas

---

## Fase 3 — Futuro

- CRM completo de pacientes
- Prontuário eletrônico
- Automação de marketing avançada
- Pagamentos de procedimentos (cobrar paciente pelo app)
- Gestão financeira da clínica
- Analytics avançado
- Aplicativo mobile (iOS / Android)

---

## Fluxo de Valor — Visão Geral

```
MVP1: Operação
Clínica configurada → Paciente agenda (página pública) → Profissional atende → Avaliação registrada

MVP2: Crescimento
Paciente atendido → Sistema monitora retorno → Notificação automática → Novo agendamento
                 → IA auxilia no chat → Mais conversões
                 → Campanhas segmentadas → Maior ocupação
```
