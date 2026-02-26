/**
 * Agente de Recomendação de Comida (Claude).
 * Usa a API Anthropic para gerar recomendações baseadas em perfil, histórico e cardápio.
 * Chave: VITE_ANTHROPIC_API_KEY no .env (nunca commitar a chave no código).
 */

const ANTHROPIC_API_URL_PRODUCTION = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/** Em dev usa proxy do Vite para evitar CORS. */
function getAnthropicApiUrl(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/api-anthropic/v1/messages`;
  }
  return ANTHROPIC_API_URL_PRODUCTION;
}

/** Normaliza a chave do .env (trim e remove aspas que às vezes vêm no valor). */
function getAnthropicApiKey(): string {
  const raw = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (raw == null || typeof raw !== 'string') return '';
  return raw.trim().replace(/^["']|["']$/g, '');
}

export interface CustomerProfile {
  name?: string;
  restrictions?: string[];
  allergies?: string[];
  preferences?: string[];
}

export interface OrderHistoryItem {
  items: string[];
  categories?: string[];
  date?: string;
  total?: number;
}

export interface CurrentContext {
  message?: string;
  occasion?: string;
  address?: string;
  budget?: string;
  restrictions_now?: string[];
  time_of_day?: string;
}

export interface MenuCatalogItem {
  item_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  preparationTime?: number;
  tags?: string[];
  available?: boolean;
}

export interface BusinessRules {
  out_of_stock?: string[];
  combos?: string[];
  priority_partners?: string[];
}

export interface RecommendationItem {
  item_id: string;
  name: string;
  price: number;
  customizations?: string[];
  why: string;
  suggested_addon?: { item_id?: string; name?: string };
  suggested_drink?: { item_id?: string; name?: string };
}

export interface RecommendationAgentResponse {
  quick_summary: string;
  questions: string[];
  recommendations: RecommendationItem[];
  fallback_if_unavailable: string;
}

const SYSTEM_PROMPT = `Você é um Agente de Recomendação de Comida para um app de pedidos.
Sua tarefa é executar imediatamente a recomendação com base no histórico do cliente e no contexto do pedido atual. Não faça planos, não descreva etapas, não explique seu raciocínio interno.

Entradas que você receberá (sempre que disponíveis):
- customer_profile: dados do cliente (nome, restrições, alergias, preferências declaradas).
- order_history: lista de pedidos anteriores (itens, categorias, adicionais, valores, data/hora, avaliações).
- current_context: mensagem do cliente e contexto (horário, ocasião, endereço/região, clima se houver, orçamento, restrições do momento).
- menu_catalog: cardápio disponível (itens, ingredientes, categoria, preço, tempo de preparo, disponibilidade, tags: vegano/sem lactose/apimentado etc.).
- business_rules: regras (ex.: itens fora de estoque, combos, margem, prioridade de parceiros).

O que você deve fazer (execute, não planeje):
1. Entenda o pedido atual (o que o cliente quer agora) e combine com o histórico para inferir preferências prováveis.
2. Respeite restrições com prioridade máxima: alergias, intolerâncias, dieta, itens proibidos, orçamento máximo, disponibilidade do cardápio.
3. Gere 3 a 5 recomendações do menu_catalog, variando de forma inteligente (1 "igual ao de sempre", 1 "variação próxima", 1 "novidade compatível", 1 "opção mais econômica" quando fizer sentido).
4. Para cada recomendação, inclua motivo curto (1 frase) baseado em histórico/contexto.
5. Sugira 1 adicional/acompanhamento e 1 bebida quando combinar com o padrão do cliente (sem insistir).
6. Se faltar informação crítica, faça no máximo 1 pergunta objetiva. Se não for crítico, assuma de forma conservadora e prossiga.

Regras de saída:
- Não escreva "passo a passo", "vou analisar", "plano", "estratégia".
- Não invente itens que não existam no menu_catalog.
- Seja direto, simpático e curto.
- Responda em português do Brasil.
- Retorne APENAS um JSON válido, sem texto antes ou depois, no formato especificado.`;

function buildUserPrompt(payload: {
  customer_profile?: CustomerProfile | null;
  order_history?: OrderHistoryItem[] | null;
  current_context?: CurrentContext | null;
  menu_catalog?: MenuCatalogItem[] | null;
  business_rules?: BusinessRules | null;
}): string {
  const parts: string[] = ['Use os dados abaixo para gerar as recomendações.\n'];
  if (payload.customer_profile != null) {
    parts.push('customer_profile: ' + JSON.stringify(payload.customer_profile, null, 2));
  }
  if (payload.order_history != null && payload.order_history.length > 0) {
    parts.push('order_history: ' + JSON.stringify(payload.order_history, null, 2));
  }
  if (payload.current_context != null) {
    parts.push('current_context: ' + JSON.stringify(payload.current_context, null, 2));
  }
  if (payload.menu_catalog != null && payload.menu_catalog.length > 0) {
    parts.push('menu_catalog: ' + JSON.stringify(payload.menu_catalog, null, 2));
  }
  if (payload.business_rules != null && Object.keys(payload.business_rules).length > 0) {
    parts.push('business_rules: ' + JSON.stringify(payload.business_rules, null, 2));
  }
  parts.push('\nRetorne o JSON no formato: { "quick_summary": "...", "questions": [], "recommendations": [ { "item_id", "name", "price", "customizations", "why", "suggested_addon", "suggested_drink" } ], "fallback_if_unavailable": "..." }');
  return parts.join('\n\n');
}

function extractJsonFromResponse(text: string): string {
  let clean = text.trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) clean = jsonMatch[0];
  if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  return clean.trim();
}

export async function runRecommendationAgent(payload: {
  customer_profile?: CustomerProfile | null;
  order_history?: OrderHistoryItem[] | null;
  current_context?: CurrentContext | null;
  menu_catalog?: MenuCatalogItem[] | null;
  business_rules?: BusinessRules | null;
}): Promise<{ success: true; data: RecommendationAgentResponse } | { success: false; error: string }> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return { success: false, error: 'Claude não configurado. Defina VITE_ANTHROPIC_API_KEY no .env' };
  }

  const userContent = buildUserPrompt(payload);

  try {
    const res = await fetch(getAnthropicApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      if (res.status === 401) {
        return {
          success: false,
          error: 'Chave da Claude inválida ou expirada. Verifique VITE_ANTHROPIC_API_KEY no .env (sem aspas), reinicie o servidor (npm run dev) e teste de novo.',
        };
      }
      return {
        success: false,
        error: `API Claude: ${res.status} ${res.statusText}${errBody ? ` - ${errBody.slice(0, 200)}` : ''}`,
      };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      return { success: false, error: 'Resposta da Claude sem conteúdo' };
    }

    const jsonStr = extractJsonFromResponse(text);
    const parsed = JSON.parse(jsonStr) as RecommendationAgentResponse;

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      return { success: false, error: 'Resposta sem campo recommendations' };
    }

    return {
      success: true,
      data: {
        quick_summary: parsed.quick_summary ?? '',
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        recommendations: parsed.recommendations,
        fallback_if_unavailable: parsed.fallback_if_unavailable ?? '',
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    return { success: false, error: message };
  }
}

/**
 * Monta menu_catalog a partir de restaurantes com cardápio (para uso no agente).
 * item_id = "restaurantId|index" para poder resolver depois.
 */
export function buildMenuCatalogFromRestaurants(
  restaurants: Array<{ id: string; name: string; products: Array<{ name: string; description?: string; price: number; category: string; preparationTime?: number }> }>
): MenuCatalogItem[] {
  const items: MenuCatalogItem[] = [];
  for (const r of restaurants) {
    r.products.forEach((p, idx) => {
      items.push({
        item_id: `${r.id}|${idx}`,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        preparationTime: p.preparationTime,
        available: true,
      });
    });
  }
  return items;
}

// --- Recomendação de restaurantes (Assistente IA) via Claude ---

export interface RestaurantRecommendationResult {
  success: boolean;
  response?: string;
  recommendedRestaurants?: Array<{ id: string; name: string; reason: string }>;
  error?: string;
}

/** Recomenda restaurantes via Claude (mesmo formato do chat). Use esta função quando VITE_ANTHROPIC_API_KEY estiver definida. */
export async function recommendRestaurantsClaude(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  restaurantsData: Array<{ id: string; name: string; address?: string; phone?: string; products: Array<{ name: string; description?: string; price: number; category: string }> }>
): Promise<RestaurantRecommendationResult> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return { success: false, error: 'Claude não configurado. Defina VITE_ANTHROPIC_API_KEY no .env' };
  }

  let customRules = '';
  let toneInstructions = 'Seja amigável, casual e use emojis moderadamente para criar conexão.';
  let cardsThreshold = 'conservative';

  try {
    const { getChatbotConfig } = await import('./chatbotConfigService');
    const chatbotConfig = await getChatbotConfig();
    customRules = chatbotConfig.customRules || '';
    cardsThreshold = chatbotConfig.showCardsThreshold || 'conservative';
    switch (chatbotConfig.tone) {
      case 'professional':
        toneInstructions = 'Mantenha um tom profissional e formal, sem exagerar nos emojis.';
        break;
      case 'enthusiastic':
        toneInstructions = 'Seja entusiasmado, energético e use bastante emojis!';
        break;
      case 'friendly':
      default:
        toneInstructions = 'Seja amigável, casual e use emojis moderadamente para criar conexão.';
        break;
    }
  } catch {
    // manter padrões
  }

  const restaurantsInfo = restaurantsData.map(r => ({
    id: r.id,
    nome: r.name,
    endereco: r.address,
    telefone: r.phone,
    categorias: [...new Set(r.products.map(p => p.category))],
    pratos_destaque: r.products.slice(0, 5).map(p => ({ nome: p.name, descricao: p.description, preco: p.price })),
    preco_medio: r.products.length ? (r.products.reduce((acc, p) => acc + p.price, 0) / r.products.length).toFixed(2) : '0',
  }));

  let cardsInstructions = 'Seja conservador ao recomendar restaurantes. Apenas mostre cards quando o usuário pedir explicitamente ou a conversa claramente indicar que está pronto para ver opções.';
  if (cardsThreshold === 'eager') cardsInstructions = 'Seja proativo ao recomendar restaurantes. Se o usuário demonstrar interesse em qualquer tipo de comida, mostre opções.';
  else if (cardsThreshold === 'balanced') cardsInstructions = 'Recomende restaurantes quando o usuário demonstrar interesse claro ou pedir sugestões.';

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

${customRules ? `REGRAS PERSONALIZADAS:\n${customRules}\n\n` : ''}DADOS DOS RESTAURANTES DISPONÍVEIS:
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
Retorne APENAS o JSON puro com esta estrutura exata:

{
  "message": "sua mensagem amigável e conversacional aqui com emojis",
  "restaurants": [
    {
      "id": "ID_EXATO_DO_FIRESTORE",
      "name": "Nome do Restaurante",
      "reason": "breve razão da recomendação (1 linha)"
    }
  ]
}

ATENÇÃO: O campo "id" DEVE ser copiado EXATAMENTE como está nos dados dos restaurantes disponíveis. NUNCA invente IDs.
Se não recomendar nenhum restaurante nesta mensagem, deixe "restaurants" como array vazio: [].`;

  const messages: { role: 'user' | 'assistant'; content: string }[] = [...conversationHistory, { role: 'user', content: userMessage }];

  try {
    const res = await fetch(getAnthropicApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      if (res.status === 401) {
        return {
          success: false,
          error: 'Chave da Claude inválida ou expirada. Verifique VITE_ANTHROPIC_API_KEY no .env (sem aspas) e reinicie o servidor.',
        };
      }
      return { success: false, error: `Claude: ${res.status} ${errBody.slice(0, 150)}` };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return { success: false, error: 'Resposta da Claude sem conteúdo' };

    const jsonStr = extractJsonFromResponse(text);
    const parsed = JSON.parse(jsonStr) as { message?: string; restaurants?: Array<{ id: string; name: string; reason: string }> };

    if (!parsed.message) {
      return { success: false, error: 'Formato de resposta inválido da Claude' };
    }

    return {
      success: true,
      response: parsed.message,
      recommendedRestaurants: parsed.restaurants || [],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return { success: false, error: msg };
  }
}
