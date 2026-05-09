import Stripe from 'stripe';
import { HttpsError } from 'firebase-functions/v2/https';

export function sanitizeMetadata(raw: unknown): Record<string, string> {
  const metadata: Record<string, string> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof k === 'string' && k.length <= 40 && typeof v === 'string' && v.length <= 500) {
        metadata[k] = v.slice(0, 500);
      }
    }
  }
  return metadata;
}

export function translateStripeError(err: unknown, ctx: string): HttpsError {
  if (err instanceof Stripe.errors.StripeError) {
    console.error(`[${ctx}] Stripe`, err.type, err.message);
    const msg = `Stripe: ${err.message}`.slice(0, 240);
    return new HttpsError('failed-precondition', msg);
  }
  console.error(`[${ctx}]`, err);
  return new HttpsError('internal', 'Erro inesperado com o Stripe.');
}
