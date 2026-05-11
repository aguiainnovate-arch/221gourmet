/**
 * Stripe Connect — onboarding de restaurante (subconta Express).
 * Segredo Stripe apenas nas Cloud Functions.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

const onboardingFn = httpsCallable<
  { restaurantId: string; email: string; password: string },
  { url: string; stripeConnectAccountId: string }
>(functions, 'createRestaurantStripeConnectOnboardingLink');

const syncFn = httpsCallable<
  { restaurantId: string; email: string; password: string },
  {
    stripeConnectAccountId: string | null;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
    disabledReason: string | null;
    requirementsSummary: string | null;
  }
>(functions, 'syncRestaurantStripeConnectStatus');

export async function startRestaurantStripeConnectOnboarding(args: {
  restaurantId: string;
  email: string;
  password: string;
}): Promise<{ url: string; stripeConnectAccountId: string }> {
  const { data } = await onboardingFn(args);
  if (!data?.url) {
    throw new Error('Não foi possível obter o link de cadastro Stripe.');
  }
  return data;
}

export async function syncRestaurantStripeConnectFromStripe(args: {
  restaurantId: string;
  email: string;
  password: string;
}): Promise<{
  stripeConnectAccountId: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  disabledReason: string | null;
  requirementsSummary: string | null;
}> {
  const { data } = await syncFn(args);
  if (!data) {
    throw new Error('Resposta vazia ao sincronizar Stripe Connect.');
  }
  return data;
}
