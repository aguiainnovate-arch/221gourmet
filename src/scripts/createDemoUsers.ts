/**
 * Script para criar um usuário de cada tipo (Admin, Restaurante, Cliente Delivery).
 * O Admin já existe no código; este script cria Restaurante e Cliente no Firestore.
 *
 * Execução: npm run create:demo-users
 * Ou: npx tsx src/scripts/createDemoUsers.ts
 */

import bcrypt from 'bcryptjs';
import { getPlans } from '../services/planService';
import { getRestaurants, addRestaurant, updateRestaurant } from '../services/restaurantService';
import { getRestaurantPermissions, updateRestaurantPermissions } from '../services/permissionService';
import { saveDeliveryUser } from '../services/deliveryUserService';

// Credenciais de demonstração (também documentadas em CREDENCIAIS_DEMO.md)
const DEMO = {
  admin: {
    email: 'admin@gmail.com',
    password: '123456',
  },
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
};

async function ensureDemoRestaurant(): Promise<string | null> {
  const plans = await getPlans();
  const planId = plans[0]?.id;
  if (!planId) {
    console.warn('⚠️  Nenhum plano encontrado. Execute a inicialização de planos antes de criar o restaurante demo.');
    return null;
  }

  const restaurants = await getRestaurants();
  const existing = restaurants.find((r) => r.email.toLowerCase() === DEMO.restaurante.email.toLowerCase());

  const hashedPassword = await bcrypt.hash(DEMO.restaurante.password, 10);

  if (existing) {
    await updateRestaurant(existing.id, {
      password: hashedPassword,
      deliverySettings: { enabled: true, aiDescription: existing.deliverySettings?.aiDescription ?? '' },
    });
    // Garantir permissão de delivery para aparecer na página principal do cliente
    const perms = await getRestaurantPermissions(existing.id);
    await updateRestaurantPermissions(existing.id, { ...perms, delivery: true });
    console.log('✅ Restaurante demo já existia; senha e delivery atualizados.');
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
  console.log('✅ Restaurante demo criado:', restaurant.id);
  return restaurant.id;
}

async function ensureDemoDeliveryUser(): Promise<string> {
  const user = await saveDeliveryUser({
    email: DEMO.cliente.email,
    phone: DEMO.cliente.phone,
    name: DEMO.cliente.name,
    address: DEMO.cliente.address,
    defaultPaymentMethod: 'pix',
  });
  console.log('✅ Cliente delivery demo criado/atualizado:', user.id);
  return user.id;
}

export async function runCreateDemoUsers(): Promise<void> {
  console.log('\n📋 Criando usuários de demonstração...\n');

  // Admin: não cria nada, já está no código
  console.log('👤 Admin: já configurado no sistema (ver CREDENCIAIS_DEMO.md)\n');

  try {
    await ensureDemoRestaurant();
    await ensureDemoDeliveryUser();
    console.log('\n✅ Concluído. Consulte CREDENCIAIS_DEMO.md para logins e senhas.\n');
  } catch (error) {
    console.error('❌ Erro ao criar usuários demo:', error);
    throw error;
  }
}

runCreateDemoUsers().catch(() => process.exit(1));
