# Roteiro de Testes — Portal do Paciente
**MyAgendix** · Versão do Portal: V1 + M4 (Confirmação Rica) + M9 (Avaliação Rápida) + M10 (Gamificação)

> **Como usar este roteiro**
> Cada teste tem um **pré-requisito**, os **passos** e o **resultado esperado**.
> Marque ✅ ao passar, ❌ ao falhar (anote o que aconteceu).
> Alguns testes dependem de dados criados em testes anteriores — siga a ordem.

---

## Pré-requisitos gerais

- Sistema rodando localmente (API + Web)
- Pelo menos 1 **tenant** ativo com slug, ex: `minha-clinica`
- Pelo menos 1 **profissional** com procedimento e horário de trabalho configurados
- Acesso ao painel do gestor para configurar/verificar dados
- Um e-mail real (ou Mailtrap) para testar recuperação de senha

---

## BLOCO 1 — Agendamento Público (sem login)

### T01 — Agendar como novo paciente

**URL:** `/:slug`

**Passos:**
1. Acesse a página pública de agendamento
2. Escolha um profissional e um procedimento
3. Selecione uma data com horário disponível
4. Preencha nome, telefone e e-mail (use um e-mail ainda não cadastrado)
5. Clique em "Confirmar agendamento"

**Esperado:**
- Step 4 exibe resumo com profissional, serviço, data e horário corretos
- Exibe o bloco "Acesse sua conta" com o e-mail informado
- Botão exibe **"Entrar"** (não "Minha área", pois é um novo paciente)

---

### T02 — Tentar agendar no mesmo horário já ocupado

**Pré-requisito:** T01 concluído

**Passos:**
1. Abra uma aba anônima e acesse `/:slug`
2. Selecione o mesmo profissional, procedimento, data e horário do T01
3. Preencha dados de outro paciente e confirme

**Esperado:**
- Mensagem de erro: "O horário pode ter sido ocupado. Tente outro."
- Nenhum agendamento duplicado criado

---

### T03 — Visualizar horários: sem disponibilidade em uma data

**Passos:**
1. No Step 2, navegue por datas até encontrar uma sem horários configurados
2. Observe a tela

**Esperado:**
- Mensagem "Sem horários disponíveis. Tente outra data." sem travar a tela

---

## BLOCO 2 — Autenticação do Paciente

### T04 — Login com credenciais corretas

**URL:** `/:slug/minha-conta/login`

**Pré-requisito:** Paciente criado no T01 (ou criado manualmente pela clínica)

**Passos:**
1. Acesse a página de login
2. Insira o e-mail e senha do paciente
3. Clique em "Entrar"

**Esperado:**
- Redireciona para o Dashboard (`/:slug/minha-conta`)
- Nome do paciente aparece no cabeçalho do portal

---

### T05 — Login com senha errada

**Passos:**
1. Acesse `/:slug/minha-conta/login`
2. Insira o e-mail correto com senha errada
3. Clique em "Entrar"

**Esperado:**
- Mensagem de erro exibida (ex: "E-mail ou senha inválidos")
- Permanece na página de login

---

### T06 — Acesso direto à área logada sem autenticação

**Passos:**
1. Sem estar logado, acesse diretamente `/:slug/minha-conta/agendamentos`

**Esperado:**
- Redirecionado para `/:slug/minha-conta/login`

---

### T07 — Recuperação de senha (fluxo completo)

**Passos:**
1. Acesse `/:slug/minha-conta/login` → clique em "Esqueci minha senha"
2. Informe o e-mail cadastrado e envie
3. Acesse o e-mail recebido e clique no link de redefinição
4. Defina uma nova senha e confirme
5. Faça login com a nova senha

**Esperado:**
- Confirmação de envio de e-mail exibida
- Link redireciona para a página de redefinição
- Login com nova senha funciona normalmente

---

## BLOCO 3 — Agendamento Público (paciente já logado)

### T08 — Agendar estando logado

**Pré-requisito:** T04 concluído (paciente logado)

**Passos:**
1. Acesse `/:slug` (página pública de agendamento)
2. Observe o Step 3 (dados do paciente)
3. Conclua o agendamento

**Esperado:**
- Step 3 mostra banner "Agendando como [nome]" com dados bloqueados
- Campos de nome/e-mail não são editáveis
- Campo de telefone **não exibe erro de validação** mesmo que esteja vazio (paciente pode não ter telefone cadastrado)
- O agendamento usa a rota autenticada do portal (JWT) — **não re-envia dados pessoais pelo formulário**
- Step 4 exibe botão **"Minha área"** (não "Entrar")
- Clicar em "Minha área" leva direto para `/:slug/minha-conta/agendamentos`

---

## BLOCO 4 — Dashboard do Paciente

### T09 — Visualizar dashboard

**URL:** `/:slug/minha-conta`

**Passos:**
1. Acesse o dashboard após login

**Esperado:**
- Saudação com o primeiro nome do paciente
- Lista dos próximos agendamentos (até 3)
- Atalhos para "Meus Agendamentos" e "Meu Perfil"
- Se não houver próximos agendamentos, exibe mensagem de estado vazio

---

## BLOCO 5 — Meus Agendamentos

### T10 — Visualizar aba "Próximos"

**URL:** `/:slug/minha-conta/agendamentos`

**Passos:**
1. Acesse a página de agendamentos com a aba "Próximos" selecionada

**Esperado:**
- Lista agendamentos futuros com status SCHEDULED
- O agendamento mais próximo aparece **por último** (mais recente no topo)
- Cada card mostra: data, horário, procedimento, profissional e status

---

### T11 — Visualizar aba "Histórico"

**Passos:**
1. Clique na aba "Histórico"

**Esperado:**
- Lista agendamentos passados ou concluídos
- O mais recente aparece **no topo** da lista
- Agendamentos com status COMPLETED exibem o card de avaliação (se ainda não avaliados)

---

### T12 — Cancelar um agendamento

**Pré-requisito:** Agendamento com status SCHEDULED existente

**Passos:**
1. Na aba "Próximos", localize um agendamento elegível
2. Clique em "Cancelar"
3. Confirme no modal de confirmação

**Esperado:**
- Modal aparece com aviso antes de confirmar
- Após confirmar, card atualiza para status "Cancelado" sem recarregar a página
- Botão de cancelar desaparece

---

### T13 — Tentativa de cancelamento fora do prazo

**Pré-requisito:** Config de cancelamento definida com antecedência mínima (ex: 2h) — ver T22

**Passos:**
1. Tente cancelar um agendamento que começa em menos de 2 horas

**Esperado:**
- Mensagem de erro exibida explicando que o prazo passou
- Agendamento **não** é cancelado

---

## BLOCO 6 — Avaliação Rápida (M9)

### T14 — Avaliação positiva (😊 Ótimo)

**Pré-requisito:** Agendamento com status COMPLETED sem avaliação

**Passos:**
1. Na aba "Histórico", localize um agendamento COMPLETED sem avaliação
2. Observe o card de avaliação exibido automaticamente
3. Clique em 😊 (Ótimo)
4. Observe a tela de agradecimento
5. (Opcional) Clique em "Avaliar no Google Maps" — apenas se URL configurada
6. Clique em "Apenas confirmar avaliação"

**Esperado:**
- Ao clicar no emoji, a tela muda suavemente para a mensagem de agradecimento (sem piscar checkboxes)
- Botão exibe "Enviando..." durante o envio
- Tela mostra "Obrigado pelo feedback! 🙏" por ~1,5 segundo
- Card some e badge **"😊 Avaliado"** aparece no agendamento
- Não faz logout

---

### T15 — Avaliação regular (😐 Regular)

**Pré-requisito:** Outro agendamento COMPLETED sem avaliação

**Passos:**
1. Clique em 😐 (Regular)
2. Observe os checkboxes de motivo
3. Marque 1 ou mais motivos
4. Clique em "Enviar avaliação"

**Esperado:**
- Checkboxes aparecem sem piscar
- Os itens marcados ficam destacados visualmente
- Botão exibe "Enviando..." durante o envio
- "Obrigado pelo feedback! 🙏" exibido por ~1,5 segundo
- Badge **"😐 Avaliado"** aparece no card

---

### T16 — Avaliação ruim (😞 Ruim)

**Pré-requisito:** Outro agendamento COMPLETED sem avaliação

**Passos:**
1. Clique em 😞 (Ruim)
2. Observe a pergunta "Sentimos muito. O que aconteceu?"
3. Marque motivos e envie

**Esperado:**
- Mesmo comportamento do T15
- Badge **"😞 Avaliado"** aparece no card

---

### T17 — Agendamento já avaliado não mostra o card

**Pré-requisito:** T14, T15 ou T16 concluído

**Passos:**
1. Recarregue a página e verifique o agendamento já avaliado

**Esperado:**
- Card de avaliação **não aparece** para agendamentos já avaliados
- Badge "Avaliado" permanece visível

---

## BLOCO 7 — Perfil do Paciente

### T18 — Editar dados do perfil

**URL:** `/:slug/minha-conta/perfil`

**Passos:**
1. Acesse "Meu Perfil"
2. Altere o nome e/ou telefone
3. Clique em "Salvar alterações"

**Esperado:**
- Mensagem "Perfil atualizado com sucesso!" exibida em verde
- Dados atualizados no cabeçalho do portal imediatamente
- **Não faz logout** — permanece na página logado

---

### T19 — Botão "Salvar" desabilitado quando não há mudanças

**Passos:**
1. Acesse "Meu Perfil" sem alterar nenhum campo
2. Observe o botão "Salvar alterações"

**Esperado:**
- Botão aparece desabilitado (opaco, cursor não-permitido)

---

## BLOCO 8 — Segurança (Troca de Senha)

### T20 — Alterar senha com sucesso

**URL:** `/:slug/minha-conta/seguranca`

**Passos:**
1. Acesse "Segurança"
2. Preencha a senha atual, a nova senha e a confirmação
3. Salve

**Esperado:**
- Confirmação de sucesso exibida
- Login com a nova senha funciona na próxima vez

---

### T21 — Logout

**Passos:**
1. Clique no botão de logout no menu do portal

**Esperado:**
- Redirecionado para `/:slug/minha-conta/login`
- Ao tentar acessar `/:slug/minha-conta` diretamente, redireciona para login

---

## BLOCO 9 — Visão da Clínica (Gestor)

### T22 — Configurar regras de cancelamento do portal

**URL:** Painel do gestor → Configurações → Portal do Paciente

**Passos:**
1. Acesse a página de configurações do portal
2. Ative o cancelamento pelo paciente
3. Defina antecedência mínima (ex: 4 horas)
4. Defina quais status permitem cancelamento (ex: apenas "Agendado")
5. Salve

**Esperado:**
- Configuração salva com sucesso
- Teste T13 passa a bloquear cancelamentos fora do prazo definido aqui

---

### T23 — Desativar cancelamento pelo paciente

**Passos:**
1. Na mesma tela, desative o toggle "Permitir cancelamento"
2. Salve

**Esperado:**
- Botão "Cancelar" desaparece para o paciente no portal
- Nenhum agendamento pode ser cancelado via portal até reativar

---

### T24 — Verificar avaliação registrada no agendamento (clínica)

**Pré-requisito:** T14, T15 ou T16 concluído

**Passos:**
1. Acesse o painel da clínica → Agendamentos
2. Localize o agendamento avaliado pelo paciente

**Esperado:**
- Avaliação (emoji e motivos) visível no detalhe do agendamento

---

## BLOCO 10 — Confirmação Rica (M4)

> Esses testes cobrem o **Step 4** do agendamento público, reescrito para exibir
> informações detalhadas do profissional, procedimento e preparo.

### T25 — Exibir avatar e informações do profissional

**Pré-requisito:** Profissional com foto (avatarUrl) cadastrada

**Passos:**
1. Conclua um agendamento (T01 ou T08)
2. Observe o Step 4

**Esperado:**
- Avatar circular do profissional aparece no topo do card de confirmação
- Nome e especialidade visíveis abaixo do avatar

---

### T26 — Exibir badge de preço

**Pré-requisito:** Procedimento com `priceCents` configurado (ex: R$ 150,00)

**Passos:**
1. Selecione um procedimento com preço e conclua o agendamento

**Esperado:**
- Badge de preço "R$ 150,00" aparece no Step 4
- Se o procedimento não tem preço cadastrado, o badge **não aparece**

---

### T27 — Exibir instruções de preparo

**Pré-requisito:** Procedimento com `preparationInstructions` preenchido no painel do gestor

**Passos:**
1. Selecione esse procedimento e conclua o agendamento

**Esperado:**
- Callout âmbar "Preparo necessário" exibe as instruções de preparo
- Se o procedimento não tem instruções, o callout **não aparece**

---

### T28 — Baixar evento .ics ("Salvar na agenda")

**Pré-requisito:** T01 ou T08 concluído

**Passos:**
1. No Step 4, clique em "Salvar na agenda"

**Esperado:**
- Download de arquivo `.ics` iniciado imediatamente (sem server-side)
- Arquivo contém título, data, horário e clínica corretos
- Importável no Google Calendar, Apple Calendar e Outlook

---

### T29 — Abrir rota no Google Maps ("Como chegar")

**Pré-requisito:** Tenant com endereço (`address`) configurado

**Passos:**
1. No Step 4, clique em "Como chegar"

**Esperado:**
- Nova aba abre com o Google Maps usando o endereço da clínica
- Se a clínica não tem endereço, o botão **não aparece**

---

### T30 — Step 4 sem preço nem preparo (procedimento básico)

**Pré-requisito:** Procedimento sem `priceCents` e sem `preparationInstructions`

**Passos:**
1. Conclua um agendamento com esse procedimento

**Esperado:**
- Step 4 exibe normalmente sem badge de preço e sem callout de preparo
- Nenhum elemento vazio ou espaço em branco desnecessário

---

## BLOCO 11 — Gamificação / Fidelidade (M10)

> Testa o sistema de pontos e tiers exibido no dashboard do paciente.

### T31 — LoyaltyCard aparece no dashboard

**Pré-requisito:** Paciente logado

**Passos:**
1. Acesse `/:slug/minha-conta` após o login

**Esperado:**
- Card de fidelidade exibido com tier atual (BRONZE por padrão para novos pacientes)
- Pontos atuais: 0 (se nenhum evento de pontos ainda ocorreu)
- Barra de progresso vazia ou com valor proporcional
- Label do tier visível (ex: "Bronze")

---

### T32 — Pontos concedidos ao concluir agendamento

**Pré-requisito:** Agendamento com status COMPLETED (gestor altera o status para COMPLETED)

**Passos:**
1. No painel do gestor, altere um agendamento para "Concluído"
2. Acesse o dashboard do paciente

**Esperado:**
- Pontos aumentam em +30 (conclusão de agendamento)
- Barra de progresso avança proporcionalmente
- Tier permanece BRONZE (0–149 pts) ou avança se atingiu 150

---

### T33 — Bônus de primeiro agendamento concluído

**Pré-requisito:** Paciente com **zero** agendamentos concluídos anteriormente

**Passos:**
1. Conclua o **primeiro** agendamento do paciente (gestor marca como COMPLETED)
2. Acesse o dashboard

**Esperado:**
- Paciente recebe +30 (conclusão) **+ +20 (bônus de primeiro)** = **+50 pontos**
- O bônus só ocorre uma vez por paciente

---

### T34 — Pontos concedidos ao enviar avaliação rápida

**Pré-requisito:** Agendamento COMPLETED sem avaliação

**Passos:**
1. Envie uma avaliação rápida (T14, T15 ou T16)
2. Volte ao dashboard

**Esperado:**
- Pontos aumentam em **+10** (avaliação rápida)
- A segunda avaliação do mesmo agendamento **não concede pontos**

---

### T35 — Progressão de tier: BRONZE → SILVER

**Pré-requisito:** Paciente com 140 pontos acumulados

**Passos:**
1. Conclua mais 1 agendamento para atingir ≥ 150 pontos (≥ lifetime)
2. Verifique o dashboard

**Esperado:**
- Tier muda para **SILVER** automaticamente
- Label atualiza para "Silver" e o ícone/cor do tier refletem a mudança
- Barra de progresso exibe o progresso em direção ao GOLD (400 pts)

---

### T36 — Progressão de tier: SILVER → GOLD

**Pré-requisito:** Paciente com 380 pontos acumulados

**Passos:**
1. Conclua agendamentos até atingir ≥ 400 pontos
2. Verifique o dashboard

**Esperado:**
- Tier muda para **GOLD**
- Barra de progresso aparece cheia (ou indica tier máximo)

---

### T37 — Pontos não duplicados em re-avaliação

**Pré-requisito:** Agendamento já avaliado (T14, T15 ou T16)

**Passos:**
1. Não é possível reavaliar pelo portal — o card some após a avaliação
2. Verifique via banco que nenhuma segunda transação de `QUICK_RATING_SUBMITTED` existe para o mesmo agendamento

**Esperado:**
- Apenas **1** registro de `PointsTransaction` com reason `QUICK_RATING_SUBMITTED` por agendamento

---

## Resumo dos Cenários

| Código | Área | Descrição | Status |
|--------|------|-----------|--------|
| T01 | Booking | Agendar como novo paciente | ☐ |
| T02 | Booking | Bloquear horário já ocupado | ☐ |
| T03 | Booking | Data sem disponibilidade | ☐ |
| T04 | Auth | Login com credenciais corretas | ☐ |
| T05 | Auth | Login com senha errada | ☐ |
| T06 | Auth | Acesso direto sem autenticação | ☐ |
| T07 | Auth | Recuperação de senha completa | ☐ |
| T08 | Booking | Agendar estando logado (sem erro de telefone) | ☐ |
| T09 | Dashboard | Visualizar dashboard | ☐ |
| T10 | Agendamentos | Aba Próximos | ☐ |
| T11 | Agendamentos | Aba Histórico (ordem) | ☐ |
| T12 | Agendamentos | Cancelar agendamento | ☐ |
| T13 | Agendamentos | Cancelamento fora do prazo | ☐ |
| T14 | M9 | Avaliação positiva | ☐ |
| T15 | M9 | Avaliação regular + motivos | ☐ |
| T16 | M9 | Avaliação ruim + motivos | ☐ |
| T17 | M9 | Card não reaparece após avaliação | ☐ |
| T18 | Perfil | Editar dados sem logout | ☐ |
| T19 | Perfil | Botão salvar desabilitado | ☐ |
| T20 | Segurança | Alterar senha | ☐ |
| T21 | Auth | Logout | ☐ |
| T22 | Gestor | Configurar cancelamento | ☐ |
| T23 | Gestor | Desativar cancelamento | ☐ |
| T24 | Gestor | Ver avaliação no agendamento | ☐ |
| T25 | M4 | Avatar e info do profissional no Step 4 | ☐ |
| T26 | M4 | Badge de preço no Step 4 | ☐ |
| T27 | M4 | Instruções de preparo no Step 4 | ☐ |
| T28 | M4 | Download do arquivo .ics | ☐ |
| T29 | M4 | Link "Como chegar" (Google Maps) | ☐ |
| T30 | M4 | Step 4 sem preço nem preparo | ☐ |
| T31 | M10 | LoyaltyCard no dashboard | ☐ |
| T32 | M10 | Pontos ao concluir agendamento (+30) | ☐ |
| T33 | M10 | Bônus de primeiro agendamento (+20) | ☐ |
| T34 | M10 | Pontos ao avaliar (+10) | ☐ |
| T35 | M10 | Progressão BRONZE → SILVER (150 pts) | ☐ |
| T36 | M10 | Progressão SILVER → GOLD (400 pts) | ☐ |
| T37 | M10 | Pontos não duplicados em re-avaliação | ☐ |
