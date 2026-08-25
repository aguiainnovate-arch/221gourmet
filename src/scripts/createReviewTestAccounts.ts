/**
 * Contas para o vídeo de exclusão da App Review.
 * Execução: npx tsx src/scripts/createReviewTestAccounts.ts
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getPlans, addPlan } from '../services/planService';
import { getRestaurants, addRestaurant, updateRestaurant } from '../services/restaurantService';
import { getRestaurantPermissions, updateRestaurantPermissions } from '../services/permissionService';
import { saveDeliveryUser } from '../services/deliveryUserService';
import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
} from '../types/partnership';

const LOG = '[review-test-accounts]';
const PASSWORD = '123456';

const CLIENTE = {
  email: 'cliente@teste.com',
  phone: '(11) 91111-1111',
  name: 'Cliente Teste',
  address: 'Rua Teste, 1 - Centro',
};

const RESTAURANTE = {
  email: 'restaurante@teste.com',
  password: PASSWORD,
  name: 'Restaurante Teste',
  domain: 'teste-apple',
  phone: '(11) 32222-2222',
  address: 'Av Teste, 10 - Centro',
};

async function ensurePlan(): Promise<string> {
  const plans = await getPlans();
  if (plans.length > 0) return plans[0].id;
  const plan = await addPlan({
    name: 'Plano Básico',
    description: 'Plano padrão',
    price: 0,
    period: 'monthly',
    features: ['Cardápio digital', 'Delivery', 'Mesas'],
    maxTables: 50,
    maxProducts: 200,
    supportLevel: 'basic',
    active: true,
  });
  return plan.id;
}

async function ensureRestaurant(planId: string): Promise<string> {
  const restaurants = await getRestaurants();
  const existing = restaurants.find(
    (r) => r.email.toLowerCase() === RESTAURANTE.email.toLowerCase()
  );
  const hashedPassword = await bcrypt.hash(RESTAURANTE.password, 10);
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 2);
  const partnershipSubscription = {
    status: 'active' as const,
    trialStartedAt: new Date(),
    trialEndsAt: periodEnd,
    deliveryMode: 'store_delivery' as const,
    platformFeePercent: 14.99,
    monthlyFee: PARTNERSHIP_MONTHLY_FEE,
    monthlyFeeWaiverThreshold: PARTNERSHIP_FEE_WAIVER_THRESHOLD,
    currentPeriodEnd: periodEnd,
    updatedAt: new Date(),
  };

  if (existing) {
    await updateRestaurant(existing.id, {
      password: hashedPassword,
      partnershipSubscription,
      deliverySettings: { enabled: true, aiDescription: existing.deliverySettings?.aiDescription ?? '' },
    });
    const perms = await getRestaurantPermissions(existing.id);
    await updateRestaurantPermissions(existing.id, { ...perms, delivery: true });
    console.log(`${LOG} Restaurante atualizado: ${existing.id}`);
    return existing.id;
  }

  const restaurant = await addRestaurant({
    name: RESTAURANTE.name,
    domain: RESTAURANTE.domain,
    email: RESTAURANTE.email,
    phone: RESTAURANTE.phone,
    address: RESTAURANTE.address,
    password: hashedPassword,
    planId,
    partnershipSubscription,
    deliverySettings: { enabled: true, aiDescription: '' },
  });
  const perms = await getRestaurantPermissions(restaurant.id);
  await updateRestaurantPermissions(restaurant.id, { ...perms, delivery: true });
  console.log(`${LOG} Restaurante criado: ${restaurant.id}`);
  return restaurant.id;
}

async function main(): Promise<void> {
  if (!process.env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error('Firebase ausente no .env');
  }
  console.log(`${LOG} Projeto: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
  const planId = await ensurePlan();
  const restaurantId = await ensureRestaurant(planId);
  const cliente = await saveDeliveryUser({
    ...CLIENTE,
    defaultPaymentMethod: 'pix',
    password: PASSWORD,
  });
  console.log(`\n${LOG} Pronto para o vídeo de exclusão:`);
  console.log(`${LOG} Cliente:     ${CLIENTE.email} / ${PASSWORD}  (id ${cliente.id})`);
  console.log(`${LOG} Restaurante: ${RESTAURANTE.email} / ${PASSWORD}  (id ${restaurantId})`);
}

main().catch((err) => {
  console.error(LOG, err);
  process.exit(1);
});
