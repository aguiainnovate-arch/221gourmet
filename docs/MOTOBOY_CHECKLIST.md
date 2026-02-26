# Checklist – Fluxo Motoboy (testes manuais)

## Pré-requisitos

- Firebase: criar coleções (ou deixar que o app crie no primeiro uso):
  - `users` – usuários com role MOTOBOY (email, passwordHash, role, displayName, phone, createdAt, updatedAt)
  - `deliveryRequests` – chamadas (orderId, restaurantId, motoboyUserId, fee, status, createdAt, updatedAt)
- Criar um motoboy: `npm run create:motoboy -- --email=motoboy@teste.com --nome="Motoboy Teste"`
- Credenciais em `docs/motoboys/motoboy-*.md`

## 1. Login e redirecionamento

- [ ] Abrir **/delivery/auth**
- [ ] Login com **email de restaurante** → pede senha → redireciona para `/:restaurantId/settings`
- [ ] Logout; login com **email de motoboy** → pede senha → redireciona para `/motoboy`
- [ ] Acessar `/motoboy` sem estar logado → redireciona para `/delivery/auth?returnUrl=/motoboy`

## 2. Painel do restaurante (Cozinha > Pedidos Delivery)

- [ ] Pedido em **Preparando** → botão **"Pronto para entrega"** → status vai para **Pronto p/ entrega**
- [ ] Pedido em **Pronto p/ entrega** → botão **"Chamar motoboy"** → abre modal
- [ ] No modal: informar valor da tele (ex. 10) → **Chamar motoboy** → chamada criada; modal fecha
- [ ] Pedido continua em **Pronto p/ entrega** até um motoboy aceitar

## 3. Painel do motoboy

- [ ] Login como motoboy → abre `/motoboy`
- [ ] Lista de **Chamadas pendentes** com: pedido (ID), restaurante, endereço, valor da tele
- [ ] **Aceitar** → chamada some da lista; pedido no Firestore passa para status **delivering** e ganha `motoboyUserId`
- [ ] **Recusar** → chamada some da lista (status RECUSADA); restaurante pode chamar outro

## 4. Restaurante vê atualização

- [ ] Após motoboy aceitar: na Cozinha > Pedidos Delivery o pedido aparece em **Saindo** (delivering)
- [ ] Restaurante pode marcar **Marcar como Entregue** → status **Entregue**

## 5. Cliente (Meus pedidos)

- [ ] Em **Meus pedidos**, o pedido exibe: Aguardando → Confirmado → Preparando → **Pronto para entrega** → **Saindo para entrega** → Entregue
- [ ] Timeline com 6 etapas (incluindo "Pronto p/ entrega")

## 6. Script e .md

- [ ] `npm run create:motoboy -- --email=outro@motoboy.com --nome=Outro` cria usuário no Firestore
- [ ] Arquivo `docs/motoboys/motoboy-Outro.md` (ou similar) é criado com Nome, Email, Senha, Role, Data, URL de login

## Build

- [ ] `npm run build` conclui sem erros
