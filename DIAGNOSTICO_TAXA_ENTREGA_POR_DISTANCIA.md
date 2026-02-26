# Diagnóstico e Plano de Correção: Taxa de Entrega por Distância

## A) Resumo do problema

**Sintoma:** No checkout de delivery, o valor da taxa de entrega permanece sempre o mesmo, independentemente da distância entre o endereço do cliente e o endereço do restaurante.

**Expectativa:** A taxa deve variar conforme a distância (ex.: taxa base + R$/km × distância), respeitando mínimo, máximo, raio de entrega e eventual isenção por pedido mínimo.

**Contexto técnico:** A plataforma já possui implementação de taxa por distância (regra `feeRule` em `deliverySettings`, cálculo Haversine, geocoding). O problema observado é que, na prática, o fluxo cai no **fallback de taxa fixa** na maior parte dos casos, dando a impressão de que “nunca muda”.

---

## B) Diagnóstico provável

### Hipóteses de causa (em ordem de probabilidade)

| # | Hipótese | Descrição | Como verificar |
|---|----------|-----------|----------------|
| 1 | **Fallback sempre acionado por falta de endereço da loja** | O cálculo por distância exige o endereço do restaurante geocodificado. Se `restaurant.address` estiver vazio ou o geocode falhar, o código usa taxa fixa (ex.: R$ 5,00) e a taxa não varia. | Verificar no Firestore se o restaurante tem `address` (e idealmente `addressForGeocode`) preenchido. No checkout, inspecionar se `originGeo` é null. |
| 2 | **Regra por distância não configurada** | Se `deliverySettings.feeRule` não existir ou for inválida (`isFeeRuleUsable` retorna false), o checkout usa apenas o fallback. | Em Configurações → Delivery, conferir se “Taxa de entrega” está preenchida (base, R$/km, raio máximo). |
| 3 | **Geocode do endereço da loja falha** | O endereço é salvo em formato “exibição” (ex.: com CEP no final). O Nominatim pode não resolver bem esse formato, retornando null e acionando o fallback. | Usar endereço em formato otimizado para geocode (ex.: `addressForGeocode`: "Rua, Número, Bairro, Cidade, UF, Brazil"). |
| 4 | **Taxa fixa hardcoded em algum fluxo** | Em algum branch (ex.: sem endereço do cliente ou erro de rede) o código poderia estar fixando sempre o mesmo valor. | Revisar todos os `setDeliveryFee(...)` e garantir que o valor só seja fixo quando for fallback explícito. |
| 5 | **Distância não calculada / sempre zero** | Bug no Haversine ou nas coordenadas (ex.: origem e destino iguais) faria a taxa ser sempre a mesma (ex.: só a base). | Logar `distanceKm` e `originGeo`/`destGeo` no efeito do checkout; testar com dois endereços conhecidos. |

### Causa raiz identificada (neste projeto)

- **Endereço da loja:** Muitos restaurantes não tinham endereço cadastrado no perfil ou o campo usado para geocode não era adequado ao Nominatim.
- **Formato do endereço:** O uso apenas de `restaurant.address` (linha completa com CEP) fazia o geocode falhar com frequência, acionando o fallback.
- **Correção já aplicada:** Foi introduzido o campo `addressForGeocode` (formato "Rua, Número, Bairro, Cidade, UF, Brazil"), preenchido ao salvar “Dados do restaurante” e usado no checkout como origem do geocode. O checkout passou a usar `restaurant.addressForGeocode || restaurant.address` para calcular a distância.

---

## C) Solução proposta (arquitetura)

A arquitetura atual já cobre o fluxo; a solução consiste em **garantir dados e fluxo** corretos:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PAINEL (Settings)                                                        │
│ • Aba "Dados do restaurante": nome, telefone, endereço (CEP/ViaCEP)     │
│   → Salva address + addressForGeocode no documento do restaurante       │
│ • Aba "Delivery": Taxa de entrega (base, R$/km, raio, mín, máx, isenção)│
│   → Salva deliverySettings.feeRule + fallbackFixedFee                   │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FIRESTORE                                                                │
│ • restaurants/{id}: address, addressForGeocode, deliverySettings        │
│   deliverySettings: { feeRule: { baseFee, perKmFee, maxRadiusKm, ... } } │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CHECKOUT (DeliveryMenu)                                                  │
│ 1. Carrega restaurante (getRestaurants) → addressForGeocode || address  │
│ 2. Se não há feeRule válida ou não há endereço origem → taxa = fallback  │
│ 3. Geocode: origem (loja) + destino (cliente) → Haversine → distanceKm  │
│ 4. Se distanceKm > maxRadiusKm → erro "Fora da área"                    │
│ 5. Senão: taxa = calculateDeliveryFee(distanceKm, subtotal, feeRule)     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Backend/API:** Não há API REST separada; leitura/escrita é feita pelo **Firebase Client SDK** (Firestore) a partir do frontend. Validação da regra está em `deliveryFeeService.validateFeeRule` e é usada no painel e em `updateRestaurantDeliverySettings` / `updateRestaurant`.

---

## D) Detalhamento (passos, regras e exemplos)

### 1. Perguntas mínimas (se ainda houver dúvida)

1. O restaurante já preencheu e salvou o endereço em **Configurações → Dados do restaurante**?
2. Em **Configurações → Delivery**, a seção “Taxa de entrega” está preenchida (valor base, R$/km, raio máximo > 0)?
3. O endereço de teste do cliente está dentro do raio máximo configurado?
4. Há bloqueio de rede/CORS para o domínio do Nominatim em produção?
5. O plano do restaurante permite uso de delivery com taxa por distância (se houver restrição por plano)?

*Se todas forem “sim” e o problema persistir, focar em logs de geocode (origem/destino) e em testes E2E.*

### 2. Passo a passo para reproduzir e validar a correção

**Pré-requisitos**

- Restaurante com delivery habilitado.
- Endereço da loja cadastrado (e salvo) em **Dados do restaurante** (para gerar `addressForGeocode`).
- Taxa por distância configurada em **Delivery** (ex.: base R$ 3, R$ 2,50/km, raio 10 km).

**Reproduzir o problema (antes da correção)**

1. Deixar o restaurante sem `addressForGeocode` ou com endereço que falhe no geocode.
2. No cardápio delivery, informar um endereço de entrega.
3. Observar: taxa permanece igual (ex.: R$ 5,00) ao mudar o endereço.

**Validar a correção**

1. Em **Configurações → Dados do restaurante**, preencher CEP, rua, número, bairro, cidade, UF e clicar em **Salvar**.
2. Em **Configurações → Delivery**, preencher taxa base, R$/km e raio máximo; salvar.
3. Abrir o cardápio delivery (outra aba/incógnito para não usar cache).
4. Endereço próximo (ex.: 2 km): anotar a taxa (ex.: R$ 3 + 2,50×2 = R$ 8,00).
5. Alterar o endereço para um mais distante (ex.: 6 km): a taxa deve aumentar (ex.: R$ 3 + 2,50×6 = R$ 18,00).
6. Endereço além do raio: deve aparecer “Fora da área de entrega” e o pedido não deve ser finalizável com esse endereço.

### 3. Frontend / painel (onde configurar)

| Onde | O que configurar | Persistência |
|------|-------------------|--------------|
| **Configurações → Dados do restaurante** | Nome, telefone, endereço (CEP com ViaCEP, rua, número, complemento, bairro, cidade, UF). Botão “Salvar”. | `updateRestaurant(id, { name, phone, address, addressForGeocode })`. `addressForGeocode` = `buildAddressForGeocode(...)` (sem CEP, com "Brazil"). |
| **Configurações → Delivery** | Seção “Taxa de entrega”: valor base (R$), valor por km (R$), raio máximo (km), taxa mínima (opcional), taxa máxima (opcional), isenção acima de (R$ subtotal). Botão “Salvar Todas as Configurações”. | `updateRestaurantDeliverySettings(id, { ...deliverySettings, feeRule, fallbackFixedFee })`. Validação com `validateFeeRule(feeRule)` antes de salvar. |

### 4. Backend / API

- **Stack atual:** Sem backend Node/API REST; uso de **Firestore** via SDK no cliente.
- **Escrita:** `restaurantService.updateRestaurant(id, updates)` e `restaurantService.updateRestaurantDeliverySettings(id, deliverySettings)`.
- **Leitura:** `restaurantService.getRestaurants()` e `getRestaurantById(id)` (no cardápio usa-se o restaurante vindo de `getRestaurants()`).
- **Validações:** `validateFeeRule(rule)` em `deliveryFeeService` (base, perKm, maxRadius, min, max, freeDeliveryAbove). Erros retornados na UI ao salvar.

### 5. Banco de dados (Firestore)

- **Coleção:** `restaurants`.
- **Campos relevantes:**
  - `address` (string): endereço completo para exibição.
  - `addressForGeocode` (string, opcional): endereço no formato para geocode (ex.: "Rua, Número, Bairro, Cidade, UF, Brazil").
  - `deliverySettings` (map): `enabled`, `aiDescription`, `feeRule`, `fallbackFixedFee`.
  - `feeRule` (map): `baseFee`, `perKmFee`, `maxRadiusKm`, `minFee?`, `maxFee?`, `freeDeliveryAboveSubtotal?`.

**Migration:** Não é obrigatória. Restaurantes antigos continuam com só `address`; o checkout usa `addressForGeocode || address`. Para passar a variar por distância, o dono deve salvar uma vez o endereço em “Dados do restaurante” para popular `addressForGeocode`.

### 6. Checkout: cálculo da taxa

- **Ordem:**  
  1. Obter endereço de origem: `originAddress = (restaurant.addressForGeocode || restaurant.address || '').trim()`.  
  2. Se não houver regra válida (`isFeeRuleUsable(rule)`) ou não houver `originAddress` ou endereço do cliente → usar `fallback` (ex.: R$ 5,00) e não chamar geocode.  
  3. Geocode em paralelo: `geocodeAddress(originAddress)` e `geocodeAddress(customerAddress)`.  
  4. Se algum retornar null → fallback; se só destino null → mensagem “Endereço não encontrado”.  
  5. `distanceKm = getDistanceKm(originGeo, destGeo)` (Haversine).  
  6. Se `distanceKm > rule.maxRadiusKm` → erro “Fora da área de entrega”, taxa 0, bloqueio.  
  7. Senão: `fee = calculateDeliveryFee(distanceKm, subtotal, rule)`; exibir `fee` (ou fallback se null).

- **Haversine:** Implementado em `geocodingService.getDistanceKm` (raio Terra 6371 km, resultado arredondado 2 decimais).

### 7. Regras de negócio (com exemplos)

- **Fórmula:** `taxa = base + (R$/km × distância_km)`, depois aplicar mínimo e máximo, depois isenção por subtotal.
- **Exemplo numérico:** base R$ 3, R$ 2,50/km, mín R$ 5, máx R$ 22, raio 10 km, isenção acima de R$ 80.
  - 0 km, subtotal R$ 50: bruto 3 → mín 5 → **R$ 5,00**.
  - 4 km, subtotal R$ 30: 3 + 10 = 13, entre mín/máx → **R$ 13,00**.
  - 4 km, subtotal R$ 90: isenção → **R$ 0,00**.
  - 8 km, subtotal R$ 40: 3 + 20 = 23 → máx 22 → **R$ 22,00**.
  - 12 km: > 10 km → **entrega não permitida** (mensagem + bloqueio).
- **Fallback:** Se não houver `feeRule` válida ou geocode falhar: usar `deliverySettings.fallbackFixedFee ?? 5`.

---

## E) Testes

### Testes unitários (já existentes – `deliveryFeeService.test.ts`)

- `calculateDeliveryFee`: retorna null quando distância > raio; permite distância = raio; taxa linear base + perKm×km; aplica mín e máx; aplica isenção por subtotal; arredondamento 2 decimais; caso de integração com regra completa.
- `validateFeeRule`: regra válida; base/perKm/raio negativos ou zero; min > max; freeDeliveryAboveSubtotal ≤ 0.
- `isFeeRuleUsable`: undefined/null; regra inválida; regra válida.
- `FALLBACK_FIXED_FEE` = 5.

### Testes unitários sugeridos (complementares)

- `geocodingService.getDistanceKm`: distância 0 (mesmos pontos); distância conhecida entre dois pontos (ex.: ~1 km); simetria (getDistanceKm(a,b) === getDistanceKm(b,a)).
- `geocodeAddress`: mock da resposta Nominatim; endereço vazio retorna null; resposta vazia retorna null.

### Testes de integração sugeridos

- Checkout: com `feeRule` válida e endereços que geocodificam, alterar endereço do cliente e verificar que a taxa exibida muda (ex.: dois CEPs diferentes, mesma cidade).
- Checkout: endereço fora do raio → mensagem “Fora da área” e botão de finalizar desabilitado ou bloqueio na submissão.
- Checkout: restaurante sem `addressForGeocode` e sem `address` → taxa = fallback.
- Checkout: restaurante sem `feeRule` → taxa = fallback, sem erro de “endereço não encontrado” se o endereço do cliente for válido (apenas fallback).

### Casos extremos

| Caso | Entrada | Resultado esperado |
|------|---------|---------------------|
| 0 km | distância 0, base 3, perKm 2,5 | Taxa = 3 (base). Com minFee 5 → 5. |
| Distância alta | 100 km, raio 10 km | null (fora do raio); no checkout: erro “Fora da área”. |
| Arredondamento | base 1,111, perKm 1,111, 1 km | Taxa com 2 decimais (ex.: 2,22). |
| min/max | valor bruto < min → min; valor bruto > max → max. | Conferir nos testes existentes. |
| Config ausente | feeRule undefined ou inválida | Fallback (ex.: 5). |
| Geocode origem null | Endereço loja não geocodifica | Fallback, sem travar. |
| Geocode destino null | Endereço cliente não geocodifica | Fallback + mensagem “Endereço não encontrado”. |

---

## F) Checklist de aceite e monitoramento

### Critérios de aceite

- [ ] **Painel:** Em Configurações → Dados do restaurante, ao salvar endereço completo, o documento do restaurante passa a ter `address` e `addressForGeocode`.
- [ ] **Painel:** Em Configurações → Delivery, é possível salvar taxa base, R$/km, raio máximo, opcionais mín, máx e isenção; ao salvar, `deliverySettings.feeRule` persiste no Firestore.
- [ ] **Checkout:** Para o mesmo restaurante e mesma regra, ao alterar o endereço do cliente para um mais distante, a taxa exibida aumenta (e diminui ao colocar endereço mais próximo), dentro do raio.
- [ ] **Checkout:** Endereço além do raio máximo exibe mensagem clara (“Fora da área de entrega”) e impede finalizar pedido para esse endereço.
- [ ] **Checkout:** Se o restaurante não tiver endereço (ou geocode falhar) ou não tiver `feeRule` válida, a taxa exibida é o fallback (ex.: R$ 5,00), sem erro de tela quebrada.
- [ ] **Regra:** Cálculo segue base + perKm×km com mín/máx e isenção por subtotal; valores em 2 decimais.
- [ ] **Testes:** Suite de testes do `deliveryFeeService` (e, se existir, do geocoding) passando; ao menos um teste de integração ou E2E cobrindo “taxa muda com endereço”.

### Monitoramento em produção

- **Métricas sugeridas (se houver instrumentação):**
  - Proporção de pedidos de delivery em que a taxa foi calculada por distância vs. fallback (ex.: log ou evento quando `originGeo`/`destGeo` é null).
  - Falhas de geocode (origem vs. destino) para ajustar formato de endereço ou considerar outro provedor.
- **Logs úteis (dev/staging):** Em desenvolvimento, logar `distanceKm`, `fee`, e se veio de `calculateDeliveryFee` ou fallback; não logar endereços completos em produção (LGPD).
- **Alertas:** Se a taxa de fallback for muito alta (ex.: > 50% dos checkouts), investigar endereços da loja e disponibilidade do Nominatim.

---

## Referência rápida de arquivos

| Componente | Arquivo |
|------------|---------|
| Regra e cálculo da taxa | `src/services/deliveryFeeService.ts` |
| Geocode e Haversine | `src/services/geocodingService.ts` |
| Tipos (DeliveryFeeRule, DeliverySettings) | `src/types/restaurant.ts` |
| Persistência restaurante / delivery | `src/services/restaurantService.ts` |
| Formulário taxa + endereço loja | `src/pages/Settings.tsx` (abas Delivery e Dados do restaurante) |
| Checkout e exibição da taxa | `src/pages/DeliveryMenu.tsx` |
| Helpers endereço (ViaCEP, buildAddressForGeocode) | `src/services/viaCepService.ts` |
| Testes unitários da taxa | `src/services/deliveryFeeService.test.ts` |
