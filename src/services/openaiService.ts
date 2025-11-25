import OpenAI from 'openai';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TestPromptResult {
  success: boolean;
  response?: string;
  error?: string;
  tokensUsed?: number;
  model?: string;
  timestamp?: Date;
}

export interface TranslationResult {
  success: boolean;
  translations?: {
    'en-US': { name: string; description: string };
    'es-ES': { name: string; description: string };
    'fr-FR': { name: string; description: string };
  };
  error?: string;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;

  constructor() {
    // Inicializar automaticamente com a chave do .env se disponível
    this.initializeFromEnv();
  }

  private initializeFromEnv(): void {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      this.initialize({
        apiKey: apiKey,
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7
      });
    }
  }

  initialize(config: OpenAIConfig): void {
    this.config = {
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.7,
      ...config
    };

    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  isConfigured(): boolean {
    return this.client !== null && this.config !== null;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client || !this.config) {
      return { success: false, error: 'OpenAI não configurado' };
    }

    try {
      await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Olá! Responda apenas "Conexão estabelecida com sucesso!"'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao testar conexão OpenAI:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<ChatResponse> {
    if (!this.client || !this.config) {
      return { 
        success: false, 
        error: 'OpenAI não configurado. Verifique se a variável VITE_OPENAI_API_KEY está definida no arquivo .env' 
      };
    }

    try {
      const messages: any[] = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      messages.push({
        role: 'user',
        content: message
      });

      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: messages,
        max_tokens: this.config.maxTokens || 1000,
        temperature: this.config.temperature || 0.7
      });

      const content = response.choices[0]?.message?.content || '';
      const usage = response.usage;

      return {
        success: true,
        content,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        } : undefined
      };

    } catch (error) {
      console.error('Erro ao enviar mensagem para OpenAI:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  async testPrompt(prompt: string, systemPrompt?: string): Promise<TestPromptResult> {
    const result = await this.sendMessage(prompt, systemPrompt);
    
    return {
      success: result.success,
      response: result.content,
      error: result.error,
      tokensUsed: result.usage?.totalTokens,
      model: this.config?.model,
      timestamp: new Date()
    };
  }

  getConfig(): OpenAIConfig | null {
    return this.config;
  }

  updateConfig(newConfig: Partial<OpenAIConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
      
      if (newConfig.apiKey) {
        this.initialize(this.config);
      }
    }
  }

  async translateProduct(name: string, description: string): Promise<TranslationResult> {
    if (!this.client || !this.config) {
      return { 
        success: false, 
        error: 'OpenAI não configurado. Verifique se a variável VITE_OPENAI_API_KEY está definida no arquivo .env' 
      };
    }

    const systemPrompt = `Você é um tradutor especializado em cardápios de restaurantes. Sua tarefa é traduzir nomes e descrições de produtos de forma natural e apetitosa para diferentes idiomas.

Regras importantes:
1. Mantenha o tom apetitoso e atrativo
2. Use termos culinários apropriados para cada idioma
3. Adapte culturalmente quando necessário (ex: "sanduíche" → "sandwich" em inglês)
4. Mantenha a mesma estrutura e estilo do texto original
5. Responda APENAS com um JSON válido no formato especificado

Formato de resposta (JSON):
{
  "en-US": {
    "name": "nome traduzido para inglês",
    "description": "descrição traduzida para inglês"
  },
  "es-ES": {
    "name": "nombre traducido al español",
    "description": "descripción traducida al español"
  },
  "fr-FR": {
    "name": "nom traduit en français",
    "description": "description traduite en français"
  }
}`;

    const userPrompt = `Traduza este produto de restaurante:

Nome: ${name}
Descrição: ${description}

Traduza para inglês (en-US), espanhol (es-ES) e francês (fr-FR).`;

    try {
      const response = await this.sendMessage(userPrompt, systemPrompt);
      
      if (!response.success || !response.content) {
        return { success: false, error: response.error || 'Erro na tradução' };
      }

      // Tentar fazer parse do JSON da resposta
      try {
        const translations = JSON.parse(response.content.trim());
        
        // Validar estrutura da resposta
        const requiredLanguages = ['en-US', 'es-ES', 'fr-FR'];
        const isValid = requiredLanguages.every(lang => 
          translations[lang] && 
          translations[lang].name && 
          translations[lang].description
        );

        if (!isValid) {
          return { success: false, error: 'Formato de resposta inválido da IA' };
        }

        return { success: true, translations };
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta:', response.content);
        return { success: false, error: 'Resposta da IA não está em formato JSON válido' };
      }
    } catch (error) {
      console.error('Erro na tradução:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido na tradução' 
      };
    }
  }
}

export const openaiService = new OpenAIService();

export const initializeOpenAI = (config: OpenAIConfig) => {
  openaiService.initialize(config);
};

export const testOpenAIConnection = () => {
  return openaiService.testConnection();
};

export const sendOpenAIMessage = (message: string, systemPrompt?: string) => {
  return openaiService.sendMessage(message, systemPrompt);
};

export const testOpenAIPrompt = (prompt: string, systemPrompt?: string) => {
  return openaiService.testPrompt(prompt, systemPrompt);
};

export const translateProduct = (name: string, description: string) => {
  return openaiService.translateProduct(name, description);
};

export interface MenuImageProduct {
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface MenuImageResult {
  success: boolean;
  products?: MenuImageProduct[];
  error?: string;
}

export const processMenuImage = async (base64Image: string): Promise<MenuImageResult> => {
  const client = (openaiService as any).client;
  const config = (openaiService as any).config;

  if (!client || !config) {
    return {
      success: false,
      error: 'OpenAI não configurado. Verifique se a variável VITE_OPENAI_API_KEY está definida no arquivo .env'
    };
  }

  const systemPrompt = `Você é um assistente especializado em extrair informações de cardápios de restaurantes através de imagens. 

Sua tarefa é:
1. Analisar a imagem do cardápio fornecida
2. Identificar TODOS os produtos/pratos visíveis
3. Extrair para cada produto: nome, descrição (se disponível), preço e categoria
4. Organizar os produtos em categorias lógicas (Entradas, Pratos Principais, Bebidas, Sobremesas, etc.)
5. Retornar um JSON válido com todos os produtos encontrados

Regras importantes:
- Se não houver descrição visível, use uma descrição genérica baseada no nome
- Converta todos os preços para número (ex: "R$ 25,90" → 25.90)
- Se não houver categoria explícita, infira uma categoria apropriada
- Mantenha os nomes dos produtos exatamente como aparecem no cardápio
- Se houver variações de tamanho/preço do mesmo produto, crie entradas separadas

Formato de resposta (JSON):
{
  "products": [
    {
      "name": "Nome do Produto",
      "description": "Descrição do produto",
      "price": 25.90,
      "category": "Categoria"
    }
  ]
}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analise esta imagem de cardápio e extraia todos os produtos com suas informações no formato JSON especificado.'
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'Erro ao processar imagem' };
    }

    try {
      // Limpar o conteúdo removendo blocos de código markdown
      let cleanContent = content.trim();
      
      // Remover ```json e ``` se existirem
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const result = JSON.parse(cleanContent.trim());
      
      if (!result.products || !Array.isArray(result.products)) {
        return { success: false, error: 'Formato de resposta inválido da IA' };
      }

      // Validar estrutura dos produtos
      const validProducts = result.products.filter((p: any) => 
        p.name && p.price !== undefined && p.category
      );

      if (validProducts.length === 0) {
        return { success: false, error: 'Nenhum produto válido encontrado na imagem' };
      }

      return { success: true, products: validProducts };
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', content);
      return { success: false, error: 'Resposta da IA não está em formato JSON válido' };
    }
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao processar imagem'
    };
  }
};

// Interface para recomendação de restaurantes
export interface RestaurantRecommendation {
  success: boolean;
  response?: string;
  recommendedRestaurants?: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  error?: string;
}

// Recomendar restaurantes baseado em conversa com usuário
export const recommendRestaurants = async (
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  restaurantsData: any[]
): Promise<RestaurantRecommendation> => {
  const client = (openaiService as any).client;
  const config = (openaiService as any).config;

  if (!client || !config) {
    return {
      success: false,
      error: 'OpenAI não configurado. Verifique se a variável VITE_OPENAI_API_KEY está definida no arquivo .env'
    };
  }

  // Carregar configurações personalizadas do chatbot do Firestore
  let customRules = '';
  let toneInstructions = '';
  let cardsThreshold = 'conservative';

  try {
    // Importar dinamicamente para evitar problemas de circular dependency
    const { getChatbotConfig } = await import('./chatbotConfigService');
    const chatbotConfig = await getChatbotConfig();
    
    customRules = chatbotConfig.customRules || '';
    cardsThreshold = chatbotConfig.showCardsThreshold || 'conservative';
    
    // Definir instruções de tom de voz
    switch (chatbotConfig.tone) {
      case 'professional':
        toneInstructions = 'Mantenha um tom profissional e formal, sem exagerar nos emojis.';
        break;
      case 'enthusiastic':
        toneInstructions = 'Seja entusiasmado, energético e use bastante emojis! Demonstre empolgação!';
        break;
      case 'friendly':
      default:
        toneInstructions = 'Seja amigável, casual e use emojis moderadamente para criar conexão.';
    }
  } catch (error) {
    console.error('Erro ao carregar configurações do chatbot:', error);
    // Usar configurações padrão em caso de erro
    toneInstructions = 'Seja amigável, casual e use emojis moderadamente para criar conexão.';
  }

  // Preparar dados dos restaurantes de forma resumida para o prompt
  const restaurantsInfo = restaurantsData.map(r => ({
    id: r.id, // ID REAL DO FIRESTORE - MUITO IMPORTANTE!
    nome: r.name,
    endereco: r.address,
    telefone: r.phone,
    categorias: [...new Set(r.products.map((p: any) => p.category))],
    pratos_destaque: r.products.slice(0, 5).map((p: any) => ({
      nome: p.name,
      descricao: p.description,
      preco: p.price
    })),
    preco_medio: (r.products.reduce((acc: number, p: any) => acc + p.price, 0) / r.products.length).toFixed(2)
  }));

  // Ajustar instruções baseado no threshold de cards
  let cardsInstructions = '';
  switch (cardsThreshold) {
    case 'eager':
      cardsInstructions = 'Seja proativo ao recomendar restaurantes. Se o usuário demonstrar interesse em qualquer tipo de comida, mostre opções.';
      break;
    case 'balanced':
      cardsInstructions = 'Recomende restaurantes quando o usuário demonstrar interesse claro ou pedir sugestões.';
      break;
    case 'conservative':
    default:
      cardsInstructions = 'Seja conservador ao recomendar restaurantes. Apenas mostre cards quando o usuário pedir explicitamente ou a conversa claramente indicar que está pronto para ver opções.';
  }

  const systemPrompt = `Você é um assistente virtual especializado em recomendar restaurantes. Você tem acesso a informações de vários restaurantes com seus cardápios completos.

Seu papel é:
1. Entender as preferências e necessidades do usuário através da conversa
2. Analisar os restaurantes disponíveis e seus cardápios
3. Fazer recomendações personalizadas baseadas no que o usuário quer
4. Destacar pratos específicos que combinam com as preferências do usuário
5. Mencionar faixas de preço quando relevante
6. Se o usuário perguntar sobre tipos de comida que não estão disponíveis, sugerir alternativas próximas

TOM DE VOZ:
${toneInstructions}

POLÍTICA DE RECOMENDAÇÕES:
${cardsInstructions}

${customRules ? `REGRAS PERSONALIZADAS:
${customRules}

` : ''}DADOS DOS RESTAURANTES DISPONÍVEIS:
${JSON.stringify(restaurantsInfo, null, 2)}

Regras importantes:
- Seja conversacional e natural
- Use emojis para tornar a conversa mais agradável
- Mencione restaurantes específicos pelo nome
- Destaque pratos interessantes dos restaurantes
- Se o usuário tiver restrições alimentares, leve isso em conta
- Se o usuário mencionar preço, considere o preço médio dos restaurantes
- Não invente informações - use apenas os dados fornecidos
- Se não houver restaurantes que atendam perfeitamente, sugira a melhor alternativa disponível

IMPORTANTE - FORMATO DE RESPOSTA:
Você DEVE responder EXCLUSIVAMENTE com um objeto JSON válido, SEM QUALQUER TEXTO ANTES OU DEPOIS.
NÃO escreva explicações, NÃO escreva mensagens fora do JSON.
Retorne APENAS o JSON puro com esta estrutura exata:

{
  "message": "sua mensagem amigável e conversacional aqui com emojis",
  "restaurants": [
    {
      "id": "4VsripKqGAZdm878fciV",
      "name": "Nome do Restaurante",
      "reason": "breve razão da recomendação (1 linha)"
    }
  ]
}

ATENÇÃO CRÍTICA: O campo "id" DEVE ser copiado EXATAMENTE como está nos dados dos restaurantes disponíveis!
Exemplo: Se nos dados você vê { "id": "4VsripKqGAZdm878fciV", "nome": "Casa do Chef" }
Então use: { "id": "4VsripKqGAZdm878fciV", "name": "Casa do Chef", "reason": "..." }
NUNCA invente IDs como "1", "2", "restaurante1", etc.

REGRAS DO JSON:
- O campo "message" deve conter sua resposta conversacional completa com emojis
- O campo "restaurants" deve conter APENAS os restaurantes que você está recomendando ativamente
- O campo "id" em cada restaurante DEVE ser o ID EXATO do Firestore fornecido nos dados (ex: "4VsripKqGAZdm878fciV")
- NUNCA use IDs inventados como "1", "2", "3" - use SEMPRE o ID real fornecido no campo "id" dos dados
- Se não recomendar nenhum restaurante específico nesta mensagem, deixe "restaurants" como array vazio: []
- NUNCA inclua o JSON dentro de uma mensagem de texto
- NUNCA adicione texto antes ou depois do JSON
- A resposta inteira deve ser APENAS o objeto JSON
- Use escape correto para aspas dentro do JSON

QUANDO INCLUIR RESTAURANTES NO ARRAY:
- APENAS quando você estiver fazendo uma recomendação FINAL e ESPECÍFICA
- APENAS quando o usuário tiver dado informações suficientes sobre o que quer
- APENAS quando você tiver certeza que é a hora de mostrar opções concretas
- Na MAIORIA das mensagens, mantenha "restaurants" como array vazio []

QUANDO NÃO INCLUIR RESTAURANTES (deixar array vazio):
- Quando estiver fazendo perguntas para entender melhor o usuário
- Quando estiver em conversa inicial/exploratória
- Quando o usuário ainda não deixou claro o que quer
- Quando estiver respondendo a agradecimentos ou conversas gerais
- Quando estiver confirmando ou esclarecendo preferências
- Quando o usuário disser "esquece" ou mudar de assunto (não recomende nada ainda)

SEJA CONSERVADOR: Prefira NÃO recomendar restaurantes até ter certeza que o usuário está pronto para ver opções específicas.`;

  try {
    // Montar histórico de mensagens
    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Adicionar histórico de conversa
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Adicionar mensagem atual do usuário
    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await client.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.8, // Um pouco mais criativo para conversação
      response_format: { type: "json_object" } // Força resposta em JSON
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'Erro ao obter recomendação' };
    }

    try {
      // Tentar fazer parse do JSON
      let cleanContent = content.trim();
      
      // Remover markdown code blocks se existirem
      if (cleanContent.includes('```json')) {
        cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```/g, '');
      } else if (cleanContent.includes('```')) {
        cleanContent = cleanContent.replace(/```/g, '');
      }
      
      // Tentar encontrar o JSON no texto (caso haja texto antes ou depois)
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleanContent.trim());
      
      // Validar estrutura
      if (!parsed.message) {
        console.error('JSON sem campo message:', parsed);
        return { success: false, error: 'Formato de resposta inválido da IA' };
      }

      return {
        success: true,
        response: parsed.message,
        recommendedRestaurants: parsed.restaurants || []
      };
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta da IA:', content);
      console.error('Erro detalhado:', parseError);
      
      // Fallback: tentar extrair pelo menos a mensagem de texto
      // Remover qualquer JSON do conteúdo para exibir só o texto
      let fallbackText = content.replace(/\{[\s\S]*\}/g, '').trim();
      if (!fallbackText || fallbackText.length < 10) {
        fallbackText = '😔 Desculpe, tive um problema ao processar a resposta. Pode tentar reformular sua pergunta?';
      }
      
      return {
        success: true,
        response: fallbackText,
        recommendedRestaurants: []
      };
    }
  } catch (error) {
    console.error('Erro ao recomendar restaurantes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao recomendar restaurantes'
    };
  }
};