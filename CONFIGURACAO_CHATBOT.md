# ⚙️ Configuração Personalizada do Chatbot AI

## 📋 Visão Geral

Agora você pode personalizar completamente o comportamento do chatbot AI através da página de configuração em `/owner`. Defina regras, tom de voz, mensagens e muito mais!

## 🎯 Como Acessar

1. Acesse `/owner` (página administrativa)
2. Clique em "Configuração de IA" no menu lateral
3. Role até a seção **"Configuração do Chatbot"** (com ícone laranja ✨)

## ⚙️ Opções de Configuração

### 1. **Mensagem de Boas-Vindas** 👋

```
Campo: Textarea (2 linhas)
Padrão: "Olá! 👋 Sou seu assistente virtual..."
```

**O que faz:**
- Define a primeira mensagem que o usuário vê ao abrir o chat
- Pode incluir emojis e quebras de linha
- É carregada automaticamente ao abrir o chatbot

**Exemplos:**

```
🍕 Bem-vindo! Estou aqui para te ajudar a encontrar a comida perfeita!

🎉 Olá! Pronto para descobrir restaurantes incríveis? Vamos lá!

👋 Oi! Que tipo de comida você está procurando hoje?
```

### 2. **Tom de Voz** 🎭

```
Campo: Select (dropdown)
Opções:
  - Amigável e Casual 😊
  - Profissional e Formal 👔
  - Entusiasmado e Energético 🎉
```

**O que faz:**
- Define o estilo de comunicação da IA
- Afeta o uso de emojis e a formalidade das respostas
- Aplicado automaticamente em todas as mensagens

**Comportamento por tom:**

#### Amigável e Casual 😊
```
- Usa emojis moderadamente
- Linguagem informal e acolhedora
- Tom conversacional natural
Exemplo: "Legal! Que tipo de comida você gosta? 😊"
```

#### Profissional e Formal 👔
```
- Poucos emojis
- Linguagem mais formal
- Tom corporativo e respeitoso
Exemplo: "Certamente posso ajudá-lo. Que tipo de culinária prefere?"
```

#### Entusiasmado e Energético 🎉
```
- Muitos emojis
- Linguagem empolgada
- Tom vibrante e animado
Exemplo: "Que ótimo! 🎉 Vamos encontrar algo DELICIOSO para você! 🍕✨"
```

### 3. **Quando Mostrar Cards de Restaurantes** 🎯

```
Campo: Select (dropdown)
Opções:
  - Conservador 🎯
  - Equilibrado 📊
  - Proativo 🚀
```

**O que faz:**
- Define a frequência com que cards de restaurantes aparecem
- Controla quando a IA deve recomendar restaurantes ativamente

**Comportamento por nível:**

#### Conservador 🎯 (Padrão)
```
A IA só mostra cards quando:
- Usuário pedir explicitamente ("me recomenda", "quais são as opções")
- Conversa claramente indicar que está pronto para ver opções
- Usuário demonstrar interesse muito forte

Exemplo de conversa:
👤 "Quero pizza"
🤖 "Ótimo! Que estilo de pizza você prefere?" [SEM CARD]
👤 "Pode recomendar alguma?"
🤖 "Claro! Tenho ótimas opções:" [COM CARDS]
```

#### Equilibrado 📊
```
A IA mostra cards quando:
- Usuário demonstrar interesse claro em um tipo de comida
- Conversa indicar que está buscando opções
- Fizer sentido mostrar sugestões

Exemplo de conversa:
👤 "Quero pizza"
🤖 "Ótima escolha! Veja estas opções:" [COM CARDS]
```

#### Proativo 🚀
```
A IA mostra cards frequentemente:
- Ao menor sinal de interesse
- Após entender preferências básicas
- De forma proativa para agilizar a escolha

Exemplo de conversa:
👤 "Tô com fome"
🤖 "Que tal estas opções populares?" [COM CARDS]
```

### 4. **Regras Personalizadas** 📝

```
Campo: Textarea (6 linhas, monospaced)
Formato: Uma regra por linha
```

**O que faz:**
- Adiciona comportamentos específicos para sua operação
- Regras são incluídas no prompt da IA
- Aplicadas em todas as conversas

**Exemplos de Regras:**

```
Sempre mencionar opções vegetarianas quando disponível
Priorizar restaurantes com entrega grátis
Sugerir bebidas junto com comidas
Destacar promoções e descontos ativos
Mencionar tempo de entrega estimado
Recomendar acompanhamentos populares
Avisar sobre pratos picantes
Sugerir porções para grupos quando apropriado
Mencionar opções sem glúten se houver
Priorizar restaurantes com avaliação acima de 4.5
```

**Regras mais Complexas:**

```
Se o usuário mencionar "barato" ou "econômico", focar em opções abaixo de R$ 25
Sempre perguntar sobre restrições alimentares antes de recomendar
Se for noite (após 18h), sugerir opções de jantar
Nos finais de semana, mencionar pratos especiais
Para pedidos acima de R$ 50, mencionar restaurantes com frete grátis
```

## 💾 Salvamento e Aplicação

### Como Salvar
1. Configure todos os campos desejados
2. Clique em **"Salvar Configurações do Chatbot"** (botão laranja)
3. Aguarde a confirmação "✅ Configuração do chatbot salva com sucesso!"

### Onde é Salvo
- **localStorage** do navegador
- Chave: `chatbot-config`
- Persiste entre sessões
- Específico por domínio/navegador

### Quando é Aplicado
- ✅ **Imediatamente** após salvar
- ✅ Aplicado em todas as novas conversas do chat
- ✅ Afeta todos os usuários que acessam o site
- ⚠️ Conversas já abertas precisam ser fechadas e reabertas

## 🧪 Como Testar

### Teste Rápido
1. Configure e salve as alterações
2. Abra a página `/delivery`
3. Clique no botão do chatbot (laranja flutuante)
4. Verifique:
   - ✅ Mensagem de boas-vindas personalizada
   - ✅ Tom de voz nas respostas
   - ✅ Frequência de aparição de cards
   - ✅ Regras personalizadas sendo aplicadas

### Teste de Tom de Voz

**Configure: "Profissional"**
```
Digite: "Quero pizza"
Esperado: Resposta formal sem muitos emojis
```

**Configure: "Entusiasmado"**
```
Digite: "Quero pizza"
Esperado: Resposta animada com vários emojis
```

### Teste de Cards

**Configure: "Conservador"**
```
Digite: "Quero pizza"
Esperado: Pergunta adicional, SEM cards
Digite: "Me recomenda alguma"
Esperado: Cards aparecem
```

**Configure: "Proativo"**
```
Digite: "Quero pizza"
Esperado: Cards aparecem imediatamente
```

### Teste de Regras Personalizadas

**Configure: "Sempre mencionar opções vegetarianas"**
```
Digite: "Me recomenda um restaurante"
Esperado: IA menciona opções vegetarianas na resposta
```

## 📊 Estrutura Técnica

### Formato do JSON Salvo
```json
{
  "greeting": "Olá! 👋 Como posso ajudar?",
  "tone": "friendly",
  "showCardsThreshold": "conservative",
  "customRules": "Sempre mencionar opções vegetarianas\nPriorizar restaurantes com entrega grátis"
}
```

### Integração com OpenAI

As configurações são injetadas no prompt do sistema:

```typescript
const systemPrompt = `
Você é um assistente virtual...

TOM DE VOZ:
${toneInstructions}

POLÍTICA DE RECOMENDAÇÕES:
${cardsInstructions}

REGRAS PERSONALIZADAS:
${customRules}

DADOS DOS RESTAURANTES:
...
`;
```

## 🎨 Interface Visual

### Localização
- **Página:** `/owner` → Configuração de IA
- **Seção:** "Configuração do Chatbot" (com borda laranja)
- **Posição:** Coluna esquerda, após "Configuração da API"

### Elementos
- 📝 Campo de mensagem de boas-vindas
- 🎭 Dropdown de tom de voz
- 🎯 Dropdown de threshold de cards
- 📋 Textarea de regras personalizadas
- 💾 Botão de salvar (laranja)
- 💡 Dica em destaque (amarelo)

## 💡 Dicas e Boas Práticas

### Mensagem de Boas-Vindas
✅ **BOM:** "Olá! Pronto para pedir comida deliciosa? 🍕"
❌ **EVITE:** Mensagens muito longas ou genéricas

### Tom de Voz
- Use "Amigável" para público geral
- Use "Profissional" para empresas/corporativo
- Use "Entusiasmado" para promoções/eventos

### Threshold de Cards
- "Conservador" = Melhor UX, menos intrusivo
- "Equilibrado" = Bom meio termo
- "Proativo" = Conversões rápidas, pode ser intrusivo

### Regras Personalizadas
✅ **BOM:** 
```
Sempre mencionar tempo de entrega
Priorizar restaurantes premium
```

❌ **EVITE:**
```
Seja sempre educado (muito genérico)
Responda bem (sem ação clara)
```

## 🔄 Resetar Configurações

Para voltar ao padrão:
1. Acesse `/owner` → Configuração de IA
2. Limpe todos os campos
3. Clique em "Salvar"
4. Ou delete a chave `chatbot-config` no localStorage via DevTools

## 📱 Compatibilidade

- ✅ Funciona em todos os navegadores modernos
- ✅ Persiste entre sessões
- ✅ Responsivo (mobile e desktop)
- ⚠️ Específico por domínio (produção ≠ desenvolvimento)

## 🚀 Casos de Uso

### Restaurante Premium
```
Tom: Profissional
Cards: Conservador
Regras:
- Destacar pratos gourmet
- Mencionar ingredientes premium
- Sugerir harmonização com vinhos
```

### Fast Food / Casual
```
Tom: Entusiasmado
Cards: Proativo
Regras:
- Mencionar promoções
- Sugerir combos
- Destacar entrega rápida
```

### Delivery Saudável
```
Tom: Amigável
Cards: Equilibrado
Regras:
- Sempre mencionar opções vegetarianas
- Destacar pratos sem glúten
- Mencionar informações nutricionais
```

---

**Configuração Simples, Poder Infinito! 🚀**

