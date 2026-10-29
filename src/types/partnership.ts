/** Planos de parceria Bora Comer! (mensalidade + taxa por pedido). */

export type PartnershipDeliveryMode = 'store_delivery' | 'platform_delivery';

export type PartnershipPlanId = 'start' | 'pro' | 'max';

export type PartnershipSubscriptionStatus = 'trial' | 'active' | 'expired' | 'past_due';

export interface PartnershipPlanOption {
  id: PartnershipDeliveryMode;
  title: string;
  subtitle: string;
  platformFeePercent: number;
  monthlyFee: number;
}

export const PARTNERSHIP_TRIAL_DAYS = 7;
export const PARTNERSHIP_MONTHLY_FEE = 89.9;
/** TEMP TESTE: preço mínimo do Stripe para cartão em BRL (R$ 0,50). Reverter para PARTNERSHIP_MONTHLY_FEE após o teste. */
export const PARTNERSHIP_STORE_DELIVERY_TEST_MONTHLY_FEE = 0.5;
export const PARTNERSHIP_FEE_WAIVER_THRESHOLD = 1500;

export const PARTNERSHIP_PLANS: Record<PartnershipDeliveryMode, PartnershipPlanOption> = {
  store_delivery: {
    id: 'store_delivery',
    title: 'Delivery com entrega feita pela loja',
    subtitle: 'Você recebe os pedidos na Bora Comer! e faz a entrega com sua própria equipe.',
    platformFeePercent: 12,
    monthlyFee: PARTNERSHIP_STORE_DELIVERY_TEST_MONTHLY_FEE,
  },
  platform_delivery: {
    id: 'platform_delivery',
    title: 'Delivery + entrega feita pela Bora Comer!',
    subtitle: 'Pedidos na plataforma com logística de entrega pela Bora Comer!.',
    platformFeePercent: 19.99,
    monthlyFee: PARTNERSHIP_MONTHLY_FEE,
  },
};

/** Formata taxa % para UI: 12 → "12%", 19.99 → "19,99%". */
export function formatFeePercent(percent: number): string {
  if (!Number.isFinite(percent)) return '0%';
  const rounded = Math.round(percent * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}%`;
  return `${rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

export interface PartnershipSubscription {
  status: PartnershipSubscriptionStatus;
  trialStartedAt: Date;
  trialEndsAt: Date;
  /** Plano comercial. Trial sempre é Start. */
  planId?: PartnershipPlanId;
  deliveryMode?: PartnershipDeliveryMode;
  platformFeePercent?: number;
  monthlyFee: number;
  monthlyFeeWaiverThreshold: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  updatedAt?: Date;
}

export function createTrialPartnershipSubscription(
  from: Date = new Date()
): PartnershipSubscription {
  const trialStartedAt = from;
  const trialEndsAt = new Date(from.getTime() + PARTNERSHIP_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return {
    status: 'trial',
    planId: 'start',
    trialStartedAt,
    trialEndsAt,
    deliveryMode: 'store_delivery',
    monthlyFee: PARTNERSHIP_MONTHLY_FEE,
    monthlyFeeWaiverThreshold: PARTNERSHIP_FEE_WAIVER_THRESHOLD,
    updatedAt: from,
  };
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export function normalizePartnershipSubscription(
  raw: unknown
): PartnershipSubscription | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;

  const trialStartedAt = toDate(data.trialStartedAt) ?? new Date();
  const trialEndsAt =
    toDate(data.trialEndsAt) ??
    new Date(trialStartedAt.getTime() + PARTNERSHIP_TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const statusRaw = data.status;
  const status: PartnershipSubscriptionStatus =
    statusRaw === 'active' ||
    statusRaw === 'expired' ||
    statusRaw === 'past_due' ||
    statusRaw === 'trial'
      ? statusRaw
      : 'trial';

  const deliveryMode =
    data.deliveryMode === 'store_delivery' || data.deliveryMode === 'platform_delivery'
      ? data.deliveryMode
      : undefined;

  const planIdRaw = data.planId;
  const planId: PartnershipPlanId | undefined =
    planIdRaw === 'start' || planIdRaw === 'pro' || planIdRaw === 'max'
      ? planIdRaw
      : status === 'trial'
        ? 'start'
        : undefined;

  const platformFeePercent = Number(data.platformFeePercent);
  const monthlyFee = Number(data.monthlyFee);
  const waiver = Number(data.monthlyFeeWaiverThreshold);

  return {
    status,
    planId,
    trialStartedAt,
    trialEndsAt,
    deliveryMode,
    platformFeePercent: Number.isFinite(platformFeePercent) ? platformFeePercent : undefined,
    monthlyFee: Number.isFinite(monthlyFee) ? monthlyFee : PARTNERSHIP_MONTHLY_FEE,
    monthlyFeeWaiverThreshold: Number.isFinite(waiver)
      ? waiver
      : PARTNERSHIP_FEE_WAIVER_THRESHOLD,
    stripeCustomerId:
      typeof data.stripeCustomerId === 'string' ? data.stripeCustomerId : undefined,
    stripeSubscriptionId:
      typeof data.stripeSubscriptionId === 'string' ? data.stripeSubscriptionId : undefined,
    currentPeriodEnd: toDate(data.currentPeriodEnd),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Serializa para Firestore (Timestamps via Date — o SDK aceita Date). */
export function partnershipSubscriptionToFirestore(
  sub: PartnershipSubscription
): Record<string, unknown> {
  return {
    status: sub.status,
    planId: sub.planId ?? (sub.status === 'trial' ? 'start' : null),
    trialStartedAt: sub.trialStartedAt,
    trialEndsAt: sub.trialEndsAt,
    deliveryMode: sub.deliveryMode ?? null,
    platformFeePercent: sub.platformFeePercent ?? null,
    monthlyFee: sub.monthlyFee,
    monthlyFeeWaiverThreshold: sub.monthlyFeeWaiverThreshold,
    stripeCustomerId: sub.stripeCustomerId ?? null,
    stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
    currentPeriodEnd: sub.currentPeriodEnd ?? null,
    updatedAt: sub.updatedAt ?? new Date(),
  };
}
