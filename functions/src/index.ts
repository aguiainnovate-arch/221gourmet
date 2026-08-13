import { onCall, HttpsError } from 'firebase-functions/v2/https';
import OpenAI, { APIError } from 'openai';
import Stripe from 'stripe';

import { getStripe, stripeSecretKey } from './stripeClient';
import { openaiApiKey } from './openaiSecret';
import { sanitizeMetadata, translateStripeError } from './stripeUtils';
import { resolveDestinationAndFee } from './stripeRestaurantConnect';

export { extractMenuPdfText } from './extractMenuPdfText';
export { importMenuFromClaudeText } from './importMenuFromClaudeText';
export {
  createRestaurantStripeConnectOnboardingLink,
  syncRestaurantStripeConnectStatus,
} from './stripeRestaurantConnect';
export {
  createPartnershipSubscriptionCheckout,
  confirmPartnershipSubscriptionCheckout,
} from './stripePartnershipBilling';
export { recommendRestaurantsWithAI } from './recommendRestaurantsWithAI';

const LEAD_MODERATION_CHAT_MODEL = 'gpt-4o-mini';
/** Modelo estável da API de moderação (omni-* pode retornar 400 em contas/regiões sem acesso). */
const LEAD_MODERATION_MOD_MODEL = 'text-moderation-latest';

const LEAD_MODERATION_SYSTEM = `Você é um filtro de segurança e qualidade para cadastros de RESTAURANTES na plataforma brasileira "Bora Comer".

Analise o JSON com os dados do formulário e decida se parece um DONO DE RESTAURANTE de boa-fé querendo parceria comercial, ou se é brincadeira, spam, má-fé, trollagem, teste absurdo, conteúdo ofensivo ou dados sem sentido.

REJEITE (allowed: false) quando houver indícios claros de:
- Nomes ou descrições de piada, trollagem, meme sem contexto de negócio, sabotagem ou intenção de prejudicar a plataforma
- Frases genéricas de insatisfação usadas como "nome" ou descrição do restaurante (ex.: só "não gostei", "péssimo", "ódio") sem qualquer dado de negócio
- Texto gibberish, só emojis, lorem ipsum como único conteúdo relevante
- Discurso de ódio, assédio, ameaças, conteúdo ilegal ou discriminatório
- Descrição vazia de sentido comercial ou mentira absurda e intencional
- Dados claramente falsos de propósito ou cadastro claramente de teste para abuso

ACEITE (allowed: true) quando:
- Nome de restaurante e descrição fazem sentido como negócio de alimentação
- Dados de contato e localização parecem plausíveis (erros de digitação leves são OK)
- Pequenos negócios informais mas genuínos devem ser aceitos

Responda SOMENTE com um único objeto JSON (sem markdown, sem texto fora do JSON) no formato:
{"allowed":true}
ou
{"allowed":false,"user_message_pt":"mensagem educada em português do Brasil, 1 a 2 frases, explicando de forma clara o motivo da recusa (ex.: dados parecem de teste, nome não descreve um restaurante, falta informação comercial mínima). Não cite OpenAI, IA nem modelo."}`;

const MOD_CATEGORY_PT: Record<string, string> = {
  sexual: 'conteúdo sexual inadequado para cadastro comercial',
  hate: 'discurso de ódio',
  'hate/threatening': 'discurso de ódio ou ameaças',
  harassment: 'linguagem de assédio ou intimidação',
  'harassment/threatening': 'assédio grave ou ameaças',
  'self-harm': 'referências a automutilação ou suicídio',
  'self-harm/intent': 'indícios de intenção de automutilação',
  'self-harm/instructions': 'instruções relacionadas a automutilação',
  violence: 'violência ou glorificação de violência',
  'violence/graphic': 'descrições gráficas de violência',
  illicit: 'conteúdo ilícito',
  'illicit/violent': 'conteúdo ilícito ou extremamente violento',
  'sexual/minors': 'conteúdo sexual envolvendo menores',
};

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

/** Sucesso HTTP: decisão explícita da IA (nunca erro técnico). */
interface ModerationResult {
  allowed: boolean;
  userMessage?: string;
}

function collectLeadTextBlob(payload: LeadPayload): string {
  const parts = [
    payload.restaurantName,
    payload.ownerName,
    payload.description,
    payload.address,
    payload.cityState,
    payload.cuisineType,
    payload.openingHours,
    payload.socialLink,
    payload.email,
    payload.phone,
    payload.whatsapp,
  ];
  return parts
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join('\n')
    .slice(0, 28_000);
}

function stripAssistantJsonFence(content: string): string {
  let clean = content.trim();
  if (clean.includes('```json')) {
    clean = clean.replace(/```json\s*/gi, '').replace(/```/g, '');
  } else if (clean.includes('```')) {
    clean = clean.replace(/```/g, '');
  }
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) clean = jsonMatch[0];
  return clean.trim();
}

function buildOpenAiModerationUserMessage(categories: object | undefined): string {
  if (!categories || typeof categories !== 'object') {
    return 'O conteúdo informado não atende às diretrizes de segurança da plataforma. Revise nome, descrição e demais campos e tente novamente com dados adequados a um restaurante.';
  }
  const reasons: string[] = [];
  for (const [key, flagged] of Object.entries(categories)) {
    if (flagged !== true) continue;
    const pt = MOD_CATEGORY_PT[key];
    if (pt) reasons.push(pt);
  }
  if (reasons.length === 0) {
    return 'O conteúdo informado não atende às diretrizes de uso da plataforma. Ajuste os textos para um cadastro comercial respeitoso e tente novamente.';
  }
  const list = reasons.slice(0, 4).join(', ');
  return `Não foi possível aceitar o cadastro: identificamos ${list}. Corrija as informações para refletir um negócio de alimentação adequado e envie novamente.`;
}

function openAiHttpStatusToHttpsError(status: number, errBodyPreview: string): HttpsError {
  console.error('[moderateLead] Erro HTTP OpenAI:', status, errBodyPreview);
  const transient =
    status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  if (transient) {
    return new HttpsError(
      'unavailable',
      'Não foi possível validar seu cadastro agora. Tente novamente em alguns instantes.'
    );
  }
  if (status === 401 || status === 403) {
    return new HttpsError(
      'failed-precondition',
      'Validação automática indisponível. Tente mais tarde ou fale com nosso time comercial.'
    );
  }
  // 400/404: parâmetro ou modelo inválido — aparece nos logs; cliente recebe código mapeável
  if (status === 400 || status === 404) {
    return new HttpsError(
      'failed-precondition',
      'Validação automática indisponível no servidor (API OpenAI). Peça ao administrador para conferir logs da function moderateLead, chave OPENAI_API_KEY e faturamento na OpenAI.'
    );
  }
  return new HttpsError(
    'internal',
    'Não foi possível concluir a validação automática. Tente novamente em instantes.'
  );
}

export const moderateLead = onCall(
  { secrets: [openaiApiKey], region: 'us-central1', cors: true, invoker: 'public' },
  async (request): Promise<ModerationResult> => {
    const payload = request.data as LeadPayload;

    if (!payload || typeof payload !== 'object') {
      throw new HttpsError('invalid-argument', 'Dados do formulário inválidos para validação.');
    }

    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      console.error('[moderateLead] Secret OPENAI_API_KEY ausente ou vazia.');
      throw new HttpsError(
        'failed-precondition',
        'Validação automática não está disponível no momento. Tente mais tarde ou fale com nosso time comercial.'
      );
    }

    const client = new OpenAI({ apiKey });
    const textBlob = collectLeadTextBlob(payload);

    if (textBlob.trim()) {
      try {
        const modResp = await client.moderations.create({
          model: LEAD_MODERATION_MOD_MODEL,
          input: textBlob,
        });
        const first = modResp.results?.[0];
        if (first?.flagged) {
          const msg = buildOpenAiModerationUserMessage(first.categories);
          console.warn('[moderateLead] Bloqueio pela API de moderação OpenAI.');
          return { allowed: false, userMessage: msg };
        }
      } catch (e) {
        console.warn('[moderateLead] Camada de moderação OpenAI falhou; seguindo com análise por chat:', e);
      }
    }

    const userMessage = `Dados do formulário (JSON):\n${JSON.stringify(payload, null, 2)}\n\nResponda apenas um único objeto JSON com os campos "allowed" (boolean) e, se allowed for false, "user_message_pt" (string em português do Brasil).`;

    let content: string | null | undefined;
    try {
      const completion = await client.chat.completions.create({
        model: LEAD_MODERATION_CHAT_MODEL,
        temperature: 0.15,
        max_completion_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: LEAD_MODERATION_SYSTEM },
          { role: 'user', content: userMessage },
        ],
      });
      content = completion.choices[0]?.message?.content;
      const fr = completion.choices[0]?.finish_reason;
      if (fr === 'length') {
        console.warn('[moderateLead] Resposta OpenAI truncada (finish_reason=length).');
      }
    } catch (e: unknown) {
      if (e instanceof APIError) {
        const detail =
          typeof e.error === 'object' && e.error !== null
            ? JSON.stringify(e.error).slice(0, 600)
            : e.message;
        console.error('[moderateLead] OpenAI APIError', {
          status: e.status,
          type: e.type,
          code: e.code,
          message: e.message,
          errorBody: detail,
        });
        if (typeof e.status === 'number' && e.status > 0) {
          throw openAiHttpStatusToHttpsError(e.status, detail);
        }
      } else {
        console.error('[moderateLead] Falha ao chamar chat OpenAI:', e);
      }
      const status =
        e && typeof e === 'object' && 'status' in e && typeof (e as { status: unknown }).status === 'number'
          ? (e as { status: number }).status
          : 0;
      const body =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : String(e);
      if (status > 0) {
        throw openAiHttpStatusToHttpsError(status, body.slice(0, 400));
      }
      throw new HttpsError(
        'unavailable',
        'Não foi possível validar seu cadastro agora. Tente novamente em alguns instantes.'
      );
    }

    if (!content || !String(content).trim()) {
      console.warn('[moderateLead] Resposta OpenAI sem conteúdo.');
      throw new HttpsError(
        'internal',
        'Não foi possível concluir a validação automática. Tente novamente em instantes.'
      );
    }

    const cleaned = stripAssistantJsonFence(String(content));

    let parsed: { allowed?: boolean; user_message_pt?: string };
    try {
      parsed = JSON.parse(cleaned) as { allowed?: boolean; user_message_pt?: string };
    } catch (e) {
      console.warn('[moderateLead] JSON da IA inválido (parse). Trecho:', cleaned.slice(0, 200), e);
      throw new HttpsError(
        'internal',
        'Não foi possível concluir a validação automática. Tente novamente em instantes.'
      );
    }

    if (typeof parsed.allowed !== 'boolean') {
      console.warn('[moderateLead] JSON da IA sem campo boolean "allowed".', cleaned.slice(0, 200));
      throw new HttpsError(
        'internal',
        'Não foi possível concluir a validação automática. Tente novamente em instantes.'
      );
    }

    if (parsed.allowed) {
      return { allowed: true };
    }

    return {
      allowed: false,
      userMessage:
        typeof parsed.user_message_pt === 'string' && parsed.user_message_pt.trim()
          ? parsed.user_message_pt.trim()
          : 'Não conseguimos validar seu cadastro. Envie o nome do restaurante, uma descrição do negócio e dados de contato coerentes com um estabelecimento real.',
    };
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

