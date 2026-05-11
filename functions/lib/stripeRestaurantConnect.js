"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRestaurantStripeConnectStatus = exports.createRestaurantStripeConnectOnboardingLink = void 0;
exports.parsePlatformFeeBps = parsePlatformFeeBps;
exports.resolveDestinationAndFee = resolveDestinationAndFee;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("./firebaseAdmin");
const stripeClient_1 = require("./stripeClient");
const stripeUtils_1 = require("./stripeUtils");
const DEFAULT_RESTAURANT_PASSWORD = '123456';
/**
 * Origem do front (protocolo + host, sem path). Ex.: https://boracoomer.netlify.app
 * Não use sufixo /delivery — o código monta `/{restaurantId}/settings?...` sozinho.
 */
const publicAppUrl = (0, params_1.defineString)('PUBLIC_APP_URL', {
    default: 'http://localhost:5173',
    description: 'Origem do app (ex. https://site.com). Sem path; retorno Stripe = /{id}/settings',
});
function connectAppOrigin(raw) {
    const trimmed = raw.trim().replace(/\/$/, '');
    if (!trimmed)
        return 'http://localhost:5173';
    try {
        const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        return new URL(withProto).origin;
    }
    catch (_a) {
        return trimmed;
    }
}
function restaurantStripeConnectReturnUrl(origin, restaurantId, stripeConnect) {
    const id = encodeURIComponent(restaurantId);
    return `${origin}/${id}/settings?tab=delivery&stripe_connect=${stripeConnect}`;
}
/** Taxa da plataforma em basis points (100 = 1%). Ex.: 300 = 3% sobre cada pagamento delivery (fica na conta da plataforma). */
const platformFeeBps = (0, params_1.defineString)('STRIPE_PLATFORM_FEE_BPS', {
    default: '0',
});
function summarizeStripeAccountRequirements(acct) {
    var _a, _b;
    const requirements = acct.requirements;
    const disabledReason = requirements === null || requirements === void 0 ? void 0 : requirements.disabled_reason;
    const pending = [
        ...((_a = requirements === null || requirements === void 0 ? void 0 : requirements.currently_due) !== null && _a !== void 0 ? _a : []),
        ...((_b = requirements === null || requirements === void 0 ? void 0 : requirements.past_due) !== null && _b !== void 0 ? _b : []),
    ];
    const uniquePending = [...new Set(pending)].slice(0, 8);
    if (disabledReason && uniquePending.length > 0) {
        return `${disabledReason}: ${uniquePending.join(', ')}`;
    }
    if (disabledReason) {
        return disabledReason;
    }
    if (uniquePending.length > 0) {
        return uniquePending.join(', ');
    }
    return null;
}
async function verifyRestaurantOwnerPassword(restaurantId, email, plainPassword) {
    const snap = await firebaseAdmin_1.admin.firestore().collection('restaurants').doc(restaurantId).get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Restaurante não encontrado.');
    }
    const data = snap.data();
    const storedEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
    if (!storedEmail || storedEmail !== email.toLowerCase().trim()) {
        throw new https_1.HttpsError('permission-denied', 'Credenciais inválidas.');
    }
    let hash = typeof data.password === 'string' ? data.password : '';
    if (!hash) {
        if (plainPassword !== DEFAULT_RESTAURANT_PASSWORD) {
            throw new https_1.HttpsError('permission-denied', 'Credenciais inválidas.');
        }
        return data;
    }
    const ok = await bcryptjs_1.default.compare(plainPassword, hash);
    if (!ok) {
        throw new https_1.HttpsError('permission-denied', 'Credenciais inválidas.');
    }
    return data;
}
/** Onboarding Stripe Connect (Express): cria conta vinculada se precisar e devolve URL do fluxo hospedado pela Stripe. */
exports.createRestaurantStripeConnectOnboardingLink = (0, https_1.onCall)({
    secrets: [stripeClient_1.stripeSecretKey],
    region: 'us-central1',
    cors: true,
    // Navegador + callable sem Firebase Auth do restaurante — Cloud Run precisa permitir invocação pública.
    invoker: 'public',
}, async (request) => {
    var _a;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const restaurantId = typeof raw.restaurantId === 'string' ? raw.restaurantId.trim() : '';
    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    const password = typeof raw.password === 'string' ? raw.password : '';
    if (!restaurantId || !email || !password) {
        throw new https_1.HttpsError('invalid-argument', 'Informe restaurantId, email e senha do restaurante.');
    }
    await verifyRestaurantOwnerPassword(restaurantId, email, password);
    const stripe = (0, stripeClient_1.getStripe)();
    const db = firebaseAdmin_1.admin.firestore();
    const ref = db.collection('restaurants').doc(restaurantId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Restaurante não encontrado.');
    }
    const r = snap.data();
    let accountId = typeof r.stripeConnectAccountId === 'string' ? r.stripeConnectAccountId.trim() : '';
    try {
        if (!accountId.startsWith('acct_')) {
            const emailStripe = typeof r.email === 'string' && r.email.includes('@')
                ? r.email.trim()
                : undefined;
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'BR',
                email: emailStripe,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                metadata: {
                    firestoreRestaurantId: restaurantId.slice(0, 500),
                },
            });
            accountId = account.id;
            await ref.update({
                stripeConnectAccountId: accountId,
                stripeConnectUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        const origin = connectAppOrigin(publicAppUrl.value());
        const link = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: restaurantStripeConnectReturnUrl(origin, restaurantId, 'refresh'),
            return_url: restaurantStripeConnectReturnUrl(origin, restaurantId, 'return'),
            type: 'account_onboarding',
        });
        if (!link.url) {
            throw new https_1.HttpsError('internal', 'Não foi possível gerar o link de cadastro Stripe.');
        }
        return { url: link.url, stripeConnectAccountId: accountId };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw (0, stripeUtils_1.translateStripeError)(err, 'createRestaurantStripeConnectOnboardingLink');
    }
});
/** Atualiza no Firestore o status da conta conectada (charges_enabled, etc.). */
exports.syncRestaurantStripeConnectStatus = (0, https_1.onCall)({
    secrets: [stripeClient_1.stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
}, async (request) => {
    var _a, _b, _c, _d;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const restaurantId = typeof raw.restaurantId === 'string' ? raw.restaurantId.trim() : '';
    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    const password = typeof raw.password === 'string' ? raw.password : '';
    if (!restaurantId || !email || !password) {
        throw new https_1.HttpsError('invalid-argument', 'Informe restaurantId, email e senha do restaurante.');
    }
    await verifyRestaurantOwnerPassword(restaurantId, email, password);
    const ref = firebaseAdmin_1.admin.firestore().collection('restaurants').doc(restaurantId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Restaurante não encontrado.');
    }
    const accountIdRaw = typeof ((_b = snap.data()) === null || _b === void 0 ? void 0 : _b.stripeConnectAccountId) === 'string'
        ? snap.data().stripeConnectAccountId.trim()
        : '';
    if (!accountIdRaw.startsWith('acct_')) {
        await ref.update({
            stripeConnectChargesEnabled: false,
            stripeConnectDetailsSubmitted: false,
            stripeConnectPayoutsEnabled: false,
            stripeConnectUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return {
            stripeConnectAccountId: null,
            chargesEnabled: false,
            detailsSubmitted: false,
            payoutsEnabled: false,
            disabledReason: null,
            requirementsSummary: null,
        };
    }
    const stripe = (0, stripeClient_1.getStripe)();
    try {
        const acct = await stripe.accounts.retrieve(accountIdRaw);
        const chargesEnabled = acct.charges_enabled === true;
        const detailsSubmitted = acct.details_submitted === true;
        const payoutsEnabled = acct.payouts_enabled === true;
        const disabledReason = (_d = (_c = acct.requirements) === null || _c === void 0 ? void 0 : _c.disabled_reason) !== null && _d !== void 0 ? _d : null;
        const requirementsSummary = summarizeStripeAccountRequirements(acct);
        await ref.update({
            stripeConnectChargesEnabled: chargesEnabled,
            stripeConnectDetailsSubmitted: detailsSubmitted,
            stripeConnectPayoutsEnabled: payoutsEnabled,
            stripeConnectDisabledReason: disabledReason,
            stripeConnectRequirementsSummary: requirementsSummary,
            stripeConnectUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return {
            stripeConnectAccountId: accountIdRaw,
            chargesEnabled,
            detailsSubmitted,
            payoutsEnabled,
            disabledReason,
            requirementsSummary,
        };
    }
    catch (err) {
        throw (0, stripeUtils_1.translateStripeError)(err, 'syncRestaurantStripeConnectStatus');
    }
});
function parsePlatformFeeBps() {
    const raw = platformFeeBps.value().trim();
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0 || n > 9999) {
        return 0;
    }
    return n;
}
async function resolveDestinationAndFee(amountCents, restaurantId) {
    var _a, _b, _c, _d, _e;
    const stripe = (0, stripeClient_1.getStripe)();
    const ref = firebaseAdmin_1.admin.firestore().collection('restaurants').doc(restaurantId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('failed-precondition', 'Restaurante não encontrado para pagamento.');
    }
    const destRaw = typeof ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.stripeConnectAccountId) === 'string'
        ? snap.data().stripeConnectAccountId.trim()
        : '';
    if (!destRaw.startsWith('acct_')) {
        throw new https_1.HttpsError('failed-precondition', 'Este restaurante ainda não configurou recebimento online (Stripe Connect). Use dinheiro, PIX ou cartão na entrega, ou tente mais tarde.');
    }
    let chargesEnabled = ((_b = snap.data()) === null || _b === void 0 ? void 0 : _b.stripeConnectChargesEnabled) === true;
    try {
        const acct = await stripe.accounts.retrieve(destRaw);
        chargesEnabled = acct.charges_enabled === true;
        await ref.update({
            stripeConnectChargesEnabled: (_c = acct.charges_enabled) !== null && _c !== void 0 ? _c : false,
            stripeConnectDetailsSubmitted: (_d = acct.details_submitted) !== null && _d !== void 0 ? _d : false,
            stripeConnectPayoutsEnabled: (_e = acct.payouts_enabled) !== null && _e !== void 0 ? _e : false,
            stripeConnectUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        throw (0, stripeUtils_1.translateStripeError)(err, 'resolveDestinationAndFee.retrieveAccount');
    }
    if (!chargesEnabled) {
        throw new https_1.HttpsError('failed-precondition', 'O restaurante ainda não está habilitado a receber pagamentos online. Conclua o cadastro Stripe nas configurações do restaurante.');
    }
    const bps = parsePlatformFeeBps();
    let applicationFeeAmount = Math.floor((amountCents * bps) / 10000);
    if (applicationFeeAmount >= amountCents) {
        applicationFeeAmount = 0;
    }
    return { destination: destRaw, applicationFeeAmount };
}
//# sourceMappingURL=stripeRestaurantConnect.js.map