"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToInbound = replyToInbound;
const openai_1 = __importDefault(require("openai"));
const firebaseAdmin_1 = require("../firebaseAdmin");
const openaiSecret_1 = require("../openaiSecret");
const prompt_1 = require("./prompt");
const twilioSend_1 = require("./twilioSend");
const tools_1 = require("./tools");
const phone_1 = require("./phone");
const FALLBACK = 'Tive um problema agora. Pode repetir em instantes?';
const MAX_TOOL_ROUNDS = 3;
const MAX_STORED_MESSAGES = 24;
const SANDBOX_RESTAURANT_ID = 'xli1hZjDRsHFtCnzr8hk';
const SANDBOX_RESTAURANT_NAME = 'Restaurante Teste';
async function loadConfig() {
    var _a;
    const ref = firebaseAdmin_1.admin.firestore().doc('whatsappConfig/default');
    const snap = await ref.get();
    const current = snap.exists ? snap.data() || {} : {};
    const existingId = typeof current.restaurantId === 'string' ? current.restaurantId.trim() : '';
    if (existingId) {
        const personality = typeof current.personality === 'string' && current.personality.trim()
            ? current.personality.trim()
            : 'DESCONTRAIDO';
        return { restaurantId: existingId, personality };
    }
    const restaurant = await firebaseAdmin_1.admin.firestore().collection('restaurants').doc(SANDBOX_RESTAURANT_ID).get();
    const name = restaurant.exists ? (_a = restaurant.data()) === null || _a === void 0 ? void 0 : _a.name : '';
    if (name !== SANDBOX_RESTAURANT_NAME) {
        console.error('[boris] restaurante sandbox não confere, config não gravada');
        return null;
    }
    const personality = 'DESCONTRAIDO';
    await ref.set({
        restaurantId: SANDBOX_RESTAURANT_ID,
        from: 'whatsapp:+14155238886',
        personality,
    }, { merge: true });
    return { restaurantId: SANDBOX_RESTAURANT_ID, personality };
}
async function appendConversation(conversationId, patch, message) {
    var _a, _b;
    const ref = firebaseAdmin_1.admin.firestore().collection('whatsappConversations').doc(conversationId);
    const snap = await ref.get();
    const previous = snap.exists && Array.isArray((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.messages) ? (_b = snap.data()) === null || _b === void 0 ? void 0 : _b.messages : [];
    const messages = [...previous, message].slice(-MAX_STORED_MESSAGES);
    await ref.set(Object.assign(Object.assign({}, patch), { messages, updatedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp() }), { merge: true });
    return messages;
}
async function replyToInbound(input) {
    var _a, _b, _c;
    const text = input.body.trim();
    if (!text)
        return;
    const config = await loadConfig();
    if (!config) {
        console.error('[boris] whatsappConfig/default sem restaurantId');
        return;
    }
    const customerPhone = (0, phone_1.normalizePhone)(input.waId || input.from);
    if (!customerPhone)
        return;
    const to = (0, phone_1.toWhatsAppAddress)(customerPhone);
    const conversationId = (0, phone_1.conversationDocId)(customerPhone, config.restaurantId);
    const ctx = {
        restaurantId: config.restaurantId,
        customerPhone,
        conversationId,
    };
    const existing = await firebaseAdmin_1.admin.firestore().collection('whatsappConversations').doc(conversationId).get();
    const mode = existing.exists && ((_a = existing.data()) === null || _a === void 0 ? void 0 : _a.mode) === 'human' ? 'human' : 'ai';
    const history = await appendConversation(conversationId, {
        restaurantId: config.restaurantId,
        customerPhone,
        waId: input.waId,
        profileName: input.profileName || '',
        mode,
    }, { role: 'user', content: text });
    if (mode === 'human')
        return;
    const apiKey = openaiSecret_1.openaiApiKey.value().trim();
    if (!apiKey) {
        await (0, twilioSend_1.sendWhatsAppTurn)(to, FALLBACK);
        return;
    }
    let facts = {};
    try {
        const real = await (0, tools_1.loadRealFacts)(ctx);
        facts = Object.assign(Object.assign({}, real), { customer_name: input.profileName || '' });
    }
    catch (err) {
        console.error('[boris] falha ao carregar fatos', err);
    }
    const client = new openai_1.default({ apiKey });
    const messages = [
        { role: 'system', content: (0, prompt_1.buildBorisSystemPrompt)({ personality: config.personality, facts }) },
        ...history.slice(-12).map((msg) => ({ role: msg.role, content: msg.content })),
    ];
    let reply = '';
    try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
            const response = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                tools: tools_1.BORIS_TOOLS,
                temperature: 0.4,
            });
            const choice = (_b = response.choices[0]) === null || _b === void 0 ? void 0 : _b.message;
            if (!choice)
                break;
            const toolCalls = choice.tool_calls || [];
            if (!toolCalls.length) {
                reply = ((_c = choice.content) === null || _c === void 0 ? void 0 : _c.trim()) || '';
                break;
            }
            messages.push(choice);
            for (const call of toolCalls) {
                if (call.type !== 'function')
                    continue;
                const result = await (0, tools_1.executeBorisTool)(call.function.name, call.function.arguments || '{}', ctx);
                messages.push({
                    role: 'tool',
                    tool_call_id: call.id,
                    content: JSON.stringify(result),
                });
            }
        }
    }
    catch (err) {
        console.error('[boris] OpenAI falhou', err);
        reply = '';
    }
    const outbound = reply || FALLBACK;
    await (0, twilioSend_1.sendWhatsAppTurn)(to, outbound);
    await appendConversation(conversationId, {}, { role: 'assistant', content: outbound });
}
//# sourceMappingURL=orchestrator.js.map