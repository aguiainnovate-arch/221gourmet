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

export interface LeadModerationResult {
  allowed: boolean;
  userMessage?: string;
}

interface ModerationFunctionResult {
  allowed: boolean;
  userMessage?: string;
}

const moderateLeadFn = httpsCallable<RestaurantLeadPayload, ModerationFunctionResult>(
  functions,
  'moderateLead'
);

export async function moderateRestaurantLeadWithClaude(
  payload: RestaurantLeadPayload
): Promise<LeadModerationResult> {
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
      devWarn(`${LOG} Resposta inválida da function — bloqueando (fail-closed).`);
      return { allowed: false, userMessage: VALIDATION_UNAVAILABLE_MESSAGE };
    }

    return { allowed: data.allowed, userMessage: data.userMessage };
  } catch (err: unknown) {
    devError(`${LOG} Erro ao chamar Cloud Function de moderação:`, err);

    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : '';

    if (/not.*configured|failed-precondition/i.test(message)) {
      devWarn(`${LOG} Cloud Function não configurada — bloqueando (fail-closed).`);
    } else {
      devWarn(`${LOG} Bloqueando cadastro após erro (fail-closed).`);
    }

    return { allowed: false, userMessage: VALIDATION_UNAVAILABLE_MESSAGE };
  }
}

/** Alias para compatibilidade com código que usa o nome GPT. */
export const moderateRestaurantLeadWithGPT = moderateRestaurantLeadWithClaude;

export function isRestaurantLeadModerationConfigured(): boolean {
  return true;
}
