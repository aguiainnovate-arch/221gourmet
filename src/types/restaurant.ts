import type { PartnershipSubscription } from './partnership';

/** Taxa de entrega configurada pelo restaurante. */
export type DeliveryFeeMode = 'flat' | 'distance';

export interface DeliveryFeeSettings {
  mode: DeliveryFeeMode;
  /** Taxa única (flat) ou taxa base (distance). */
  flatFee: number;
  /** Valor cobrado por km no modo distance. */
  perKmFee: number;
  /** Raio máximo em km. 0 = sem limite. */
  maxRadiusKm: number;
}

export interface DeliveryLocation {
  lat: number;
  lng: number;
}

export interface RestaurantDeliverySettings {
  enabled: boolean;
  aiDescription: string;
  originAddress?: string;
  location?: DeliveryLocation;
  fee?: DeliveryFeeSettings;
}

/** @deprecated Use DeliveryFeeSettings. Mantido para compatibilidade. */
export interface DeliveryFeeRule {
  baseFee: number;
  perKmFee: number;
  maxRadiusKm: number;
  minFee?: number;
  maxFee?: number;
  freeDeliveryAboveSubtotal?: number;
}

export const DEFAULT_DELIVERY_FEE: DeliveryFeeSettings = {
  mode: 'flat',
  flatFee: 5,
  perKmFee: 1.5,
  maxRadiusKm: 10,
};

export function normalizeDeliverySettings(raw: unknown): RestaurantDeliverySettings {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const feeRaw = (data.fee && typeof data.fee === 'object' ? data.fee : {}) as Record<string, unknown>;
  const locRaw = (data.location && typeof data.location === 'object' ? data.location : null) as Record<string, unknown> | null;
  const lat = locRaw ? Number(locRaw.lat) : NaN;
  const lng = locRaw ? Number(locRaw.lng) : NaN;
  const flatFee = Number(feeRaw.flatFee);
  const perKmFee = Number(feeRaw.perKmFee);
  const maxRadiusKm = Number(feeRaw.maxRadiusKm);

  return {
    enabled: data.enabled !== false,
    aiDescription: typeof data.aiDescription === 'string' ? data.aiDescription : '',
    originAddress: typeof data.originAddress === 'string' ? data.originAddress : undefined,
    location: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
    fee: {
      mode: feeRaw.mode === 'distance' ? 'distance' : 'flat',
      flatFee: Number.isFinite(flatFee) && flatFee >= 0 ? flatFee : DEFAULT_DELIVERY_FEE.flatFee,
      perKmFee: Number.isFinite(perKmFee) && perKmFee >= 0 ? perKmFee : DEFAULT_DELIVERY_FEE.perKmFee,
      maxRadiusKm: Number.isFinite(maxRadiusKm) && maxRadiusKm >= 0 ? maxRadiusKm : DEFAULT_DELIVERY_FEE.maxRadiusKm,
    },
  };
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DayOpeningHours {
  closed: boolean;
  /** HH:mm */
  open: string;
  /** HH:mm */
  close: string;
}

export type RestaurantOpeningHours = Record<Weekday, DayOpeningHours>;

export const WEEKDAY_ORDER: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DEFAULT_DAY_HOURS: DayOpeningHours = {
  closed: false,
  open: '11:00',
  close: '22:00',
};

export function createDefaultOpeningHours(): RestaurantOpeningHours {
  return {
    monday: { ...DEFAULT_DAY_HOURS },
    tuesday: { ...DEFAULT_DAY_HOURS },
    wednesday: { ...DEFAULT_DAY_HOURS },
    thursday: { ...DEFAULT_DAY_HOURS },
    friday: { ...DEFAULT_DAY_HOURS },
    saturday: { ...DEFAULT_DAY_HOURS },
    sunday: { ...DEFAULT_DAY_HOURS },
  };
}

function normalizeTimeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function normalizeOpeningHours(raw: unknown): RestaurantOpeningHours {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const result = createDefaultOpeningHours();

  for (const day of WEEKDAY_ORDER) {
    const entry = data[day];
    if (!entry || typeof entry !== 'object') continue;
    const dayData = entry as Record<string, unknown>;
    result[day] = {
      closed: dayData.closed === true,
      open: normalizeTimeString(dayData.open, DEFAULT_DAY_HOURS.open),
      close: normalizeTimeString(dayData.close, DEFAULT_DAY_HOURS.close),
    };
  }

  return result;
}

export interface Restaurant {
  id: string;
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  password: string; // Senha criptografada com bcrypt
  planId?: string;  // Opcional para compatibilidade com restaurantes antigos
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  settings?: {
    maxTables: number;
    allowOnlineOrders: boolean;
    enableAnalytics: boolean;
  };
  permissions?: {
    automaticTranslation: boolean;
    imageMenuTransfer: boolean;
  };
  deliverySettings?: RestaurantDeliverySettings;
  /** Horários de funcionamento por dia da semana. */
  openingHours?: RestaurantOpeningHours;
  /** Trial / assinatura de parceria Bora Comer!. */
  partnershipSubscription?: PartnershipSubscription;
  /** Stripe Connect — Express (IDs e flags sincronizados pelo backend). */
  stripeConnectAccountId?: string;
  stripeConnectChargesEnabled?: boolean;
  stripeConnectDetailsSubmitted?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  stripeConnectDisabledReason?: string | null;
  stripeConnectRequirementsSummary?: string | null;
}

export interface CreateRestaurantData {
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  password: string; // Senha criptografada com bcrypt
  planId: string;  // Agora referencia o ID do plano ao invés de string fixa
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  permissions?: {
    automaticTranslation: boolean;
    imageMenuTransfer: boolean;
  };
  deliverySettings?: RestaurantDeliverySettings;
  openingHours?: RestaurantOpeningHours;
  partnershipSubscription?: PartnershipSubscription;
}

export interface UpdateRestaurantData {
  name?: string;
  domain?: string;
  email?: string;
  phone?: string;
  address?: string;
  password?: string; // Senha criptografada com bcrypt
  planId?: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  active?: boolean;
  permissions?: {
    automaticTranslation: boolean;
    imageMenuTransfer: boolean;
  };
  deliverySettings?: RestaurantDeliverySettings;
  openingHours?: RestaurantOpeningHours;
  partnershipSubscription?: PartnershipSubscription;
}
