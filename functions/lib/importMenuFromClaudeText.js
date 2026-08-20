"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importMenuFromClaudeText = void 0;
/**
 * Usa GPT-4o-mini (OpenAI) para interpretar texto de cardápio e gravar
 * categorias + produtos no Firestore do restaurante.
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const openai_1 = __importDefault(require("openai"));
const https_1 = require("firebase-functions/v2/https");
const openaiSecret_1 = require("./openaiSecret");
const MODEL = 'gpt-4o-mini';
const RESTAURANT_ID_REGEX = /^[A-Za-z0-9_-]{6,128}$/;
const MAX_MENU_TEXT_CHARS = 70000;
function ensureAdmin() {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
function parsePrice(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return round2(value);
    }
    if (typeof value !== 'string')
        return null;
    let s = value.replace(/R\$\s?/gi, '').trim();
    if (!s)
        return null;
    if (s.includes(',') && /\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
    }
    else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0)
        return null;
    return round2(n);
}
function stripJsonFence(text) {
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
- Se não houver preço confiável para um item, NÃO invente: omita o item.
- Se o texto listar tamanhos com preço (Pizza M/G/GG/XG) e sabores sem preço individual, crie um produto por sabor e tamanho ("Calabresa (G)") com o preço daquele tamanho.
- Remova duplicatas óbvias (mesmo nome e preço).
- Não inclua cabeçalhos de restaurante, endereço, telefone, formas de pagamento como item.
- Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.

Formato EXATO do JSON:
{"categories":[{"name":"string","items":[{"name":"string","description":"string","price":number}]}]}`;
function buildUserPrompt(menuText, existingCategoryNames) {
    const existing = existingCategoryNames.length > 0
        ? existingCategoryNames.map((n) => `- ${n}`).join('\n')
        : '(nenhuma — crie as categorias necessárias)';
    const truncated = menuText.length > MAX_MENU_TEXT_CHARS
        ? `${menuText.slice(0, MAX_MENU_TEXT_CHARS)}\n\n[... texto truncado para processamento ...]`
        : menuText;
    return `Categorias já cadastradas neste restaurante (reutilize o nome EXATAMENTE igual quando o item se encaixar; pode criar novas categorias se precisar):\n${existing}\n\n---\nTEXTO DO CARDÁPIO:\n\n${truncated}\n\n---\nRetorne apenas o JSON no formato especificado.`;
}
exports.importMenuFromClaudeText = (0, https_1.onCall)({
    secrets: [openaiSecret_1.openaiApiKey],
    region: 'us-central1',
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 300,
}, async (request) => {
    var _a, _b, _c, _d;
    ensureAdmin();
    const restaurantId = (_a = request.data) === null || _a === void 0 ? void 0 : _a.restaurantId;
    const menuText = (_b = request.data) === null || _b === void 0 ? void 0 : _b.menuText;
    if (typeof restaurantId !== 'string' || !RESTAURANT_ID_REGEX.test(restaurantId)) {
        throw new https_1.HttpsError('invalid-argument', 'restaurantId inválido.');
    }
    if (typeof menuText !== 'string' || !menuText.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'menuText é obrigatório.');
    }
    const apiKey = openaiSecret_1.openaiApiKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError('failed-precondition', 'Chave OpenAI não configurada no servidor (OPENAI_API_KEY).');
    }
    const db = admin.firestore();
    const catSnap = await db
        .collection('categories')
        .where('restaurantId', '==', restaurantId)
        .get();
    const existingByLower = new Map();
    const existingNames = [];
    catSnap.forEach((d) => {
        const data = d.data();
        const name = typeof data.name === 'string' ? data.name.trim() : '';
        if (!name)
            return;
        existingByLower.set(name.toLowerCase(), { id: d.id, name });
        existingNames.push(name);
    });
    const userMessage = buildUserPrompt(menuText, existingNames.sort((a, b) => a.localeCompare(b)));
    const client = new openai_1.default({ apiKey });
    let raw;
    try {
        const completion = await client.chat.completions.create({
            model: MODEL,
            temperature: 0.2,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage },
            ],
        });
        raw = (_d = (_c = completion.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content;
    }
    catch (e) {
        console.error('[importMenuFromClaudeText] OpenAI:', e);
        throw new https_1.HttpsError('internal', 'Erro ao consultar a OpenAI. Verifique OPENAI_API_KEY, billing e logs da função.');
    }
    if (!raw || typeof raw !== 'string') {
        throw new https_1.HttpsError('internal', 'Resposta vazia da IA.');
    }
    let parsed;
    try {
        parsed = JSON.parse(stripJsonFence(raw));
    }
    catch (e) {
        console.warn('[importMenuFromClaudeText] JSON inválido:', e, raw.slice(0, 500));
        throw new https_1.HttpsError('internal', 'A IA não retornou JSON válido. Tente um trecho menor ou mais claro.');
    }
    if (!Array.isArray(parsed.categories)) {
        throw new https_1.HttpsError('internal', 'JSON sem array "categories".');
    }
    const warnings = [];
    const errors = [];
    let categoriesCreated = 0;
    let productsCreated = 0;
    let productsSkipped = 0;
    const seenProductKeys = new Set();
    async function ensureCategoryName(requestedName) {
        const trimmed = requestedName.trim();
        if (!trimmed) {
            return ensureCategoryName('Outros');
        }
        const key = trimmed.toLowerCase();
        const hit = existingByLower.get(key);
        if (hit)
            return hit.name;
        const docRef = await db.collection('categories').add({
            name: trimmed,
            restaurantId,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
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
            const desc = typeof item.description === 'string' ? item.description.trim().slice(0, 2000) : '';
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
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                    availableForDelivery: true,
                });
                productsCreated += 1;
            }
            catch (e) {
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
});
//# sourceMappingURL=importMenuFromClaudeText.js.map