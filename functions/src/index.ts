import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

import { getStripe, stripeSecretKey } from './stripeClient';
import { sanitizeMetadata, translateStripeError } from './stripeUtils';
import { resolveDestinationAndFee } from './stripeRestaurantConnect';

export { extractMenuPdfText } from './extractMenuPdfText';
export { importMenuFromClaudeText } from './importMenuFromClaudeText';
export {
  createRestaurantStripeConnectOnboardingLink,
  syncRestaurantStripeConnectStatus,
} from './stripeRestaurantConnect';

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

const MODEL = 'claude-3-haiku-20240307';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Você é um filtro de segurança e qualidade para cadastros de RESTAURANTES na plataforma brasileira "Bora Comer".

Analise o JSON com os dados do formulário e decida se parece um DONO DE RESTAURANTE de boa-fé querendo parceria comercial, ou se é brincadeira, spam, teste absurdo, conteúdo ofensivo ou dados sem sentido.

REJEITE (allowed: false) quando houver indícios claros de:
- Nomes ou descrições de piada, trollagem, meme sem contexto de negócio ("Restaurante do 4chan", "asdfasdf", "teste teste teste", "aaa", só números repetidos)
- Texto gibberish, só emojis, lorem ipsum como único conteúdo relevante
- Discurso de ódio, assédio, ameaças, conteúdo ilegal
- Descrição vazia de sentido comercial ou óbvia mentira absurda
- Dados claramente falsos de propósito

ACEITE (allowed: true) quando:
- Nome de restaurante e descrição fazem sentido como negócio de alimentação
- Dados de contato e localização parecem plausíveis (erros de digitação leves são OK)
- Pequenos negócios informais mas genuínos devem ser aceitos

Responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois:
{"allowed":true}
ou
{"allowed":false,"user_message_pt":"mensagem educada em português do Brasil, até 2 frases."}`;

interface LeadPayload {
  restaurantName?: string;
  ownerName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cnpj?: string;
  address?: string;
  cityState?: string;
  cuisineType?: string;
  openingHours?: string;
  priceRange?: string;
  socialLink?: string;
  description?: string;
}

interface ModerationResult {
  allowed: boolean;
  userMessage?: string;
}

export const moderateLead = onCall(
  { secrets: [anthropicApiKey], region: 'us-central1', cors: true, invoker: 'public' },
  async (request): Promise<ModerationResult> => {
    const payload = request.data as LeadPayload;

    if (!payload || typeof payload !== 'object') {
      throw new HttpsError('invalid-argument', 'Payload inválido.');
    }

    const apiKey = anthropicApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'Chave da IA não configurada.');
    }

    const userMessage = `Dados do formulário (JSON):\n${JSON.stringify(payload, null, 2)}`;

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[moderateLead] Erro Anthropic:', res.status, err.slice(0, 300));
      throw new HttpsError('internal', 'Erro ao consultar IA de moderação.');
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.[0]?.text;

    if (!text) {
      throw new HttpsError('internal', 'Resposta vazia da IA.');
    }

    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as { allowed?: boolean; user_message_pt?: string };

      if (typeof parsed.allowed !== 'boolean') {
        console.warn('[moderateLead] JSON sem "allowed" boolean — bloqueando.');
        return {
          allowed: false,
          userMessage: 'Não foi possível validar o cadastro. Tente novamente.',
        };
      }

      if (parsed.allowed) {
        return { allowed: true };
      }

      return {
        allowed: false,
        userMessage:
          typeof parsed.user_message_pt === 'string' && parsed.user_message_pt.trim()
            ? parsed.user_message_pt.trim()
            : 'Não conseguimos validar seu cadastro. Verifique se os dados correspondem a um restaurante real.',
      };
    } catch {
      console.warn('[moderateLead] JSON inválido da IA — bloqueando.');
      return {
        allowed: false,
        userMessage: 'Não foi possível validar o cadastro. Tente novamente.',
      };
    }
  }
);

/** Cria PaymentIntent para checkout delivery. Aceita cartão salvo (off_session) ou fluxo interativo. */
export const createDeliveryPaymentIntent = onCall(
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' },
  async (request): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    status: string;
    requiresAction: boolean;
  }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const amountCents = raw.amountCents;

    if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || !Number.isFinite(amountCents)) {
      throw new HttpsError('invalid-argument', 'amountCents deve ser um número inteiro (centavos).');
    }

    // R$ 1,00 a R$ 100.000,00 — ajuste se precisar
    if (amountCents < 100 || amountCents > 10_000_000) {
      throw new HttpsError('invalid-argument', 'Valor do pedido fora do intervalo permitido.');
    }

    const currency =
      typeof raw.currency === 'string' && /^[a-z]{3}$/i.test(raw.currency)
        ? raw.currency.toLowerCase()
        : 'brl';

    const usePix = raw.usePix === true;

    const metadata = sanitizeMetadata(raw.metadata);
    const restaurantIdMeta =
      typeof metadata.restaurantId === 'string' ? metadata.restaurantId.trim() : '';
    if (!restaurantIdMeta) {
      throw new HttpsError(
        'invalid-argument',
        'metadata.restaurantId é obrigatório para pagamento delivery.'
      );
    }

    const { destination, applicationFeeAmount } = await resolveDestinationAndFee(
      amountCents,
      restaurantIdMeta
    );

    const customerId = typeof raw.customerId === 'string' ? raw.customerId : undefined;
    const paymentMethodId = typeof raw.paymentMethodId === 'string' ? raw.paymentMethodId : undefined;
    const savePaymentMethod = raw.savePaymentMethod === true;

    const stripe = getStripe();

    const currencyEffective = usePix ? 'brl' : currency;
    if (usePix && currency !== 'brl') {
      throw new HttpsError('invalid-argument', 'PIX só está disponível em BRL.');
    }

    const params: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: currencyEffective,
      metadata,
      transfer_data: {
        destination,
      },
    };

    if (applicationFeeAmount > 0) {
      params.application_fee_amount = applicationFeeAmount;
    }

    if (customerId) params.customer = customerId;

    if (usePix) {
      params.payment_method_types = ['pix'];
    } else if (paymentMethodId && customerId) {
      // Fluxo com cartão salvo — confirmar imediatamente
      params.payment_method = paymentMethodId;
      params.confirm = true;
      params.off_session = true;
    } else {
      // Fluxo interativo (Payment Element)
      params.automatic_payment_methods = { enabled: true };
      if (savePaymentMethod && customerId) {
        params.setup_future_usage = 'off_session';
      }
    }

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create(params);
    } catch (err: unknown) {
      // Se a cobrança off_session exigir 3DS, a Stripe retorna StripeCardError com payment_intent embutido
      if (
        err instanceof Stripe.errors.StripeCardError &&
        (err as Stripe.errors.StripeCardError).payment_intent
      ) {
        const pi = (err as Stripe.errors.StripeCardError).payment_intent as Stripe.PaymentIntent;
        return {
          clientSecret: pi.client_secret ?? '',
          paymentIntentId: pi.id,
          status: pi.status,
          requiresAction: pi.status === 'requires_action' || pi.status === 'requires_confirmation',
        };
      }
      throw translateStripeError(err, 'createDeliveryPaymentIntent');
    }

    if (!intent.client_secret) {
      console.error('[createDeliveryPaymentIntent] PaymentIntent sem client_secret');
      throw new HttpsError('internal', 'Erro ao preparar pagamento.');
    }

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      status: intent.status,
      requiresAction: intent.status === 'requires_action' || intent.status === 'requires_confirmation',
    };
  }
);

/** Garante Stripe Customer para o usuário delivery. Retorna customerId (cria se não existir). */
export const ensureDeliveryStripeCustomer = onCall(
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' },
  async (request): Promise<{ customerId: string }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const deliveryUserId = typeof raw.deliveryUserId === 'string' ? raw.deliveryUserId.trim() : '';
    if (!deliveryUserId) {
      throw new HttpsError('invalid-argument', 'deliveryUserId obrigatório.');
    }

    const email = typeof raw.email === 'string' ? raw.email.slice(0, 200) : undefined;
    const name = typeof raw.name === 'string' ? raw.name.slice(0, 200) : undefined;
    const phone = typeof raw.phone === 'string' ? raw.phone.slice(0, 40) : undefined;
    const existingCustomerId =
      typeof raw.existingCustomerId === 'string' && raw.existingCustomerId.startsWith('cus_')
        ? raw.existingCustomerId
        : undefined;

    const stripe = getStripe();

    try {
      if (existingCustomerId) {
        const customer = await stripe.customers.retrieve(existingCustomerId);
        if (customer && !('deleted' in customer && customer.deleted)) {
          return { customerId: existingCustomerId };
        }
      }

      // Procurar por metadata.deliveryUserId para não duplicar
      const existing = await stripe.customers.search({
        query: `metadata['deliveryUserId']:'${deliveryUserId}'`,
        limit: 1,
      });
      if (existing.data[0]) {
        return { customerId: existing.data[0].id };
      }

      const created = await stripe.customers.create({
        email,
        name,
        phone,
        metadata: { deliveryUserId },
      });
      return { customerId: created.id };
    } catch (err: unknown) {
      throw translateStripeError(err, 'ensureDeliveryStripeCustomer');
    }
  }
);

/** Cria SetupIntent para salvar cartão do customer (sem cobrar). */
export const createDeliverySetupIntent = onCall(
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' },
  async (request): Promise<{ clientSecret: string }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const customerId = typeof raw.customerId === 'string' ? raw.customerId : '';
    if (!customerId.startsWith('cus_')) {
      throw new HttpsError('invalid-argument', 'customerId inválido.');
    }

    const stripe = getStripe();

    try {
      // Somente cartão: evita Stripe Link / outros métodos que pedem "login"
      // em outra conta (confundido com a sessão do app).
      const setup = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });
      if (!setup.client_secret) {
        throw new HttpsError('internal', 'SetupIntent sem client_secret.');
      }
      return { clientSecret: setup.client_secret };
    } catch (err: unknown) {
      throw translateStripeError(err, 'createDeliverySetupIntent');
    }
  }
);

/** Lista cartões salvos do customer. */
export const listDeliverySavedCards = onCall(
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' },
  async (request): Promise<{
    cards: Array<{
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    }>;
  }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const customerId = typeof raw.customerId === 'string' ? raw.customerId : '';
    if (!customerId.startsWith('cus_')) {
      throw new HttpsError('invalid-argument', 'customerId inválido.');
    }

    const stripe = getStripe();

    try {
      const list = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 20,
      });
      const cards = list.data
        .filter((pm) => !!pm.card)
        .map((pm) => ({
          id: pm.id,
          brand: pm.card!.brand,
          last4: pm.card!.last4,
          expMonth: pm.card!.exp_month,
          expYear: pm.card!.exp_year,
        }));
      return { cards };
    } catch (err: unknown) {
      throw translateStripeError(err, 'listDeliverySavedCards');
    }
  }
);

/** Remove um PaymentMethod (desanexa do customer). */
export const removeDeliverySavedCard = onCall(
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true, invoker: 'public' },
  async (request): Promise<{ removed: boolean }> => {
    const raw = (request.data ?? {}) as Record<string, unknown>;
    const paymentMethodId = typeof raw.paymentMethodId === 'string' ? raw.paymentMethodId : '';
    if (!paymentMethodId.startsWith('pm_')) {
      throw new HttpsError('invalid-argument', 'paymentMethodId inválido.');
    }
    const stripe = getStripe();
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
      return { removed: true };
    } catch (err: unknown) {
      throw translateStripeError(err, 'removeDeliverySavedCard');
    }
  }
);

