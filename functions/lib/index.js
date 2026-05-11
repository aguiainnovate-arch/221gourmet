"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDeliverySavedCard = exports.listDeliverySavedCards = exports.createDeliverySetupIntent = exports.ensureDeliveryStripeCustomer = exports.createDeliveryPaymentIntent = exports.moderateLead = exports.recommendRestaurantsWithAI = exports.syncRestaurantStripeConnectStatus = exports.createRestaurantStripeConnectOnboardingLink = exports.importMenuFromClaudeText = exports.extractMenuPdfText = void 0;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const stripe_1 = __importDefault(require("stripe"));
const stripeClient_1 = require("./stripeClient");
const stripeUtils_1 = require("./stripeUtils");
const stripeRestaurantConnect_1 = require("./stripeRestaurantConnect");
var extractMenuPdfText_1 = require("./extractMenuPdfText");
Object.defineProperty(exports, "extractMenuPdfText", { enumerable: true, get: function () { return extractMenuPdfText_1.extractMenuPdfText; } });
var importMenuFromClaudeText_1 = require("./importMenuFromClaudeText");
Object.defineProperty(exports, "importMenuFromClaudeText", { enumerable: true, get: function () { return importMenuFromClaudeText_1.importMenuFromClaudeText; } });
var stripeRestaurantConnect_2 = require("./stripeRestaurantConnect");
Object.defineProperty(exports, "createRestaurantStripeConnectOnboardingLink", { enumerable: true, get: function () { return stripeRestaurantConnect_2.createRestaurantStripeConnectOnboardingLink; } });
Object.defineProperty(exports, "syncRestaurantStripeConnectStatus", { enumerable: true, get: function () { return stripeRestaurantConnect_2.syncRestaurantStripeConnectStatus; } });
var recommendRestaurantsWithAI_1 = require("./recommendRestaurantsWithAI");
Object.defineProperty(exports, "recommendRestaurantsWithAI", { enumerable: true, get: function () { return recommendRestaurantsWithAI_1.recommendRestaurantsWithAI; } });
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
function anthropicHttpToHttpsError(status, errBodyPreview) {
    console.error('[moderateLead] Erro HTTP Anthropic:', status, errBodyPreview);
    const transient = status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 529;
    if (transient) {
        return new https_1.HttpsError('unavailable', 'Não foi possível validar seu cadastro agora. Tente novamente em alguns instantes.');
    }
    if (status === 401 || status === 403) {
        return new https_1.HttpsError('failed-precondition', 'Validação automática indisponível. Tente mais tarde ou fale com nosso time comercial.');
    }
    return new https_1.HttpsError('internal', 'Não foi possível concluir a validação automática. Tente novamente em instantes.');
}
exports.moderateLead = (0, https_1.onCall)({ secrets: [anthropicApiKey], region: 'us-central1', cors: true, invoker: 'public' }, async (request) => {
    var _a, _b;
    const payload = request.data;
    if (!payload || typeof payload !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'Dados do formulário inválidos para validação.');
    }
    const apiKey = anthropicApiKey.value();
    if (!apiKey) {
        console.error('[moderateLead] Secret ANTHROPIC_API_KEY ausente ou vazia.');
        throw new https_1.HttpsError('failed-precondition', 'Validação automática não está disponível no momento. Tente mais tarde ou fale com nosso time comercial.');
    }
    const userMessage = `Dados do formulário (JSON):\n${JSON.stringify(payload, null, 2)}`;
    let res;
    try {
        res = await fetch(ANTHROPIC_URL, {
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
    }
    catch (e) {
        console.error('[moderateLead] Falha de rede ao chamar Anthropic:', e);
        throw new https_1.HttpsError('unavailable', 'Não foi possível validar seu cadastro agora. Tente novamente em alguns instantes.');
    }
    if (!res.ok) {
        const err = await res.text();
        throw anthropicHttpToHttpsError(res.status, err.slice(0, 300));
    }
    let data;
    try {
        data = (await res.json());
    }
    catch (e) {
        console.error('[moderateLead] Resposta Anthropic não é JSON válido:', e);
        throw new https_1.HttpsError('internal', 'Não foi possível interpretar a validação automática. Tente novamente em instantes.');
    }
    const text = (_b = (_a = data.content) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text;
    if (!text || !String(text).trim()) {
        console.warn('[moderateLead] Bloco de texto vazio na resposta da IA.');
        throw new https_1.HttpsError('internal', 'Não foi possível concluir a validação automática. Tente novamente em instantes.');
    }
    const cleaned = text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    }
    catch (e) {
        console.warn('[moderateLead] JSON da IA inválido (parse). Trecho:', cleaned.slice(0, 200), e);
        throw new https_1.HttpsError('internal', 'Não foi possível concluir a validação automática. Tente novamente em instantes.');
    }
    if (typeof parsed.allowed !== 'boolean') {
        console.warn('[moderateLead] JSON da IA sem campo boolean "allowed".', cleaned.slice(0, 200));
        throw new https_1.HttpsError('internal', 'Não foi possível concluir a validação automática. Tente novamente em instantes.');
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
});
/** Cria PaymentIntent para checkout delivery. Aceita cartão salvo (off_session) ou fluxo interativo. */
exports.createDeliveryPaymentIntent = (0, https_1.onCall)({ secrets: [stripeClient_1.stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' }, async (request) => {
    var _a, _b;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const amountCents = raw.amountCents;
    if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || !Number.isFinite(amountCents)) {
        throw new https_1.HttpsError('invalid-argument', 'amountCents deve ser um número inteiro (centavos).');
    }
    // R$ 1,00 a R$ 100.000,00 — ajuste se precisar
    if (amountCents < 100 || amountCents > 10000000) {
        throw new https_1.HttpsError('invalid-argument', 'Valor do pedido fora do intervalo permitido.');
    }
    const currency = typeof raw.currency === 'string' && /^[a-z]{3}$/i.test(raw.currency)
        ? raw.currency.toLowerCase()
        : 'brl';
    const usePix = raw.usePix === true;
    const metadata = (0, stripeUtils_1.sanitizeMetadata)(raw.metadata);
    const restaurantIdMeta = typeof metadata.restaurantId === 'string' ? metadata.restaurantId.trim() : '';
    if (!restaurantIdMeta) {
        throw new https_1.HttpsError('invalid-argument', 'metadata.restaurantId é obrigatório para pagamento delivery.');
    }
    const { destination, applicationFeeAmount } = await (0, stripeRestaurantConnect_1.resolveDestinationAndFee)(amountCents, restaurantIdMeta);
    const customerId = typeof raw.customerId === 'string' ? raw.customerId : undefined;
    const paymentMethodId = typeof raw.paymentMethodId === 'string' ? raw.paymentMethodId : undefined;
    const savePaymentMethod = raw.savePaymentMethod === true;
    const stripe = (0, stripeClient_1.getStripe)();
    const currencyEffective = usePix ? 'brl' : currency;
    if (usePix && currency !== 'brl') {
        throw new https_1.HttpsError('invalid-argument', 'PIX só está disponível em BRL.');
    }
    const params = {
        amount: amountCents,
        currency: currencyEffective,
        metadata,
        transfer_data: {
            destination,
        },
    };
    if (applicationFeeAmount > 0) {
        params.application_fee_amount = applicationFeeAmount;
    }
    if (customerId)
        params.customer = customerId;
    if (usePix) {
        params.payment_method_types = ['pix'];
    }
    else if (paymentMethodId && customerId) {
        // Fluxo com cartão salvo — confirmar imediatamente
        params.payment_method = paymentMethodId;
        params.confirm = true;
        params.off_session = true;
    }
    else {
        // Fluxo interativo (Payment Element)
        params.automatic_payment_methods = { enabled: true };
        if (savePaymentMethod && customerId) {
            params.setup_future_usage = 'off_session';
        }
    }
    let intent;
    try {
        intent = await stripe.paymentIntents.create(params);
    }
    catch (err) {
        // Se a cobrança off_session exigir 3DS, a Stripe retorna StripeCardError com payment_intent embutido
        if (err instanceof stripe_1.default.errors.StripeCardError &&
            err.payment_intent) {
            const pi = err.payment_intent;
            return {
                clientSecret: (_b = pi.client_secret) !== null && _b !== void 0 ? _b : '',
                paymentIntentId: pi.id,
                status: pi.status,
                requiresAction: pi.status === 'requires_action' || pi.status === 'requires_confirmation',
            };
        }
        throw (0, stripeUtils_1.translateStripeError)(err, 'createDeliveryPaymentIntent');
    }
    if (!intent.client_secret) {
        console.error('[createDeliveryPaymentIntent] PaymentIntent sem client_secret');
        throw new https_1.HttpsError('internal', 'Erro ao preparar pagamento.');
    }
    return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        status: intent.status,
        requiresAction: intent.status === 'requires_action' || intent.status === 'requires_confirmation',
    };
});
/** Garante Stripe Customer para o usuário delivery. Retorna customerId (cria se não existir). */
exports.ensureDeliveryStripeCustomer = (0, https_1.onCall)({ secrets: [stripeClient_1.stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' }, async (request) => {
    var _a;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const deliveryUserId = typeof raw.deliveryUserId === 'string' ? raw.deliveryUserId.trim() : '';
    if (!deliveryUserId) {
        throw new https_1.HttpsError('invalid-argument', 'deliveryUserId obrigatório.');
    }
    const email = typeof raw.email === 'string' ? raw.email.slice(0, 200) : undefined;
    const name = typeof raw.name === 'string' ? raw.name.slice(0, 200) : undefined;
    const phone = typeof raw.phone === 'string' ? raw.phone.slice(0, 40) : undefined;
    const existingCustomerId = typeof raw.existingCustomerId === 'string' && raw.existingCustomerId.startsWith('cus_')
        ? raw.existingCustomerId
        : undefined;
    const stripe = (0, stripeClient_1.getStripe)();
    try {
        if (existingCustomerId) {
            const customer = await stripe.customers.retrieve(existingCustomerId);
            if (customer && !('deleted' in customer && customer.deleted)) {
                return { customerId: existingCustomerId };
            }
        }
        // Procurar por metadata.deliveryUserId para não duplicar
        const existing = await stripe.customers.search({
            query: `metadata['deliveryUserId']:'${deliveryUserId}'`,
            limit: 1,
        });
        if (existing.data[0]) {
            return { customerId: existing.data[0].id };
        }
        const created = await stripe.customers.create({
            email,
            name,
            phone,
            metadata: { deliveryUserId },
        });
        return { customerId: created.id };
    }
    catch (err) {
        throw (0, stripeUtils_1.translateStripeError)(err, 'ensureDeliveryStripeCustomer');
    }
});
/** Cria SetupIntent para salvar cartão do customer (sem cobrar). */
exports.createDeliverySetupIntent = (0, https_1.onCall)({ secrets: [stripeClient_1.stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' }, async (request) => {
    var _a;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const customerId = typeof raw.customerId === 'string' ? raw.customerId : '';
    if (!customerId.startsWith('cus_')) {
        throw new https_1.HttpsError('invalid-argument', 'customerId inválido.');
    }
    const stripe = (0, stripeClient_1.getStripe)();
    try {
        // Somente cartão: evita Stripe Link / outros métodos que pedem "login"
        // em outra conta (confundido com a sessão do app).
        const setup = await stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
            usage: 'off_session',
        });
        if (!setup.client_secret) {
            throw new https_1.HttpsError('internal', 'SetupIntent sem client_secret.');
        }
        return { clientSecret: setup.client_secret };
    }
    catch (err) {
        throw (0, stripeUtils_1.translateStripeError)(err, 'createDeliverySetupIntent');
    }
});
/** Lista cartões salvos do customer. */
exports.listDeliverySavedCards = (0, https_1.onCall)({ secrets: [stripeClient_1.stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' }, async (request) => {
    var _a;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const customerId = typeof raw.customerId === 'string' ? raw.customerId : '';
    if (!customerId.startsWith('cus_')) {
        throw new https_1.HttpsError('invalid-argument', 'customerId inválido.');
    }
    const stripe = (0, stripeClient_1.getStripe)();
    try {
        const list = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
            limit: 20,
        });
        const cards = list.data
            .filter((pm) => !!pm.card)
            .map((pm) => ({
            id: pm.id,
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
        }));
        return { cards };
    }
    catch (err) {
        throw (0, stripeUtils_1.translateStripeError)(err, 'listDeliverySavedCards');
    }
});
/** Remove um PaymentMethod (desanexa do customer). */
exports.removeDeliverySavedCard = (0, https_1.onCall)({ secrets: [stripeClient_1.stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' }, async (request) => {
    var _a;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const paymentMethodId = typeof raw.paymentMethodId === 'string' ? raw.paymentMethodId : '';
    if (!paymentMethodId.startsWith('pm_')) {
        throw new https_1.HttpsError('invalid-argument', 'paymentMethodId inválido.');
    }
    const stripe = (0, stripeClient_1.getStripe)();
    try {
        await stripe.paymentMethods.detach(paymentMethodId);
        return { removed: true };
    }
    catch (err) {
        throw (0, stripeUtils_1.translateStripeError)(err, 'removeDeliverySavedCard');
    }
});
//# sourceMappingURL=index.js.map