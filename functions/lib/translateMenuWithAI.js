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
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateMenuWithAI = void 0;
const https_1 = require("firebase-functions/v2/https");
const openai_1 = __importStar(require("openai"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const openaiSecret_1 = require("./openaiSecret");
const MAX_ITEMS = 40;
const MAX_STRING = 800;
const MAX_RESTAURANT_ID = 128;
function clip(s, max) {
    const t = typeof s === 'string' ? s : String(s !== null && s !== void 0 ? s : '');
    return t.length > max ? t.slice(0, max) : t;
}
function mapOpenAiError(e) {
    var _a;
    if (e instanceof openai_1.APIError) {
        const status = e.status;
        const code = typeof e.code === 'string' ? e.code : '';
        console.error('[translateMenuWithAI] OpenAI APIError', {
            status,
            code,
            type: e.type,
            message: (_a = e.message) === null || _a === void 0 ? void 0 : _a.slice(0, 300),
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
    }
    else {
        console.error('[translateMenuWithAI] Erro na API OpenAI:', e);
    }
    return 'Não foi possível traduzir o cardápio no momento. Tente novamente.';
}
function validatePayload(raw) {
    var _a, _b, _c, _d;
    if (!raw || typeof raw !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'Payload inválido.');
    }
    const data = raw;
    const restaurantId = clip(String((_a = data.restaurantId) !== null && _a !== void 0 ? _a : ''), MAX_RESTAURANT_ID).trim();
    if (!restaurantId) {
        throw new https_1.HttpsError('invalid-argument', 'restaurantId é obrigatório.');
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Informe ao menos um item para traduzir.');
    }
    if (data.items.length > MAX_ITEMS) {
        throw new https_1.HttpsError('invalid-argument', `Máximo de ${MAX_ITEMS} itens por chamada. Divida o cardápio em lotes.`);
    }
    const items = [];
    for (const rawItem of data.items) {
        if (!rawItem || typeof rawItem !== 'object')
            continue;
        const item = rawItem;
        const id = clip(String((_b = item.id) !== null && _b !== void 0 ? _b : ''), 128).trim();
        const name = clip(String((_c = item.name) !== null && _c !== void 0 ? _c : ''), MAX_STRING).trim();
        const description = clip(String((_d = item.description) !== null && _d !== void 0 ? _d : ''), MAX_STRING);
        const type = item.type === 'category' ? 'category' : 'product';
        if (!id || !name)
            continue;
        items.push({ id, name, description, type });
    }
    if (items.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Nenhum item válido para traduzir.');
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
function parseTranslationsJson(content, expectedIds) {
    var _a, _b, _c, _d;
    const parsed = JSON.parse(content);
    const root = parsed && typeof parsed === 'object' && parsed.translations && typeof parsed.translations === 'object'
        ? parsed.translations
        : parsed;
    const out = {};
    for (const id of expectedIds) {
        const entry = root[id];
        if (!entry || typeof entry !== 'object')
            continue;
        const e = entry;
        const en = e['en-US'];
        const fr = e['fr-FR'];
        if (!en || typeof en !== 'object' || !fr || typeof fr !== 'object')
            continue;
        const enObj = en;
        const frObj = fr;
        const enName = clip(String((_a = enObj.name) !== null && _a !== void 0 ? _a : ''), MAX_STRING).trim();
        const frName = clip(String((_b = frObj.name) !== null && _b !== void 0 ? _b : ''), MAX_STRING).trim();
        if (!enName || !frName)
            continue;
        out[id] = {
            'en-US': {
                name: enName,
                description: clip(String((_c = enObj.description) !== null && _c !== void 0 ? _c : ''), MAX_STRING),
            },
            'fr-FR': {
                name: frName,
                description: clip(String((_d = frObj.description) !== null && _d !== void 0 ? _d : ''), MAX_STRING),
            },
        };
    }
    return out;
}
async function loadRestaurantContext(restaurantId, fallbackName, fallbackCuisine) {
    try {
        const snap = await firebaseAdmin_1.admin.firestore().collection('restaurants').doc(restaurantId).get();
        if (snap.exists) {
            const d = snap.data() || {};
            return {
                name: clip(String(d.name || fallbackName || ''), 200) || 'Restaurante',
                cuisineType: clip(String(d.cuisineType || d.type || fallbackCuisine || ''), 120),
            };
        }
    }
    catch (e) {
        console.warn('[translateMenuWithAI] Falha ao carregar restaurante:', e);
    }
    return {
        name: fallbackName || 'Restaurante',
        cuisineType: fallbackCuisine || '',
    };
}
exports.translateMenuWithAI = (0, https_1.onCall)({
    secrets: [openaiSecret_1.openaiApiKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
    timeoutSeconds: 120,
    memory: '512MiB',
}, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Faça login para traduzir o cardápio.');
    }
    const apiKey = openaiSecret_1.openaiApiKey.value();
    if (!apiKey) {
        console.error('[translateMenuWithAI] Secret OPENAI_API_KEY ausente ou vazia.');
        throw new https_1.HttpsError('failed-precondition', 'Tradução por IA não está configurada no servidor (secret OPENAI_API_KEY).');
    }
    let restaurantId;
    let items;
    let restaurantName;
    let cuisineType;
    try {
        const parsed = validatePayload(request.data);
        restaurantId = parsed.restaurantId;
        items = parsed.items;
        restaurantName = parsed.restaurantName;
        cuisineType = parsed.cuisineType;
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError('invalid-argument', 'Dados inválidos para tradução.');
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
    const client = new openai_1.default({ apiKey });
    let content;
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
        content = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
    }
    catch (e) {
        return { success: false, error: mapOpenAiError(e) };
    }
    if (!(content === null || content === void 0 ? void 0 : content.trim())) {
        return { success: false, error: 'Resposta vazia da IA.' };
    }
    try {
        const translations = parseTranslationsJson(content.trim(), items.map((i) => i.id));
        if (Object.keys(translations).length === 0) {
            return { success: false, error: 'A IA não retornou traduções válidas.' };
        }
        return { success: true, translations };
    }
    catch (e) {
        console.error('[translateMenuWithAI] Parse JSON falhou:', content.slice(0, 400), e);
        return { success: false, error: 'Resposta da IA não está em JSON válido.' };
    }
});
//# sourceMappingURL=translateMenuWithAI.js.map