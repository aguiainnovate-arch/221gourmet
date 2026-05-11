/**
 * Moderação de leads de restaurante via Firebase Cloud Function.
 *
 * A chave da Anthropic (Claude) fica armazenada com segurança no servidor
 * (Firebase Functions secret), NUNCA exposta no bundle do cliente.
 *
 * A função `moderateLead` é invocada via httpsCallable — sem chave no front.
 *
 * Em dev local, você pode ativar o emulador de Functions adicionando
 *   VITE_USE_FUNCTIONS_EMULATOR=true
 * no seu .env.local e rodando: firebase emulators:start --only functions
 *
 * Logs: prefixo [leadModeration] — Console do navegador (F12) e, em dev,
 * espelho no terminal do Vite (via POST /__dev-client-log).
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import type { RestaurantLeadPayload } from './restaurantLeadService';
import { devError, devLog, devWarn } from '../utils/devTerminalMirror';

const LOG = '[leadModeration]';

const VALIDATION_UNAVAILABLE_MESSAGE =
  'Não foi possível validar o cadastro neste momento. Confira os dados e tente novamente em instantes.';

/** Decisão explícita da IA (HTTP 200 + JSON válido). */
export type LeadModerationDecision =
  | { outcome: 'approved' }
  | { outcome: 'rejected'; userMessage: string };

/** Falha técnica ou de configuração — não é reprovação pela IA. */
export type LeadModerationTechnicalFailure = {
  outcome: 'technical';
  /** Mensagem segura para o usuário (não expor stack, chaves ou corpo de API). */
  userMessage: string;
  /** Código Firebase Functions, ex.: functions/unavailable */
  firebaseCode?: string;
};

export type ModerateRestaurantLeadResult = LeadModerationDecision | LeadModerationTechnicalFailure;

interface ModerationFunctionResult {
  allowed: boolean;
  userMessage?: string;
}

const moderateLeadFn = httpsCallable<RestaurantLeadPayload, ModerationFunctionResult>(
  functions,
  'moderateLead'
);

function extractFirebaseErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function extractFirebaseErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const message = (err as { message?: unknown }).message;
  return typeof message === 'string' ? message : '';
}

/**
 * Erros da callable que indicam falha técnica na moderação (não decisão allowed:false).
 * invalid-argument: payload inválido — não salvar automaticamente como lead “pendente”.
 */
function isTechnicalModerationFailure(code: string | undefined): boolean {
  if (!code) return true;
  return (
    code === 'functions/internal' ||
    code === 'functions/unavailable' ||
    code === 'functions/resource-exhausted' ||
    code === 'functions/deadline-exceeded'
  );
}

/** Falha de configuração no servidor (ex.: secret ausente). Não persiste lead automaticamente. */
function isConfigurationModerationFailure(code: string | undefined): boolean {
  return code === 'functions/failed-precondition';
}

export async function moderateRestaurantLeadWithClaude(
  payload: RestaurantLeadPayload
): Promise<ModerateRestaurantLeadResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  devLog(`${LOG} Início da verificação (Cloud Function → Claude)`, {
    restaurante: payload.restaurantName?.slice(0, 80) || '(vazio)',
  });

  try {
    const result = await moderateLeadFn(payload);
    const data = result.data;

    const elapsed =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    devLog(`${LOG} Verificação concluída em ${Math.round(elapsed)}ms`, { allowed: data.allowed });

    if (typeof data.allowed !== 'boolean') {
      devWarn(
        `${LOG} Resposta inválida da function (allowed não boolean) — tratando como falha técnica de validação, não reprovação.`
      );
      return {
        outcome: 'technical',
        userMessage: VALIDATION_UNAVAILABLE_MESSAGE,
        firebaseCode: 'functions/invalid-response',
      };
    }

    if (data.allowed) {
      return { outcome: 'approved' };
    }

    return {
      outcome: 'rejected',
      userMessage:
        typeof data.userMessage === 'string' && data.userMessage.trim()
          ? data.userMessage.trim()
          : 'Não conseguimos validar seu cadastro. Verifique se os dados correspondem a um restaurante real.',
    };
  } catch (err: unknown) {
    devError(`${LOG} Erro ao chamar Cloud Function de moderação:`, err);

    const firebaseCode = extractFirebaseErrorCode(err);
    const rawMessage = extractFirebaseErrorMessage(err);

    if (isConfigurationModerationFailure(firebaseCode)) {
      devWarn(
        `${LOG} Moderação indisponível por configuração/serviço (failed-precondition). Não é reprovação do cadastro.`
      );
      return {
        outcome: 'technical',
        userMessage:
          'A validação automática não está disponível no momento. Tente mais tarde ou fale com nosso time comercial.',
        firebaseCode,
      };
    }

    if (firebaseCode === 'functions/invalid-argument') {
      devWarn(`${LOG} Payload rejeitado pela function (invalid-argument).`);
      return {
        outcome: 'technical',
        userMessage: 'Não foi possível enviar os dados para validação. Confira o formulário e tente novamente.',
        firebaseCode,
      };
    }

    if (isTechnicalModerationFailure(firebaseCode)) {
      devWarn(
        `${LOG} Falha técnica na moderação (${firebaseCode || 'sem código'}) — não classificar como reprovação pela IA.`
      );
      const fromServer =
        rawMessage &&
        !/FirebaseError|internal|HTTPS error/i.test(rawMessage) &&
        rawMessage.length < 400
          ? rawMessage.trim()
          : '';
      return {
        outcome: 'technical',
        userMessage: fromServer || VALIDATION_UNAVAILABLE_MESSAGE,
        firebaseCode,
      };
    }

    devWarn(
      `${LOG} Erro não mapeado na callable (${firebaseCode || 'desconhecido'}) — tratando como falha técnica.`
    );
    return {
      outcome: 'technical',
      userMessage: VALIDATION_UNAVAILABLE_MESSAGE,
      firebaseCode,
    };
  }
}

/** Alias para compatibilidade com código que usa o nome GPT. */
export const moderateRestaurantLeadWithGPT = moderateRestaurantLeadWithClaude;

export function isRestaurantLeadModerationConfigured(): boolean {
  return true;
}
