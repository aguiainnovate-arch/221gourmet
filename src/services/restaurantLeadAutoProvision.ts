import bcrypt from 'bcryptjs';
import { addRestaurant, checkDomainExists, checkRestaurantEmailTaken } from './restaurantService';
import { getActivePlans } from './planService';

export class RestaurantLeadDuplicateEmailError extends Error {
  constructor() {
    super(
      'Já existe um restaurante cadastrado com este e-mail. Acesse /restaurant/auth para entrar no painel ou use outro e-mail.'
    );
    this.name = 'RestaurantLeadDuplicateEmailError';
  }
}

export class RestaurantLeadAutoProvisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RestaurantLeadAutoProvisionError';
  }
}

function slugifyDomainBase(restaurantName: string): string {
  const base = restaurantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 25);
  if (base.length >= 3) return base;
  const padded = (base + 'menu').replace(/-+/g, '-').slice(0, 25);
  return padded.length >= 3 ? padded : 'restaurante';
}

function pickPhone(payload: { phone: string; whatsapp: string }): string {
  const p = payload.phone?.replace(/\D/g, '') ?? '';
  const w = payload.whatsapp?.replace(/\D/g, '') ?? '';
  if (p.length >= 10) return payload.phone.trim();
  if (w.length >= 10) return payload.whatsapp.trim();
  return (payload.phone || payload.whatsapp || '').trim();
}

function buildAddress(address: string, cityState: string): string {
  return [address.trim(), cityState.trim()].filter(Boolean).join(' — ');
}

function generateTemporaryPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => chars[x % chars.length]).join('');
}

/**
 * Cria restaurante no Firestore após moderação automática aprovar o lead (Bora Comer).
 * Domínio derivado do nome; plano = primeiro plano ativo (menor preço); senha provisória aleatória (hash bcrypt).
 */
export async function provisionRestaurantFromApprovedLead(payload: {
  restaurantName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  cityState: string;
}): Promise<{ restaurantId: string; domain: string; temporaryPassword: string }> {
  if (await checkRestaurantEmailTaken(payload.email)) {
    throw new RestaurantLeadDuplicateEmailError();
  }

  const plans = await getActivePlans();
  if (!plans.length) {
    throw new RestaurantLeadAutoProvisionError(
      'Não há plano ativo no sistema. Entre em contato com o suporte para concluir seu cadastro.'
    );
  }

  const phone = pickPhone(payload);
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    throw new RestaurantLeadAutoProvisionError(
      'Informe um telefone ou WhatsApp válido (com DDD) para criar o estabelecimento.'
    );
  }

  const base = slugifyDomainBase(payload.restaurantName);
  let domain = base;
  let attempts = 0;
  while (await checkDomainExists(domain)) {
    attempts += 1;
    const suffix = attempts <= 30 ? `-${attempts}` : `-${Math.random().toString(36).slice(2, 7)}`;
    domain = `${base.slice(0, Math.max(1, 25 - suffix.length))}${suffix}`;
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  let restaurant;
  try {
    restaurant = await addRestaurant({
      name: payload.restaurantName.trim(),
      domain,
      email: payload.email.trim().toLowerCase(),
      phone,
      address: buildAddress(payload.address, payload.cityState),
      password: hashedPassword,
      planId: plans[0].id,
      theme: {
        primaryColor: '#0F172A',
        secondaryColor: '#F97316',
      },
    });
  } catch {
    throw new RestaurantLeadAutoProvisionError(
      'Não foi possível gravar o restaurante agora. Verifique sua conexão e tente novamente em instantes.'
    );
  }

  return {
    restaurantId: restaurant.id,
    domain,
    temporaryPassword,
  };
}