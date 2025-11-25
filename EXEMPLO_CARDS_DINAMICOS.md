# 🎯 Cards Dinâmicos no Chatbot AI - Exemplo de Uso

## Como Funciona

Quando você conversa com o chatbot AI e ele recomenda restaurantes, **cards visuais aparecem automaticamente** abaixo da mensagem!

## 📱 Exemplo Visual

### Conversa 1: Pizza
```
👤 Usuário: "Quero pizza"

🤖 AI: "🍕 Ótima escolha! Encontrei restaurantes especializados em pizza:"

   ┌─────────────────────────────────────────────┐
   │ 🏪 Pizzaria Bella Napoli          ⭐ 4.5  │
   │                                             │
   │ 🎯 Especializada em pizzas artesanais      │
   │    com massa fina e ingredientes frescos    │
   │                                             │
   │ 📍 Rua das Palmeiras, 456                  │
   │ 📞 (11) 98765-4321                          │
   │                                             │
   │ ─────────────────────────────────────────── │
   │       Ver cardápio completo →               │
   └─────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────┐
   │ 🏪 Pizza Express                  ⭐ 4.5  │
   │                                             │
   │ 🎯 Entregas rápidas e preços acessíveis    │
   │                                             │
   │ 📍 Av. Principal, 789                       │
   │ 📞 (11) 91234-5678                          │
   │                                             │
   │ ─────────────────────────────────────────── │
   │       Ver cardápio completo →               │
   └─────────────────────────────────────────────┘
```

### Conversa 2: Comida Barata
```
👤 Usuário: "Tenho só R$ 25, o que dá pra comer?"

🤖 AI: "💰 Ótimo! Encontrei várias opções deliciosas que cabem no seu orçamento:"

   ┌─────────────────────────────────────────────┐
   │ 🏪 Lanche Feliz                   ⭐ 4.5  │
   │                                             │
   │ 🎯 Marmitas a partir de R$ 15,00           │
   │                                             │
   │ 📍 Rua do Comércio, 321                     │
   │ 📞 (11) 95555-1234                          │
   │                                             │
   │ ─────────────────────────────────────────── │
   │       Ver cardápio completo →               │
   └─────────────────────────────────────────────┘
```

### Conversa 3: Vegetariano
```
👤 Usuário: "Sou vegetariano"

🤖 AI: "🥗 Perfeito! Temos ótimas opções vegetarianas:"

   ┌─────────────────────────────────────────────┐
   │ 🏪 Green Life                     ⭐ 4.5  │
   │                                             │
   │ 🎯 Cardápio 100% vegetariano e vegano      │
   │                                             │
   │ 📍 Rua Saúde, 101                           │
   │ 📞 (11) 97777-8888                          │
   │                                             │
   │ ─────────────────────────────────────────── │
   │       Ver cardápio completo →               │
   └─────────────────────────────────────────────┘
```

## ✨ Características dos Cards

### Design
- ✅ Gradiente de branco para laranja claro
- ✅ Borda laranja que fica mais forte no hover
- ✅ Sombra que aumenta ao passar o mouse
- ✅ Ícone de seta à direita que cresce no hover
- ✅ Transições suaves em todas as animações

### Informações Exibidas
- ✅ Nome do restaurante
- ✅ Avaliação com estrelas (4.5 por padrão)
- ✅ Razão da recomendação (personalizada pela AI)
- ✅ Endereço completo
- ✅ Telefone para contato
- ✅ Botão "Ver cardápio completo"

### Interatividade
- ✅ Todo o card é clicável
- ✅ Ao clicar, fecha o chat
- ✅ Redireciona para `/delivery/{restaurantId}`
- ✅ Navegação via React Router
- ✅ Efeitos visuais no hover

## 🔄 Fluxo Técnico

```javascript
// 1. AI retorna JSON estruturado
{
  "message": "🍕 Ótima escolha! Encontrei restaurantes...",
  "restaurants": [
    {
      "id": "abc123",
      "name": "Pizzaria Bella Napoli",
      "reason": "Especializada em pizzas artesanais"
    }
  ]
}

// 2. Chat renderiza mensagem + cards
<Message text={message} />
{restaurants.map(r => (
  <RestaurantChatCard
    id={r.id}
    name={r.name}
    reason={r.reason}
    address={restaurantData.address}
    phone={restaurantData.phone}
  />
))}

// 3. Ao clicar no card
navigate(`/delivery/${restaurant.id}`);
setIsOpen(false); // Fecha o chat
```

## 🎯 Casos de Uso

### Caso 1: Múltiplos Restaurantes
A AI pode recomendar vários restaurantes de uma vez:
- Cada um ganha seu próprio card
- Cards aparecem em sequência vertical
- Todos são clicáveis individualmente

### Caso 2: Sem Recomendações Específicas
Se a AI não mencionar restaurantes específicos:
- Apenas a mensagem de texto aparece
- Nenhum card é renderizado
- Conversa continua normalmente

### Caso 3: Conversação Longa
Durante uma conversa longa:
- Cards aparecem apenas nas mensagens onde há recomendações
- Histórico preserva os cards anteriores
- Todos os cards antigos continuam clicáveis

## 🚀 Para Testar

1. Abra o chatbot (botão laranja flutuante)
2. Digite: **"Quero pizza"**
3. Aguarde a resposta da AI
4. Veja os cards aparecerem automaticamente
5. Clique em um card para ir ao restaurante

## 💡 Dicas de Teste

Para ver os cards em ação, pergunte coisas como:
- "Quero pizza"
- "Me recomenda algum restaurante"
- "Tenho R$ 30, onde posso comer?"
- "Preciso de comida japonesa"
- "Opções vegetarianas?"

A AI vai analisar e recomendar restaurantes, e os cards aparecerão automaticamente! 🎉

---

**Desenvolvido com ❤️ e muito design thinking**

