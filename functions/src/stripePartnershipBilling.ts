/**
 * Stripe Billing — assinatura mensal de parceria Bora Comer!.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';

import { admin } from './firebaseAdmin';
import { getStripe, stripeSecretKey } from './stripeClient';
import { translateStripeError } from './stripeUtils';
import { connectAppOrigin, publicAppUrl } from './stripeRestaurantConnect';

const MONTHLY_FEE_CENTS = 8990;
const WAIVER_THRESHOLD = 1500;

type DeliveryMode = 'store_delivery' | 'platform_delivery';

const PLAN_META: Record<
  DeliveryMode,
  { label: string; platformFeePercent: number }
> = {
  store_delivery: {
    label: 'Delivery com entrega pela loja',
    platformFeePercent: 14.99,
  },
  platform_delivery: {
    label: 'Delivery + entrega Bora Comer!',
    platformFeePercent: 19.99,
  },
};

export const createPartnershipSubscriptionCheckout = onCall(
  {
    secrets: [stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
  },
  async (request): Promise<{ url: string; sessionId: string }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const restaurantId = typeof raw.restaurantId === 'string' ? raw.restaurantId.trim() : '';
    const deliveryMode = raw.deliveryMode as DeliveryMode;

    if (!restaurantId) {
      throw new HttpsError('invalid-argument', 'Informe restaurantId.');
    }
    if (deliveryMode !== 'store_delivery' && deliveryMode !== 'platform_delivery') {
      throw new HttpsError('invalid-argument', 'Modo de entrega inválido.');
    }

    const plan = PLAN_META[deliveryMode];
    const db = admin.firestore();
    const ref = db.collection('restaurants').doc(restaurantId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Restaurante não encontrado.');
    }

    const restaurant = snap.data()!;
    const email =
      typeof restaurant.email === 'string' && restaurant.email.includes('@')
        ? restaurant.email.trim()
        : undefined;
    const name =
      typeof restaurant.name === 'string' ? restaurant.name.trim().slice(0, 120) : 'Restaurante';

    const stripe = getStripe();
    const origin = connectAppOrigin(publicAppUrl.value());

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
        throw new HttpsError('internal', 'Não foi possível criar a sessão de pagamento.');
      }

      await ref.update({
        'partnershipSubscription.deliveryMode': deliveryMode,
        'partnershipSubscription.platformFeePercent': plan.platformFeePercent,
        'partnershipSubscription.monthlyFee': MONTHLY_FEE_CENTS / 100,
        'partnershipSubscription.monthlyFeeWaiverThreshold': WAIVER_THRESHOLD,
        'partnershipSubscription.updatedAt': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { url: session.url, sessionId: session.id };
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;
      throw translateStripeError(err, 'createPartnershipSubscriptionCheckout');
    }
  }
);

export const confirmPartnershipSubscriptionCheckout = onCall(
  {
    secrets: [stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
  },
  async (
    request
  ): Promise<{
    ok: boolean;
    restaurantId: string;
    status: string;
  }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId.trim() : '';
    if (!sessionId.startsWith('cs_')) {
      throw new HttpsError('invalid-argument', 'sessionId inválido.');
    }

    const stripe = getStripe();
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.purpose !== 'partnership_subscription') {
        throw new HttpsError('failed-precondition', 'Sessão não é de assinatura de parceria.');
      }

      const restaurantId =
        session.metadata?.firestoreRestaurantId ||
        (typeof session.client_reference_id === 'string' ? session.client_reference_id : '');

      if (!restaurantId) {
        throw new HttpsError('failed-precondition', 'Restaurante não identificado na sessão.');
      }

      if (session.status !== 'complete' && session.payment_status !== 'paid') {
        throw new HttpsError('failed-precondition', 'Pagamento ainda não confirmado.');
      }

      const deliveryMode = (session.metadata?.deliveryMode || 'store_delivery') as DeliveryMode;
      const plan = PLAN_META[deliveryMode] ?? PLAN_META.store_delivery;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription && typeof session.subscription === 'object'
            ? (session.subscription as { id?: string }).id
            : undefined;
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer && typeof session.customer === 'object'
            ? (session.customer as { id?: string }).id
            : undefined;

      const db = admin.firestore();
      const ref = db.collection('restaurants').doc(restaurantId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Restaurante não encontrado.');
      }

      const existing = (snap.data()?.partnershipSubscription || {}) as Record<string, unknown>;

      await ref.update({
        partnershipSubscription: {
          status: 'active',
          trialStartedAt: existing.trialStartedAt ?? FieldValue.serverTimestamp(),
          trialEndsAt: existing.trialEndsAt ?? FieldValue.serverTimestamp(),
          deliveryMode,
          platformFeePercent: plan.platformFeePercent,
          monthlyFee: MONTHLY_FEE_CENTS / 100,
          monthlyFeeWaiverThreshold: WAIVER_THRESHOLD,
          stripeCustomerId: customerId ?? existing.stripeCustomerId ?? null,
          stripeSubscriptionId: subscriptionId ?? existing.stripeSubscriptionId ?? null,
          currentPeriodEnd: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { ok: true, restaurantId, status: 'active' };
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;
      throw translateStripeError(err, 'confirmPartnershipSubscriptionCheckout');
    }
  }
);
