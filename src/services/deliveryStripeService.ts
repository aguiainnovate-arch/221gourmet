/**
 * Integração Stripe para o checkout de delivery.
 * Secret key (sk_/rk_) fica apenas em Firebase Secret STRIPE_SECRET_KEY.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface CreateDeliveryPaymentIntentRequest {
  amountCents: number;
  currency?: string;
  metadata?: Record<string, string>;
  customerId?: string;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
  /** PIX instantâneo (Brasil) — PaymentIntent só com `pix`; confirmação no cliente com confirmPixPayment. */
  usePix?: boolean;
}

export interface CreateDeliveryPaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
  requiresAction: boolean;
}

const createPiFn = httpsCallable<
  CreateDeliveryPaymentIntentRequest,
  CreateDeliveryPaymentIntentResponse
>(functions, 'createDeliveryPaymentIntent');

const ensureCustomerFn = httpsCallable<
  {
    deliveryUserId: string;
    email?: string;
    name?: string;
    phone?: string;
    existingCustomerId?: string;
  },
  { customerId: string }
>(functions, 'ensureDeliveryStripeCustomer');

const createSetupIntentFn = httpsCallable<
  { customerId: string },
  { clientSecret: string }
>(functions, 'createDeliverySetupIntent');

const listCardsFn = httpsCallable<
  { customerId: string },
  { cards: SavedCard[] }
>(functions, 'listDeliverySavedCards');

const removeCardFn = httpsCallable<
  { paymentMethodId: string },
  { removed: boolean }
>(functions, 'removeDeliverySavedCard');

export async function createDeliveryPaymentIntent(
  payload: CreateDeliveryPaymentIntentRequest
): Promise<CreateDeliveryPaymentIntentResponse> {
  const { data } = await createPiFn(payload);
  if (!data?.clientSecret && data?.status !== 'succeeded') {
    throw new Error('Resposta inválida do servidor de pagamento.');
  }
  return data;
}

export async function ensureDeliveryStripeCustomer(args: {
  deliveryUserId: string;
  email?: string;
  name?: string;
  phone?: string;
  existingCustomerId?: string;
}): Promise<string> {
  const { data } = await ensureCustomerFn(args);
  if (!data?.customerId) throw new Error('Falha ao preparar cliente Stripe.');
  return data.customerId;
}

export async function createDeliverySetupIntent(customerId: string): Promise<string> {
  const { data } = await createSetupIntentFn({ customerId });
  if (!data?.clientSecret) throw new Error('Falha ao iniciar cadastro de cartão.');
  return data.clientSecret;
}

export async function listDeliverySavedCards(customerId: string): Promise<SavedCard[]> {
  const { data } = await listCardsFn({ customerId });
  return data?.cards ?? [];
}

export async function removeDeliverySavedCard(paymentMethodId: string): Promise<void> {
  await removeCardFn({ paymentMethodId });
}

/** Nome amigável da bandeira do cartão (pt-BR). */
export function brandLabel(brand: string): string {
  const map: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
    elo: 'Elo',
    hipercard: 'Hipercard',
  };
  return map[brand?.toLowerCase()] ?? (brand || 'Cartão');
}
