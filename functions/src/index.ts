import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

export { extractMenuPdfText } from './extractMenuPdfText';
export { importMenuFromClaudeText } from './importMenuFromClaudeText';

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const asaasApiKey = defineSecret('ASAAS_API_KEY');

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
  { secrets: [anthropicApiKey], region: 'us-central1', cors: true },
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

function getStripe(): Stripe {
  const secret = stripeSecretKey.value();
  if (!secret) {
    throw new HttpsError('failed-precondition', 'Stripe não configurado (secret ausente).');
  }
  return new Stripe(secret);
}

function sanitizeMetadata(raw: unknown): Record<string, string> {
  const metadata: Record<string, string> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof k === 'string' && k.length <= 40 && typeof v === 'string' && v.length <= 500) {
        metadata[k] = v.slice(0, 500);
      }
    }
  }
  return metadata;
}

function translateStripeError(err: unknown, ctx: string): HttpsError {
  if (err instanceof Stripe.errors.StripeError) {
    console.error(`[${ctx}] Stripe`, err.type, err.message);
    const msg = `Stripe: ${err.message}`.slice(0, 240);
    return new HttpsError('failed-precondition', msg);
  }
  console.error(`[${ctx}]`, err);
  return new HttpsError('internal', 'Erro inesperado com o Stripe.');
}

/** Cria PaymentIntent para checkout delivery. Aceita cartão salvo (off_session) ou fluxo interativo. */
export const createDeliveryPaymentIntent = onCall(
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true },
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

    const metadata = sanitizeMetadata(raw.metadata);
    const customerId = typeof raw.customerId === 'string' ? raw.customerId : undefined;
    const paymentMethodId = typeof raw.paymentMethodId === 'string' ? raw.paymentMethodId : undefined;
    const savePaymentMethod = raw.savePaymentMethod === true;

    const stripe = getStripe();

    const params: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency,
      metadata,
    };

    if (customerId) params.customer = customerId;

    if (paymentMethodId && customerId) {
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
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true },
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
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true },
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
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true },
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
  { secrets: [stripeSecretKey], region: 'us-central1', cors: true },
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

type AsaasBillingType = 'PIX';

interface CreateAsaasPixChargeRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerCpfCnpj?: string;
  amount: number;
  description?: string;
  externalReference?: string;
}

interface CreateAsaasPixChargeResponse {
  paymentId: string;
  invoiceUrl: string;
  pixCopyPaste?: string;
  pixQrCodeImage?: string;
  status: string;
}

function getAsaasConfig() {
  const apiKey = asaasApiKey.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Asaas não configurado (token ausente).');
  }
  const baseUrl = process.env.ASAAS_API_BASE_URL?.trim() || 'https://api-sandbox.asaas.com/v3';
  return { apiKey, baseUrl };
}

async function asaasRequest<TResponse>(
  baseUrl: string,
  apiKey: string,
  path: string,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const errorText =
      typeof body?.errors === 'object' ? JSON.stringify(body.errors).slice(0, 300) : response.statusText;
    throw new HttpsError('failed-precondition', `Asaas erro ${response.status}: ${errorText}`);
  }

  return body as TResponse;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 11);
}

function sanitizeAsaasText(value: unknown, max = 200): string | undefined {
  if (typeof value !== 'string') return undefined;
  const sanitized = value.trim();
  if (!sanitized) return undefined;
  return sanitized.slice(0, max);
}

function getDueDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Cria cobrança PIX no Asaas e retorna URL/fonte de pagamento. */
export const createDeliveryAsaasPixCharge = onCall(
  { secrets: [asaasApiKey], region: 'us-central1', cors: true },
  async (request): Promise<CreateAsaasPixChargeResponse> => {
    const raw = (request.data ?? {}) as Partial<CreateAsaasPixChargeRequest>;

    const customerName = sanitizeAsaasText(raw.customerName, 100);
    const customerEmail = sanitizeAsaasText(raw.customerEmail, 120);
    const customerPhone = sanitizeAsaasText(raw.customerPhone, 20);
    const customerCpfCnpj = sanitizeAsaasText(raw.customerCpfCnpj, 18);
    const description = sanitizeAsaasText(raw.description, 500);
    const externalReference = sanitizeAsaasText(raw.externalReference, 100);

    if (!customerName || !customerPhone) {
      throw new HttpsError('invalid-argument', 'Nome e telefone são obrigatórios para o Asaas.');
    }

    if (typeof raw.amount !== 'number' || !Number.isFinite(raw.amount) || raw.amount < 1 || raw.amount > 100000) {
      throw new HttpsError('invalid-argument', 'Valor do pedido inválido para cobrança Asaas.');
    }

    const { apiKey, baseUrl } = getAsaasConfig();

    const customerPayload: Record<string, unknown> = {
      name: customerName,
      phone: normalizePhone(customerPhone),
      notificationDisabled: true,
    };

    if (customerEmail) customerPayload.email = customerEmail;
    if (customerCpfCnpj) customerPayload.cpfCnpj = customerCpfCnpj.replace(/\D/g, '');

    const customer = await asaasRequest<{ id: string }>(baseUrl, apiKey, '/customers', {
      method: 'POST',
      body: JSON.stringify(customerPayload),
    });

    const payment = await asaasRequest<{
      id: string;
      status: string;
      invoiceUrl?: string;
      bankSlipUrl?: string;
    }>(baseUrl, apiKey, '/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'PIX' as AsaasBillingType,
        value: Number(raw.amount.toFixed(2)),
        dueDate: getDueDateString(),
        description,
        externalReference,
      }),
    });

    const pixData = await asaasRequest<{
      payload?: string;
      encodedImage?: string;
    }>(baseUrl, apiKey, `/payments/${payment.id}/pixQrCode`, {
      method: 'GET',
    });

    return {
      paymentId: payment.id,
      invoiceUrl: payment.invoiceUrl || payment.bankSlipUrl || '',
      pixCopyPaste: pixData.payload,
      pixQrCodeImage: pixData.encodedImage,
      status: payment.status,
    };
  }
);
