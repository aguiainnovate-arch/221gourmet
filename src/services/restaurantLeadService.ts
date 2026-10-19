import { devLog, devWarn, devError } from '../utils/devTerminalMirror';
import {
  saveLeadToFirestore,
  updateLeadAfterAutoProvision,
} from './restaurantLeadFirestoreService';
import {
  provisionRestaurantFromApprovedLead,
  RestaurantLeadAutoProvisionError,
  RestaurantLeadDuplicateEmailError,
} from './restaurantLeadAutoProvision';

export { RestaurantLeadAutoProvisionError, RestaurantLeadDuplicateEmailError };

export interface RestaurantLeadPayload {
  restaurantName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  cnpj: string;
  address: string;
  cityState: string;
  cuisineType: string;
  openingHours: string;
  priceRange: string;
  socialLink: string;
  description: string;
}

export interface RestaurantLeadResponse {
  id: string;
  status: 'created' | 'queued';
  /** Lead salvo após falha técnica na IA; equipe deve revisar manualmente. */
  awaitingManualModeration?: boolean;
  /** Conta criada automaticamente após a moderação IA aprovar (Bora Comer). */
  restaurantProvisioned?: {
    restaurantId: string;
    domain: string;
    temporaryPassword: string;
  };
}

/** Cadastro recusado explicitamente pela moderação automática (IA retornou allowed: false). */
export class RestaurantLeadModerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RestaurantLeadModerationError';
  }
}

/**
 * Validação automática indisponível ou não persistida (ex.: configuração no servidor).
 * Não confundir com recusa por conteúdo (ver RestaurantLeadModerationError).
 */
export class RestaurantLeadValidationUnavailableError extends Error {
  readonly firebaseCode?: string;

  constructor(message: string, firebaseCode?: string) {
    super(message);
    this.name = 'RestaurantLeadValidationUnavailableError';
    this.firebaseCode = firebaseCode;
  }
}

const LOCAL_LEADS_KEY = 'bora-comer-restaurant-leads';
const LOG = '[restaurantLead]';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Validação mínima quando a IA está indisponível (só bloqueia lixo óbvio). */
function basicLeadSafetyCheck(payload: RestaurantLeadPayload): { ok: true } | { ok: false; message: string } {
  const name = payload.restaurantName?.trim() ?? '';
  if (name.length < 2) {
    return { ok: false, message: 'Informe o nome do restaurante.' };
  }
  if (!isEmail(payload.email ?? '')) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }
  const digits = `${payload.whatsapp ?? ''}${payload.phone ?? ''}`.replace(/\D/g, '');
  if (digits.length < 10) {
    return { ok: false, message: 'Informe um WhatsApp com DDD.' };
  }
  const blob = [name, payload.email, payload.description, payload.ownerName].join('\n');
  if (/<script|javascript:|onerror\s*=|data:text\/html/i.test(blob)) {
    return {
      ok: false,
      message: 'Não foi possível validar seu cadastro. Use dados reais de um restaurante.',
    };
  }
  return { ok: true };
}

async function saveLeadProvisionAndReturn(
  payload: RestaurantLeadPayload,
  options?: { password?: string; savedWithoutAiModeration?: boolean }
): Promise<RestaurantLeadResponse> {
  let leadId: string;
  try {
    const lead = await saveLeadToFirestore(payload, {
      savedWithoutAiModeration: options?.savedWithoutAiModeration,
    });
    leadId = lead.id;
    devLog(`${LOG} Lead salvo antes do provisionamento`, { leadId });
  } catch (leadErr) {
    devError(`${LOG} Falha ao salvar lead no Firestore antes do provisionamento`, leadErr);
    throw new RestaurantLeadAutoProvisionError(
      'Não foi possível registrar sua solicitação agora. Verifique sua conexão e tente novamente em instantes.'
    );
  }

  try {
    const provisioned = await provisionRestaurantFromApprovedLead(payload, options?.password);
    const restaurantProvisioned = {
      restaurantId: provisioned.restaurantId,
      domain: provisioned.domain,
      temporaryPassword: provisioned.temporaryPassword,
    };

    try {
      await updateLeadAfterAutoProvision(leadId, {
        restaurantId: provisioned.restaurantId,
        domain: provisioned.domain,
      });
    } catch (updateErr) {
      devWarn(`${LOG} Lead salvo, restaurante criado, mas falha ao atualizar status do lead`, {
        leadId,
        updateErr,
      });
      try {
        await updateLeadAfterAutoProvision(leadId, {
          restaurantId: provisioned.restaurantId,
          domain: provisioned.domain,
        });
      } catch {
        devWarn(
          `${LOG} Lead ${leadId} permanece pendente no admin; restaurante ${provisioned.restaurantId} já existe`
        );
      }
    }

    devLog(`${LOG} Restaurante criado e lead atualizado`, {
      restaurantId: provisioned.restaurantId,
      leadId,
    });
    return {
      id: leadId,
      status: 'created',
      restaurantProvisioned,
      ...(options?.savedWithoutAiModeration ? { awaitingManualModeration: true as const } : {}),
    };
  } catch (err) {
    if (err instanceof RestaurantLeadDuplicateEmailError) {
      throw err;
    }
    if (err instanceof RestaurantLeadAutoProvisionError) {
      throw err;
    }
    if (err instanceof Error && err.message) {
      throw new RestaurantLeadAutoProvisionError(err.message);
    }
    devError(`${LOG} Falha inesperada ao provisionar`, err);
    throw new RestaurantLeadAutoProvisionError(
      'Seu cadastro foi validado, mas não conseguimos concluir a criação da conta agora. Tente novamente em instantes.'
    );
  }
}

function saveLeadFallback(
  payload: RestaurantLeadPayload,
  options?: {
    moderationSkipped?: boolean;
    restaurantProvisioned?: RestaurantLeadResponse['restaurantProvisioned'];
  }
): RestaurantLeadResponse {
  const id = `lead_${Date.now()}`;
  const current = localStorage.getItem(LOCAL_LEADS_KEY);
  const parsed: Array<
    RestaurantLeadPayload & {
      id: string;
      createdAt: string;
      savedWithoutAiModeration?: boolean;
      createdRestaurantId?: string;
      provisionDomain?: string;
      leadStatus?: 'pending' | 'approved';
    }
  > = current
    ? (JSON.parse(current) as Array<
        RestaurantLeadPayload & {
          id: string;
          createdAt: string;
          savedWithoutAiModeration?: boolean;
          createdRestaurantId?: string;
          provisionDomain?: string;
          leadStatus?: 'pending' | 'approved';
        }
      >)
    : [];

  const prov = options?.restaurantProvisioned;
  parsed.push({
    id,
    createdAt: new Date().toISOString(),
    ...(options?.moderationSkipped ? { savedWithoutAiModeration: true as const } : {}),
    ...(prov
      ? {
          leadStatus: 'approved' as const,
          createdRestaurantId: prov.restaurantId,
          provisionDomain: prov.domain,
        }
      : {}),
    ...payload
  });

  localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(parsed));
  return {
    id,
    status: 'queued',
    ...(options?.moderationSkipped ? { awaitingManualModeration: true as const } : {}),
    ...(prov ? { restaurantProvisioned: prov } : {}),
  };
}

/**
 * Envia lead para backend/API.
 * Se endpoint não estiver disponível, mantém fallback funcional em localStorage.
 * A moderação automática roda na Cloud Function `moderateLead` (OpenAI no servidor).
 */
export async function submitRestaurantLead(
  payload: RestaurantLeadPayload,
  options?: { password?: string }
): Promise<RestaurantLeadResponse> {
  devLog(`${LOG} submit iniciado`, { restaurante: payload.restaurantName?.slice(0, 60) });

  const { moderateRestaurantLeadWithClaude } = await import('./restaurantLeadModerationService');
  const moderation = await moderateRestaurantLeadWithClaude(payload);

  if (moderation.outcome === 'rejected') {
    devWarn(`${LOG} Cadastro recusado pela moderação automática (IA: reprovado).`);
    throw new RestaurantLeadModerationError(
      moderation.userMessage ||
        'Não foi possível validar seu cadastro. Use dados reais de um restaurante e tente novamente.'
    );
  }

  if (moderation.outcome === 'technical') {
    const code = moderation.firebaseCode;
    if (code === 'functions/invalid-argument') {
      devWarn(`${LOG} Payload rejeitado pela function (invalid-argument).`);
      throw new RestaurantLeadValidationUnavailableError(
        moderation.userMessage ||
          'Não foi possível enviar os dados para validação. Confira o formulário e tente novamente.',
        code
      );
    }

    const basic = basicLeadSafetyCheck(payload);
    if (!basic.ok) {
      throw new RestaurantLeadModerationError(basic.message);
    }

    devWarn(
      `${LOG} Falha técnica na moderação IA — provisionamento automático com validação básica. Código: ${code ?? '(nenhum)'}`
    );

    try {
      return await saveLeadProvisionAndReturn(payload, {
        password: options?.password,
        savedWithoutAiModeration: true,
      });
    } catch (err) {
      if (
        err instanceof RestaurantLeadDuplicateEmailError ||
        err instanceof RestaurantLeadAutoProvisionError ||
        err instanceof RestaurantLeadModerationError
      ) {
        throw err;
      }
      devWarn(`${LOG} Firestore indisponível — usando localStorage (falha técnica moderação)`, { err });
      return saveLeadFallback(payload, { moderationSkipped: true });
    }
  }

  devLog(`${LOG} Moderação IA aprovou — salvando solicitação e provisionando restaurante`);
  return saveLeadProvisionAndReturn(payload, { password: options?.password });
}
