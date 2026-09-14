import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { updateRestaurant } from './restaurantService';

const createCheckoutFn = httpsCallable<{ restaurantId: string }, { url: string; sessionId: string }>(
  functions,
  'createDigitalMenuCheckout'
);

const confirmCheckoutFn = httpsCallable<
  { sessionId: string },
  { ok: boolean; restaurantId: string; status: string }
>(functions, 'confirmDigitalMenuCheckout');

export async function startDigitalMenuCheckout(restaurantId: string): Promise<{
  url: string;
  sessionId: string;
}> {
  const { data } = await createCheckoutFn({ restaurantId });
  if (!data?.url) {
    throw new Error('Não foi possível iniciar o pagamento do cardápio digital.');
  }
  return data;
}

export async function confirmDigitalMenuCheckout(sessionId: string): Promise<{
  ok: boolean;
  restaurantId: string;
  status: string;
}> {
  const { data } = await confirmCheckoutFn({ sessionId });
  return data;
}

/** Ativa localmente (dev / fallback sem Stripe). */
export async function activateDigitalMenuLocally(restaurantId: string): Promise<void> {
  const now = new Date();
  await updateRestaurant(restaurantId, {
    digitalMenu: {
      status: 'active',
      purchasedAt: now,
      updatedAt: now,
    },
  });
}
