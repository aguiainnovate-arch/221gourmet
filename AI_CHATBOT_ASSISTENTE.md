# 🤖 Chatbot AI - Assistente de Recomendação de Restaurantes

## 📋 Visão Geral

O chatbot AI foi integrado com a OpenAI para funcionar como um assistente inteligente que recomenda restaurantes com base nas conversas com os usuários. A AI tem acesso completo a todos os restaurantes no delivery e seus cardápios.

## ✨ Funcionalidades

### 1. Recomendações Inteligentes
- A AI analisa as preferências do usuário através da conversa
- Recomenda restaurantes específicos baseado em:
  - Tipo de comida desejada
  - Faixa de preço
  - Pratos específicos
  - Tempo de preparo
  - Restrições alimentares (vegano, vegetariano, etc.)

### 2. **Cards Dinâmicos e Clicáveis** ⭐ NOVO!
- Quando a AI menciona restaurantes, aparecem **cards visuais** automaticamente
- Cada card mostra:
  - Nome do restaurante
  - Razão da recomendação
  - Endereço e telefone
  - Avaliação (estrelas)
  - Botão para ver cardápio completo
- **Cards são clicáveis** - levam direto para a página do restaurante
- Design moderno com gradientes e animações
- Hover effects para melhor UX

### 3. Conhecimento Completo
- A AI tem acesso a:
  - Todos os restaurantes ativos no sistema
  - Cardápios completos com descrições
  - Preços de todos os produtos
  - Categorias de pratos
  - Tempo de preparo estimado
  - Endereços e telefones dos restaurantes

### 4. Conversação Natural
- Interface de chat moderna e amigável
- Usa emojis para tornar a conversa mais agradável
- Mantém contexto da conversa (histórico)
- Responde de forma personalizada

### 5. Modo Fallback
- Se a API OpenAI não estiver configurada, o chatbot funciona em modo limitado
- Exibe aviso visual quando em modo limitado
- Ainda oferece ajuda básica ao usuário

## 🚀 Como Usar

### Para Usuários (Clientes)

1. **Acessar o Chat**
   - Clique no botão flutuante laranja no canto inferior direito da tela
   - O botão tem um ícone de mensagem com um indicador verde pulsante

2. **Iniciar Conversa**
   - O assistente vai cumprimentar você automaticamente
   - Use as sugestões rápidas ou digite sua própria mensagem
   - Exemplos de perguntas:
     - "Quero pizza"
     - "Estou com pouco dinheiro, o que tem barato?"
     - "Precisa ser rápido, tenho pressa"
     - "Tem opções vegetarianas?"
     - "Quero comida japonesa"

3. **Receber Recomendações**
   - A AI vai analisar seus pedidos
   - Vai recomendar restaurantes específicos
   - Vai mencionar pratos que combinam com seu gosto
   - Vai considerar sua faixa de preço se mencionada
   
4. **Interagir com Cards** ⭐ NOVO!
   - Quando a AI recomendar restaurantes, **cards visuais aparecem automaticamente**
   - Clique em qualquer card para ir direto ao cardápio do restaurante
   - O chat fecha automaticamente ao clicar em um card
   - Você é redirecionado para `/delivery/{restaurantId}`

### Para Administradores

1. **Configurar a API OpenAI** (Necessário para AI completa)
   - Acesse `/owner` no painel administrativo
   - Vá em "Configuração de IA"
   - Cole sua chave da API OpenAI
   - Configure os parâmetros:
     - Modelo: `gpt-4o-mini` (recomendado)
     - Max Tokens: 800 (suficiente para recomendações)
     - Temperature: 0.8 (criativo mas focado)

2. **Verificar Status**
   - O chatbot carrega automaticamente os dados dos restaurantes ao abrir
   - Mostra quantos restaurantes conhece na parte inferior
   - Indicador verde = AI totalmente funcional
   - Indicador amarelo = AI em modo limitado

## 🔧 Arquitetura Técnica

### Arquivos Modificados/Criados

#### 1. `src/services/restaurantService.ts`
```typescript
// Nova função adicionada
export const getAllRestaurantsWithMenus = async (): Promise<RestaurantWithMenu[]>
```
- Busca todos os restaurantes ativos
- Para cada restaurante, busca seus produtos disponíveis
- Retorna estrutura otimizada para a AI

#### 2. `src/services/openaiService.ts`
```typescript
// Nova função adicionada
export const recommendRestaurants = async (
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  restaurantsData: any[]
): Promise<RestaurantRecommendation>
```
- Recebe mensagem do usuário e histórico de conversa
- Inclui dados de todos os restaurantes no prompt do sistema
- **Retorna JSON estruturado com mensagem + restaurantes recomendados**
- Parse automático da resposta da AI

#### 3. `src/components/RestaurantChatCard.tsx` ⭐ NOVO!
- Componente visual de card do restaurante
- Exibe nome, razão da recomendação, endereço, telefone
- Design com gradiente laranja/branco
- Animações no hover
- Integrado com React Router para navegação

#### 4. `src/components/AIRestaurantChat.tsx`
**Mudanças principais:**
- Integração com API real da OpenAI
- Carregamento automático de dados dos restaurantes
- Gerenciamento de histórico de conversa
- Estados de loading e erros
- Indicadores visuais de status
- Modo fallback quando AI não configurada
- **Renderização dinâmica de cards de restaurantes** ⭐
- **Navegação automática ao clicar nos cards** ⭐

### Fluxo de Dados

```
Usuário digita mensagem
    ↓
Chat carrega dados dos restaurantes (se ainda não carregou)
    ↓
Prepara histórico de conversa
    ↓
Chama recommendRestaurants() com:
  - Mensagem atual
  - Histórico completo
  - Dados de todos os restaurantes
    ↓
OpenAI processa com GPT-4o Mini
    ↓
Retorna JSON estruturado:
  {
    "message": "resposta conversacional",
    "restaurants": [
      { "id": "xxx", "name": "Nome", "reason": "motivo" }
    ]
  }
    ↓
Parse do JSON
    ↓
Exibe mensagem + renderiza cards dos restaurantes
    ↓
Usuário clica no card
    ↓
Navega para /delivery/{restaurantId}
```

## 💡 Prompt da AI

A AI recebe instruções detalhadas:

```
Você é um assistente virtual especializado em recomendar restaurantes.

Seu papel é:
1. Entender as preferências do usuário
2. Analisar os restaurantes disponíveis e seus cardápios
3. Fazer recomendações personalizadas
4. Ser amigável e usar emojis
5. Destacar pratos específicos
6. Mencionar faixas de preço quando relevante
7. Sugerir alternativas se necessário
```

A AI também recebe todos os dados dos restaurantes em formato JSON estruturado:
- Nome, endereço, telefone
- Categorias disponíveis
- Pratos em destaque (top 5)
- Preço médio calculado

### Formato de Resposta da AI

A AI foi instruída a responder SEMPRE em formato JSON:

```json
{
  "message": "Mensagem conversacional amigável aqui 😊",
  "restaurants": [
    {
      "id": "id_do_firestore",
      "name": "Nome do Restaurante",
      "reason": "Ótima opção de pizza com preços acessíveis"
    }
  ]
}
```

- `message`: Texto que aparece no balão de chat
- `restaurants`: Array de restaurantes mencionados (gera cards automáticos)

## 📊 Dados Fornecidos à AI

Para cada restaurante, a AI recebe:

```json
{
  "nome": "Nome do Restaurante",
  "endereco": "Rua X, 123",
  "telefone": "(11) 1234-5678",
  "categorias": ["Pizza", "Massas", "Bebidas"],
  "pratos_destaque": [
    {
      "nome": "Pizza Margherita",
      "descricao": "Molho de tomate, mussarela...",
      "preco": 45.90
    }
  ],
  "preco_medio": "38.50"
}
```

## 🎯 Casos de Uso

### Caso 1: Cliente com orçamento limitado
**Usuário:** "Tenho R$ 30, o que dá pra comer?"
**AI:** Analisa todos os restaurantes, encontra pratos abaixo de R$ 30, recomenda os melhores com boa relação custo-benefício

### Caso 2: Cliente vegetariano
**Usuário:** "Sou vegetariano, tem opções?"
**AI:** Busca nos cardápios pratos vegetarianos, recomenda restaurantes com boas opções, destaca pratos específicos

### Caso 3: Cliente com pressa
**Usuário:** "Preciso de algo rápido"
**AI:** Considera tempo de preparo dos pratos, recomenda restaurantes com pratos rápidos

### Caso 4: Cliente indeciso
**Usuário:** "Não sei o que comer"
**AI:** Mostra as opções mais populares, variadas categorias, ajuda a decidir fazendo perguntas

## ⚙️ Configurações Recomendadas

### OpenAI API
- **Modelo:** `gpt-4o-mini` (melhor custo-benefício)
- **Max Tokens:** 800 (suficiente para respostas completas)
- **Temperature:** 0.8 (equilibra criatividade e precisão)

### Performance
- Dados carregados apenas ao abrir o chat (não carrega sempre)
- Cache de dados dos restaurantes durante a sessão
- Histórico de conversa mantido em memória

## 🔒 Segurança

- API Key armazenada apenas no localStorage (cliente)
- Dados dos restaurantes públicos (sem informações sensíveis)
- Sem autenticação necessária para usar o chat
- Firestore rules permitem leitura pública de produtos e restaurantes

## 🎨 Exemplo Visual de Uso

### Fluxo Completo:

1. **Usuário:** "Quero pizza barata"
   
2. **AI Responde:**
   ```
   🍕 Perfeito! Encontrei ótimas opções de pizza com preços acessíveis!
   ```
   
3. **Cards Aparecem Automaticamente:**
   ```
   ┌──────────────────────────────────────┐
   │  🏪 Pizzaria Bella Napoli      ⭐4.5│
   │  Ótima opção de pizza com preços    │
   │  acessíveis e entrega rápida        │
   │  📍 Rua das Flores, 123              │
   │  📞 (11) 1234-5678                   │
   │  ──────────────────────────────────  │
   │  Ver cardápio completo →             │
   └──────────────────────────────────────┘
   ```

4. **Usuário clica no card → Vai para /delivery/xxx**

## 📈 Melhorias Futuras

Sugestões para evolução:
1. Cache de recomendações frequentes
2. Análise de sentimento para melhorar respostas
3. Integração com sistema de avaliações
4. Sugestões baseadas em histórico do usuário (com login)
5. ✅ ~~Fotos dos pratos nas recomendações~~ → Adicionar imagens aos cards
6. ✅ ~~Links diretos para fazer pedido~~ → Implementado via cards clicáveis
7. Comparação lado a lado de restaurantes
8. Filtros avançados (entrega grátis, promoções, etc.)
9. Animação de entrada dos cards (fade in sequencial)
10. Badges de promoção/destaque nos cards

## 🐛 Troubleshooting

### Chat não funciona
- Verificar se há restaurantes ativos no sistema
- Verificar se os restaurantes têm produtos cadastrados
- Verificar console do navegador para erros

### AI em modo limitado
- Configurar API Key da OpenAI em `/owner/ai-config`
- Verificar se a chave é válida
- Verificar créditos da conta OpenAI

### Respostas genéricas
- Verificar se os dados dos restaurantes estão sendo carregados
- Verificar console: "Dados dos restaurantes carregados: X restaurantes"
- Se X = 0, não há dados para a AI trabalhar

### Erro ao carregar restaurantes
- Verificar conexão com Firebase/Firestore
- Verificar regras do Firestore (devem permitir leitura pública)
- Verificar se há erros no console

## 📝 Notas Importantes

1. **Custo:** Cada interação consome tokens da OpenAI. Com gpt-4o-mini o custo é muito baixo (~$0.0001 por conversa)

2. **Latência:** Primeira mensagem pode demorar mais (carrega dados). Mensagens seguintes são mais rápidas.

3. **Dados em Tempo Real:** O chat carrega dados sempre que abre. Se adicionar novos restaurantes, basta fechar e abrir o chat novamente.

4. **Idioma:** Atualmente em Português BR. Pode ser adaptado para multi-idioma.

5. **Mobile:** Interface responsiva funciona em dispositivos móveis.

---

**Desenvolvido com ❤️ usando OpenAI GPT-4o Mini**


