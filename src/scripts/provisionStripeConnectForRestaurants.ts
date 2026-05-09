/**
 * Cria contas Stripe Connect (Express) para restaurantes que ainda não têm stripeConnectAccountId.
 *
 * Não substitui o onboarding: cada dono ainda deve concluir o fluxo em Configurações → Delivery
 * (senha + link Stripe) para KYC/dados bancários e charges_enabled.
 *
 * Requer no .env (ou ambiente):
 * - STRIPE_SECRET_KEY (sk_test_... ou sk_live_...)
 * - VITE_FIREBASE_* (mesmo conjunto do app)
 *
 * Uso:
 *   npm run stripe:provision-connect-restaurants
 *   npm run stripe:provision-connect-restaurants -- --dry-run
 */

import 'dotenv/config';
import Stripe from 'stripe';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';

const LOG = '[provision-stripe-connect]';

function env(key: string): string {
  return process.env[key]?.trim() ?? '';
}

const dryRun = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  const stripeSecret = env('STRIPE_SECRET_KEY');
  if (!stripeSecret.startsWith('sk_')) {
    console.error(`${LOG} Defina STRIPE_SECRET_KEY no .env (chave secreta da plataforma).`);
    process.exit(1);
  }

  const firebaseConfig = {
    apiKey: env('VITE_FIREBASE_API_KEY'),
    authDomain: env('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: env('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: env('VITE_FIREBASE_APP_ID'),
  };

  if (!firebaseConfig.projectId) {
    console.error(`${LOG} Variáveis VITE_FIREBASE_* ausentes.`);
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecret);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const q = query(collection(db, 'restaurants'), orderBy('name'));
  const snapshot = await getDocs(q);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const snap of snapshot.docs) {
    const id = snap.id;
    const data = snap.data();
    const name = typeof data.name === 'string' ? data.name : id;

    const existing =
      typeof data.stripeConnectAccountId === 'string'
        ? data.stripeConnectAccountId.trim()
        : '';

    if (existing.startsWith('acct_')) {
      console.log(`${LOG} ignorado ${name} (${id}) — já tem ${existing}`);
      skipped += 1;
      continue;
    }

    const emailStripe =
      typeof data.email === 'string' && data.email.includes('@')
        ? data.email.trim().slice(0, 500)
        : undefined;

    if (dryRun) {
      console.log(`${LOG} [dry-run] criaria conta Express para: ${name} (${id}) email=${emailStripe ?? '—'}`);
      created += 1;
      continue;
    }

    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        ...(emailStripe ? { email: emailStripe } : {}),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          firestoreRestaurantId: id.slice(0, 500),
          provisionedBy: 'provisionStripeConnectForRestaurants',
        },
      });

      await updateDoc(doc(db, 'restaurants', id), {
        stripeConnectAccountId: account.id,
        stripeConnectUpdatedAt: Timestamp.now(),
      });

      console.log(`${LOG} OK ${name} (${id}) → ${account.id}`);
      created += 1;

      await new Promise((r) => setTimeout(r, 250));
    } catch (e: unknown) {
      errors += 1;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${LOG} ERRO ${name} (${id}): ${msg}`);
    }
  }

  console.log(
    `${LOG} concluído — criados/processados: ${created}, já existiam: ${skipped}, erros: ${errors}${dryRun ? ' (dry-run)' : ''}`
  );

  if (dryRun) {
    console.log(`${LOG} Execute sem --dry-run para gravar no Firestore e na Stripe.`);
  } else if (created > 0) {
    console.log(
      `${LOG} Lembrete: cada restaurante deve abrir Configurações → Delivery → Conectar Stripe e concluir o cadastro na Stripe para aceitar pagamentos online.`
    );
  }
}

main().catch((e) => {
  console.error(LOG, e);
  process.exit(1);
});
