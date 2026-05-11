"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendRestaurantsWithAI = exports.openaiApiKey = void 0;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const openai_1 = __importDefault(require("openai"));
const firebaseAdmin_1 = require("./firebaseAdmin");
exports.openaiApiKey = (0, params_1.defineSecret)('OPENAI_API_KEY');
const CHATBOT_CONFIG_DOC = 'global-chatbot-config';
const MAX_USER_MESSAGE = 4000;
const MAX_HISTORY_MESSAGES = 24;
const MAX_HISTORY_CONTENT = 4000;
const MAX_RESTAURANTS = 50;
const MAX_PRODUCTS_PER_RESTAURANT = 100;
const MAX_STRING_FIELD = 500;
function clip(s, max) {
    const t = typeof s === 'string' ? s : String(s !== null && s !== void 0 ? s : '');
    return t.length > max ? t.slice(0, max) : t;
}
function parseNumber(n) {
    if (typeof n === 'number' && Number.isFinite(n))
        return n;
    return 0;
}
function validateAndSanitizePayload(raw) {
    if (!raw || typeof raw !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'Payload inválido.');
    }
    const data = raw;
    if (typeof data.userMessage !== 'string' || !data.userMessage.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'userMessage é obrigatório.');
    }
    const userMessage = clip(data.userMessage.trim(), MAX_USER_MESSAGE);
    if (!Array.isArray(data.conversationHistory)) {
        throw new https_1.HttpsError('invalid-argument', 'conversationHistory deve ser um array.');
    }
    if (data.conversationHistory.length > MAX_HISTORY_MESSAGES) {
        throw new https_1.HttpsError('invalid-argument', 'Histórico de conversa excede o limite permitido.');
    }
    const conversationHistory = [];
    for (const item of data.conversationHistory) {
        if (!item || typeof item !== 'object') {
            throw new https_1.HttpsError('invalid-argument', 'Entrada inválida no histórico de conversa.');
        }
        const m = item;
        const role = m.role;
        if (role !== 'user' && role !== 'assistant') {
            throw new https_1.HttpsError('invalid-argument', 'Papel inválido no histórico (use user ou assistant).');
        }
        if (typeof m.content !== 'string') {
            throw new https_1.HttpsError('invalid-argument', 'Conteúdo do histórico deve ser string.');
        }
        conversationHistory.push({
            role,
            content: clip(m.content, MAX_HISTORY_CONTENT),
        });
    }
    if (!Array.isArray(data.restaurantsData)) {
        throw new https_1.HttpsError('invalid-argument', 'restaurantsData deve ser um array.');
    }
    if (data.restaurantsData.length > MAX_RESTAURANTS) {
        throw new https_1.HttpsError('invalid-argument', 'Lista de restaurantes excede o limite permitido.');
    }
    const restaurantsData = [];
    for (const r of data.restaurantsData) {
        if (!r || typeof r !== 'object')
            continue;
        const row = r;
        if (typeof row.id !== 'string' || !row.id.trim())
            continue;
        const id = clip(row.id.trim(), 128);
        const name = typeof row.name === 'string' ? clip(row.name, MAX_STRING_FIELD) : '';
        const address = typeof row.address === 'string' ? clip(row.address, MAX_STRING_FIELD) : '';
        const phone = typeof row.phone === 'string' ? clip(row.phone, 80) : '';
        const productsRaw = Array.isArray(row.products) ? row.products : [];
        const products = [];
        for (const p of productsRaw.slice(0, MAX_PRODUCTS_PER_RESTAURANT)) {
            if (!p || typeof p !== 'object')
                continue;
            const pr = p;
            products.push({
                name: typeof pr.name === 'string' ? clip(pr.name, 200) : '',
                description: typeof pr.description === 'string' ? clip(pr.description, 500) : '',
                price: parseNumber(pr.price),
                category: typeof pr.category === 'string' ? clip(pr.category, 120) : '',
            });
        }
        if (products.length === 0)
            continue;
        restaurantsData.push({ id, name, address, phone, products });
    }
    if (restaurantsData.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Nenhum restaurante válido com cardápio foi enviado.');
    }
    return { userMessage, conversationHistory, restaurantsData };
}
async function loadChatbotConfig() {
    const defaults = {
        customRules: '',
        toneInstructions: 'Seja amigável, casual e use emojis moderadamente para criar conexão.',
        cardsThreshold: 'conservative',
    };
    try {
        const snap = await firebaseAdmin_1.admin.firestore().collection('settings').doc(CHATBOT_CONFIG_DOC).get();
        if (!snap.exists)
            return defaults;
        const data = snap.data();
        if (!data)
            return defaults;
        const customRules = typeof data.customRules === 'string' ? clip(data.customRules, 8000) : '';
        const cardsThreshold = data.showCardsThreshold === 'eager' ||
            data.showCardsThreshold === 'balanced' ||
            data.showCardsThreshold === 'conservative'
            ? data.showCardsThreshold
            : 'conservative';
        let toneInstructions = defaults.toneInstructions;
        switch (data.tone) {
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
        return { customRules, toneInstructions, cardsThreshold };
    }
    catch (e) {
        console.error('[recommendRestaurantsWithAI] Erro ao ler config do chatbot no Firestore:', e);
        return defaults;
    }
}
function buildRestaurantsInfo(restaurantsData) {
    return restaurantsData.map((r) => ({
        id: r.id,
        nome: r.name,
        endereco: r.address,
        telefone: r.phone,
        categorias: [...new Set(r.products.map((p) => p.category).filter(Boolean))],
        pratos_destaque: r.products.slice(0, 5).map((p) => ({
            nome: p.name,
            descricao: p.description,
            preco: p.price,
        })),
        preco_medio: (r.products.reduce((acc, p) => acc + p.price, 0) / Math.max(r.products.length, 1)).toFixed(2),
    }));
}
function buildSystemPrompt(restaurantsInfo, toneInstructions, cardsInstructions, customRules) {
    return `Você é um assistente virtual especializado em recomendar restaurantes. Você tem acesso a informações de vários restaurantes com seus cardápios completos.

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

${customRules
        ? `REGRAS PERSONALIZADAS:
${customRules}

`
        : ''}DADOS DOS RESTAURANTES DISPONÍVEIS:
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
}
function cardsInstructionsFor(threshold) {
    switch (threshold) {
        case 'eager':
            return 'Seja proativo ao recomendar restaurantes. Se o usuário demonstrar interesse em qualquer tipo de comida, mostre opções.';
        case 'balanced':
            return 'Recomende restaurantes quando o usuário demonstrar interesse claro ou pedir sugestões.';
        case 'conservative':
        default:
            return 'Seja conservador ao recomendar restaurantes. Apenas mostre cards quando o usuário pedir explicitamente ou a conversa claramente indicar que está pronto para ver opções.';
    }
}
exports.recommendRestaurantsWithAI = (0, https_1.onCall)({ secrets: [exports.openaiApiKey], region: 'us-central1', cors: true, invoker: 'public' }, async (request) => {
    var _a, _b;
    const apiKey = exports.openaiApiKey.value();
    if (!apiKey) {
        console.error('[recommendRestaurantsWithAI] Secret OPENAI_API_KEY ausente ou vazia.');
        throw new https_1.HttpsError('failed-precondition', 'Recomendações por IA não estão configuradas no servidor. Peça ao administrador para configurar o segredo OPENAI_API_KEY nas Cloud Functions.');
    }
    let userMessage;
    let conversationHistory;
    let restaurantsData;
    try {
        const parsed = validateAndSanitizePayload(request.data);
        userMessage = parsed.userMessage;
        conversationHistory = parsed.conversationHistory;
        restaurantsData = parsed.restaurantsData;
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        console.error('[recommendRestaurantsWithAI] Erro inesperado na validação:', e);
        throw new https_1.HttpsError('invalid-argument', 'Dados inválidos para recomendação.');
    }
    const { customRules, toneInstructions, cardsThreshold } = await loadChatbotConfig();
    const restaurantsInfo = buildRestaurantsInfo(restaurantsData);
    const systemPrompt = buildSystemPrompt(restaurantsInfo, toneInstructions, cardsInstructionsFor(cardsThreshold), customRules);
    const client = new openai_1.default({ apiKey });
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
        })),
        { role: 'user', content: userMessage },
    ];
    let content;
    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 1000,
            temperature: 0.8,
            response_format: { type: 'json_object' },
        });
        content = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
    }
    catch (e) {
        console.error('[recommendRestaurantsWithAI] Erro na API OpenAI:', e);
        return {
            success: false,
            error: 'Não foi possível gerar recomendações no momento. Tente novamente em alguns instantes.',
        };
    }
    if (!content) {
        console.warn('[recommendRestaurantsWithAI] Resposta OpenAI sem conteúdo.');
        return {
            success: false,
            error: 'Não foi possível gerar recomendações no momento. Tente novamente em alguns instantes.',
        };
    }
    try {
        let cleanContent = content.trim();
        if (cleanContent.includes('```json')) {
            cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```/g, '');
        }
        else if (cleanContent.includes('```')) {
            cleanContent = cleanContent.replace(/```/g, '');
        }
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanContent = jsonMatch[0];
        }
        const parsed = JSON.parse(cleanContent.trim());
        if (!parsed.message || typeof parsed.message !== 'string') {
            console.error('[recommendRestaurantsWithAI] JSON sem campo message válido.');
            return { success: false, error: 'Resposta da IA em formato inesperado. Tente de novo.' };
        }
        const allowedIds = new Set(restaurantsData.map((r) => r.id));
        const rawList = Array.isArray(parsed.restaurants) ? parsed.restaurants : [];
        const recommendedRestaurants = rawList
            .filter((x) => x &&
            typeof x.id === 'string' &&
            allowedIds.has(x.id) &&
            typeof x.name === 'string' &&
            typeof x.reason === 'string')
            .map((x) => ({
            id: x.id,
            name: clip(x.name, 200),
            reason: clip(x.reason, 400),
        }));
        return {
            success: true,
            response: parsed.message,
            recommendedRestaurants,
        };
    }
    catch (parseError) {
        console.error('[recommendRestaurantsWithAI] Falha ao interpretar JSON da IA:', parseError);
        let fallbackText = content.replace(/\{[\s\S]*\}/g, '').trim();
        if (!fallbackText || fallbackText.length < 10) {
            fallbackText =
                '😔 Desculpe, tive um problema ao processar a resposta. Pode tentar reformular sua pergunta?';
        }
        return {
            success: true,
            response: fallbackText,
            recommendedRestaurants: [],
        };
    }
});
//# sourceMappingURL=recommendRestaurantsWithAI.js.map