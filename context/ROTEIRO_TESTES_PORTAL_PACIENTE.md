# Roteiro de Testes — Portal do Paciente
**MyAgendix** · Versão do Portal: V1 + M9 (Avaliação Rápida)

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
- Campos de nome/telefone/e-mail não são editáveis
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
| T08 | Booking | Agendar estando logado | ☐ |
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
