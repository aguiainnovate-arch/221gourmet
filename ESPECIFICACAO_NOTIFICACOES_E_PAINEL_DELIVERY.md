# Especificação: Notificações e Painel de Pedidos Delivery

**Papel:** Analista de Produto + QA + Designer de Fluxos  
**Contexto:** O restaurante não é notificado quando um cliente faz um pedido de delivery, e não existe uma área dedicada e fácil de encontrar para listar, visualizar e gerenciar esses pedidos.  
**Objetivo:** (1) Notificar o restaurante em tempo real (com fallback) ao criar um novo pedido de delivery; (2) Oferecer uma área clara no painel para listar, ver detalhes e alterar status dos pedidos de delivery.

---

## 1. Fluxo ponta a ponta (Cliente → Sistema → Painel do Restaurante)

### 1.1 Visão geral

```
[Cliente]                    [Sistema]                         [Painel Restaurante]
   |                             |                                      |
   |  Escolhe itens + endereço   |                                      |
   |  Confirma pedido            |                                      |
   |---------------------------> |                                      |
   |                             |  Persiste em Firestore (deliveries)   |
   |                             |  Dispara evento "novo pedido delivery"|
   |                             |------------------------------------->|  Notificação (in-app + som + badge)
   |                             |  (listener / poll fallback)           |  Lista atualizada (se tela aberta)
   |                             |                                      |
   |  "Pedido realizado!"        |                                      |  Restaurante abre "Pedidos Delivery"
   | <---------------------------|                                      |  Vê card do pedido (pending)
   |                             |                                      |
   |                             |                      [Aceitar]        |
   |                             | <-------------------------------------|  status → confirmed
   |                             |  Atualiza documento + (opcional) log  |
   |                             |------------------------------------->|  UI atualiza
   |                             |                                      |
   |                             |         [Em preparo] [Saiu] [Entregue] |
   |                             | <-------------------------------------|  Transições de status
   |                             |  Atualiza + notifica cliente (fase 2) |
```

### 1.2 Eventos e estados no fluxo

| Momento | Evento | Quem reage |
|--------|--------|------------|
| Cliente confirma pedido | `delivery_order_created` (pedido gravado em `deliveries`) | Sistema dispara notificação para o restaurante; painel atualiza lista se estiver na tela. |
| Restaurante aceita | `delivery_order_status_changed` (pending → confirmed) | Sistema atualiza documento; opcional: notificar cliente. |
| Restaurante avança status | `delivery_order_status_changed` (confirmed → preparing → delivering → delivered) | Sistema atualiza; painel reflete; opcional: notificar cliente. |
| Restaurante cancela | `delivery_order_cancelled` | Sistema atualiza (status cancelled + reason); painel reflete; opcional: notificar cliente. |

**Estados do pedido (já existentes no modelo):**  
`pending` → `confirmed` → `preparing` → `delivering` → `delivered`  
Ou fim em: `cancelled`.

---

## 2. Requisitos funcionais

### 2.1 Notificações

| ID | Requisito | Descrição |
|----|-----------|-----------|
| N01 | Notificação in-app | Quando um novo pedido de delivery for criado para o restaurante, exibir uma notificação in-app (toast/banner) no painel, desde que o usuário esteja logado e com a aba/painel aberta. |
| N02 | Som / alerta | Reproduzir um som curto (ou vibração em mobile) ao receber um novo pedido, configurável (ligado/desligado) nas configurações do restaurante. |
| N03 | Badge de contagem | Exibir badge numérico no item de menu "Cozinha" ou "Pedidos Delivery" com a quantidade de pedidos em status `pending` (aguardando aceite). Atualizar em tempo real ou na abertura da tela. |
| N04 | E-mail opcional | (Opcional) Enviar e-mail ao restaurante quando houver novo pedido, se o restaurante tiver optado e informado e-mail válido. |
| N05 | WhatsApp opcional | (Opcional) Enviar mensagem por WhatsApp (API/template) quando houver novo pedido, se configurado. |
| N06 | Fallback com painel fechado | Se o painel estiver fechado, ao reabrir o painel (ou ao carregar a página "Pedidos Delivery"), buscar os pedidos mais recentes e exibir badge/contagem de pendentes; opcionalmente exibir um resumo "Você tem X novos pedidos" na primeira tela após login. |
| N07 | Fallback sem tempo real | Se o canal em tempo real (ex.: listener Firestore) falhar ou não estiver disponível, usar polling (ex.: a cada 30–60 s) na tela "Pedidos Delivery" para atualizar a lista e, se houver pedidos novos desde a última leitura, disparar som + toast. |
| N08 | SLA para notificação | A notificação no painel (in-app + som) deve ser disparada em até **30 segundos** após a persistência do pedido no banco (considerando listener ativo ou primeiro poll). |

### 2.2 Página / área "Pedidos Delivery"

| ID | Requisito | Descrição |
|----|-----------|-----------|
| P01 | Área dedicada | Existir uma área/menu claramente identificável como "Pedidos Delivery" (ou "Cozinha > Pedidos Delivery"), acessível a usuários com permissão de delivery/cozinha. |
| P02 | Lista de pedidos | Listar todos os pedidos de delivery do restaurante, com informações mínimas: ID resumido, data/hora, cliente, status, total. |
| P03 | Filtros | Permitir filtrar por status (ex.: Pendentes, Aceitos, Em preparo, Saiu para entrega, Entregues, Cancelados) e, opcionalmente, por período (hoje, últimos 7 dias). |
| P04 | Busca | Permitir buscar por nome do cliente, telefone ou ID do pedido (parcial). |
| P05 | Ordenação | Ordenação padrão: mais recente primeiro; opcional: ordenar por data, status ou valor total. |
| P06 | Detalhes do pedido | Ao clicar em um pedido (ou botão "Ver detalhes"), exibir página ou modal com: cliente (nome, telefone, endereço), itens (nome, qtd, preço, observações), observações gerais, forma de pagamento, subtotal, taxa de entrega, total, horário do pedido, histórico de status (se houver log). |
| P07 | Ações de status | Na lista e/ou na tela de detalhes: botões para avançar o status (Aceitar → Em preparo → Saiu para entrega → Entregue) e para Cancelar/Recusar (com motivo obrigatório quando cancelado). |
| P08 | Atualização da lista | Na tela "Pedidos Delivery", a lista deve ser atualizada em tempo real (listener) ou por polling com intervalo definido (ex.: 30 s), para refletir novos pedidos e mudanças de status. |

---

## 3. Estados do pedido e transições

### 3.1 Diagrama de estados

```
                    [pending]
                        |
         Aceitar        |        Recusar/Cancelar
                        v               |
                  [confirmed]           v
                        |           [cancelled]
         Em preparo     |
                        v
                 [preparing]
                        |
         Saiu p/ entrega|
                        v
                 [delivering]
                        |
         Entregue       |
                        v
                 [delivered]
```

### 3.2 Transições permitidas e regras

| De | Para | Ação na UI | Regra / observação |
|----|------|------------|--------------------|
| pending | confirmed | "Aceitar pedido" | Apenas dono/gerente/atendente com permissão. |
| pending | cancelled | "Recusar pedido" | Motivo obrigatório; gravar em `cancellationReason`. |
| confirmed | preparing | "Iniciar preparo" | — |
| preparing | delivering | "Saiu para entrega" | — |
| delivering | delivered | "Marcar como entregue" | — |
| confirmed, preparing | cancelled | "Cancelar" | Motivo obrigatório. |

Não permitir: voltar de `confirmed` para `pending`, de `delivered` para qualquer outro, ou de `cancelled` para qualquer outro.

### 3.3 Permissões por papel

- **Dono / gerente:** Todas as ações (aceitar, alterar status, cancelar).
- **Atendente / cozinha:** Pode aceitar e alterar status; cancelar pode ser restrito a gerente (configurável).
- **Visualização:** Qualquer papel com acesso ao painel do restaurante e permissão "delivery" ou "cozinha" pode ver a lista; alteração de status conforme matriz acima.

*(Nota: hoje o projeto pode não ter papéis distintos; a matriz serve como especificação para quando houver.)*

---

## 4. UX sugerida

### 4.1 Navegação / menus no painel

- **Opção A (recomendada):** Manter item **"Cozinha"** no menu lateral; ao clicar, exibir sub-abas **"Pedidos Mesa"** e **"Pedidos Delivery"**. Badge no item "Cozinha" com soma de: pedidos de mesa "novo" + pedidos delivery "pending".
- **Opção B:** Item de primeiro nível **"Pedidos Delivery"** no menu (ao lado de Cozinha), levando direto à lista de delivery; badge com quantidade de `pending`.
- **Destacar:** "Pedidos Delivery" deve ser visível e nomeado de forma clara para o restaurante não confundir com "Configurações de Delivery" (que é configuração do canal, não da fila de pedidos).

### 4.2 Layout da lista

- **Visão Kanban (atual):** Colunas por status (Pendentes, Aceitos, Em preparo, Saiu, Entregues, Cancelados). Entregues e cancelados podem ficar em colunas à direita ou em aba "Histórico".
- **Visão lista (alternativa/complementar):** Tabela ou cards em lista única, com filtro por status e ordenação por data; cada linha/card com: #ID, data/hora, cliente, total, status, ações.
- **Card resumido:** Número do pedido, horário, nome do cliente, total (R$), status (badge colorido), botão "Ver detalhes" e botão de ação principal (ex.: "Aceitar" se pending).

### 4.3 Página / modal de detalhes

- **Cabeçalho:** #ID do pedido, data/hora do pedido, status atual.
- **Bloco Cliente:** Nome, telefone (clicável para ligar), endereço completo.
- **Bloco Itens:** Lista de itens (quantidade × nome, preço unitário, observação por item); subtotal dos itens.
- **Bloco Valores:** Subtotal, taxa de entrega, total; forma de pagamento.
- **Bloco Observações:** Observações gerais do pedido (se houver).
- **Bloco Ações:** Botões para próxima transição de status e "Cancelar" (com modal de motivo).
- **Opcional:** Histórico de alterações de status (quem alterou, quando, de qual status para qual).

### 4.4 Campos exibidos (checklist)

- [ ] ID do pedido (resumido, ex.: #abc12)
- [ ] Data e hora do pedido
- [ ] Nome do cliente
- [ ] Telefone do cliente
- [ ] Endereço de entrega
- [ ] Itens (nome, quantidade, preço, observações por item)
- [ ] Subtotal
- [ ] Taxa de entrega
- [ ] Total
- [ ] Forma de pagamento
- [ ] Observações gerais
- [ ] Status atual
- [ ] Botões de ação (conforme transições permitidas)
- [ ] Motivo do cancelamento (se cancelled)

---

## 5. Regras importantes

### 5.1 SLA para notificação

- **Requisito:** Do momento em que o pedido é persistido em `deliveries` até o disparo da notificação no painel (toast + som), no máximo **30 segundos** quando o usuário está com o painel aberto e o canal em tempo real ativo.
- **Fallback:** Com polling, o atraso máximo é o intervalo do poll (ex.: 30 s); considerar exibir "Atualizado há X s" na tela para transparência.

### 5.2 Pedidos duplicados

- **Prevenção no cliente:** Desabilitar o botão "Confirmar pedido" por alguns segundos após o clique e exibir "Enviando..."; evitar duplo envio.
- **No servidor:** Ao criar pedido, gravar `createdAt` e, opcionalmente, validar se não existe pedido idêntico (mesmo restaurante, mesmo cliente/telefone, mesmo total, criado nos últimos 2 minutos); em caso de suspeita, retornar aviso ou criar apenas um e retornar esse.
- **No painel:** Lista por `restaurantId` + ordenação por data; não criar "pedido duplicado" no painel por bug de UI; ao atualizar status, usar sempre o `orderId` correto.

### 5.3 Permissões por papel

- Listar e ver detalhes: qualquer usuário do restaurante com permissão de delivery/cozinha.
- Aceitar / alterar status / cancelar: conforme matriz (dono/gerente sempre; atendente conforme regra de negócio).
- Configurações de notificação (som, e-mail, WhatsApp): apenas dono/gerente (ou mesmo perfil que edita "Configurações de Delivery").

### 5.4 Auditoria / log de alterações de status

- **Requisito:** Persistir log de alterações: `orderId`, `fromStatus`, `toStatus`, `userId` (ou identificador do usuário do painel), `timestamp`.
- **Uso:** Suporte, disputas e relatórios; exibir na tela de detalhes como "Histórico do pedido" (opcional na primeira entrega).
- **Estrutura sugerida:** Coleção `deliveryOrderLogs` ou subcoleção `deliveries/{id}/logs` com documentos `{ fromStatus, toStatus, userId, timestamp }`.

---

## 6. Casos de teste e critérios de aceite (Given/When/Then)

### 6.1 Happy path – notificação

- **Cenário:** Novo pedido e painel aberto com listener ativo.  
  **Dado** que o restaurante está logado no painel e a aba está aberta  
  **E** o canal de notificação em tempo real está ativo  
  **Quando** um cliente finaliza um pedido de delivery para esse restaurante  
  **Então** em até 30 segundos o painel exibe um toast/banner de "Novo pedido de delivery"  
  **E** o som de notificação é reproduzido (se habilitado)  
  **E** o badge de "Cozinha" ou "Pedidos Delivery" é atualizado com +1 pendente  
  **E** se a tela "Pedidos Delivery" estiver visível, a lista é atualizada com o novo pedido.

### 6.2 Happy path – lista e detalhes

- **Cenário:** Restaurante abre Pedidos Delivery e vê pedidos.  
  **Dado** que existem pedidos de delivery para o restaurante  
  **Quando** o usuário acessa "Cozinha" > "Pedidos Delivery"  
  **Então** a lista exibe os pedidos (Kanban ou lista)  
  **E** cada card/linha mostra ID, data/hora, cliente, total e status  
  **E** ao clicar em "Ver detalhes" de um pedido, abre modal/página com cliente, endereço, itens, valores, pagamento e observações  
  **E** os botões de ação (Aceitar, Em preparo, etc.) aparecem conforme o status atual.

### 6.3 Happy path – transição de status

- **Cenário:** Restaurante aceita e avança até entregue.  
  **Dado** um pedido em status "Pendente"  
  **Quando** o usuário clica em "Aceitar pedido"  
  **Então** o status passa a "Aceito" e a lista/UI atualiza  
  **Quando** o usuário clica em "Iniciar preparo"  
  **Então** o status passa a "Em preparo"  
  **Quando** o usuário clica em "Saiu para entrega"  
  **Então** o status passa a "Saiu para entrega"  
  **Quando** o usuário clica em "Marcar como entregue"  
  **Então** o status passa a "Entregue" e o pedido pode ser movido para coluna/aba de entregues.

### 6.4 Edge cases

- **Painel fechado:**  
  **Dado** que um novo pedido foi criado enquanto o painel estava fechado  
  **Quando** o usuário abre o painel e acessa "Pedidos Delivery" (ou a primeira tela após login)  
  **Então** a lista é carregada com os pedidos atuais  
  **E** o badge reflete a quantidade de pedidos pendentes  
  **E** (opcional) um resumo "Você tem X novos pedidos" é exibido.

- **Fallback sem tempo real:**  
  **Dado** que o listener em tempo real não está disponível ou falhou  
  **Quando** a tela "Pedidos Delivery" está aberta  
  **Então** a aplicação usa polling (ex.: a cada 30 s) para buscar novos pedidos  
  **E** ao detectar pedido(s) novo(s), dispara toast e som (se habilitado) como se fosse tempo real.

- **Cancelamento com motivo:**  
  **Dado** um pedido em status Pendente ou Aceito ou Em preparo  
  **Quando** o usuário clica em "Recusar/Cancelar"  
  **Então** é exibido um modal solicitando motivo do cancelamento  
  **E** o usuário não pode confirmar sem informar motivo  
  **E** ao confirmar, o status passa a "Cancelado" e o motivo é gravado em `cancellationReason`.

- **Permissão insuficiente:**  
  **Dado** um usuário sem permissão para alterar status (conforme matriz)  
  **Quando** ele acessa "Pedidos Delivery"  
  **Então** pode ver a lista e detalhes (somente leitura)  
  **E** não vê botões de ação de mudança de status (ou vê desabilitados com tooltip explicativo).

- **Pedido duplicado (cliente clica duas vezes):**  
  **Dado** que o cliente clicou em "Confirmar pedido" duas vezes em sequência rápida  
  **Quando** o primeiro request persiste o pedido com sucesso  
  **Então** o segundo request pode ser ignorado ou o backend pode retornar o mesmo pedido já criado  
  **E** o restaurante vê apenas um pedido na lista.

---

## 7. Sugestão técnica de alto nível (sem código)

### 7.1 Disparar eventos ao criar pedido

- **Fonte da verdade:** A criação do pedido já persiste em Firestore (`deliveries`). O "evento" pode ser a própria escrita no documento.
- **Tempo real no painel:** O painel (cliente web do restaurante) usa um **listener** do Firestore na coleção `deliveries` com filtro `where('restaurantId', '==', restaurantId)` e `orderBy('createdAt', 'desc')`. Ao ser notificado de um novo documento (ou alteração), o cliente:
  - Atualiza a lista em memória.
  - Se o documento for novo (ex.: pelo `createdAt` ou checando se já existia na lista), dispara notificação in-app (toast) e som.
  - Atualiza o badge de pendentes (contando documentos com `status === 'pending'`).
- **Alternativa sem listener:** Polling: a cada X segundos (ex.: 30), a tela "Pedidos Delivery" chama `getDeliveryOrdersByRestaurant(restaurantId)` e compara com a lista anterior; se houver pedidos novos (por id ou createdAt), dispara toast + som e atualiza badge.

### 7.2 Persistir pedidos

- **Já existente:** `createDeliveryOrder` grava em `deliveries` com status `pending`, `createdAt`, `updatedAt`. Manter esse contrato.
- **Status:** `updateDeliveryOrderStatus(orderId, status)` atualiza `status` e `updatedAt`; `cancelDeliveryOrder(orderId, reason)` seta `cancelled` e `cancellationReason`.
- **Auditoria:** Ao alterar status, além do `updateDoc`, escrever um registro em `deliveryOrderLogs` (ou subcoleção `deliveries/{id}/logs`) com `fromStatus`, `toStatus`, `userId`, `timestamp`.

### 7.3 Atualizar o painel em tempo real

- **Opção 1 – Firestore onSnapshot:** Na tela "Pedidos Delivery" (e, se desejado, em um provider global quando o restaurante está logado), usar `onSnapshot` na query `deliveries` onde `restaurantId == currentRestaurantId`. Ao receber mudanças, atualizar estado da lista e, se for adição de documento novo, disparar notificação + som e atualizar badge.
- **Opção 2 – Polling:** `useEffect` com `setInterval` chamando `getDeliveryOrdersByRestaurant` a cada 30 s; comparar resultado com estado anterior; se houver novos IDs ou novos `createdAt`, tratar como "novo pedido" e disparar notificação + som.
- **Badge:** O badge pode ser calculado a partir da mesma lista (contagem de `status === 'pending'`) ou por uma query leve só de contagem (se o Firestore suportar). Atualizar o badge sempre que a lista for atualizada (listener ou poll).
- **Som:** Usar um arquivo de áudio curto (ex.: `.mp3`) e a API `Audio` do navegador; tocar quando a lógica detectar "novo pedido". Respeitar preferência do usuário (configuração "Notificação sonora" ligada/desligada).

---

## 8. Critérios de aceite (objetivos)

Os itens abaixo devem ser verdadeiros para considerar a funcionalidade entregue e aceita.

### Notificações

- [ ] **ACEITE-N01** Quando um novo pedido de delivery for criado para o restaurante, o painel (com usuário logado e aba aberta) exibe uma notificação in-app (toast ou banner) em até 30 segundos.
- [ ] **ACEITE-N02** O sistema reproduz um som (ou vibração) ao receber um novo pedido, quando a opção estiver habilitada nas configurações.
- [ ] **ACEITE-N03** O menu/item "Cozinha" (ou "Pedidos Delivery") exibe um badge com o número de pedidos em status "Pendente".
- [ ] **ACEITE-N04** Se o painel estiver fechado, ao reabrir e acessar "Pedidos Delivery", a lista e o badge refletem os pedidos atuais (incluindo pendentes).
- [ ] **ACEITE-N05** Existe fallback (ex.: polling a cada 30 s) quando o canal em tempo real não estiver disponível; nesse caso, novos pedidos ainda geram notificação e atualização da lista em até um ciclo de poll.

### Página Pedidos Delivery

- [ ] **ACEITE-P01** Existe uma área acessível pelo menu (ex.: Cozinha > Pedidos Delivery) que lista apenas pedidos de delivery do restaurante logado.
- [ ] **ACEITE-P02** A lista exibe, no mínimo, identificador do pedido, data/hora, nome do cliente, total e status.
- [ ] **ACEITE-P03** É possível filtrar por status (Pendente, Aceito, Em preparo, Saiu, Entregue, Cancelado) e ver detalhes de um pedido (cliente, endereço, itens, valores, pagamento, observações).
- [ ] **ACEITE-P04** O restaurante pode aceitar (pending → confirmed), iniciar preparo (confirmed → preparing), marcar "Saiu para entrega" (preparing → delivering), marcar "Entregue" (delivering → delivered) e cancelar (com motivo obrigatório quando aplicável).
- [ ] **ACEITE-P05** A lista é atualizada automaticamente (tempo real ou polling) sem precisar recarregar a página manualmente.
- [ ] **ACEITE-P06** Pedidos cancelados exibem o motivo do cancelamento quando informado.

### Regras e qualidade

- [ ] **ACEITE-R01** Não é possível voltar status de "Entregue" ou "Cancelado" para outro status.
- [ ] **ACEITE-R02** Alterações de status são persistidas de forma consistente (documento `deliveries` atualizado; opcional: log de auditoria).
- [ ] **ACEITE-R03** Duplo clique em "Confirmar pedido" no app do cliente não gera dois pedidos idênticos (mitigação no front e/ou no back).

---

*Documento alinhado ao estado atual do projeto (coleção `deliveries`, status existentes, presença de "Pedidos Delivery" dentro da aba Cozinha em Settings).*
