# Análise de Produto e Requisitos: Taxa de Entrega por Distância

**Papel:** Analista de Produto e Requisitos  
**Contexto:** Substituir a taxa de entrega fixa (R$ 5,00) por regras configuráveis pelo restaurante, com cálculo baseado na distância (km) entre restaurante e endereço do cliente.  
**Objetivo:** Permitir regras do tipo `taxa = valor_base + (valor_por_km × distância_km)` ou `valor_por_km × distância_km`, com opções de faixas, teto e raio máximo.

---

## 1. Modelos de regra possíveis

### 1.1 Por quilômetro (linear)
- **Fórmula:** `taxa = valor_base + (valor_por_km × distância_km)`
- **Exemplo:** base R$ 3,00 + R$ 2,50/km → 4 km = R$ 3 + R$ 10 = R$ 13,00
- **Uso:** Previsível para o cliente; ideal quando o custo real cresce com a distância.

### 1.2 Apenas por quilômetro (sem base)
- **Fórmula:** `taxa = valor_por_km × distância_km`
- **Exemplo:** R$ 2,00/km → 5 km = R$ 10,00
- **Uso:** Entrega “grátis” no endereço do restaurante (0 km); cresce só com distância.

### 1.3 Por faixas de distância
- **Regra:** Cada faixa tem um valor fixo (ex.: 0–3 km = R$ 8; 3–6 km = R$ 12; 6–10 km = R$ 18).
- **Cálculo:** identificar a faixa em que a distância se enquadra e usar o valor da faixa.
- **Uso:** Mensagem simples (“até 3 km: R$ 8”) e controle fino por região.

### 1.4 Taxa mínima e máxima
- **Mínima:** mesmo perto, cobrar no mínimo X (ex.: R$ 5,00).
- **Máxima:** limitar o valor mesmo longe (ex.: cap R$ 25,00).
- **Uso:** Evitar taxa zero ou valor excessivo em distâncias extremas.

### 1.5 Raio máximo de entrega
- **Regra:** Definir distância máxima (ex.: 10 km). Acima disso: “Não entregamos neste endereço” ou mensagem configurável.
- **Uso:** Operacional e de custo; evita pedidos fora da área viável.

### 1.6 Isenção acima de X (pedido mínimo / grátis)
- **Regra:** Se subtotal do pedido ≥ valor mínimo (ex.: R$ 80), taxa = 0 (ou valor reduzido).
- **Exemplo:** “Entrega grátis em compras acima de R$ 80”.
- **Uso:** Aumentar ticket médio; pode ser combinada com as regras acima (aplicar isenção depois do cálculo por distância).

### 1.7 Combinação sugerida para o MVP
- **Obrigatório:** valor base (pode ser 0), valor por km, raio máximo (km).
- **Opcional:** taxa mínima, taxa máxima.
- **Fase 2:** faixas de distância e/ou isenção por pedido mínimo.

---

## 2. Tela / fluxo de cadastro para o restaurante

### 2.1 Onde fica
- **Configurações** → aba **Delivery** (ou **Entrega**) → seção **“Taxa de entrega”** (hoje existe “Delivery” com enabled e aiDescription; estender essa mesma área).

### 2.2 Campos da regra (exemplo de tela)

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| **Endereço do restaurante** | Texto + (opcional) mapa/geocode | Sim (já existe em Restaurant.address) | Usado como origem do cálculo de distância. | Av. Brasil, 1000 – Centro |
| **Valor base (R$)** | Número (0 ou positivo) | Sim | Valor fixo da entrega. | 3,00 |
| **Valor por km (R$)** | Número (0 ou positivo) | Sim | Acréscimo por quilômetro. | 2,50 |
| **Raio máximo (km)** | Número (> 0) | Sim | Acima disso não entrega. | 10 |
| **Taxa mínima (R$)** | Número (opcional) | Não | Mínimo cobrado (ex.: 0 km). | 5,00 |
| **Taxa máxima (R$)** | Número (opcional) | Não | Teto da taxa. | 25,00 |
| **Pedido mínimo para isenção (R$)** | Número (opcional) | Não | Subtotal ≥ esse valor → taxa = 0. | 80,00 |

### 2.3 Validações
- Valor base ≥ 0.
- Valor por km ≥ 0.
- Raio máximo > 0 (ex.: mínimo 1 km).
- Taxa mínima: se preenchida, ≥ 0 e aplicada após o cálculo linear.
- Taxa máxima: se preenchida, ≥ taxa mínima (quando houver).
- Pedido mínimo para isenção: se preenchido, > 0.
- Endereço do restaurante: obrigatório para delivery; sugerir geocodificação para garantir cálculo de distância (senão usar “endereço não disponível” e bloquear ou avisar).

### 2.4 Exemplo preenchido (tela)
- **Valor base:** R$ 3,00  
- **Valor por km:** R$ 2,50  
- **Raio máximo:** 10 km  
- **Taxa mínima:** R$ 5,00  
- **Taxa máxima:** R$ 22,00  
- **Pedido mínimo isenção:** R$ 80,00  

Texto de ajuda na tela (ex.):  
“A taxa será: máximo entre (taxa mínima) e mínimo entre (base + km × distância) e (taxa máxima). Se o pedido for ≥ R$ 80, a taxa será zerada.”

### 2.5 Preview na configuração
- Campo “Testar distância (km)”: ex.: 4 → “Taxa de exemplo: R$ 13,00” (usando as regras configuradas), para o restaurante validar antes de salvar.

---

## 3. Cálculo no checkout (passo a passo e exemplos)

### 3.1 Dados necessários
- **Origem:** coordenadas (lat/lng) do endereço do restaurante (geocode do `Restaurant.address`).
- **Destino:** coordenadas do endereço do cliente (geocode no checkout).
- **Subtotal do pedido:** soma dos itens (já existente).
- **Regras do restaurante:** base, por km, raio máximo, mínima, máxima, isenção.

### 3.2 Passo a passo do cálculo

1. **Geocodificar** o endereço do cliente (se ainda não tiver coordenadas).
2. **Calcular distância** em linha reta (ou rota, se houver API) entre origem e destino, em km.
3. **Verificar raio máximo:** se `distância_km > raio_max_km` → não permitir entrega (mensagem: “Fora da área de entrega” ou configurável).
4. **Calcular taxa bruta:**  
   `taxa_bruta = valor_base + (valor_por_km × distância_km)`  
   (arredondar para 2 decimais; ver seção 4).
5. **Aplicar mínima:** `taxa = max(taxa_bruta, taxa_minima)` (se taxa mínima estiver configurada).
6. **Aplicar máxima:** `taxa = min(taxa, taxa_maxima)` (se taxa máxima estiver configurada).
7. **Aplicar isenção:** se `subtotal >= pedido_minimo_isenção` → `taxa = 0`.
8. **Retornar** `taxa` (e, se desejado, `distancia_km` e `dentro_raio`) para exibir no resumo e gravar no pedido.

### 3.3 Exemplos numéricos

**Regras:** base R$ 3, valor/km R$ 2,50, raio 10 km, mínima R$ 5, máxima R$ 22, isenção R$ 80.

| Distância | Subtotal | Cálculo bruto | Após mín/máx | Após isenção |
|-----------|----------|----------------|--------------|--------------|
| 0 km      | R$ 50    | 3 + 0 = 3      | max(3, 5) = **5** | 5 (subtotal < 80) |
| 4 km      | R$ 30    | 3 + 10 = 13    | 13           | 13 |
| 4 km      | R$ 90    | 3 + 10 = 13    | 13           | **0** (isenção) |
| 8 km      | R$ 40    | 3 + 20 = 23    | min(23, 22) = **22** | 22 |
| 12 km     | —        | —              | **Fora do raio** (não entrega) | — |

---

## 4. Requisitos funcionais e não funcionais (casos de borda)

### 4.1 Funcionais
- RF01: Restaurante pode cadastrar e editar a regra de taxa (base, por km, raio, mínima, máxima, isenção).
- RF02: No checkout, o sistema calcula a distância (origem restaurante × endereço cliente) e aplica a regra do restaurante.
- RF03: Se distância > raio máximo, o sistema impede o pedido e exibe mensagem clara.
- RF04: Se o endereço do cliente não puder ser geocodificado, o sistema exibe mensagem e não calcula taxa (ou usa fallback; ver borda).
- RF05: Alteração de endereço no checkout recalcula a taxa e atualiza o total antes de confirmar.
- RF06: O valor da taxa calculado é exibido no resumo do pedido e gravado no pedido (DeliveryOrder.deliveryFee) junto com subtotal e total.
- RF07: Comportamento de “isenção por pedido mínimo” opcional e configurável por restaurante.

### 4.2 Não funcionais
- RNF01: **Performance:** Cálculo de taxa < 2 s (geocoding pode ser o gargalo; considerar cache ou assíncrono).
- RNF02: **Arredondamento:** Taxa em reais com 2 casas decimais (padrão monetário); usar arredondamento consistente (ex.: Math.round(valor * 100) / 100).
- RNF03: **Segurança:** Apenas o restaurante dono (ou com permissão) altera as regras de taxa; cliente só visualiza e recebe o valor calculado.

### 4.3 Casos de borda
- **Distância 0 (mesmo endereço / muito próximo):** Tratar como 0 km. Taxa = valor_base (e depois mínima se houver). Ex.: base 3 + mínima 5 → taxa 5.
- **Endereços inválidos ou não geocodificáveis:** Não calcular taxa; exibir: “Não foi possível calcular a distância. Verifique o endereço ou entre em contato com o restaurante.” Opcional: permitir restaurante definir “taxa fixa de fallback” quando geocode falhar (evita travar o pedido).
- **Arredondamento:** Sempre 2 decimais; evitar 9,999 → 10,00 por arredondamento matemático consistente.
- **Alteração de endereço no checkout:** Ao mudar o endereço (e ao sair do campo ou clicar em “Recalcular”), buscar geocode do novo endereço, recalcular distância e taxa e atualizar total. Manter estado “calculando…” até a resposta.
- **Raio máximo exatamente igual à distância:** Considerar dentro da área (ex.: 10,0 km com raio 10 → entrega permitida).
- **Valores zerados:** valor_base = 0 e valor_por_km = 0 → taxa = 0 (ou taxa mínima, se houver); raio máximo ainda deve ser respeitado.
- **Restaurante sem endereço ou sem regra cadastrada:** Usar fallback: taxa fixa atual (R$ 5,00) ou bloquear cálculo e exibir aviso até o restaurante configurar (conforme migração).

---

## 5. Impactos e plano de migração da taxa automática atual

### 5.1 Situação atual (no código)
- `DeliveryMenu.tsx`: `const deliveryFee = 5.00` (fixo).
- `createDeliveryOrder` recebe `deliveryFee` e grava em `DeliveryOrder.deliveryFee`.
- Não há `deliverySettings` de taxa no `Restaurant`; só `enabled` e `aiDescription`.

### 5.2 Impactos
- **Backend / Firestore:** Novo bloco em `deliverySettings` (ou documento/coleção de configuração de entrega) para armazenar a regra (base, por_km, raio_max, etc.).
- **Frontend – Configurações:** Nova seção “Taxa de entrega” na aba Delivery, com os campos descritos na seção 2.
- **Frontend – DeliveryMenu:** Remover constante fixa; obter regras do restaurante; após endereço do cliente, chamar serviço/função que calcula distância e taxa; exibir taxa no resumo e enviar no `createDeliveryOrder`.
- **Serviço de geocoding:** Novo (ou integração com Google Maps / Nominatim / outro) para endereço → coordenadas e cálculo de distância (Haversine ou API de rota).
- **Pedidos já existentes:** Continuam com `deliveryFee` numérico; não é necessário recalcular pedidos antigos.

### 5.3 Plano de migração (compatibilidade, sem quebra)
1. **Fase 1 – Dados e configuração**
   - Adicionar estrutura de “regra de taxa” em `deliverySettings` (ou equivalente), com campos opcionais.
   - Se o restaurante não tiver regra preenchida → considerar “regra não configurada”.

2. **Fase 2 – Comportamento no checkout**
   - Se **regra configurada** e endereço do restaurante e do cliente permitirem cálculo:
     - Calcular taxa por distância (e mín/máx/isenção) e usar esse valor.
   - Se **regra não configurada** ou **erro de geocode/raio** (e não houver fallback):
     - **Fallback:** usar taxa fixa atual **R$ 5,00** (comportamento atual), para não quebrar pedidos.
   - Exibir na UI: “Taxa de entrega: R$ X,XX” (e opcionalmente “calculada por distância” ou “taxa fixa”).

3. **Fase 3 – Incentivo à configuração**
   - Na Configurações, se delivery estiver ativo e regra estiver vazia, exibir aviso: “Configure a taxa por distância para personalizar o valor da entrega. Enquanto não configurar, será usada a taxa fixa de R$ 5,00.”

4. **Resumo de compatibilidade**
   - Contrato de `createDeliveryOrder` e `DeliveryOrder.deliveryFee` permanecem; apenas a **origem** do valor muda (cálculo por distância ou fallback 5,00).
   - Nenhuma alteração obrigatória em pedidos já criados.

---

## 6. Estrutura de dados sugerida (regras de taxa)

### 6.1 No restaurante (Firestore) – extensão de `deliverySettings`

Objeto aninhado em `restaurant.deliverySettings` (ou em documento separado `deliveryConfig/{restaurantId}`):

```ts
// Exemplo em TypeScript (DTO / tipo)
interface DeliveryFeeRule {
  /** Valor fixo em reais (pode ser 0). */
  baseFee: number;
  /** Valor por quilômetro em reais. */
  perKmFee: number;
  /** Raio máximo de entrega em km. Acima disso não entrega. */
  maxRadiusKm: number;
  /** Taxa mínima em reais (opcional). */
  minFee?: number;
  /** Taxa máxima em reais (opcional). */
  maxFee?: number;
  /** Subtotal mínimo em reais para isentar a taxa (opcional). */
  freeDeliveryAboveSubtotal?: number;
}

interface DeliverySettings {
  enabled: boolean;
  aiDescription: string;
  /** Regra de taxa por distância. Se ausente, usa taxa fixa legada (ex.: 5). */
  feeRule?: DeliveryFeeRule;
  /** (Opcional) Taxa fixa de fallback quando não houver regra ou geocode falhar. */
  fallbackFixedFee?: number;
}
```

### 6.2 Persistência (Firestore)

- **Opção A – No documento do restaurante:**  
  `restaurants/{restaurantId}` → campo `deliverySettings.feeRule` (e `fallbackFixedFee`).
- **Opção B – Documento separado:**  
  `deliveryConfig/{restaurantId}` com `feeRule`, `fallbackFixedFee`, `updatedAt`.  
  Facilita histórico e auditoria sem alterar o documento grande do restaurante.

### 6.3 Exemplo de documento (Firestore)

```json
{
  "deliverySettings": {
    "enabled": true,
    "aiDescription": "Pizza e massas, entrega rápida",
    "feeRule": {
      "baseFee": 3,
      "perKmFee": 2.5,
      "maxRadiusKm": 10,
      "minFee": 5,
      "maxFee": 22,
      "freeDeliveryAboveSubtotal": 80
    },
    "fallbackFixedFee": 5
  }
}
```

### 6.4 Dados no pedido (já existente + opcional)

- **Manter:** `DeliveryOrder.deliveryFee` (número) – valor final em reais.
- **Opcional para suporte/auditoria:**  
  `deliveryFeeDetails?: { distanceKm: number; ruleUsed: 'distance' | 'fallback'; rawFee?: number }`  
  para saber como o valor foi obtido (distância, regra, valor antes de mín/máx).

---

## Resumo executivo

- **Regras:** Linear (base + por km), com opção de mínima, máxima, raio máximo e isenção por pedido mínimo; depois podem vir faixas.
- **Cadastro:** Seção “Taxa de entrega” em Configurações → Delivery, com campos validados e preview por distância.
- **Checkout:** Geocode → distância → aplicar regra (com mín/máx e isenção) → exibir e gravar taxa; fora do raio = não permitir entrega.
- **Requisitos e bordas:** Distância 0, endereço inválido, arredondamento, mudança de endereço e fallback tratados de forma explícita.
- **Migração:** Regra opcional; se ausente ou erro, usar taxa fixa R$ 5,00; sem mudança em pedidos antigos.
- **Dados:** `DeliveryFeeRule` em `deliverySettings` (ou em `deliveryConfig`); `deliveryFee` no pedido mantido; opcional `deliveryFeeDetails` para rastreio.

Este documento pode ser usado como base para especificação técnica e implementação no projeto 221gourmet.
