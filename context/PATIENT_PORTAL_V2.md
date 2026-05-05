# Portal do Paciente — V2 — Jornada Nota 10

> Última atualização: Abril de 2026
> Referência: "A Jornada Ideal — 12 Momentos"
> Status: Planejado — pós MVP1

---

## Premissa

Este documento descreve as funcionalidades da V2 do Portal do Paciente, derivadas dos 12 momentos da jornada ideal. **Não substitui nem contradiz o PATIENT_PORTAL.md (V1).** Tudo aqui é incremental — cada feature assume que a V1 está em produção e funcionando.

Funcionalidades já cobertas pela V1 ou pelo SCOPE.md (avaliações básicas, histórico, CRM base, motor de retenção, campanhas, IA) são mencionadas apenas quando a V2 adiciona algo novo sobre elas.

---

## M1 — Descoberta Instantânea

### Reconhecimento de Cliente Recorrente

Quando um paciente já cadastrado acessa `/:slug`, o sistema detecta automaticamente que é um retorno e personaliza a experiência sem exigir login.

**Mecanismo de reconhecimento (por ordem de prioridade):**
1. JWT de paciente armazenado no dispositivo (já logado)
2. Cookie persistente vinculado ao `patientId` (consentimento LGPD exibido na primeira visita)
3. Número de telefone digitado no Step 3 — neste ponto o sistema já sabe quem é e pode adaptar o restante do fluxo

**Comportamento para cliente recorrente:**
- Exibe saudação personalizada: *"Olá, Coutinho — repetir seu último atendimento?"*
- Botão principal: **Repetir último atendimento** — preenche automaticamente profissional e procedimento do último agendamento e vai direto para seleção de horário
- Botão secundário: **Escolher outro serviço** — fluxo normal

**Dados necessários no backend:**
- `GET /t/:slug/public/returning?phone=` — verifica se telefone pertence a paciente existente e retorna `{ name, lastProcedureName, lastProfessionalName }` (sem dados sensíveis)

---

### Social Proof e Escassez Suave

Elementos exibidos na página de booking para novos visitantes, configuráveis pelo gestor da clínica.

**Social Proof:**
- Nota média da clínica (baseada nas `AppointmentEvaluation` existentes)
- Total de atendimentos realizados ("+ de 1.200 atendimentos")
- Depoimentos em destaque (texto curto, inserido manualmente pelo gestor)

**Escassez suave:**
- "Restam X horários hoje" — calculado em tempo real a partir dos slots disponíveis
- Exibido apenas quando `X <= 5` (threshold configurável pelo gestor)

**Novo modelo:** `ClinicPublicPageConfig` — configurações da página pública (exibir/ocultar social proof, threshold de escassez, depoimentos).

---

## M2 — Decisão em 2 Telas

### Sugestão Inteligente de Serviço

Para clientes recorrentes, o Step 1 do booking destaca o "serviço usual" (procedimento mais agendado pelo paciente) no topo da lista, com tag visual "Seu favorito".

**Lógica:** `COUNT(appointments) GROUP BY procedureId WHERE patientId = X ORDER BY count DESC LIMIT 1`

### Sugestão Inteligente de Horários

No Step 2 (seleção de data/hora), em vez de uma grade genérica, o sistema sugere 3 horários em destaque baseados no padrão histórico do paciente (dia da semana e faixa horária mais frequentes).

**Dados necessários:**
- Campo `preferredAppointmentHour` já existe em `PatientCrmMetrics`
- Adicionar `preferredDayOfWeek` (SmallInt) em `PatientCrmMetrics`
- Worker que atualiza esses campos após cada agendamento concluído

### Card de Confirmação Completo (Step 4)

O card de confirmação final exibe, além do que já existe:
- Foto do profissional (`professional.avatarUrl`)
- Duração do procedimento
- Valor (se `procedure.priceCents` estiver preenchido)
- Link de rota para o endereço da clínica (`tenant.address` → Google Maps)
- Instruções de preparo (novo campo `procedure.preparationInstructions` — texto opcional)
- Botões de ação: **Salvar na agenda** (link `.ics`), **Compartilhar**, **Como chegar**

**Novo campo no modelo `Procedure`:** `preparationInstructions String?`

---

## M3 — Cadastro Invisível

### Progressive Profiling

A cada retorno do paciente (segundo agendamento em diante), o sistema solicita um único dado novo — nunca mais de um por visita — com benefício explícito associado.

**Sequência sugerida (configurável):**

| Visita | Dado solicitado | Benefício exibido |
|--------|----------------|-------------------|
| 2ª | Data de aniversário | "Ganhe um mimo especial no seu mês" |
| 3ª | Gênero | "Personalizamos as sugestões para você" |
| 4ª | Canal de preferência (WhatsApp/SMS/Email) | "Receba lembretes no canal que preferir" |
| 5ª+ | opt-in marketing | "Receba promoções exclusivas" |

**Implementação:** campo `progressiveProfilingStep Int @default(0)` no modelo `Patient`. O booking público verifica o step atual e, após o agendamento criado, exibe um modal discreto pedindo o próximo dado.

---

## M4 — Confirmação Rica

### Mensagem de Confirmação Aprimorada (WhatsApp)

O template de confirmação existente (`WhatsappTemplate`) ganha novos campos dinâmicos disponíveis:
- `{{profissional_foto_url}}` — URL da foto (para canais que suportam imagem)
- `{{duracao}}` — duração do procedimento em minutos
- `{{valor}}` — valor formatado (se disponível)
- `{{preparo}}` — instruções de preparo (se disponível)
- `{{rota_url}}` — link Google Maps para o endereço da clínica

**Botões de ação no WhatsApp** (via Z-API, se suportado pelo plano):
- Confirmar presença
- Reagendar
- Cancelar
- Como chegar

---

## M5 — Lembrete com Valor

### Cadência de Lembretes em Dois Momentos

Atualmente o sistema envia um lembrete único (configurável em horas, padrão 24h). A V2 adiciona um segundo lembrete próximo ao atendimento.

**Dois lembretes configuráveis pelo gestor:**
- `reminderHoursBefore` (já existe) — lembrete principal (padrão 24h): resumo + instruções de preparo + link de rota
- `reminderMinutesBefore` (novo campo em `Tenant`) — lembrete de chegada (padrão 240 min / 4h): localização + botão de check-in antecipado

**Novos campos em `Tenant`:** `reminderMinutesBefore Int @default(240)`

### Check-in Antecipado

O lembrete de 4h inclui um link de check-in antecipado: `/:slug/checkin/:appointmentToken`. Ao abrir, o paciente confirma que está a caminho. O sistema marca `appointment.patientCheckedInAt` e notifica a recepção em tempo real (via Socket.io já existente).

**Novos campos em `Appointment`:** `patientCheckedInAt DateTime? @db.Timestamptz`

---

## M6 — Chegada Fluida

### Geofence (Detecção Automática de Chegada)

Com permissão do paciente, o navegador monitora a geolocalização. Quando o paciente entra num raio configurável do endereço da clínica, o sistema registra a chegada automaticamente.

**Configuração da clínica:**
- `tenant.address` (já existe) — endereço em texto, geocodificado via API (Google Maps Geocoding ou Nominatim)
- `tenant.geofenceRadiusMeters Int @default(200)` — raio de detecção configurável

**Fluxo:**
1. Lembrete de 4h inclui opt-in para geofence ("Quer que avisemos a clínica quando você chegar?")
2. Se aceito, a página de check-in abre em background e monitora coordenadas
3. Ao entrar no raio, dispara `POST /t/:slug/patient/appointments/:id/arrived`
4. Fallback: botão manual "Cheguei" sempre disponível

**Consentimento:** opt-in explícito por agendamento, não persistido automaticamente.

### Gestão de Atraso

Se o paciente abrir a página de check-in após o horário agendado, é exibida a tela de atraso:
- Opções: +5, +10, +15, +20 min ou cancelar
- Valor do botão configurável pelo gestor (`cancellationAllowedLateMinutes`)
- Ao selecionar, cria notificação interna para a recepção e atualiza `appointment.estimatedArrivalDelayMinutes`

**Novo campo em `Appointment`:** `estimatedArrivalDelayMinutes Int?`

### Posição na Fila

Durante a espera, o paciente pode ver sua posição na fila do profissional naquele dia.

`GET /t/:slug/patient/appointments/:id/queue-position`

Retorna: `{ position: 2, estimatedWaitMinutes: 15 }` — calculado com base nos agendamentos anteriores do dia para o mesmo profissional e seus status atuais.

---

## M7 — Acompanhamento ao Vivo

### Status em Tempo Real

O paciente pode abrir a página do agendamento e ver o status atual em tempo real, sem precisar recarregar a página.

**Implementação:** Socket.io já está no projeto. Criar room por `appointmentId`. Quando a recepção ou profissional atualiza o status (fluxo já existente), emitir evento `appointment:status_changed` para o room.

**Estados exibidos ao paciente (linguagem simplificada):**

| Status interno | Texto exibido ao paciente |
|---------------|--------------------------|
| SCHEDULED | Aguardando seu atendimento |
| PATIENT_PRESENT | Recepção avisada — aguarde |
| IN_PROGRESS | Em atendimento |
| COMPLETED | Concluído |
| CANCELED | Cancelado |

### Upsell Digital Durante o Atendimento

O profissional pode, durante o atendimento (`IN_PROGRESS`), enviar uma oferta de serviço adicional para o celular do paciente.

**Fluxo:**
1. Profissional seleciona um procedimento adicional na tela de atendimento e clica em "Oferecer ao paciente"
2. Sistema cria `ServiceOffer { appointmentId, procedureId, status: PENDING, expiresAt: +5min }`
3. Paciente recebe notificação em tempo real na página do agendamento
4. Paciente aceita ou recusa com 1 toque
5. Se aceito: cria novo agendamento sequencial (mesmo dia, logo após o término do atual) ou adiciona ao `notes` do atendimento atual
6. Se recusado ou expirado: sem ação

**Novo modelo:** `ServiceOffer`

---

## M8 — Encerramento Zero-Fricção

### Tela de Resumo Pós-Atendimento

Quando o status muda para `COMPLETED`, o paciente (se logado ou com o link de acompanhamento aberto) vê uma tela de encerramento:
- Resumo: o que foi feito, profissional, duração real
- Valor total
- Pontos ganhos (gamificação)
- Badge conquistado (se aplicável)
- Botão principal: **Agendar retorno** — data já sugerida (hoje + cadência padrão do procedimento)

**Cadência padrão do procedimento:** novo campo `procedure.suggestedReturnDays Int?` — quantos dias o gestor recomenda para retorno. Usado para pré-preencher a sugestão de reagendamento.

### Pagamento pelo App

Integração com gateway de pagamento para que o paciente finalize o pagamento pelo celular antes de sair.

> **Nota:** Este módulo se alinha com "Pagamentos de procedimentos" já previsto na Fase 3 do SCOPE.md. A V2 do portal antecipa a UX do paciente; a integração financeira completa segue o roadmap de billing.

**Fluxo simplificado V2:**
1. Após `COMPLETED`, sistema exibe valor do procedimento
2. Botão: **Pagar agora** → redireciona para link de pagamento do gateway (Pagar.me / Asaas)
3. Confirmação de pagamento registrada em `AppointmentPayment { appointmentId, amountCents, method, paidAt, externalId }`

**Novo modelo:** `AppointmentPayment`

---

## M9 — Avaliação Leve

### Fluxo de Avaliação Aprimorado

A avaliação atual (1–5 estrelas + comentário) é substituída por um fluxo em dois momentos:

**Momento 1 — Emoji rápido (imediato após COMPLETED):**
- Três opções: 😊 😐 😞
- Se positivo (😊): convite para avaliar no Google Maps (link direto) e/ou compartilhar no Instagram — 1 toque cada
- Se neutro/negativo: campo de motivo com opções rápidas (checkboxes: "Esperei muito", "Resultado abaixo do esperado", "Problema com atendimento") + botão opcional "Falar com a clínica" (abre conversa no módulo de chat, MVP2)
- Avaliação salva como `AppointmentEvaluation` com campo `quickRating: POSITIVE | NEUTRAL | NEGATIVE`

**Momento 2 — Avaliação detalhada (opcional, 24h depois via WhatsApp):**
- Link para avaliação completa (estrelas + comentário) enviado por WhatsApp
- Mesmo modelo `AppointmentEvaluation` já existente, agora com campo `quickRating` adicional

**Novos campos em `AppointmentEvaluation`:**
- `quickRating QuickRating?` — enum: `POSITIVE | NEUTRAL | NEGATIVE`
- `quickRatingReasons String[]` — motivos selecionados no fluxo negativo/neutro
- `detailedRatingRequestedAt DateTime?` — quando o link de avaliação detalhada foi enviado

---

## M10 — Recompensa Imediata (Gamificação)

### Sistema de Pontos e Tiers

> `PatientCrmMetrics` já tem `totalAppointments` e `classification (BRONZE/SILVER/GOLD)`. A V2 adiciona pontos explícitos e a UX de gamificação.

**Regras de pontos (configuráveis pelo gestor):**

| Ação | Pontos padrão |
|------|--------------|
| Agendamento concluído | +30 pts |
| Avaliação realizada | +10 pts |
| Check-in pontual (sem atraso) | +5 pts |
| Indicação convertida | +50 pts |
| Aniversário | +20 pts |
| Primeiro agendamento | +20 pts (bônus) |

**Tiers (thresholds configuráveis pelo gestor):**

| Tier | Threshold padrão |
|------|-----------------|
| Bronze | 0 pts |
| Silver | 150 pts |
| Gold | 400 pts |

**Novos campos em `PatientCrmMetrics`:**
- `loyaltyPoints Int @default(0)` — pontos acumulados
- `lifetimePoints Int @default(0)` — pontos totais históricos (nunca diminui)

**Novo modelo:** `PointsTransaction { patientId, points, reason, appointmentId?, createdAt }` — log de cada transação de pontos.

**Novo modelo:** `Badge { slug, name, description, iconUrl }` + `PatientBadge { patientId, badgeSlug, earnedAt }` — conquistas do paciente.

**Exemplos de badges:** `primeira-consulta`, `5-consultas`, `avaliador-fiel`, `pontual`, `gold-member`.

**UX no portal:**
- Barra de progresso para próximo tier: "faltam 60 pts para Gold"
- Animação leve ao ganhar pontos (CSS keyframes, sem lib externa)
- Tela de conquistas: badges com data de obtenção
- Compartilhamento de badge (imagem estática gerada server-side)

---

## M11 — Memória Ativa

### Motor de Cadência Inteligente

> O SCOPE.md já prevê o "Motor de Retenção". Este módulo detalha como ele funciona na V2 do portal.

**Lógica de cálculo da cadência:**
1. Busca os últimos 3 agendamentos do paciente para o mesmo procedimento
2. Calcula a média de dias entre eles
3. Se não há histórico suficiente, usa `procedure.suggestedReturnDays` como fallback
4. Agenda um job (BullMQ) para `lastAppointmentDate + avgDays`

**Mensagem proativa:**
- Enviada pelo canal de preferência do paciente (`preferredContactChannel`)
- Tom personalizado: usa o nome do paciente, nome do procedimento, nome do profissional preferido
- Inclui 1 link direto para booking com profissional e procedimento pré-selecionados

**Auto-hold (opcional, configurável pela clínica):**
- Se habilitado, o sistema faz uma "reserva tentativa" no horário mais compatível com o padrão do paciente (dia da semana + faixa horária histórica)
- A mensagem inclui: *"Já reservei um horário que combina com você — confirmar?"*
- O slot fica em status `TENTATIVE` por 24h; se não confirmado, é liberado automaticamente

**Novo status em `AppointmentStatus`:** `TENTATIVE` — reserva automática pendente de confirmação do paciente.

---

## M12 — Retorno Ágil

### Experiência Personalizada na Abertura

Para pacientes logados que retornam ao portal, a tela inicial (`/:slug/minha-conta`) é personalizada:
- Saudação com nome
- Tier atual e pontos com barra de progresso
- Próximo agendamento em destaque (se houver)
- **Botão principal:** "Repetir último atendimento" ou "Agendar algo novo"
- Histórico resumido dos últimos atendimentos

> A maioria dessa UX já está prevista no `PatientDashboardPage` da V1. A V2 adiciona os elementos de gamificação (tier, pontos, barra de progresso) que dependem do M10.

---

## Resumo dos Novos Modelos de Dados

| Modelo | Propósito |
|--------|-----------|
| `ClinicPublicPageConfig` | Social proof, escassez, depoimentos (página pública) |
| `ServiceOffer` | Upsell digital durante atendimento |
| `AppointmentPayment` | Registro de pagamento pelo app |
| `PointsTransaction` | Log de pontos de fidelidade |
| `Badge` | Definição de conquistas |
| `PatientBadge` | Conquistas obtidas pelo paciente |

---

## Resumo dos Novos Campos em Modelos Existentes

| Modelo | Campo | Propósito |
|--------|-------|-----------|
| `Patient` | `progressiveProfilingStep Int @default(0)` | Progressive profiling |
| `Tenant` | `reminderMinutesBefore Int @default(240)` | Lembrete de chegada |
| `Tenant` | `geofenceRadiusMeters Int @default(200)` | Raio de geofence |
| `Procedure` | `preparationInstructions String?` | Instruções pré-atendimento |
| `Procedure` | `suggestedReturnDays Int?` | Cadência sugerida de retorno |
| `Appointment` | `patientCheckedInAt DateTime?` | Check-in antecipado |
| `Appointment` | `estimatedArrivalDelayMinutes Int?` | Atraso informado pelo paciente |
| `AppointmentEvaluation` | `quickRating QuickRating?` | Avaliação emoji rápida |
| `AppointmentEvaluation` | `quickRatingReasons String[]` | Motivos da avaliação negativa |
| `AppointmentEvaluation` | `detailedRatingRequestedAt DateTime?` | Controle do envio do link detalhado |
| `PatientCrmMetrics` | `loyaltyPoints Int @default(0)` | Pontos atuais |
| `PatientCrmMetrics` | `lifetimePoints Int @default(0)` | Pontos históricos totais |
| `PatientCrmMetrics` | `preferredDayOfWeek Int?` | Dia da semana preferido |
| `AppointmentStatus` | `TENTATIVE` | Reserva automática pendente |

---

## Novos Enums

```prisma
enum QuickRating {
  POSITIVE
  NEUTRAL
  NEGATIVE
}
```

---

## Dependências Técnicas Novas

| Feature | Dependência |
|---------|------------|
| Geofence | Geolocation API (browser nativo) + Geocoding API (Google ou Nominatim) |
| Status em tempo real (M7) | Socket.io (já no projeto) |
| Compartilhamento de badge | Sharp ou Canvas API (geração de imagem server-side) |
| Check-in / atraso | Deep link no WhatsApp + rota pública sem auth |
| Auto-hold | BullMQ delayed jobs (já no projeto) |
| Pagamento | Pagar.me ou Asaas SDK (MVP financeiro) |

---

## Ordem de Implementação Sugerida

Os momentos têm dependências entre si. Sequência recomendada por valor entregue / complexidade:

1. **M9 avaliação leve** — baixa complexidade, alto impacto no Google/Instagram
2. **M4 confirmação rica** — apenas novos campos em `Procedure` + template atualizado
3. **M10 gamificação básica** — pontos + tiers + animação no portal (sem badges ainda)
4. **M2 sugestão inteligente** — usa dados que já existem no CRM
5. **M5 duplo lembrete + check-in** — novo job BullMQ + página pública leve
6. **M1 reconhecimento de recorrente** — cookie + endpoint de lookup
7. **M3 progressive profiling** — modal pós-booking
8. **M6 chegada fluida** — geofence + gestão de atraso
9. **M7 status ao vivo + upsell** — Socket.io + modelo ServiceOffer
10. **M8 pagamento** — integração financeira (depende do roadmap billing)
11. **M10 badges** — após gamificação básica estabilizada
12. **M11 auto-hold** — após motor de cadência validado
