/**
 * Script para popular o Firebase com 5 restaurantes fictícios, cada um com:
 * - Conta de restaurante (documento em Firestore)
 * - Pelo menos 3 categorias de menu
 * - Mínimo 3 itens por categoria (nome, descrição, preço, categoria)
 *
 * Credenciais são salvas em credentials.json e referenciadas em CREDENCIAIS_DEMO.md.
 *
 * Execução: npm run seed:demo-restaurants
 * Ou: npx tsx src/scripts/seedDemoRestaurants.ts
 *
 * Requer .env com VITE_FIREBASE_* preenchido.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';
import { getPlans, addPlan } from '../services/planService';
import { addRestaurant } from '../services/restaurantService';
import { getRestaurantPermissions, updateRestaurantPermissions } from '../services/permissionService';
import { addCategory } from '../services/categoryService';
import { addProduct } from '../services/productService';

const LOG = '[seed-demo-restaurants]';

// --- Definição dos 5 restaurantes fictícios ---

interface MenuCategory {
  name: string;
  items: Array<{ name: string; description: string; price: number }>;
}

interface RestaurantSeed {
  name: string;
  domain: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  categories: MenuCategory[];
}

const RESTAURANTS_SEED: RestaurantSeed[] = [
  {
    name: 'Cantina Bella Italia',
    domain: 'bella-italia-demo',
    email: 'restaurante1@demo.com',
    password: 'Demo@101',
    phone: '(11) 3111-1111',
    address: 'Rua das Flores, 100 - Centro - São Paulo, SP',
    categories: [
      {
        name: 'Pratos Principais',
        items: [
          { name: 'Risoto de Cogumelos', description: 'Arroz arbóreo cremoso com cogumelos frescos e parmesão.', price: 52.9 },
          { name: 'Osso Buco', description: 'Vitelo guisado com legumes e gremolata, servido com polenta.', price: 68.0 },
          { name: 'Saltimbocca alla Romana', description: 'Vitela com presunto e sálvia em molho de vinho branco.', price: 58.5 },
        ],
      },
      {
        name: 'Massas',
        items: [
          { name: 'Spaghetti alla Carbonara', description: 'Bacon, gema, pecorino e pimenta preta.', price: 42.0 },
          { name: 'Penne ao Molho Pesto', description: 'Pesto de manjericão, pinoli e parmesão.', price: 38.5 },
          { name: 'Ravioli de Queijo com Nozes', description: 'Ravioli recheado com ricota e molho de manteiga e sálvia.', price: 45.0 },
        ],
      },
      {
        name: 'Sobremesas',
        items: [
          { name: 'Tiramisù', description: 'Clássico italiano com mascarpone e café.', price: 28.0 },
          { name: 'Panna Cotta', description: 'Creme de baunilha com calda de frutas vermelhas.', price: 24.5 },
          { name: 'Cannoli Siciliano', description: 'Massa crocante recheada com ricota e chocolate.', price: 22.0 },
        ],
      },
    ],
  },
  {
    name: 'Sabor do Nordeste',
    domain: 'sabor-nordeste-demo',
    email: 'restaurante2@demo.com',
    password: 'Demo@102',
    phone: '(11) 3222-2222',
    address: 'Av. Nordeste, 200 - Recife, PE',
    categories: [
      {
        name: 'Pratos Típicos',
        items: [
          { name: 'Baião de Dois', description: 'Arroz com feijão-de-corda, queijo coalho e temperos nordestinos.', price: 35.0 },
          { name: 'Carne-de-Sol com Macaxeira', description: 'Carne-de-sol frita, macaxeira e vinagrete.', price: 48.0 },
          { name: 'Moqueca de Camarão', description: 'Camarões em moqueca de dendê e leite de coco.', price: 62.0 },
        ],
      },
      {
        name: 'Bebidas',
        items: [
          { name: 'Caldo de Cana', description: 'Suco fresco de cana-de-açúcar gelado.', price: 8.0 },
          { name: 'Cajuína', description: 'Bebida tradicional do caju sem álcool.', price: 10.0 },
          { name: 'Água de Coco Verde', description: 'Coco fresco gelado.', price: 12.0 },
        ],
      },
      {
        name: 'Sobremesas',
        items: [
          { name: 'Cuscuz Doce', description: 'Cuscuz de milho com leite condensado e coco.', price: 18.0 },
          { name: 'Bolo de Rolo', description: 'Fino bolo de goiabada e queijo.', price: 14.0 },
          { name: 'Cartola', description: 'Banana frita, queijo e canela com mel.', price: 22.0 },
        ],
      },
    ],
  },
  {
    name: 'Sushi Zen',
    domain: 'sushi-zen-demo',
    email: 'restaurante3@demo.com',
    password: 'Demo@103',
    phone: '(11) 3333-3333',
    address: 'Alameda Japão, 300 - Liberdade - São Paulo, SP',
    categories: [
      {
        name: 'Sushis',
        items: [
          { name: 'Combo 12 Peças', description: 'Variedade de nigiri e uramaki (salmão, atum, pepino).', price: 55.0 },
          { name: 'Temaki de Salmão', description: 'Cone de alga com salmão fresco, arroz e cream cheese.', price: 28.0 },
          { name: 'Sashimi Premium', description: '10 fatias de peixe fresco (salmão, atum, peixe-branco).', price: 72.0 },
        ],
      },
      {
        name: 'Bebidas',
        items: [
          { name: 'Saquê Gelado', description: 'Saquê japonês 180ml servido gelado.', price: 25.0 },
          { name: 'Chá Verde', description: 'Chá verde japonês (quente ou gelado).', price: 8.0 },
          { name: 'Ramune', description: 'Refrigerante japonês com tampa de bolinha.', price: 12.0 },
        ],
      },
      {
        name: 'Sobremesas',
        items: [
          { name: 'Mochi', description: 'Bolinho de arroz recheado (matcha, morango, chocolate).', price: 16.0 },
          { name: 'Dorayaki', description: 'Panqueca recheada com anko (pasta de feijão vermelho).', price: 14.0 },
          { name: 'Matcha Ice Cream', description: 'Sorvete de chá verde matcha.', price: 18.0 },
        ],
      },
    ],
  },
  {
    name: 'Churrascaria Gaúcha',
    domain: 'gaucha-demo',
    email: 'restaurante4@demo.com',
    password: 'Demo@104',
    phone: '(11) 3444-4444',
    address: 'Rua dos Bois, 400 - Vila Mariana - São Paulo, SP',
    categories: [
      {
        name: 'Carnes',
        items: [
          { name: 'Picanha na Chapa', description: '400g de picanha grelhada, ponto a escolher.', price: 89.0 },
          { name: 'Costela de Boi', description: 'Costela assada lentamente, servida com farofa.', price: 75.0 },
          { name: 'Fraldinha', description: '300g de fraldinha grelhada com tempero gaúcho.', price: 65.0 },
        ],
      },
      {
        name: 'Acompanhamentos',
        items: [
          { name: 'Arroz com Banana', description: 'Arroz branco com banana frita à milanesa.', price: 15.0 },
          { name: 'Polenta Frita', description: 'Polenta frita em rodelas com sal.', price: 12.0 },
          { name: 'Batata Frita', description: 'Batata frita crocante porção grande.', price: 18.0 },
        ],
      },
      {
        name: 'Saladas',
        items: [
          { name: 'Salada Verde', description: 'Alface, rúcula, tomate e cebola com vinagrete.', price: 22.0 },
          { name: 'Salada de Maionese', description: 'Batata, cenoura, ovos e maionese caseira.', price: 20.0 },
          { name: 'Vinagrete', description: 'Tomate, cebola e pimentão em vinagrete.', price: 14.0 },
        ],
      },
    ],
  },
  {
    name: 'Padaria & Café Manhã',
    domain: 'cafe-manha-demo',
    email: 'restaurante5@demo.com',
    password: 'Demo@105',
    phone: '(11) 3555-5555',
    address: 'Praça do Pão, 500 - Pinheiros - São Paulo, SP',
    categories: [
      {
        name: 'Café da Manhã',
        items: [
          { name: 'Croissant com Presunto e Queijo', description: 'Croissant assado na hora com presunto e mussarela.', price: 18.0 },
          { name: 'Tapioca Doce', description: 'Tapioca com banana e canela ou coco e leite condensado.', price: 14.0 },
          { name: 'Omelete Completo', description: 'Omelete com queijo, tomate e orégano, acompanha pão.', price: 22.0 },
        ],
      },
      {
        name: 'Lanches',
        items: [
          { name: 'Misto Quente', description: 'Pão de forma com presunto e queijo gratinado.', price: 16.0 },
          { name: 'Sanduíche Natural', description: 'Frango, alface, tomate e cream cheese em pão integral.', price: 24.0 },
          { name: 'Coxinha', description: 'Coxinha de frango crocante porção única.', price: 10.0 },
        ],
      },
      {
        name: 'Bebidas',
        items: [
          { name: 'Café Expresso', description: 'Café espresso 50ml.', price: 6.0 },
          { name: 'Cappuccino', description: 'Café com leite vaporizado e espuma.', price: 14.0 },
          { name: 'Suco Natural', description: 'Laranja, maracujá ou abacaxi (400ml).', price: 12.0 },
        ],
      },
    ],
  },
];

// --- Credenciais geradas (preenchidas ao rodar o script) ---

interface RestaurantCredential {
  restaurantId: string;
  name: string;
  domain: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}

const credentialsOutput: {
  generatedAt: string;
  restaurants: RestaurantCredential[];
} = {
  generatedAt: new Date().toISOString(),
  restaurants: [],
};

async function ensurePlan(): Promise<string> {
  const plans = await getPlans();
  if (plans.length > 0) {
    console.log(`${LOG} Plano existente: ${plans[0].name} (${plans[0].id})`);
    return plans[0].id;
  }
  console.log(`${LOG} Criando plano padrão...`);
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
  console.log(`${LOG} Plano criado: ${plan.id}`);
  return plan.id;
}

async function runSeed(): Promise<void> {
  console.log(`\n${LOG} ========== Seed: 5 Restaurantes Fictícios ==========\n`);

  if (!process.env.VITE_FIREBASE_PROJECT_ID) {
    console.error(`${LOG} ERRO: Defina no .env: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc.`);
    throw new Error('Configuração Firebase ausente');
  }

  const planId = await ensurePlan();
  credentialsOutput.generatedAt = new Date().toISOString();
  credentialsOutput.restaurants = [];

  for (const seed of RESTAURANTS_SEED) {
    console.log(`${LOG} Criando restaurante: ${seed.name} (${seed.email})...`);
    const hashedPassword = await bcrypt.hash(seed.password, 10);

    const restaurant = await addRestaurant({
      name: seed.name,
      domain: seed.domain,
      email: seed.email,
      phone: seed.phone,
      address: seed.address,
      password: hashedPassword,
      planId,
      deliverySettings: { enabled: true, aiDescription: '' },
    });

    const perms = await getRestaurantPermissions(restaurant.id);
    await updateRestaurantPermissions(restaurant.id, { ...perms, delivery: true });

    credentialsOutput.restaurants.push({
      restaurantId: restaurant.id,
      name: seed.name,
      domain: seed.domain,
      email: seed.email,
      password: seed.password,
      phone: seed.phone,
      address: seed.address,
    });

    for (const cat of seed.categories) {
      await addCategory(cat.name, restaurant.id);
      for (const item of cat.items) {
        await addProduct(
          {
            name: item.name,
            description: item.description,
            price: item.price,
            category: cat.name,
            available: true,
            availableForDelivery: true,
          },
          restaurant.id
        );
      }
    }
    console.log(`${LOG}   → ${restaurant.id} | ${seed.categories.length} categorias, ${seed.categories.reduce((s, c) => s + c.items.length, 0)} itens`);
  }

  const credentialsPath = 'credentials.json';
  writeFileSync(credentialsPath, JSON.stringify(credentialsOutput, null, 2), 'utf-8');
  console.log(`\n${LOG} Credenciais salvas em: ${credentialsPath}`);

  console.log(`\n${LOG} ========== Resumo ==========`);
  credentialsOutput.restaurants.forEach((r) => {
    console.log(`${LOG} ${r.name}`);
    console.log(`${LOG}   ID: ${r.restaurantId} | Email: ${r.email} | Senha: ${r.password}`);
  });
  console.log(`${LOG} ========== Fim (sucesso) ==========\n`);
}

runSeed().catch((err) => {
  console.error(`${LOG} ERRO:`, err);
  process.exit(1);
});
