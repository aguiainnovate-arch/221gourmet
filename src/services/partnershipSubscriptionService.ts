import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import type { PartnershipDeliveryMode } from '../types/partnership';
import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
  PARTNERSHIP_PLANS,
  createTrialPartnershipSubscription,
} from '../types/partnership';
import { getRestaurantById, updateRestaurant } from './restaurantService';

const createCheckoutFn = httpsCallable<
  { restaurantId: string; deliveryMode: PartnershipDeliveryMode },
  { url: string; sessionId: string }
>(functions, 'createPartnershipSubscriptionCheckout');

const confirmCheckoutFn = httpsCallable<
  { sessionId: string },
  { ok: boolean; restaurantId: string; status: string }
>(functions, 'confirmPartnershipSubscriptionCheckout');

export async function startPartnershipCheckout(args: {
  restaurantId: string;
  deliveryMode: PartnershipDeliveryMode;
}): Promise<{ url: string; sessionId: string }> {
  const { data } = await createCheckoutFn(args);
  if (!data?.url) {
    throw new Error('Não foi possível iniciar o pagamento da assinatura.');
  }
  return data;
}

export async function confirmPartnershipCheckout(sessionId: string): Promise<{
  ok: boolean;
  restaurantId: string;
  status: string;
}> {
  const { data } = await confirmCheckoutFn({ sessionId });
  return data;
}

/**
 * Ativa assinatura localmente (útil em desenvolvimento / demo sem Stripe).
 * Em produção o caminho correto é Checkout + confirmPartnershipCheckout.
 */
export async function activatePartnershipLocally(args: {
  restaurantId: string;
  deliveryMode: PartnershipDeliveryMode;
}): Promise<void> {
  const restaurant = await getRestaurantById(args.restaurantId);
  if (!restaurant) {
    throw new Error('Restaurante não encontrado.');
  }

  const plan = PARTNERSHIP_PLANS[args.deliveryMode];
  const base = restaurant.partnershipSubscription ?? createTrialPartnershipSubscription();

  await updateRestaurant(args.restaurantId, {
    partnershipSubscription: {
      ...base,
      status: 'active',
      deliveryMode: args.deliveryMode,
      platformFeePercent: plan.platformFeePercent,
      monthlyFee: PARTNERSHIP_MONTHLY_FEE,
      monthlyFeeWaiverThreshold: PARTNERSHIP_FEE_WAIVER_THRESHOLD,
      updatedAt: new Date(),
    },
  });
}

/** Força trial expirado (demo de gate). */
export async function expirePartnershipTrialLocally(restaurantId: string): Promise<void> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurante não encontrado.');
  }

  const now = new Date();
  const started = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const ended = new Date(now.getTime() - 60 * 60 * 1000);
  const base = restaurant.partnershipSubscription ?? createTrialPartnershipSubscription(started);

  await updateRestaurant(restaurantId, {
    partnershipSubscription: {
      ...base,
      status: 'expired',
      trialStartedAt: started,
      trialEndsAt: ended,
      updatedAt: now,
    },
  });
}
