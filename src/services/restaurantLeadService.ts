import { devLog, devWarn } from '../utils/devTerminalMirror';
import { saveLeadToFirestore } from './restaurantLeadFirestoreService';

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
}

/** Cadastro recusado pela moderação automática (Claude / Anthropic). */
export class RestaurantLeadModerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RestaurantLeadModerationError';
  }
}

const LOCAL_LEADS_KEY = 'bora-comer-restaurant-leads';
const LOG = '[restaurantLead]';


function saveLeadFallback(payload: RestaurantLeadPayload): RestaurantLeadResponse {
  const id = `lead_${Date.now()}`;
  const current = localStorage.getItem(LOCAL_LEADS_KEY);
  const parsed: Array<RestaurantLeadPayload & { id: string; createdAt: string }> = current
    ? (JSON.parse(current) as Array<RestaurantLeadPayload & { id: string; createdAt: string }>)
    : [];

  parsed.push({
    id,
    createdAt: new Date().toISOString(),
    ...payload
  });

  localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(parsed));
  return { id, status: 'queued' };
}

/**
 * Envia lead para backend/API.
 * Se endpoint não estiver disponível, mantém fallback funcional em localStorage.
 * Com VITE_ANTHROPIC_API_KEY, valida o conteúdo com Claude antes de persistir.
 */
export async function submitRestaurantLead(
  payload: RestaurantLeadPayload
): Promise<RestaurantLeadResponse> {
  devLog(`${LOG} submit iniciado`, { restaurante: payload.restaurantName?.slice(0, 60) });

  const { moderateRestaurantLeadWithClaude } = await import('./restaurantLeadModerationService');
  const moderation = await moderateRestaurantLeadWithClaude(payload);

  if (!moderation.allowed) {
    devWarn(`${LOG} Cadastro bloqueado pela moderação (não será salvo nem enviado).`);
    throw new RestaurantLeadModerationError(
      moderation.userMessage ||
        'Não foi possível validar seu cadastro. Use dados reais de um restaurante e tente novamente.'
    );
  }

  devLog(`${LOG} Moderação OK — salvando no Firestore`);

  try {
    const lead = await saveLeadToFirestore(payload);
    devLog(`${LOG} Lead salvo no Firestore`, { id: lead.id });
    return { id: lead.id, status: 'created' };
  } catch (err) {
    devWarn(`${LOG} Firestore indisponível — usando localStorage`, { err });
    return saveLeadFallback(payload);
  }
}
