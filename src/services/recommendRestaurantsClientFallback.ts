/**
 * Fallback client-side quando a Cloud Function recommendRestaurantsWithAI falha.
 * No APK usa api.openai.com direto via nativeFetch; na web usa proxy Vite/Netlify.
 */

import OpenAI from 'openai';
import { getChatbotConfig } from './chatbotConfigService';
import type { RestaurantRecommendation } from './recommendRestaurantsAiCallable';
import { getOpenAIBaseURL } from '../utils/openaiBaseUrl';
import { nativeFetch } from '../utils/nativeFetch';

const MAX_HISTORY = 24;
const MAX_RESTAURANTS = 50;

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function buildRestaurantsInfo(restaurantsData: unknown[]) {
  return (restaurantsData as Array<Record<string, unknown>>).slice(0, MAX_RESTAURANTS).map((r) => {
    const products = Array.isArray(r.products) ? r.products : [];
    return {
      id: String(r.id ?? ''),
      nome: String(r.name ?? ''),
      endereco: String(r.address ?? ''),
      telefone: String(r.phone ?? ''),
      categorias: [...new Set(products.map((p) => String((p as Record<string, unknown>).category ?? '')).filter(Boolean))],
      pratos_destaque: products.slice(0, 5).map((p) => {
        const pr = p as Record<string, unknown>;
        return {
          nome: String(pr.name ?? ''),
          descricao: String(pr.description ?? ''),
          preco: typeof pr.price === 'number' ? pr.price : 0,
        };
      }),
      preco_medio: (
        products.reduce((acc, p) => acc + (typeof (p as Record<string, unknown>).price === 'number' ? (p as Record<string, unknown>).price as number : 0), 0) /
        Math.max(products.length, 1)
      ).toFixed(2),
    };
  });
}

async function buildSystemPrompt(restaurantsData: unknown[]): Promise<string> {
  const chatbotConfig = await getChatbotConfig().catch(() => null);
  const customRules = chatbotConfig?.customRules ?? '';
  const cardsThreshold = chatbotConfig?.showCardsThreshold ?? 'conservative';

  let toneInstructions = 'Seja amigável, casual e use emojis moderadamente para criar conexão.';
  switch (chatbotConfig?.tone) {
    case 'professional':
      toneInstructions = 'Mantenha um tom profissional e formal, sem exagerar nos emojis.';
      break;
    case 'enthusiastic':
      toneInstructions = 'Seja entusiasmado, energético e use bastante emojis! Demonstre empolgação!';
      break;
    default:
      break;
  }

  let cardsInstructions =
    'Seja conservador ao recomendar restaurantes. Apenas mostre cards quando o usuário pedir explicitamente ou a conversa claramente indicar que está pronto para ver opções.';
  if (cardsThreshold === 'eager') {
    cardsInstructions = 'Seja proativo ao recomendar restaurantes. Se o usuário demonstrar interesse em qualquer tipo de comida, mostre opções.';
  } else if (cardsThreshold === 'balanced') {
    cardsInstructions = 'Recomende restaurantes quando o usuário demonstrar interesse claro ou pedir sugestões.';
  }

  const restaurantsInfo = buildRestaurantsInfo(restaurantsData);

  return `Você é um assistente virtual especializado em recomendar restaurantes.

TOM DE VOZ:
${toneInstructions}

POLÍTICA DE RECOMENDAÇÕES:
${cardsInstructions}

${customRules ? `REGRAS PERSONALIZADAS:\n${customRules}\n\n` : ''}DADOS DOS RESTAURANTES DISPONÍVEIS:
${JSON.stringify(restaurantsInfo, null, 2)}

Responda EXCLUSIVAMENTE com JSON válido:
{"message":"...","restaurants":[{"id":"ID_FIRESTORE","name":"Nome","reason":"..."}]}
Use IDs exatos do campo id nos dados. Se não recomendar restaurantes, use "restaurants": [].`;
}

function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: getOpenAIBaseURL(),
    dangerouslyAllowBrowser: true,
    fetch: nativeFetch,
  });
}

export async function recommendRestaurantsClientFallback(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  restaurantsData: unknown[]
): Promise<RestaurantRecommendation | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey?.trim()) {
    console.warn('[recommendRestaurantsClientFallback] VITE_OPENAI_API_KEY ausente no build.');
    return null;
  }

  const client = createOpenAIClient(apiKey.trim());
  const systemPrompt = await buildSystemPrompt(restaurantsData);
  const allowedIds = new Set(
    buildRestaurantsInfo(restaurantsData)
      .map((r) => r.id)
      .filter(Boolean)
  );

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-MAX_HISTORY).map((msg) => ({
          role: msg.role,
          content: clip(msg.content, 4000),
        })),
        { role: 'user', content: clip(userMessage, 4000) },
      ],
      max_tokens: 1000,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    let clean = content.trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) clean = jsonMatch[0];

    const parsed = JSON.parse(clean) as {
      message?: string;
      restaurants?: Array<{ id?: string; name?: string; reason?: string }>;
    };

    if (!parsed.message) return null;

    const recommendedRestaurants = (parsed.restaurants ?? [])
      .filter(
        (x) =>
          x?.id &&
          allowedIds.has(x.id) &&
          typeof x.name === 'string' &&
          typeof x.reason === 'string'
      )
      .map((x) => ({
        id: x.id as string,
        name: clip(x.name as string, 200),
        reason: clip(x.reason as string, 400),
      }));

    return {
      success: true,
      response: parsed.message,
      recommendedRestaurants,
    };
  } catch (e) {
    console.warn('[recommendRestaurantsClientFallback] Falhou:', e);
    return null;
  }
}
