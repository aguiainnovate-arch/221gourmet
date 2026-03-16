/**
 * Cria 3 usuários de demonstração (delivery) no Firestore, um por idioma do app,
 * cada um com telefone no formato internacional do país correspondente:
 * - pt-BR → Brasil (+55)
 * - en-US → Estados Unidos (+1)
 * - fr-FR → França (+33)
 *
 * Login na rota /delivery/auth com o telefone (ou email) indicado.
 * Execução: npm run create:demo-users-by-phone
 * Ou: npx tsx src/scripts/createDemoUsersByPhone.ts
 *
 * Requer .env com VITE_FIREBASE_* preenchido.
 */

import 'dotenv/config';
import { saveDeliveryUser } from '../services/deliveryUserService';

const LOG_PREFIX = '[create-demo-users-by-phone]';

const DEMO_USERS = [
  {
    lang: 'pt-BR',
    country: 'Brasil',
    name: 'Cliente Demo Brasil',
    email: 'cliente-br@demo.com',
    phone: '+5511977777777',
    address: 'Av. Paulista, 1000 - Bela Vista - São Paulo, SP',
  },
  {
    lang: 'en-US',
    country: 'United States',
    name: 'Demo Client USA',
    email: 'cliente-us@demo.com',
    phone: '+15557777777',
    address: '123 Main St - New York, NY',
  },
  {
    lang: 'fr-FR',
    country: 'France',
    name: 'Client Démo France',
    email: 'cliente-fr@demo.com',
    phone: '+33677777777',
    address: '10 Rue de la Paix - Paris',
  },
];

async function run(): Promise<void> {
  console.log(`\n${LOG_PREFIX} ========== Início ==========\n`);

  if (!process.env.VITE_FIREBASE_PROJECT_ID) {
    console.error(
      `${LOG_PREFIX} ERRO: Defina no .env: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID`
    );
    throw new Error('Configuração Firebase ausente');
  }
  console.log(`${LOG_PREFIX} Projeto Firebase: ${process.env.VITE_FIREBASE_PROJECT_ID}\n`);

  try {
    for (const u of DEMO_USERS) {
      const created = await saveDeliveryUser({
        name: u.name,
        email: u.email,
        phone: u.phone,
        address: u.address,
        defaultPaymentMethod: 'pix',
      });
      console.log(
        `${LOG_PREFIX} ${u.country} (${u.lang}): ${created.id} — telefone ${u.phone} ou email ${u.email}`
      );
    }

    console.log(`\n${LOG_PREFIX} ========== Resumo ==========`);
    DEMO_USERS.forEach((u) => {
      console.log(`${LOG_PREFIX} ${u.lang} (${u.country}): ${u.phone} | ${u.email}`);
    });
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

run().catch(() => process.exit(1));
