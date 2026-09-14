/**
 * Stripe Checkout — pagamento único do Cardápio digital (R$ 297).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';

import { admin } from './firebaseAdmin';
import { getStripe, stripeSecretKey } from './stripeClient';
import { translateStripeError } from './stripeUtils';
import { connectAppOrigin, publicAppUrl } from './stripeRestaurantConnect';

const DIGITAL_MENU_PRICE_CENTS = 29700;

export const createDigitalMenuCheckout = onCall(
  {
    secrets: [stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
  },
  async (request): Promise<{ url: string; sessionId: string }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const restaurantId = typeof raw.restaurantId === 'string' ? raw.restaurantId.trim() : '';

    if (!restaurantId) {
      throw new HttpsError('invalid-argument', 'Informe restaurantId.');
    }

    const db = admin.firestore();
    const ref = db.collection('restaurants').doc(restaurantId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Restaurante não encontrado.');
    }

    const restaurant = snap.data()!;
    if (restaurant.digitalMenu?.status === 'active') {
      throw new HttpsError('failed-precondition', 'Este restaurante já possui o cardápio digital.');
    }

    const email =
      typeof restaurant.email === 'string' && restaurant.email.includes('@')
        ? restaurant.email.trim()
        : undefined;

    const stripe = getStripe();
    const origin = connectAppOrigin(publicAppUrl.value());

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
                description:
                  'QR Code de mesas, cardápio digital no celular e IA para WhatsApp. Pagamento único.',
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
        throw new HttpsError('internal', 'Não foi possível criar a sessão de pagamento.');
      }

      return { url: session.url, sessionId: session.id };
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;
      throw translateStripeError(err, 'createDigitalMenuCheckout');
    }
  }
);

export const confirmDigitalMenuCheckout = onCall(
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
      if (session.metadata?.purpose !== 'digital_menu') {
        throw new HttpsError('failed-precondition', 'Sessão não é de cardápio digital.');
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

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent && typeof session.payment_intent === 'object'
            ? (session.payment_intent as { id?: string }).id
            : undefined;

      const ref = admin.firestore().collection('restaurants').doc(restaurantId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Restaurante não encontrado.');
      }

      await ref.update({
        digitalMenu: {
          status: 'active',
          purchasedAt: FieldValue.serverTimestamp(),
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId: paymentIntentId ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { ok: true, restaurantId, status: 'active' };
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;
      throw translateStripeError(err, 'confirmDigitalMenuCheckout');
    }
  }
);
