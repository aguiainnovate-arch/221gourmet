import { defineString } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import bcrypt from 'bcryptjs';
import { FieldValue } from 'firebase-admin/firestore';

import { admin } from './firebaseAdmin';
import { getStripe, stripeSecretKey } from './stripeClient';
import { translateStripeError } from './stripeUtils';

const DEFAULT_RESTAURANT_PASSWORD = '123456';

/**
 * Origem do front (protocolo + host, sem path). Ex.: https://boracoomer.netlify.app
 * Não use sufixo /delivery — o código monta `/{restaurantId}/settings?...` sozinho.
 */
const publicAppUrl = defineString('PUBLIC_APP_URL', {
  default: 'http://localhost:5173',
  description: 'Origem do app (ex. https://site.com). Sem path; retorno Stripe = /{id}/settings',
});

function connectAppOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return 'http://localhost:5173';
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProto).origin;
  } catch {
    return trimmed;
  }
}

function restaurantStripeConnectReturnUrl(
  origin: string,
  restaurantId: string,
  stripeConnect: 'refresh' | 'return'
): string {
  const id = encodeURIComponent(restaurantId);
  return `${origin}/${id}/settings?tab=delivery&stripe_connect=${stripeConnect}`;
}

/** Taxa da plataforma em basis points (100 = 1%). Ex.: 300 = 3% sobre cada pagamento delivery (fica na conta da plataforma). */
const platformFeeBps = defineString('STRIPE_PLATFORM_FEE_BPS', {
  default: '0',
});

async function verifyRestaurantOwnerPassword(
  restaurantId: string,
  email: string,
  plainPassword: string
): Promise<FirebaseFirestore.DocumentData> {
  const snap = await admin.firestore().collection('restaurants').doc(restaurantId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Restaurante não encontrado.');
  }
  const data = snap.data()!;
  const storedEmail =
    typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
  if (!storedEmail || storedEmail !== email.toLowerCase().trim()) {
    throw new HttpsError('permission-denied', 'Credenciais inválidas.');
  }

  let hash = typeof data.password === 'string' ? data.password : '';
  if (!hash) {
    if (plainPassword !== DEFAULT_RESTAURANT_PASSWORD) {
      throw new HttpsError('permission-denied', 'Credenciais inválidas.');
    }
    return data;
  }

  const ok = await bcrypt.compare(plainPassword, hash);
  if (!ok) {
    throw new HttpsError('permission-denied', 'Credenciais inválidas.');
  }
  return data;
}

/** Onboarding Stripe Connect (Express): cria conta vinculada se precisar e devolve URL do fluxo hospedado pela Stripe. */
export const createRestaurantStripeConnectOnboardingLink = onCall(
  {
    secrets: [stripeSecretKey],
    region: 'us-central1',
    cors: true,
    // Navegador + callable sem Firebase Auth do restaurante — Cloud Run precisa permitir invocação pública.
    invoker: 'public',
  },
  async (request): Promise<{ url: string; stripeConnectAccountId: string }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const restaurantId = typeof raw.restaurantId === 'string' ? raw.restaurantId.trim() : '';
    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    const password = typeof raw.password === 'string' ? raw.password : '';

    if (!restaurantId || !email || !password) {
      throw new HttpsError(
        'invalid-argument',
        'Informe restaurantId, email e senha do restaurante.'
      );
    }

    await verifyRestaurantOwnerPassword(restaurantId, email, password);

    const stripe = getStripe();
    const db = admin.firestore();
    const ref = db.collection('restaurants').doc(restaurantId);

    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Restaurante não encontrado.');
    }

    const r = snap.data()!;
    let accountId =
      typeof r.stripeConnectAccountId === 'string' ? r.stripeConnectAccountId.trim() : '';

    try {
      if (!accountId.startsWith('acct_')) {
        const emailStripe =
          typeof r.email === 'string' && r.email.includes('@')
            ? r.email.trim()
            : undefined;

        const account = await stripe.accounts.create({
          type: 'express',
          country: 'BR',
          email: emailStripe,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            firestoreRestaurantId: restaurantId.slice(0, 500),
          },
        });

        accountId = account.id;
        await ref.update({
          stripeConnectAccountId: accountId,
          stripeConnectUpdatedAt: FieldValue.serverTimestamp(),
        });
      }

      const origin = connectAppOrigin(publicAppUrl.value());
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: restaurantStripeConnectReturnUrl(origin, restaurantId, 'refresh'),
        return_url: restaurantStripeConnectReturnUrl(origin, restaurantId, 'return'),
        type: 'account_onboarding',
      });

      if (!link.url) {
        throw new HttpsError('internal', 'Não foi possível gerar o link de cadastro Stripe.');
      }

      return { url: link.url, stripeConnectAccountId: accountId };
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;
      throw translateStripeError(err, 'createRestaurantStripeConnectOnboardingLink');
    }
  }
);

/** Atualiza no Firestore o status da conta conectada (charges_enabled, etc.). */
export const syncRestaurantStripeConnectStatus = onCall(
  {
    secrets: [stripeSecretKey],
    region: 'us-central1',
    cors: true,
    invoker: 'public',
  },
  async (
    request
  ): Promise<{
    stripeConnectAccountId: string | null;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
  }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const restaurantId = typeof raw.restaurantId === 'string' ? raw.restaurantId.trim() : '';
    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    const password = typeof raw.password === 'string' ? raw.password : '';

    if (!restaurantId || !email || !password) {
      throw new HttpsError(
        'invalid-argument',
        'Informe restaurantId, email e senha do restaurante.'
      );
    }

    await verifyRestaurantOwnerPassword(restaurantId, email, password);

    const ref = admin.firestore().collection('restaurants').doc(restaurantId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Restaurante não encontrado.');
    }

    const accountIdRaw =
      typeof snap.data()?.stripeConnectAccountId === 'string'
        ? snap.data()!.stripeConnectAccountId.trim()
        : '';

    if (!accountIdRaw.startsWith('acct_')) {
      await ref.update({
        stripeConnectChargesEnabled: false,
        stripeConnectDetailsSubmitted: false,
        stripeConnectPayoutsEnabled: false,
        stripeConnectUpdatedAt: FieldValue.serverTimestamp(),
      });
      return {
        stripeConnectAccountId: null,
        chargesEnabled: false,
        detailsSubmitted: false,
        payoutsEnabled: false,
      };
    }

    const stripe = getStripe();

    try {
      const acct = await stripe.accounts.retrieve(accountIdRaw);
      const chargesEnabled = acct.charges_enabled === true;
      const detailsSubmitted = acct.details_submitted === true;
      const payoutsEnabled = acct.payouts_enabled === true;

      await ref.update({
        stripeConnectChargesEnabled: chargesEnabled,
        stripeConnectDetailsSubmitted: detailsSubmitted,
        stripeConnectPayoutsEnabled: payoutsEnabled,
        stripeConnectUpdatedAt: FieldValue.serverTimestamp(),
      });

      return {
        stripeConnectAccountId: accountIdRaw,
        chargesEnabled,
        detailsSubmitted,
        payoutsEnabled,
      };
    } catch (err: unknown) {
      throw translateStripeError(err, 'syncRestaurantStripeConnectStatus');
    }
  }
);

export function parsePlatformFeeBps(): number {
  const raw = platformFeeBps.value().trim();
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 9999) {
    return 0;
  }
  return n;
}

export async function resolveDestinationAndFee(amountCents: number, restaurantId: string): Promise<{
  destination: string;
  applicationFeeAmount: number;
}> {
  const stripe = getStripe();
  const ref = admin.firestore().collection('restaurants').doc(restaurantId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError(
      'failed-precondition',
      'Restaurante não encontrado para pagamento.'
    );
  }

  const destRaw =
    typeof snap.data()?.stripeConnectAccountId === 'string'
      ? snap.data()!.stripeConnectAccountId.trim()
      : '';

  if (!destRaw.startsWith('acct_')) {
    throw new HttpsError(
      'failed-precondition',
      'Este restaurante ainda não configurou recebimento online (Stripe Connect). Use dinheiro, PIX ou cartão na entrega, ou tente mais tarde.'
    );
  }

  let chargesEnabled = snap.data()?.stripeConnectChargesEnabled === true;

  try {
    const acct = await stripe.accounts.retrieve(destRaw);
    chargesEnabled = acct.charges_enabled === true;
    await ref.update({
      stripeConnectChargesEnabled: acct.charges_enabled ?? false,
      stripeConnectDetailsSubmitted: acct.details_submitted ?? false,
      stripeConnectPayoutsEnabled: acct.payouts_enabled ?? false,
      stripeConnectUpdatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err: unknown) {
    throw translateStripeError(err, 'resolveDestinationAndFee.retrieveAccount');
  }

  if (!chargesEnabled) {
    throw new HttpsError(
      'failed-precondition',
      'O restaurante ainda não está habilitado a receber pagamentos online. Conclua o cadastro Stripe nas configurações do restaurante.'
    );
  }

  const bps = parsePlatformFeeBps();
  let applicationFeeAmount = Math.floor((amountCents * bps) / 10000);
  if (applicationFeeAmount >= amountCents) {
    applicationFeeAmount = 0;
  }

  return { destination: destRaw, applicationFeeAmount };
}
