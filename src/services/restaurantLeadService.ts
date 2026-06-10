import { devLog, devWarn, devError } from '../utils/devTerminalMirror';
import { saveLeadToFirestore } from './restaurantLeadFirestoreService';
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
  payload: RestaurantLeadPayload
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
    const persistWithoutAi =
      code === undefined ||
      code === 'functions/internal' ||
      code === 'functions/unavailable' ||
      code === 'functions/resource-exhausted' ||
      code === 'functions/deadline-exceeded' ||
      code === 'functions/invalid-response';

    if (!persistWithoutAi) {
      devWarn(
        `${LOG} Validação automática indisponível (sem persistência automática). Código: ${code ?? '(nenhum)'}`
      );
      throw new RestaurantLeadValidationUnavailableError(moderation.userMessage, code);
    }

    devWarn(
      `${LOG} Falha técnica na moderação — persistindo lead como pendente para revisão humana (não é reprovação). Código: ${code ?? '(nenhum)'}`
    );

    try {
      const lead = await saveLeadToFirestore(payload, { savedWithoutAiModeration: true });
      devLog(`${LOG} Lead salvo no Firestore (revisão manual após falha da IA)`, { id: lead.id });
      return { id: lead.id, status: 'created', awaitingManualModeration: true };
    } catch (err) {
      devWarn(`${LOG} Firestore indisponível — usando localStorage (falha técnica moderação)`, { err });
      return saveLeadFallback(payload, { moderationSkipped: true });
    }
  }

  devLog(`${LOG} Moderação OK — provisionando restaurante e salvando lead`);

  try {
    const provisioned = await provisionRestaurantFromApprovedLead(payload);
    const restaurantProvisioned = {
      restaurantId: provisioned.restaurantId,
      domain: provisioned.domain,
      temporaryPassword: provisioned.temporaryPassword,
    };

    try {
      const lead = await saveLeadToFirestore(payload, {
        aiProvisionedRestaurant: {
          restaurantId: provisioned.restaurantId,
          domain: provisioned.domain,
        },
      });
      devLog(`${LOG} Restaurante criado e lead salvo`, {
        restaurantId: provisioned.restaurantId,
        leadId: lead.id,
      });
      return {
        id: lead.id,
        status: 'created',
        restaurantProvisioned,
      };
    } catch (leadErr) {
      devWarn(`${LOG} Lead não persistido no Firestore após criação do restaurante`, { leadErr });
      return saveLeadFallback(payload, { restaurantProvisioned });
    }
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
    devError(`${LOG} Falha inesperada ao provisionar após moderação OK`, err);
    throw new RestaurantLeadAutoProvisionError(
      'Seu cadastro foi validado, mas não conseguimos concluir a criação da conta agora. Tente novamente em instantes.'
    );
  }
}
