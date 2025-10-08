# ✅ Integração Completa de Pedidos por Restaurante

## 🎯 Objetivo
Implementar separação de pedidos por restaurante, diferenciando pedidos de mesa e delivery na aba da cozinha.

## 📊 Estrutura de Dados

### FirestoreOrder (Pedido Unificado)
```typescript
{
  id: string;
  restaurantId: string;           // ID do restaurante
  mesaId: string;
  mesaNumero: string;
  timestamp: string;
  status: 'novo' | 'preparando' | 'pronto';
  itens: string[];
  tempoEspera: string;
  orderType: 'mesa' | 'delivery';  // Tipo do pedido
  deliveryInfo?: {                 // Apenas para delivery
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    paymentMethod: string;
    deliveryFee: number;
  };
}
```

## 🔧 Arquivos Modificados

### 1. `src/services/orderService.ts`
- ✅ Adicionado `restaurantId` e `orderType` ao `FirestoreOrder`
- ✅ Criada função `getOrdersByRestaurant(restaurantId)` para filtrar pedidos
- ✅ Atualizada função `addOrder` para incluir novos campos

### 2. `src/services/deliveryService.ts`
- ✅ Integrada sincronização automática com coleção `orders`
- ✅ Ao criar pedido de delivery, também cria na coleção unificada
- ✅ Tradução automática de métodos de pagamento

### 3. `src/contexts/OrderContext.tsx`
- ✅ Adicionado `setRestaurantId(id)` para conectar ao restaurante
- ✅ Modificado `loadOrders()` para buscar por `restaurantId`
- ✅ Auto-refresh a cada 30 segundos
- ✅ Logs detalhados para debug
- ✅ Tipo `Order` agora é igual a `FirestoreOrder`

### 4. `src/pages/Settings.tsx`
- ✅ Conecta automaticamente ao `restaurantId` do `useRestaurantData()`
- ✅ Estatísticas separadas: Mesa, Delivery e Total
- ✅ Diferenciação visual:
  - **Mesa**: Ícone Users (laranja)
  - **Delivery**: Ícone Truck (azul) + badge + borda azul
- ✅ Informações do cliente para delivery (nome, telefone, endereço, pagamento, taxa)
- ✅ Importados ícones: Truck, MapPin, Phone, CreditCard

### 5. `src/pages/Menu.tsx`
- ✅ Adicionado `restaurantId` do `useRestaurantData()`
- ✅ Incluído `restaurantId` e `orderType: 'mesa'` ao criar pedido

## 🎨 Interface da Cozinha

### Estatísticas (Topo)
```
┌─────────────────┬─────────────────┬─────────────────┐
│  Pedidos Mesa   │ Pedidos Delivery│ Total de Pedidos│
│       3         │        2        │        5        │
└─────────────────┴─────────────────┴─────────────────┘
```

### Card de Pedido de Mesa
```
┌────────────────────────────────────────┐
│ 👥 Mesa 5                              │
│ 14:30                          15 min  │
│                                        │
│ Itens do Pedido:                       │
│ • 2x Pizza Margherita                  │
│ • 1x Coca-Cola 2L                      │
│                                        │
│ [Iniciar Preparo]                      │
└────────────────────────────────────────┘
```

### Card de Pedido de Delivery
```
┌────────────────────────────────────────┐ (borda azul)
│ 🚚 Delivery #abc123    [Delivery]      │
│ 14:35                          10 min  │
│                                        │
│ ℹ️ Informações do Cliente              │
│ Nome: Gabriel                          │
│ 📞 5199999999                          │
│ 📍 endereço pedido delivery            │
│ 💳 Dinheiro                            │
│ Taxa de entrega: R$ 5.00               │
│                                        │
│ Itens do Pedido:                       │
│ • 1x CAMARÃO À MILANESA                │
│ • 1x CARNE DE SOL (info adicional)     │
│                                        │
│ [Iniciar Preparo] (botão azul)         │
└────────────────────────────────────────┘
```

## 🔄 Fluxo de Dados

### Pedido de Mesa (Menu)
```
Cliente → /menu/:mesaId
  ↓
Seleciona produtos
  ↓
Finaliza pedido
  ↓
addOrder({
  restaurantId,
  orderType: 'mesa',
  ...
})
  ↓
Firestore: collection('orders')
  ↓
OrderContext (filtrado por restaurantId)
  ↓
Settings: Aba Cozinha
```

### Pedido de Delivery
```
Cliente → /delivery/:restaurantId
  ↓
Seleciona produtos
  ↓
Preenche dados (nome, endereço, etc)
  ↓
createDeliveryOrder()
  ├─→ Firestore: collection('deliveries')
  └─→ Firestore: collection('orders') [SINCRONIZAÇÃO]
        ↓
    OrderContext (filtrado por restaurantId)
        ↓
    Settings: Aba Cozinha
```

## 🧪 Como Testar

### Teste 1: Pedido de Mesa
1. Acesse `/menu/:mesaId` (qualquer mesa)
2. Adicione produtos ao pedido
3. Finalize o pedido
4. Vá para `/settings?tab=cozinha`
5. ✅ Pedido aparece com ícone de usuários (laranja)

### Teste 2: Pedido de Delivery
1. Acesse `/delivery`
2. Escolha um restaurante
3. Adicione produtos ao carrinho
4. Preencha dados do cliente
5. Finalize o pedido
6. Vá para `/settings?tab=cozinha` do mesmo restaurante
7. ✅ Pedido aparece com:
   - Ícone de caminhão (azul)
   - Badge "Delivery"
   - Borda azul
   - Informações do cliente

### Teste 3: Separação por Restaurante
1. Crie pedido no Restaurante A
2. Crie pedido no Restaurante B
3. Abra `/settings?tab=cozinha` do Restaurante A
4. ✅ Mostra apenas pedidos do Restaurante A
5. Abra `/settings?tab=cozinha` do Restaurante B
6. ✅ Mostra apenas pedidos do Restaurante B

### Teste 4: Botão Atualizar
1. Com a cozinha aberta, crie um novo pedido
2. Clique no botão "Atualizar"
3. ✅ Novo pedido aparece imediatamente

### Teste 5: Auto-Refresh
1. Com a cozinha aberta, crie um novo pedido
2. Aguarde até 30 segundos
3. ✅ Pedido aparece automaticamente

## 📝 Logs de Debug

No console do navegador, você verá:
```
🏪 RestaurantId definido: YcL3Q98o8zkWRT1ak4BD
📊 Carregando pedidos para restaurante: YcL3Q98o8zkWRT1ak4BD
✅ Pedidos carregados: 5 | Mesa: 3 | Delivery: 2
```

## ⚠️ Notas Importantes

1. **Pedidos Antigos**: Pedidos criados antes desta atualização não terão `restaurantId` ou `orderType`. Eles não aparecerão na nova interface.

2. **Migração**: Se necessário, criar script de migração para adicionar esses campos aos pedidos existentes.

3. **Firestore Rules**: Certifique-se de que as regras do Firestore permitem leitura/escrita na coleção `orders` filtrada por `restaurantId`.

4. **Performance**: A query `where('restaurantId', '==', id)` é eficiente e não requer índice composto.

## 🚀 Próximos Passos (Opcional)

1. ✨ Notificação sonora quando novos pedidos chegam
2. 📊 Métricas de tempo médio de preparo
3. 🖨️ Impressão automática de tickets
4. 📱 Notificações push para dispositivos móveis
5. 🔔 Alerta quando pedidos estão esperando muito tempo

