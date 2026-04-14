/**
 * Usa Claude (Anthropic) para interpretar texto de cardápio e gravar
 * categorias + produtos no Firestore do restaurante.
 */
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');
/** Mesma família já usada em moderateLead; ajuste se a conta suportar outro ID. */
const MODEL = 'claude-3-haiku-20240307';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const RESTAURANT_ID_REGEX = /^[A-Za-z0-9_-]{6,128}$/;
const MAX_MENU_TEXT_CHARS = 70_000;

interface ClaudeMenuItem {
  name?: string;
  description?: string;
  price?: number | string;
}

interface ClaudeMenuCategory {
  name?: string;
  items?: ClaudeMenuItem[];
}

interface ClaudeMenuPayload {
  categories?: ClaudeMenuCategory[];
}

export interface ImportMenuFromClaudeResult {
  success: boolean;
  categoriesCreated: number;
  productsCreated: number;
  productsSkipped: number;
  warnings: string[];
  errors: string[];
}

function ensureAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return round2(value);
  }
  if (typeof value !== 'string') return null;
  let s = value.replace(/R\$\s?/gi, '').trim();
  if (!s) return null;
  if (s.includes(',') && /\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return round2(n);
}

function stripJsonFence(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

const SYSTEM_PROMPT = `Você é um assistente especializado em cardápios de restaurantes no Brasil.

Tarefa: ler o TEXTO extraído de um cardápio (pode ter ruído, colunas quebradas, números de página) e devolver um JSON com categorias e itens.

Regras:
- Agrupe itens em categorias lógicas em português (ex.: "Bebidas", "Pratos principais", "Acompanhamentos", "Sobremesas", "Entradas", "Porções", "Lanches", "Outros").
- Se o texto mencionar Coca-Cola, sucos, cervejas, etc., use "Bebidas" ou subcategoria clara.
- Pratos com proteína principal costumam ir em "Pratos principais" ou nome similar.
- Batata frita, arroz, feijão, saladas simples como lado: "Acompanhamentos" quando fizer sentido.
- Cada item deve ter: "name" (string), "description" (string, pode ser vazia), "price" (número em reais, use ponto decimal, ex: 12.9 ou 24.5).
- Se não houver preço confiável para um item, NÃO invente: omita o item ou use categoria "Outros" só se indispensável.
- Remova duplicatas óbvias (mesmo nome e preço).
- Não inclua cabeçalhos de restaurante, endereço, telefone, formas de pagamento como item.
- Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.

Formato EXATO do JSON:
{"categories":[{"name":"string","items":[{"name":"string","description":"string","price":number}]}]}`;

function buildUserPrompt(menuText: string, existingCategoryNames: string[]): string {
  const existing =
    existingCategoryNames.length > 0
      ? existingCategoryNames.map((n) => `- ${n}`).join('\n')
      : '(nenhuma — crie as categorias necessárias)';
  const truncated =
    menuText.length > MAX_MENU_TEXT_CHARS
      ? `${menuText.slice(0, MAX_MENU_TEXT_CHARS)}\n\n[... texto truncado para processamento ...]`
      : menuText;

  return `Categorias já cadastradas neste restaurante (reutilize o nome EXATAMENTE igual quando o item se encaixar; pode criar novas categorias se precisar):\n${existing}\n\n---\nTEXTO DO CARDÁPIO:\n\n${truncated}\n\n---\nRetorne apenas o JSON no formato especificado.`;
}

export const importMenuFromClaudeText = onCall(
  {
    secrets: [anthropicApiKey],
    region: 'us-central1',
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (request): Promise<ImportMenuFromClaudeResult> => {
    ensureAdmin();

    const restaurantId = request.data?.restaurantId;
    const menuText = request.data?.menuText;

    if (typeof restaurantId !== 'string' || !RESTAURANT_ID_REGEX.test(restaurantId)) {
      throw new HttpsError('invalid-argument', 'restaurantId inválido.');
    }
    if (typeof menuText !== 'string' || !menuText.trim()) {
      throw new HttpsError('invalid-argument', 'menuText é obrigatório.');
    }

    const apiKey = anthropicApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'Chave Anthropic não configurada.');
    }

    const db = admin.firestore();

    const catSnap = await db
      .collection('categories')
      .where('restaurantId', '==', restaurantId)
      .get();

    const existingByLower = new Map<string, { id: string; name: string }>();
    const existingNames: string[] = [];
    catSnap.forEach((d) => {
      const data = d.data();
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) return;
      existingByLower.set(name.toLowerCase(), { id: d.id, name });
      existingNames.push(name);
    });

    const userMessage = buildUserPrompt(menuText, existingNames.sort((a, b) => a.localeCompare(b)));

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        // Haiku 3: máximo de saída é 4096 (8192 gera HTTP 400 da API).
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[importMenuFromClaudeText] Anthropic HTTP', res.status, err.slice(0, 400));
      throw new HttpsError('internal', 'Erro ao consultar Claude.');
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const raw = data.content?.[0]?.text;
    if (!raw || typeof raw !== 'string') {
      throw new HttpsError('internal', 'Resposta vazia do Claude.');
    }

    let parsed: ClaudeMenuPayload;
    try {
      parsed = JSON.parse(stripJsonFence(raw)) as ClaudeMenuPayload;
    } catch (e) {
      console.warn('[importMenuFromClaudeText] JSON inválido:', e, raw.slice(0, 500));
      throw new HttpsError('internal', 'Claude não retornou JSON válido. Tente um trecho menor ou mais claro.');
    }

    if (!Array.isArray(parsed.categories)) {
      throw new HttpsError('internal', 'JSON sem array "categories".');
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    let categoriesCreated = 0;
    let productsCreated = 0;
    let productsSkipped = 0;

    const seenProductKeys = new Set<string>();

    async function ensureCategoryName(requestedName: string): Promise<string> {
      const trimmed = requestedName.trim();
      if (!trimmed) {
        return ensureCategoryName('Outros');
      }
      const key = trimmed.toLowerCase();
      const hit = existingByLower.get(key);
      if (hit) return hit.name;

      const docRef = await db.collection('categories').add({
        name: trimmed,
        restaurantId,
        createdAt: FieldValue.serverTimestamp(),
      });
      existingByLower.set(key, { id: docRef.id, name: trimmed });
      categoriesCreated += 1;
      return trimmed;
    }

    for (const cat of parsed.categories) {
      const catNameRaw = typeof cat.name === 'string' ? cat.name : '';
      if (!catNameRaw.trim()) {
        warnings.push('Categoria sem nome ignorada.');
        continue;
      }
      const canonicalCategory = await ensureCategoryName(catNameRaw);

      const items = Array.isArray(cat.items) ? cat.items : [];
      for (const item of items) {
        const itemName = typeof item.name === 'string' ? item.name.trim() : '';
        if (!itemName) {
          productsSkipped += 1;
          warnings.push('Item sem nome ignorado.');
          continue;
        }
        const price = parsePrice(item.price);
        if (price === null) {
          productsSkipped += 1;
          warnings.push(`Item sem preço válido ignorado: "${itemName}"`);
          continue;
        }
        const desc =
          typeof item.description === 'string' ? item.description.trim().slice(0, 2000) : '';

        const dedupeKey = `${canonicalCategory.toLowerCase()}|${itemName.toLowerCase()}|${price}`;
        if (seenProductKeys.has(dedupeKey)) {
          productsSkipped += 1;
          continue;
        }
        seenProductKeys.add(dedupeKey);

        try {
          await db.collection('products').add({
            name: itemName.slice(0, 200),
            description: desc,
            price,
            category: canonicalCategory,
            available: true,
            image: '',
            restaurantId,
            createdAt: FieldValue.serverTimestamp(),
            availableForDelivery: true,
          });
          productsCreated += 1;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`Falha ao salvar "${itemName}": ${msg}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      categoriesCreated,
      productsCreated,
      productsSkipped,
      warnings,
      errors,
    };
  }
);
