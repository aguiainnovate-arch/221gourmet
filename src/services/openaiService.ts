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