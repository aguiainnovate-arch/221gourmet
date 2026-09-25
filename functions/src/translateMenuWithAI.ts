import { onCall, HttpsError } from 'firebase-functions/v2/https';
import OpenAI, { APIError } from 'openai';

import { admin } from './firebaseAdmin';
import { openaiApiKey } from './openaiSecret';

const MAX_ITEMS = 40;
const MAX_STRING = 800;
const MAX_RESTAURANT_ID = 128;

type ItemType = 'product' | 'category';

interface MenuItemInput {
  id: string;
  name: string;
  description: string;
  type: ItemType;
}

interface LangFields {
  name: string;
  description: string;
}

export interface TranslateMenuWithAIResult {
  success: boolean;
  translations?: Record<string, { 'en-US': LangFields; 'fr-FR': LangFields }>;
  error?: string;
}

function clip(s: string, max: number): string {
  const t = typeof s === 'string' ? s : String(s ?? '');
  return t.length > max ? t.slice(0, max) : t;
}

function mapOpenAiError(e: unknown): string {
  if (e instanceof APIError) {
    const status = e.status;
    const code = typeof e.code === 'string' ? e.code : '';
    console.error('[translateMenuWithAI] OpenAI APIError', {
      status,
      code,
      type: e.type,
      message: e.message?.slice(0, 300),
    });
    if (status === 401 || code === 'invalid_api_key') {
      return 'Chave OpenAI inválida ou revogada no servidor (secret OPENAI_API_KEY).';
    }
    if (status === 429 || code === 'rate_limit_exceeded' || code === 'insufficient_quota') {
      return 'Cota ou limite da OpenAI esgotado. Tente novamente mais tarde.';
    }
    if (status === 503 || status === 500) {
      return 'A OpenAI está instável no momento. Tente novamente em alguns instantes.';
    }
  } else {
    console.error('[translateMenuWithAI] Erro na API OpenAI:', e);
  }
  return 'Não foi possível traduzir o cardápio no momento. Tente novamente.';
}

function validatePayload(raw: unknown): {
  restaurantId: string;
  items: MenuItemInput[];
  restaurantName?: string;
  cuisineType?: string;
} {
  if (!raw || typeof raw !== 'object') {
    throw new HttpsError('invalid-argument', 'Payload inválido.');
  }
  const data = raw as Record<string, unknown>;
  const restaurantId = clip(String(data.restaurantId ?? ''), MAX_RESTAURANT_ID).trim();
  if (!restaurantId) {
    throw new HttpsError('invalid-argument', 'restaurantId é obrigatório.');
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new HttpsError('invalid-argument', 'Informe ao menos um item para traduzir.');
  }
  if (data.items.length > MAX_ITEMS) {
    throw new HttpsError(
      'invalid-argument',
      `Máximo de ${MAX_ITEMS} itens por chamada. Divida o cardápio em lotes.`
    );
  }

  const items: MenuItemInput[] = [];
  for (const rawItem of data.items) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = rawItem as Record<string, unknown>;
    const id = clip(String(item.id ?? ''), 128).trim();
    const name = clip(String(item.name ?? ''), MAX_STRING).trim();
    const description = clip(String(item.description ?? ''), MAX_STRING);
    const type = item.type === 'category' ? 'category' : 'product';
    if (!id || !name) continue;
    items.push({ id, name, description, type });
  }

  if (items.length === 0) {
    throw new HttpsError('invalid-argument', 'Nenhum item válido para traduzir.');
  }

  return {
    restaurantId,
    items,
    restaurantName: data.restaurantName
      ? clip(String(data.restaurantName), 200).trim()
      : undefined,
    cuisineType: data.cuisineType
      ? clip(String(data.cuisineType), 120).trim()
      : undefined,
  };
}

function parseTranslationsJson(
  content: string,
  expectedIds: string[]
): Record<string, { 'en-US': LangFields; 'fr-FR': LangFields }> {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const root =
    parsed && typeof parsed === 'object' && parsed.translations && typeof parsed.translations === 'object'
      ? (parsed.translations as Record<string, unknown>)
      : (parsed as Record<string, unknown>);

  const out: Record<string, { 'en-US': LangFields; 'fr-FR': LangFields }> = {};

  for (const id of expectedIds) {
    const entry = root[id];
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const en = e['en-US'];
    const fr = e['fr-FR'];
    if (!en || typeof en !== 'object' || !fr || typeof fr !== 'object') continue;
    const enObj = en as Record<string, unknown>;
    const frObj = fr as Record<string, unknown>;
    const enName = clip(String(enObj.name ?? ''), MAX_STRING).trim();
    const frName = clip(String(frObj.name ?? ''), MAX_STRING).trim();
    if (!enName || !frName) continue;
    out[id] = {
      'en-US': {
        name: enName,
        description: clip(String(enObj.description ?? ''), MAX_STRING),
      },
      'fr-FR': {
        name: frName,
        description: clip(String(frObj.description ?? ''), MAX_STRING),
      },
    };
  }

  return out;
}

async function loadRestaurantContext(
  restaurantId: string,
  fallbackName?: string,
  fallbackCuisine?: string
): Promise<{ name: string; cuisineType: string }> {
  try {
    const snap = await admin.firestore().collection('restaurants').doc(restaurantId).get();
    if (snap.exists) {
      const d = snap.data() || {};
      return {
        name: clip(String(d.name || fallbackName || ''), 200) || 'Restaurante',
        cuisineType: clip(String(d.cuisineType || d.type || fallbackCuisine || ''), 120),
      };
    }
  } catch (e) {
    console.warn('[translateMenuWithAI] Falha ao carregar restaurante:', e);
  }
  return {
    name: fallbackName || 'Restaurante',
    cuisineType: fallbackCuisine || '',
  };
}

export const translateMenuWithAI = onCall(
  {
    secrets: [openaiApiKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request): Promise<TranslateMenuWithAIResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Faça login para traduzir o cardápio.');
    }

    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      console.error('[translateMenuWithAI] Secret OPENAI_API_KEY ausente ou vazia.');
      throw new HttpsError(
        'failed-precondition',
        'Tradução por IA não está configurada no servidor (secret OPENAI_API_KEY).'
      );
    }

    let restaurantId: string;
    let items: MenuItemInput[];
    let restaurantName: string | undefined;
    let cuisineType: string | undefined;

    try {
      const parsed = validatePayload(request.data);
      restaurantId = parsed.restaurantId;
      items = parsed.items;
      restaurantName = parsed.restaurantName;
      cuisineType = parsed.cuisineType;
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError('invalid-argument', 'Dados inválidos para tradução.');
    }

    const ctx = await loadRestaurantContext(restaurantId, restaurantName, cuisineType);

    const systemPrompt = `Você é um tradutor especializado em cardápios de restaurantes.
O texto-fonte está em português (pt-BR). Gere traduções naturais e apetitosas para inglês (en-US) e francês (fr-FR).

Contexto do restaurante:
- Nome: ${ctx.name}
${ctx.cuisineType ? `- Tipo/cozinha: ${ctx.cuisineType}` : ''}

Regras:
1. Não faça tradução só literal — adapte termos culinários e tom de cardápio.
2. Preserve nomes próprios, marcas e pratos temáticos quando fizer sentido (ex.: "Feijoada da Casa").
3. Para type=category, description pode ser igual ao name.
4. Responda APENAS com JSON no formato:
{
  "translations": {
    "<id>": {
      "en-US": { "name": "...", "description": "..." },
      "fr-FR": { "name": "...", "description": "..." }
    }
  }
}`;

    const userPrompt = `Traduza estes itens do cardápio (pt-BR → en-US e fr-FR):

${JSON.stringify(items, null, 2)}`;

    const client = new OpenAI({ apiKey });

    let content: string | null | undefined;
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      });
      content = response.choices[0]?.message?.content;
    } catch (e) {
      return { success: false, error: mapOpenAiError(e) };
    }

    if (!content?.trim()) {
      return { success: false, error: 'Resposta vazia da IA.' };
    }

    try {
      const translations = parseTranslationsJson(content.trim(), items.map((i) => i.id));
      if (Object.keys(translations).length === 0) {
        return { success: false, error: 'A IA não retornou traduções válidas.' };
      }
      return { success: true, translations };
    } catch (e) {
      console.error('[translateMenuWithAI] Parse JSON falhou:', content.slice(0, 400), e);
      return { success: false, error: 'Resposta da IA não está em JSON válido.' };
    }
  }
);
