import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import { HttpsError } from 'firebase-functions/v2/https';

export const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

export function getStripe(): Stripe {
  const secret = stripeSecretKey.value();
  if (!secret) {
    throw new HttpsError('failed-precondition', 'Stripe não configurado (secret ausente).');
  }
  return new Stripe(secret);
}
