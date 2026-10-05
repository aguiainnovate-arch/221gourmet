"use strict";
/**
 * Stripe Checkout — pagamento único do Cardápio digital (R$ 297).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmDigitalMenuCheckout = exports.createDigitalMenuCheckout = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("./firebaseAdmin");
const stripeClient_1 = require("./stripeClient");
const stripeUtils_1 = require("./stripeUtils");
const stripeRestaurantConnect_1 = require("./stripeRestaurantConnect");
const DIGITAL_MENU_PRICE_CENTS = 29700;
exports.createDigitalMenuCheckout = (0, https_1.onCall)({
    secrets: [stripeClient_1.stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
}, async (request) => {
    var _a, _b;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const restaurantId = typeof raw.restaurantId === 'string' ? raw.restaurantId.trim() : '';
    if (!restaurantId) {
        throw new https_1.HttpsError('invalid-argument', 'Informe restaurantId.');
    }
    const db = firebaseAdmin_1.admin.firestore();
    const ref = db.collection('restaurants').doc(restaurantId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Restaurante não encontrado.');
    }
    const restaurant = snap.data();
    if (((_b = restaurant.digitalMenu) === null || _b === void 0 ? void 0 : _b.status) === 'active') {
        throw new https_1.HttpsError('failed-precondition', 'Este restaurante já possui o cardápio digital.');
    }
    const email = typeof restaurant.email === 'string' && restaurant.email.includes('@')
        ? restaurant.email.trim()
        : undefined;
    const stripe = (0, stripeClient_1.getStripe)();
    const origin = (0, stripeRestaurantConnect_1.connectAppOrigin)(stripeRestaurantConnect_1.publicAppUrl.value());
    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: email,
            client_reference_id: restaurantId,
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: 'brl',
                        unit_amount: DIGITAL_MENU_PRICE_CENTS,
                        product_data: {
                            name: 'Bora Comer! — Cardápio digital',
                            description: 'QR Code de mesas, cardápio digital no celular e IA para WhatsApp. Pagamento único.',
                        },
                    },
                },
            ],
            metadata: {
                firestoreRestaurantId: restaurantId.slice(0, 500),
                purpose: 'digital_menu',
            },
            success_url: `${origin}/planos?digital_menu=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/planos?digital_menu=cancel`,
        });
        if (!session.url) {
            throw new https_1.HttpsError('internal', 'Não foi possível criar a sessão de pagamento.');
        }
        return { url: session.url, sessionId: session.id };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw (0, stripeUtils_1.translateStripeError)(err, 'createDigitalMenuCheckout');
    }
});
exports.confirmDigitalMenuCheckout = (0, https_1.onCall)({
    secrets: [stripeClient_1.stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
}, async (request) => {
    var _a, _b, _c;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId.trim() : '';
    if (!sessionId.startsWith('cs_')) {
        throw new https_1.HttpsError('invalid-argument', 'sessionId inválido.');
    }
    const stripe = (0, stripeClient_1.getStripe)();
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (((_b = session.metadata) === null || _b === void 0 ? void 0 : _b.purpose) !== 'digital_menu') {
            throw new https_1.HttpsError('failed-precondition', 'Sessão não é de cardápio digital.');
        }
        const restaurantId = ((_c = session.metadata) === null || _c === void 0 ? void 0 : _c.firestoreRestaurantId) ||
            (typeof session.client_reference_id === 'string' ? session.client_reference_id : '');
        if (!restaurantId) {
            throw new https_1.HttpsError('failed-precondition', 'Restaurante não identificado na sessão.');
        }
        if (session.status !== 'complete' && session.payment_status !== 'paid') {
            throw new https_1.HttpsError('failed-precondition', 'Pagamento ainda não confirmado.');
        }
        const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent && typeof session.payment_intent === 'object'
                ? session.payment_intent.id
                : undefined;
        const ref = firebaseAdmin_1.admin.firestore().collection('restaurants').doc(restaurantId);
        const snap = await ref.get();
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Restaurante não encontrado.');
        }
        await ref.update({
            digitalMenu: {
                status: 'active',
                purchasedAt: firestore_1.FieldValue.serverTimestamp(),
                stripeCheckoutSessionId: sessionId,
                stripePaymentIntentId: paymentIntentId !== null && paymentIntentId !== void 0 ? paymentIntentId : null,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { ok: true, restaurantId, status: 'active' };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw (0, stripeUtils_1.translateStripeError)(err, 'confirmDigitalMenuCheckout');
    }
});
//# sourceMappingURL=stripeDigitalMenuBilling.js.map