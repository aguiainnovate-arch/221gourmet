/**
 * Moderação de leads de restaurante com Claude (Anthropic).
 * Analisa se o cadastro parece legítimo (restaurante real) ou brincadeira/spam/troll.
 *
 * Requer VITE_ANTHROPIC_API_KEY. Sem chave, bloqueia o envio (fail-closed).
 *
 * Em `npm run dev`, usa o proxy do Vite (/__proxy-anthropic/...) para evitar CORS.
 * Em produção, configure VITE_ANTHROPIC_MODERATION_URL apontando para seu backend.
 *
 * Logs: prefixo [leadModeration] — Console do navegador (F12) e, em dev, espelho no
 * terminal do Vite com prefixo [browser→terminal] (via POST /__dev-client-log).
 */

import type { RestaurantLeadPayload } from './restaurantLeadService';
import { devError, devLog, devWarn } from '../utils/devTerminalMirror';

const LOG = '[leadModeration]';
const MODEL = 'claude-3-haiku-20240307';
const ANTHROPIC_DIRECT_URL = 'https://api.anthropic.com/v1/messages';

const VALIDATION_UNAVAILABLE_MESSAGE =
  'Não foi possível validar o cadastro neste momento. Confira os dados e tente novamente em instantes.';
const INVALID_KEY_MESSAGE =
  'Falha de configuração da validação automática. Tente novamente mais tarde.';

export interface LeadModerationResult {
  allowed: boolean;
  userMessage?: string;
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_ANTHROPIC_API_KEY?.trim() || undefined;
}

function resolveUrl(): string {
  const override = import.meta.env.VITE_ANTHROPIC_MODERATION_URL?.trim();
  if (override) return override;
  if (import.meta.env.DEV) return '/__proxy-anthropic/v1/messages';
  return ANTHROPIC_DIRECT_URL;
}

function redactSecrets(input: string): string {
  return input
    .replace(/\bsk-ant-[A-Za-z0-9_-]{10,}\b/g, 'sk-ant-***')
    .replace(/\bsk-proj-[A-Za-z0-9_-]{10,}\b/g, 'sk-proj-***');
}

const SYSTEM_PROMPT = `Você é um filtro de segurança e qualidade para cadastros de RESTAURANTES na plataforma brasileira "Bora Comer".

Analise o JSON com os dados do formulário e decida se parece um DONO DE RESTAURANTE de boa-fé querendo parceria comercial, ou se é brincadeira, spam, teste absurdo, conteúdo ofensivo ou dados sem sentido.

REJEITE (allowed: false) quando houver indícios claros de:
- Nomes ou descrições de piada, trollagem, meme sem contexto de negócio ("Restaurante do 4chan", "asdfasdf", "teste teste teste", "aaa", só números repetidos)
- Texto gibberish, só emojis, lorem ipsum como único conteúdo relevante
- Discurso de ódio, assédio, ameaças, conteúdo ilegal
- Descrição vazia de sentido comercial ou óbvia mentira absurda
- Dados claramente falsos de propósito (ex.: endereço só "rua" sem nada mais em todos os campos genéricos)

ACEITE (allowed: true) quando:
- Nome de restaurante e descrição fazem sentido como negócio de alimentação
- Dados de contato e localização parecem plausíveis (erros de digitação leves são OK)
- Pequenos negócios informais mas genuínos devem ser aceitos

Responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois:
{"allowed":true}
ou
{"allowed":false,"user_message_pt":"mensagem educada em português do Brasil, até 2 frases, explicando que não foi possível validar o cadastro e pedindo dados coerentes com um restaurante real."}`;

function parseModerationResponse(text: string): LeadModerationResult {
  const preview = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  devLog(`${LOG} Resposta bruta (trecho):`, preview);

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { allowed?: boolean; user_message_pt?: string };

    if (typeof parsed.allowed !== 'boolean') {
      devWarn(`${LOG} JSON sem campo "allowed" boolean — bloqueando (fail-closed).`);
      return { allowed: false, userMessage: VALIDATION_UNAVAILABLE_MESSAGE };
    }

    if (parsed.allowed) {
      devLog(`${LOG} Resultado: APROVADO`);
      return { allowed: true };
    }

    const msg =
      typeof parsed.user_message_pt === 'string' && parsed.user_message_pt.trim()
        ? parsed.user_message_pt.trim()
        : 'Não conseguimos validar seu cadastro. Verifique se os dados correspondem a um restaurante real e tente novamente.';

    devWarn(`${LOG} Resultado: REPROVADO`, { userMessagePreview: msg.slice(0, 120) });
    return { allowed: false, userMessage: msg };
  } catch (e) {
    devWarn(`${LOG} JSON inválido — bloqueando (fail-closed).`, e);
    return { allowed: false, userMessage: VALIDATION_UNAVAILABLE_MESSAGE };
  }
}

export async function moderateRestaurantLeadWithClaude(
  payload: RestaurantLeadPayload
): Promise<LeadModerationResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  devLog(`${LOG} Início da verificação (Claude)`, {
    restaurante: payload.restaurantName?.slice(0, 80) || '(vazio)',
    modelo: MODEL
  });

  const apiKey = getApiKey();
  if (!apiKey) {
    devWarn(`${LOG} VITE_ANTHROPIC_API_KEY ausente — bloqueando cadastro (fail-closed).`);
    return { allowed: false, userMessage: INVALID_KEY_MESSAGE };
  }

  devLog(`${LOG} Chave Anthropic configurada — chamando API…`);

  const userPayload = {
    restaurantName: payload.restaurantName,
    ownerName: payload.ownerName,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    email: payload.email,
    cnpj: payload.cnpj,
    address: payload.address,
    cityState: payload.cityState,
    cuisineType: payload.cuisineType,
    openingHours: payload.openingHours,
    priceRange: payload.priceRange,
    socialLink: payload.socialLink,
    description: payload.description
  };

  const url = resolveUrl();
  devLog(`${LOG} POST`, url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Dados do formulário (JSON):\n${JSON.stringify(userPayload, null, 2)}`
          }
        ]
      })
    });

    if (!res.ok) {
      const rawErr = await res.text();
      devError(`${LOG} Erro HTTP Anthropic`, res.status, redactSecrets(rawErr).slice(0, 500));
      if (res.status === 401 || /invalid.*key/i.test(rawErr)) {
        return { allowed: false, userMessage: INVALID_KEY_MESSAGE };
      }
      return { allowed: false, userMessage: VALIDATION_UNAVAILABLE_MESSAGE };
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.[0]?.text;

    if (!text || typeof text !== 'string') {
      devWarn(`${LOG} Resposta sem texto — bloqueando (fail-closed).`);
      return { allowed: false, userMessage: VALIDATION_UNAVAILABLE_MESSAGE };
    }

    const result = parseModerationResponse(text);
    const elapsed =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    devLog(`${LOG} Verificação concluída em ${Math.round(elapsed)}ms`, { allowed: result.allowed });
    return result;
  } catch (err) {
    devError(`${LOG} Exceção na chamada:`, err);
    devWarn(`${LOG} Bloqueando cadastro após exceção (fail-closed).`);
    return { allowed: false, userMessage: VALIDATION_UNAVAILABLE_MESSAGE };
  }
}

/** Alias para compatibilidade com código que usa o nome GPT. */
export const moderateRestaurantLeadWithGPT = moderateRestaurantLeadWithClaude;

export function isRestaurantLeadModerationConfigured(): boolean {
  return Boolean(getApiKey());
}
