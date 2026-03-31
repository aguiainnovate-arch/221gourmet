"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateLead = void 0;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const anthropicApiKey = (0, params_1.defineSecret)('ANTHROPIC_API_KEY');
const MODEL = 'claude-3-haiku-20240307';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const SYSTEM_PROMPT = `Você é um filtro de segurança e qualidade para cadastros de RESTAURANTES na plataforma brasileira "Bora Comer".

Analise o JSON com os dados do formulário e decida se parece um DONO DE RESTAURANTE de boa-fé querendo parceria comercial, ou se é brincadeira, spam, teste absurdo, conteúdo ofensivo ou dados sem sentido.

REJEITE (allowed: false) quando houver indícios claros de:
- Nomes ou descrições de piada, trollagem, meme sem contexto de negócio ("Restaurante do 4chan", "asdfasdf", "teste teste teste", "aaa", só números repetidos)
- Texto gibberish, só emojis, lorem ipsum como único conteúdo relevante
- Discurso de ódio, assédio, ameaças, conteúdo ilegal
- Descrição vazia de sentido comercial ou óbvia mentira absurda
- Dados claramente falsos de propósito

ACEITE (allowed: true) quando:
- Nome de restaurante e descrição fazem sentido como negócio de alimentação
- Dados de contato e localização parecem plausíveis (erros de digitação leves são OK)
- Pequenos negócios informais mas genuínos devem ser aceitos

Responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois:
{"allowed":true}
ou
{"allowed":false,"user_message_pt":"mensagem educada em português do Brasil, até 2 frases."}`;
exports.moderateLead = (0, https_1.onCall)({ secrets: [anthropicApiKey], region: 'us-central1', cors: true }, async (request) => {
    var _a, _b;
    const payload = request.data;
    if (!payload || typeof payload !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'Payload inválido.');
    }
    const apiKey = anthropicApiKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError('failed-precondition', 'Chave da IA não configurada.');
    }
    const userMessage = `Dados do formulário (JSON):\n${JSON.stringify(payload, null, 2)}`;
    const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        console.error('[moderateLead] Erro Anthropic:', res.status, err.slice(0, 300));
        throw new https_1.HttpsError('internal', 'Erro ao consultar IA de moderação.');
    }
    const data = (await res.json());
    const text = (_b = (_a = data.content) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text;
    if (!text) {
        throw new https_1.HttpsError('internal', 'Resposta vazia da IA.');
    }
    const cleaned = text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    try {
        const parsed = JSON.parse(cleaned);
        if (typeof parsed.allowed !== 'boolean') {
            console.warn('[moderateLead] JSON sem "allowed" boolean — bloqueando.');
            return {
                allowed: false,
                userMessage: 'Não foi possível validar o cadastro. Tente novamente.',
            };
        }
        if (parsed.allowed) {
            return { allowed: true };
        }
        return {
            allowed: false,
            userMessage: typeof parsed.user_message_pt === 'string' && parsed.user_message_pt.trim()
                ? parsed.user_message_pt.trim()
                : 'Não conseguimos validar seu cadastro. Verifique se os dados correspondem a um restaurante real.',
        };
    }
    catch (_c) {
        console.warn('[moderateLead] JSON inválido da IA — bloqueando.');
        return {
            allowed: false,
            userMessage: 'Não foi possível validar o cadastro. Tente novamente.',
        };
    }
});
//# sourceMappingURL=index.js.map