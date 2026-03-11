/**
 * Script para criar as 3 contas de demonstração no Firestore (via Firebase):
 * 1. Restaurante
 * 2. Cliente (usuário delivery)
 * 3. Motoboy (usuário delivery com perfil motoboy)
 *
 * Garante um plano padrão se não existir nenhum.
 * Execução: npm run create:demo-accounts
 * Ou: npx tsx src/scripts/createDemoAccounts.ts
 *
 * Requer .env com VITE_FIREBASE_* preenchido.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getPlans, addPlan } from '../services/planService';
import { getRestaurants, addRestaurant, updateRestaurant } from '../services/restaurantService';
import { getRestaurantPermissions, updateRestaurantPermissions } from '../services/permissionService';
import { saveDeliveryUser } from '../services/deliveryUserService';

const LOG_PREFIX = '[create-demo-accounts]';

const DEMO = {
  restaurante: {
    email: 'restaurante@demo.com',
    password: 'Demo@123',
    name: 'Restaurante Demo',
    domain: 'demo-restaurante',
    phone: '(11) 33333-3333',
    address: 'Rua Demo, 100 - Centro - São Paulo, SP',
  },
  cliente: {
    email: 'cliente@demo.com',
    phone: '(11) 99999-9999',
    name: 'Cliente Demo',
    address: 'Rua do Cliente, 123 - Bairro Demo - São Paulo, SP',
  },
  motoboy: {
    email: 'motoboy@demo.com',
    phone: '(11) 98888-8888',
    name: 'Motoboy Demo',
    address: 'Rua do Motoboy, 456 - São Paulo, SP',
  },
};

async function ensurePlan(): Promise<string> {
  console.log(`${LOG_PREFIX} Verificando planos...`);
  const plans = await getPlans();
  if (plans.length > 0) {
    console.log(`${LOG_PREFIX} Plano existente encontrado: ${plans[0].name} (${plans[0].id})`);
    return plans[0].id;
  }
  console.log(`${LOG_PREFIX} Nenhum plano encontrado. Criando plano padrão.`);
  const plan = await addPlan({
    name: 'Plano Básico',
    description: 'Plano padrão para demonstração',
    price: 0,
    period: 'monthly',
    features: ['Cardápio digital', 'Delivery', 'Mesas'],
    maxTables: 50,
    maxProducts: 200,
    supportLevel: 'basic',
    active: true,
  });
  console.log(`${LOG_PREFIX} Plano criado: ${plan.id}`);
  return plan.id;
}

async function ensureRestaurant(planId: string): Promise<string> {
  console.log(`${LOG_PREFIX} Verificando restaurante demo (${DEMO.restaurante.email})...`);
  const restaurants = await getRestaurants();
  const existing = restaurants.find((r) => r.email.toLowerCase() === DEMO.restaurante.email.toLowerCase());
  const hashedPassword = await bcrypt.hash(DEMO.restaurante.password, 10);

  if (existing) {
    await updateRestaurant(existing.id, {
      password: hashedPassword,
      deliverySettings: { enabled: true, aiDescription: existing.deliverySettings?.aiDescription ?? '' },
    });
    const perms = await getRestaurantPermissions(existing.id);
    await updateRestaurantPermissions(existing.id, { ...perms, delivery: true });
    console.log(`${LOG_PREFIX} Restaurante demo atualizado: ${existing.id}`);
    return existing.id;
  }

  const restaurant = await addRestaurant({
    name: DEMO.restaurante.name,
    domain: DEMO.restaurante.domain,
    email: DEMO.restaurante.email,
    phone: DEMO.restaurante.phone,
    address: DEMO.restaurante.address,
    password: hashedPassword,
    planId,
    deliverySettings: { enabled: true, aiDescription: '' },
  });
  const perms = await getRestaurantPermissions(restaurant.id);
  await updateRestaurantPermissions(restaurant.id, { ...perms, delivery: true });
  console.log(`${LOG_PREFIX} Restaurante demo criado: ${restaurant.id}`);
  return restaurant.id;
}

async function ensureDeliveryUser(
  label: string,
  data: { email: string; phone: string; name: string; address: string }
): Promise<string> {
  console.log(`${LOG_PREFIX} Verificando ${label} (${data.email})...`);
  const user = await saveDeliveryUser({
    ...data,
    defaultPaymentMethod: 'pix',
  });
  console.log(`${LOG_PREFIX} ${label} criado/atualizado: ${user.id}`);
  return user.id;
}

export async function runCreateDemoAccounts(): Promise<void> {
  console.log(`\n${LOG_PREFIX} ========== Início ==========\n`);

  if (!process.env.VITE_FIREBASE_PROJECT_ID) {
    console.error(`${LOG_PREFIX} ERRO: Variáveis Firebase não encontradas. Defina no .env: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID`);
    throw new Error('Configuração Firebase ausente');
  }
  console.log(`${LOG_PREFIX} Projeto Firebase: ${process.env.VITE_FIREBASE_PROJECT_ID}\n`);

  try {
    const planId = await ensurePlan();
    const restaurantId = await ensureRestaurant(planId);
    const clienteId = await ensureDeliveryUser('Cliente (usuário delivery)', DEMO.cliente);
    const motoboyId = await ensureDeliveryUser('Motoboy', DEMO.motoboy);

    console.log(`\n${LOG_PREFIX} ========== Resumo ==========`);
    console.log(`${LOG_PREFIX} Plano ID:      ${planId}`);
    console.log(`${LOG_PREFIX} Restaurante ID: ${restaurantId} (${DEMO.restaurante.email} / ${DEMO.restaurante.password})`);
    console.log(`${LOG_PREFIX} Cliente ID:     ${clienteId} (${DEMO.cliente.email} ou ${DEMO.cliente.phone})`);
    console.log(`${LOG_PREFIX} Motoboy ID:     ${motoboyId} (${DEMO.motoboy.email} ou ${DEMO.motoboy.phone})`);
    console.log(`${LOG_PREFIX} ========== Fim (sucesso) ==========\n`);
  } catch (error) {
    console.error(`\n${LOG_PREFIX} ERRO:`, error);
    if (error instanceof Error) {
      console.error(`${LOG_PREFIX} Mensagem: ${error.message}`);
      console.error(`${LOG_PREFIX} Stack: ${error.stack}`);
    }
    throw error;
  }
}

runCreateDemoAccounts().catch(() => process.exit(1));
