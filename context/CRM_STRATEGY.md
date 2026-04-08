# MyAgendix — Estratégia de CRM e Dados do Paciente

> Última atualização: Abril de 2026
> Objetivo: guiar a evolução do cadastro de paciente para suportar CRM, automação de marketing e segmentação

---

## Visão Geral

Para que o MyAgendix evolua de agenda para plataforma de crescimento (CRM + automação de marketing), o cadastro do paciente deve conter dados que permitam segmentação, personalização de campanhas e análise de comportamento.

O cadastro é estruturado em **3 níveis de coleta**, respeitando o momento da jornada do paciente:

| Nível   | Quando         | Campos                                      |
|---------|----------------|---------------------------------------------|
| Nível 1 | Cadastro rápido (MVP1 — página pública) | Nome, telefone |
| Nível 2 | Complemento (MVP1/MVP2 — pós-cadastro) | E-mail, data de nascimento, preferências |
| Nível 3 | CRM (MVP2/Fase 3 — acumulado ao longo do tempo) | Histórico, comportamento, valor do paciente |

---

## 1. Dados Básicos de Identificação

Necessários para identificação e comunicação. **MVP1.**

| Campo              | Uso estratégico                               |
|--------------------|-----------------------------------------------|
| Nome completo      | Personalização de comunicação                 |
| Telefone           | Principal canal de contato                    |
| E-mail             | Canal secundário, campanhas                   |
| Data de nascimento | Campanhas de aniversário                      |
| Gênero             | Segmentação e personalização                  |
| Cidade / Região    | Segmentação geográfica                        |

---

## 2. Dados de Comunicação e Preferência de Contato

Permite respeitar o canal e horário preferido do paciente. **MVP2.**

| Campo                            | Uso estratégico                             |
|----------------------------------|---------------------------------------------|
| Canal preferido (WhatsApp/Email) | Aumentar taxa de abertura de campanhas      |
| Horário preferido para contato   | Evitar mensagens em horários inconvenientes |
| Opt-in para promoções (LGPD)     | Base legal para envio de campanhas          |

---

## 3. Dados de Comportamento de Agendamento

Gerados automaticamente pelo sistema a partir dos agendamentos. **MVP2 — calculados.**

| Dado                        | Como é calculado                         |
|-----------------------------|------------------------------------------|
| Frequência de visitas       | Média de dias entre consultas            |
| Data da última consulta     | Query em `appointments`                  |
| Total de consultas          | Count em `appointments`                  |
| Histórico de cancelamentos  | Count por `canceled_by = PATIENT`        |
| Histórico de faltas         | Count por status específico (futuro)     |

---

## 4. Histórico de Procedimentos

Fundamental para o motor de retenção. **MVP2.**

Já coberto pela tabela `appointments` — cada consulta registra procedimento, data e profissional. A análise de frequência por procedimento alimenta os lembretes automáticos:

- Limpeza de pele → lembrete em 30 dias
- Botox → lembrete em 4 meses
- Consulta → retorno conforme ciclo do profissional

---

## 5. Interesses do Paciente

Permite campanhas segmentadas antes mesmo de um histórico de atendimentos. **MVP2.**

| Campo                     | Exemplo                           |
|---------------------------|-----------------------------------|
| Procedimentos de interesse | Botox, Limpeza de pele, Laser     |
| Áreas de interesse         | Estética facial, Corporal         |
| Interesse em promoções     | Booleano — opt-in específico      |

---

## 6. Dados Demográficos Opcionais

Melhoram a segmentação sem serem obrigatórios. **Fase 3.**

- Faixa etária (derivada da data de nascimento)
- Profissão
- Estado civil

---

## 7. Dados de Experiência do Paciente

Coletados após atendimentos. **MVP1** (estrelas + comentário) → **MVP2** (análise).

Já coberto por `appointment_evaluations`. Em MVP2, o sistema identifica padrões de insatisfação e alerta o gestor.

---

## 8. Valor do Paciente — Customer Value

Calculado automaticamente pelo sistema. **MVP2.**

| Métrica                   | Cálculo                                        |
|---------------------------|------------------------------------------------|
| Valor total gasto         | Soma do valor dos procedimentos realizados     |
| Número de consultas        | Count em `appointments` por paciente           |
| Ticket médio              | Valor total ÷ número de consultas              |
| Classificação             | Regra configurável: Bronze / Prata / Ouro      |

> **Nota:** Para calcular valor total gasto, os procedimentos precisarão ter um campo `price_cents` no futuro (Fase 3 — gestão financeira). No MVP2, a classificação pode ser baseada em volume de consultas como proxy.

---

## 9. Preferências de Horário

Melhora as sugestões automáticas de agendamento. **MVP2.**

| Campo                      | Uso                                        |
|----------------------------|--------------------------------------------|
| Horário preferido          | Sugestão inteligente de slots              |
| Dias preferidos da semana  | Priorização na agenda inteligente          |

---

## 10. Dados Operacionais Internos

Visíveis apenas pela equipe da clínica. **MVP1.**

Já coberto por `patient_evaluations` (observações + tags do profissional) e `patients.notes`.

---

## 11. Segmentos Automáticos do CRM

Com os dados estruturados, o sistema criará segmentos automaticamente:

| Segmento                      | Critério                                        |
|-------------------------------|--------------------------------------------------|
| Sem retorno em 6 meses        | `last_appointment_date < hoje - 180 dias`       |
| Pacientes de botox            | Procedimento botox no histórico                  |
| Alto risco de falta           | Histórico de cancelamentos > threshold           |
| Ticket alto (Ouro)            | Classificação = GOLD                             |
| Paciente novo                 | Total de consultas = 1                           |
| Aniversariante do mês         | `birth_date` no mês atual                       |

---

## 12. Fluxo de Automação — Motor de Retenção

```
Paciente realiza procedimento
        ↓
Sistema registra data + procedimento
        ↓
Worker calcula tempo médio de retorno para o procedimento
        ↓
Sistema envia lembrete automático no momento certo
        ↓
Paciente agenda nova consulta
```

---

## 13. Impacto no Modelo de Dados

As informações desta estratégia implicam as seguintes adições ao banco:

**Campos adicionados à tabela `patients`:**
- `gender`, `city`, `preferred_contact_channel`, `preferred_contact_time_start`, `preferred_days_of_week[]`, `marketing_opt_in`

**Nova tabela `patient_interests`:**
- Procedimentos e áreas de interesse declarados pelo paciente

**Nova tabela `patient_crm_metrics`** (MVP2 — atualizada por worker):
- `total_appointments`, `last_appointment_at`, `cancellation_count`, `classification`, `preferred_appointment_hour`

Ver detalhes em `DBMODEL.md`.
