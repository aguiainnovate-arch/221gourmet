import type { PartnershipSubscription } from './partnership';

/** Taxa de entrega configurada pelo restaurante. */
export type DeliveryFeeMode = 'flat' | 'distance' | 'neighborhood';

/** Teto realista de área de entrega. Evita raios de dezenas/centenas de km. */
export const MAX_DELIVERY_RADIUS_KM = 20;
export const MIN_DELIVERY_RADIUS_KM = 1;
export const MAX_NEIGHBORHOOD_ZONES = 40;

export interface NeighborhoodDeliveryZone {
  id: string;
  name: string;
  fee: number;
  lat?: number;
  lng?: number;
  distanceKm?: number;
}

export interface DeliveryFeeSettings {
  mode: DeliveryFeeMode;
  /** Taxa única (flat) ou taxa base (distance). */
  flatFee: number;
  /** Valor cobrado por km no modo distance. */
  perKmFee: number;
  /** Raio máximo em km, limitado a MAX_DELIVERY_RADIUS_KM. */
  maxRadiusKm: number;
  neighborhoodZones?: NeighborhoodDeliveryZone[];
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
  neighborhoodZones: [],
};

export function clampDeliveryRadiusKm(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return DEFAULT_DELIVERY_FEE.maxRadiusKm;
  return Math.min(MAX_DELIVERY_RADIUS_KM, Math.max(MIN_DELIVERY_RADIUS_KM, km));
}

function parseFeeMode(value: unknown): DeliveryFeeMode {
  if (value === 'distance' || value === 'neighborhood') return value;
  return 'flat';
}

function normalizeNeighborhoodZones(raw: unknown): NeighborhoodDeliveryZone[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const zones: NeighborhoodDeliveryZone[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === 'string' ? rec.name.trim() : '';
    const fee = Number(rec.fee);
    if (!name || !Number.isFinite(fee) || fee < 0) continue;
    const key = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const lat = Number(rec.lat);
    const lng = Number(rec.lng);
    const distanceKm = Number(rec.distanceKm);
    zones.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `zone-${zones.length + 1}`,
      name,
      fee,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : undefined,
    });
    if (zones.length >= MAX_NEIGHBORHOOD_ZONES) break;
  }

  return zones;
}

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
      mode: parseFeeMode(feeRaw.mode),
      flatFee: Number.isFinite(flatFee) && flatFee >= 0 ? flatFee : DEFAULT_DELIVERY_FEE.flatFee,
      perKmFee: Number.isFinite(perKmFee) && perKmFee >= 0 ? perKmFee : DEFAULT_DELIVERY_FEE.perKmFee,
      maxRadiusKm: clampDeliveryRadiusKm(maxRadiusKm),
      neighborhoodZones: normalizeNeighborhoodZones(feeRaw.neighborhoodZones),
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

export interface OpeningHoursInterval {
  /** HH:mm */
  open: string;
  /** HH:mm */
  close: string;
}

export interface DayOpeningHours {
  closed: boolean;
  /** HH:mm — primeiro intervalo (compatibilidade com dados antigos). */
  open: string;
  /** HH:mm — primeiro intervalo (compatibilidade com dados antigos). */
  close: string;
  /** Períodos do dia (ex.: 09:00–14:00 e 17:00–23:00). */
  intervals: OpeningHoursInterval[];
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

export const MAX_OPENING_INTERVALS = 2;

export const DEFAULT_INTERVAL: OpeningHoursInterval = {
  open: '11:00',
  close: '22:00',
};

export const DEFAULT_SECOND_INTERVAL: OpeningHoursInterval = {
  open: '17:00',
  close: '23:00',
};

export const DEFAULT_DAY_HOURS: DayOpeningHours = {
  closed: false,
  open: DEFAULT_INTERVAL.open,
  close: DEFAULT_INTERVAL.close,
  intervals: [{ ...DEFAULT_INTERVAL }],
};

export function cloneDayHours(day: DayOpeningHours): DayOpeningHours {
  const intervals =
    Array.isArray(day.intervals) && day.intervals.length > 0
      ? day.intervals.map((interval) => ({ open: interval.open, close: interval.close }))
      : [{ open: day.open, close: day.close }];
  return {
    closed: day.closed,
    intervals,
    open: intervals[0].open,
    close: intervals[0].close,
  };
}

export function createDefaultOpeningHours(): RestaurantOpeningHours {
  return {
    monday: cloneDayHours(DEFAULT_DAY_HOURS),
    tuesday: cloneDayHours(DEFAULT_DAY_HOURS),
    wednesday: cloneDayHours(DEFAULT_DAY_HOURS),
    thursday: cloneDayHours(DEFAULT_DAY_HOURS),
    friday: cloneDayHours(DEFAULT_DAY_HOURS),
    saturday: cloneDayHours(DEFAULT_DAY_HOURS),
    sunday: cloneDayHours(DEFAULT_DAY_HOURS),
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

function normalizeIntervals(dayData: Record<string, unknown>): OpeningHoursInterval[] {
  if (Array.isArray(dayData.intervals) && dayData.intervals.length > 0) {
    const parsed = dayData.intervals
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        open: normalizeTimeString(item.open, DEFAULT_INTERVAL.open),
        close: normalizeTimeString(item.close, DEFAULT_INTERVAL.close),
      }))
      .slice(0, MAX_OPENING_INTERVALS);
    if (parsed.length > 0) return parsed;
  }

  return [
    {
      open: normalizeTimeString(dayData.open, DEFAULT_INTERVAL.open),
      close: normalizeTimeString(dayData.close, DEFAULT_INTERVAL.close),
    },
  ];
}

export function normalizeOpeningHours(raw: unknown): RestaurantOpeningHours {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const result = createDefaultOpeningHours();

  for (const day of WEEKDAY_ORDER) {
    const entry = data[day];
    if (!entry || typeof entry !== 'object') continue;
    const dayData = entry as Record<string, unknown>;
    const intervals = normalizeIntervals(dayData);
    result[day] = {
      closed: dayData.closed === true,
      intervals,
      open: intervals[0].open,
      close: intervals[0].close,
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
