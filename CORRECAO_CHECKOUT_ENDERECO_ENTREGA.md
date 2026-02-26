# Correção: Endereço de entrega no checkout (delivery)

## A) Resumo do bug e impacto

**Bug:** Na etapa de finalizar pedido (checkout) do delivery, o campo de endereço de entrega estava no formato antigo: um único **textarea** de texto livre, sem seleção de endereço do perfil nem busca por CEP com auto-preenchimento.

**Impacto:** Pior experiência do usuário (digitar tudo à mão), mais erros de digitação, CEP/rua/bairro/cidade/UF não validados, e usuários logados não conseguiam reutilizar o endereço já cadastrado em "Minha conta".

---

## B) Causa provável

1. **Regressão / formulário antigo nunca substituído**  
   O checkout foi implementado com um único campo `customerAddress` (textarea). A tela "Minha conta" em Delivery já tinha endereço estruturado (CEP + ViaCEP), mas o checkout nunca foi atualizado para o mesmo modelo nem para permitir “usar endereço cadastrado”.

2. **Falta de integração perfil ↔ checkout**  
   O perfil do usuário (Delivery) persiste um único endereço em `user.address` (string montada com `buildAddressLine`), mas o checkout não oferecia opção de “usar esse endereço” nem formulário estruturado equivalente.

3. **Nenhuma feature flag ou rota errada**  
   Não há feature flag; o componente correto é o mesmo (`DeliveryMenu.tsx`). A causa é apenas o uso do formulário antigo (textarea) no bloco de endereço do checkout.

---

## C) Solução (passo a passo)

1. **Estado no checkout**  
   - `useProfileAddress`: usar endereço do perfil (quando logado e com endereço).  
   - `addressForm`: CEP, rua, número, complemento, bairro, cidade, UF.  
   - `cepLoading`, `cepMessage`: feedback da busca por CEP.

2. **Endereço efetivo**  
   - Se `useProfileAddress && user?.address` → endereço efetivo = `user.address`.  
   - Senão → endereço efetivo = `buildAddressLine(addressForm)` quando o formulário estiver completo (CEP 8 dígitos + rua, número, bairro, cidade, UF).

3. **UI**  
   - Se usuário logado e tem endereço: opção “Usar endereço cadastrado” (exibe o endereço) e “Informar outro endereço”.  
   - Se não tem perfil ou escolhe “outro”: formulário com CEP (máscara + onBlur ViaCEP), rua, número, complemento, bairro, cidade, UF.  
   - Mensagens: “CEP não encontrado”, “Buscando…”, e erro da taxa de entrega quando aplicável.

4. **Validação e submit**  
   - Botão “Confirmar pedido” habilitado só com nome, telefone e endereço válido (perfil ou formulário completo).  
   - No submit: `customerAddress` do pedido = endereço efetivo; ao salvar usuário, grava esse mesmo endereço no perfil.

5. **Compatibilidade**  
   - Pedidos continuam recebendo `customerAddress` (string). Nenhuma mudança em tipo de ordem ou API.  
   - Comportamento responsivo mantido (mesmo layout em web/mobile).

---

## D) Mudanças técnicas e arquivos

### Frontend (React)

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/DeliveryMenu.tsx` | Removido estado `customerAddress` e textarea. Adicionados `useProfileAddress`, `addressForm`, `cepLoading`, `cepMessage`. Função `getEffectiveAddress()` e `hasValidAddress`. Handler `handleCepBlur` (ViaCEP). Bloco de UI: radio “Usar endereço cadastrado” / “Informar outro endereço” e formulário CEP (campos obrigatórios: CEP, rua, número, bairro, cidade, UF; complemento opcional). Taxa de entrega e submit passam a usar `effectiveAddress` / `getEffectiveAddress()`. Botão confirmar usa `hasValidAddress`. |

### Serviços

| Arquivo | Uso |
|---------|-----|
| `src/services/viaCepService.ts` | Já existente. Checkout passa a usar `fetchAddressByCep`, `formatCep`, `normalizeCep`, `buildAddressLine`. |
| `src/services/deliveryUserService.ts` | Sem mudança. Continua recebendo `address: string` em `saveDeliveryUser`. |
| `src/services/geocodingService.ts` | Sem mudança. Geocode do endereço no submit continua com a string efetiva. |

### Backend / Firestore

- Nenhuma alteração. `deliveryUsers` segue com campo `address` (string). Pedidos com `customerAddress` (string).

### Testes

| Arquivo | Conteúdo |
|---------|----------|
| `src/services/viaCepService.test.ts` | **Novo.** Testes para `normalizeCep`, `formatCep`, `buildAddressLine` (montagem da linha usada no checkout) e `fetchAddressByCep` (mock da API e CEP inválido/erro). |

---

## E) Testes e critérios de aceite

### Testes unitários

- **viaCepService:**  
  - `normalizeCep`: remove não-dígitos, limita a 8 caracteres.  
  - `formatCep`: formata com hífen quando 8 dígitos.  
  - `buildAddressLine`: monta linha com obrigatórios; inclui complemento; CEP formatado.  
  - `fetchAddressByCep`: retorna null para CEP &lt; 8 dígitos; mock da API retorna objeto; resposta com `erro: true` retorna null.

### Teste manual (integração / fluxo)

1. **Selecionar endereço do perfil e finalizar**  
   - Login no delivery.  
   - Em “Minha conta”, cadastrar endereço completo (CEP válido, rua, número, bairro, cidade, UF) e salvar.  
   - Abrir um restaurante → cardápio → adicionar itens → Finalizar pedido.  
   - Ver “Usar endereço cadastrado” selecionado e o endereço exibido.  
   - Confirmar pedido.  
   - Verificar que o pedido foi criado com esse endereço e que a taxa de entrega foi calculada.

2. **Preencher via CEP e finalizar**  
   - No checkout, escolher “Informar outro endereço”.  
   - Informar CEP válido (ex.: 01310-100) e sair do campo → rua, bairro, cidade, UF preenchidos.  
   - Preencher número (e opcionalmente complemento).  
   - Confirmar pedido.  
   - Verificar pedido criado com endereço montado corretamente e taxa calculada.

3. **Validações**  
   - CEP inválido ou “não encontrado”: mensagem clara; botão confirmar desabilitado até endereço válido.  
   - Endereço fora da área: mensagem “Fora da área de entrega” e bloqueio conforme regra existente.

### Critérios de aceite

- Usuário logado com endereço pode escolher “Usar endereço cadastrado” e finalizar.  
- Qualquer usuário pode preencher endereço por CEP (auto-preenchimento) + número/complemento e finalizar.  
- Campos obrigatórios: CEP (8 dígitos), rua, número, bairro, cidade, UF; complemento opcional.  
- CEP não encontrado e serviço fora do ar exibem mensagens claras.  
- Endereço enviado no pedido e salvo no perfil (quando aplicável) é o endereço efetivo (perfil ou linha montada do formulário).  
- Pedidos antigos e atuais continuam com `customerAddress` (string); nada quebrado em tipo ou API.

---

## Como testar manualmente (passo a passo)

1. Acesse a listagem de delivery (ex.: `/delivery`).  
2. Faça login (se quiser testar “usar endereço cadastrado”).  
3. Em “Minha conta”, preencha e salve um endereço (CEP, rua, número, bairro, cidade, UF).  
4. Escolha um restaurante com delivery e abra o cardápio.  
5. Adicione itens ao carrinho e clique em “Finalizar pedido”.  
6. **Cenário A:** Deixe “Usar endereço cadastrado” marcado → confira o endereço exibido → Confirme o pedido.  
7. **Cenário B:** Marque “Informar outro endereço” → digite um CEP (ex.: 01310-100) e saia do campo → confira o auto-preenchimento → preencha número (e complemento se quiser) → Confirme o pedido.  
8. Em ambos os casos, verifique na tela de sucesso e, se possível, no painel do restaurante, que o endereço do pedido está correto.

---

## Arquivos alterados (lista)

- `src/pages/DeliveryMenu.tsx` – checkout com endereço perfil + formulário CEP.  
- `src/services/viaCepService.test.ts` – **novo**; testes de CEP e montagem de endereço.  
- `CORRECAO_CHECKOUT_ENDERECO_ENTREGA.md` – **novo**; este documento.

Nenhum arquivo de backend, Firestore ou tipo de pedido foi alterado para manter compatibilidade.
