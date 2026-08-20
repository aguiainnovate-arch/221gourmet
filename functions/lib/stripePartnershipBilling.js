"use strict";
/**
 * Stripe Billing — assinatura mensal de parceria Bora Comer!.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPartnershipSubscriptionCheckout = exports.createPartnershipSubscriptionCheckout = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("./firebaseAdmin");
const stripeClient_1 = require("./stripeClient");
const stripeUtils_1 = require("./stripeUtils");
const stripeRestaurantConnect_1 = require("./stripeRestaurantConnect");
const MONTHLY_FEE_CENTS = 8990;
const WAIVER_THRESHOLD = 1500;
const PLAN_META = {
    store_delivery: {
        label: 'Delivery com entrega pela loja',
        platformFeePercent: 14.99,
    },
    platform_delivery: {
        label: 'Delivery + entrega Bora Comer!',
        platformFeePercent: 19.99,
    },
};
exports.createPartnershipSubscriptionCheckout = (0, https_1.onCall)({
    secrets: [stripeClient_1.stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
}, async (request) => {
    var _a;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const restaurantId = typeof raw.restaurantId === 'string' ? raw.restaurantId.trim() : '';
    const deliveryMode = raw.deliveryMode;
    if (!restaurantId) {
        throw new https_1.HttpsError('invalid-argument', 'Informe restaurantId.');
    }
    if (deliveryMode !== 'store_delivery' && deliveryMode !== 'platform_delivery') {
        throw new https_1.HttpsError('invalid-argument', 'Modo de entrega inválido.');
    }
    const plan = PLAN_META[deliveryMode];
    const db = firebaseAdmin_1.admin.firestore();
    const ref = db.collection('restaurants').doc(restaurantId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Restaurante não encontrado.');
    }
    const restaurant = snap.data();
    const email = typeof restaurant.email === 'string' && restaurant.email.includes('@')
        ? restaurant.email.trim()
        : undefined;
    const name = typeof restaurant.name === 'string' ? restaurant.name.trim().slice(0, 120) : 'Restaurante';
    const stripe = (0, stripeClient_1.getStripe)();
    const origin = (0, stripeRestaurantConnect_1.connectAppOrigin)(stripeRestaurantConnect_1.publicAppUrl.value());
    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: email,
            client_reference_id: restaurantId,
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: 'brl',
                        unit_amount: MONTHLY_FEE_CENTS,
                        recurring: { interval: 'month' },
                        product_data: {
                            name: `Bora Comer! — ${plan.label}`,
                            description: `Mensalidade de parceria. Taxa por pedido: ${plan.platformFeePercent}%. Isenta até R$ ${WAIVER_THRESHOLD.toFixed(2)} de faturamento mensal na plataforma.`,
                        },
                    },
                },
            ],
            metadata: {
                firestoreRestaurantId: restaurantId.slice(0, 500),
                deliveryMode,
                platformFeePercent: String(plan.platformFeePercent),
                purpose: 'partnership_subscription',
            },
            subscription_data: {
                metadata: {
                    firestoreRestaurantId: restaurantId.slice(0, 500),
                    deliveryMode,
                    platformFeePercent: String(plan.platformFeePercent),
                },
            },
            success_url: `${origin}/planos?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/planos?checkout=cancel`,
        });
        if (!session.url) {
            throw new https_1.HttpsError('internal', 'Não foi possível criar a sessão de pagamento.');
        }
        await ref.update({
            'partnershipSubscription.deliveryMode': deliveryMode,
            'partnershipSubscription.platformFeePercent': plan.platformFeePercent,
            'partnershipSubscription.monthlyFee': MONTHLY_FEE_CENTS / 100,
            'partnershipSubscription.monthlyFeeWaiverThreshold': WAIVER_THRESHOLD,
            'partnershipSubscription.updatedAt': firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { url: session.url, sessionId: session.id };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw (0, stripeUtils_1.translateStripeError)(err, 'createPartnershipSubscriptionCheckout');
    }
});
exports.confirmPartnershipSubscriptionCheckout = (0, https_1.onCall)({
    secrets: [stripeClient_1.stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
}, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const raw = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId.trim() : '';
    if (!sessionId.startsWith('cs_')) {
        throw new https_1.HttpsError('invalid-argument', 'sessionId inválido.');
    }
    const stripe = (0, stripeClient_1.getStripe)();
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (((_b = session.metadata) === null || _b === void 0 ? void 0 : _b.purpose) !== 'partnership_subscription') {
            throw new https_1.HttpsError('failed-precondition', 'Sessão não é de assinatura de parceria.');
        }
        const restaurantId = ((_c = session.metadata) === null || _c === void 0 ? void 0 : _c.firestoreRestaurantId) ||
            (typeof session.client_reference_id === 'string' ? session.client_reference_id : '');
        if (!restaurantId) {
            throw new https_1.HttpsError('failed-precondition', 'Restaurante não identificado na sessão.');
        }
        if (session.status !== 'complete' && session.payment_status !== 'paid') {
            throw new https_1.HttpsError('failed-precondition', 'Pagamento ainda não confirmado.');
        }
        const deliveryMode = (((_d = session.metadata) === null || _d === void 0 ? void 0 : _d.deliveryMode) || 'store_delivery');
        const plan = (_e = PLAN_META[deliveryMode]) !== null && _e !== void 0 ? _e : PLAN_META.store_delivery;
        const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription && typeof session.subscription === 'object'
                ? session.subscription.id
                : undefined;
        const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer && typeof session.customer === 'object'
                ? session.customer.id
                : undefined;
        const db = firebaseAdmin_1.admin.firestore();
        const ref = db.collection('restaurants').doc(restaurantId);
        const snap = await ref.get();
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Restaurante não encontrado.');
        }
        const existing = (((_f = snap.data()) === null || _f === void 0 ? void 0 : _f.partnershipSubscription) || {});
        await ref.update({
            partnershipSubscription: {
                status: 'active',
                trialStartedAt: (_g = existing.trialStartedAt) !== null && _g !== void 0 ? _g : firestore_1.FieldValue.serverTimestamp(),
                trialEndsAt: (_h = existing.trialEndsAt) !== null && _h !== void 0 ? _h : firestore_1.FieldValue.serverTimestamp(),
                deliveryMode,
                platformFeePercent: plan.platformFeePercent,
                monthlyFee: MONTHLY_FEE_CENTS / 100,
                monthlyFeeWaiverThreshold: WAIVER_THRESHOLD,
                stripeCustomerId: (_j = customerId !== null && customerId !== void 0 ? customerId : existing.stripeCustomerId) !== null && _j !== void 0 ? _j : null,
                stripeSubscriptionId: (_k = subscriptionId !== null && subscriptionId !== void 0 ? subscriptionId : existing.stripeSubscriptionId) !== null && _k !== void 0 ? _k : null,
                currentPeriodEnd: null,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { ok: true, restaurantId, status: 'active' };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw (0, stripeUtils_1.translateStripeError)(err, 'confirmPartnershipSubscriptionCheckout');
    }
});
//# sourceMappingURL=stripePartnershipBilling.js.map