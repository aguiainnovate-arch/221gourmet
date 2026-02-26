# PR: Taxa de entrega configurável por distância

## Checklist do que foi feito

### Frontend – Painel (Configurações → Delivery)
- [x] Seção **"Taxa de entrega"** adicionada em Configurações → Delivery (entre "Descrição para IA" e "Produtos Disponíveis").
- [x] Campos: valor base (R$), valor por km (R$), raio máximo (km), taxa mínima (opcional), taxa máxima (opcional), isenção por valor mínimo (opcional).
- [x] Load: valores carregados de `restaurant.deliverySettings.feeRule` ao abrir a aba.
- [x] Save: ao clicar em "Salvar Todas as Configurações", `feeRule` e `fallbackFixedFee` são enviados junto com `enabled` e `aiDescription`; validação no backend (validateFeeRule) antes de persistir.

### Backend / Persistência
- [x] **Firestore:** nenhuma nova coleção. Campo `deliverySettings` do documento `restaurants/{id}` estendido com `feeRule` (objeto) e `fallbackFixedFee` (número). Restaurantes antigos sem esses campos continuam com fallback R$ 5,00.
- [x] **restaurantService.updateRestaurantDeliverySettings:** passa a aceitar `DeliverySettings` completo (incluindo `feeRule` e `fallbackFixedFee`); valida `feeRule` com `validateFeeRule` antes de gravar; em erro de validação lança com mensagens amigáveis.
- [x] **Leitura:** `getRestaurantById`, `getRestaurants`, `getRestaurantByDomain`, `getRestaurantsByPlan` já devolvem `data.deliverySettings` completo; com tipos atualizados, `feeRule` e `fallbackFixedFee` passam a ser lidos quando existirem.

### Cálculo no checkout (DeliveryMenu)
- [x] Constante fixa R$ 5,00 removida; uso de estado `deliveryFee` (inicializado com `FALLBACK_FIXED_FEE`).
- [x] Quando o restaurante tem `feeRule` válido e endereço do restaurante + endereço do cliente preenchidos: geocode dos dois endereços (Nominatim), distância (Haversine), então `calculateDeliveryFee(distância, subtotal, feeRule)`.
- [x] Se distância > raio máximo: mensagem "Fora da área de entrega. Não entregamos neste endereço.", bloqueio do envio do pedido e botão "Confirmar Pedido" desabilitado.
- [x] Se não houver `feeRule` configurado, ou geocode falhar, ou endereço em branco: uso de `fallbackFixedFee` (ou R$ 5,00).
- [x] Exibição de "Calculando taxa…" durante o geocode; exibição do erro sob o campo endereço quando fora da área.

### Testes
- [x] **Unitários (deliveryFeeService):** cálculo com/sem min/max/isenção, distância além do raio, arredondamento, validação de regra, `isFeeRuleUsable`, `FALLBACK_FIXED_FEE`.
- [x] **Cenário de integração (deliveryFeeService):** um teste com regra completa (base + perKm, min, max, isenção) e vários casos (0 km, 4 km, 8 km, 12 km, subtotais 30/50/80/90).
- [x] **geocodingService:** `getDistanceKm` (mesmo ponto, dois pontos, simetria); `geocodeAddress` (vazio, mock de fetch).

### Arquivos alterados/criados
- `src/types/restaurant.ts` – `DeliveryFeeRule`, `DeliverySettings`, uso em `Restaurant` / `CreateRestaurantData` / `UpdateRestaurantData`.
- `src/services/deliveryFeeService.ts` – **novo:** `calculateDeliveryFee`, `validateFeeRule`, `isFeeRuleUsable`, `FALLBACK_FIXED_FEE`.
- `src/services/geocodingService.ts` – **novo:** `geocodeAddress` (Nominatim), `getDistanceKm` (Haversine).
- `src/services/restaurantService.ts` – `updateRestaurantDeliverySettings` com tipo `DeliverySettings` e validação de `feeRule`.
- `src/pages/Settings.tsx` – estado da taxa de entrega, load/save de `feeRule`, UI da seção "Taxa de entrega".
- `src/pages/DeliveryMenu.tsx` – estado da taxa, efeito de geocode + cálculo, mensagem fora da área, fallback.
- `src/services/deliveryFeeService.test.ts` – **novo:** testes unitários + integração do cálculo.
- `src/services/geocodingService.test.ts` – **novo:** testes de distância e geocode.
- `vite.config.ts` – configuração do Vitest; `package.json` – scripts `test` e `test:watch`.

---

## Como testar

### 1. Painel – Configurar taxa
1. Login no painel do restaurante → menu **Delivery**.
2. Preencher **Taxa de entrega:** ex.: Valor base 3, Valor por km 2,50, Raio máximo 10, Taxa mínima 5, Taxa máxima 22, Isenção 80.
3. Clicar em **Salvar Todas as Configurações**.
4. Recarregar a página e conferir se os valores voltam preenchidos.

### 2. Checkout – Taxa calculada
1. Abrir o cardápio de delivery do mesmo restaurante (`/delivery/:restaurantId/menu`).
2. Adicionar itens ao carrinho e abrir **Finalizar Pedido**.
3. Preencher **Endereço de entrega** com um endereço real dentro do raio (ex.: mesmo bairro do restaurante).
4. Verificar se aparece "Calculando taxa…" e depois o valor da taxa (ex.: R$ 13,00 para ~4 km com base 3 + 2,50/km).
5. Alterar o endereço para outro válido e ver se a taxa atualiza.

### 3. Fora da área
1. No checkout, colocar um endereço muito distante (acima do raio máximo configurado).
2. Deve aparecer a mensagem em vermelho: "Fora da área de entrega. Não entregamos neste endereço." e o botão **Confirmar Pedido** deve ficar desabilitado.

### 4. Sem configuração (fallback)
1. Em outro restaurante (ou apagar `feeRule` no Firestore para o mesmo), abrir o checkout de delivery.
2. A taxa deve ser R$ 5,00 (fallback), sem "Calculando…" prolongado (geocode pode não ser chamado se não houver `feeRule`).

### 5. Testes automatizados
```bash
npm run test
```
Todos os 23 testes devem passar (deliveryFeeService + geocodingService).

### 6. Build
```bash
npm run build
```
Deve concluir sem erros.

---

## Observações
- **Geocoding:** hoje usa Nominatim (OpenStreetMap), sem API key. Para produção com muito uso, pode ser trocado por Google Maps ou outro provedor (ajustar `geocodingService.ts`).
- **Endereço do restaurante:** o cálculo usa `restaurant.address`. Garanta que o endereço do restaurante esteja preenchido nas configurações do estabelecimento para o cálculo por distância funcionar.
