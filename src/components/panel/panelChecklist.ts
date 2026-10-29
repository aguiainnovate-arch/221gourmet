export interface PanelChecklistStep {
  id: string;
  label: string;
  done: boolean;
  tab: string;
}

export interface PanelNavItem {
  id: string;
  label: string;
  badge?: number;
  /** Mostra cadeado cinza na sidebar. */
  locked?: boolean;
}

/** Planos comerciais da parceria marketplace. */
export type PartnershipPlanId = 'start' | 'pro' | 'max';

/**
 * Trial = Start por 7 dias.
 * Start libera operação básica do marketplace (pedidos, delivery, cardápio, visual, horários, QR básico).
 * Pro/Max liberam o que está nesta lista.
 */
export const START_LOCKED_TAB_IDS = [
  'cashback',
  'whatsapp',
  'relatorios',
  'garcons',
] as const;

/** Assinatura expirada: bloqueia o que gera operação / venda. */
export const EXPIRED_LOCKED_TAB_IDS = [
  'cozinha',
  'delivery',
  'cashback',
  'whatsapp',
  'mesas',
] as const;

export type PanelAccessReason = 'legacy' | 'active' | 'trial' | 'expired' | 'past_due';

export type PanelAccessForLocks = {
  access: boolean;
  reason: PanelAccessReason;
  /** Plano efetivo. Trial sempre conta como Start. */
  planId?: PartnershipPlanId | null;
};

/**
 * Cadeado na sidebar do painel.
 * - legacy: nada bloqueado
 * - trial: direitos do Start (7 dias)
 * - active + start: mesmos cadeados do Start
 * - active + pro/max (ou sem planId ainda): sem cadeado de plano
 * - expired / past_due: pedidos, delivery, cashback, WhatsApp e mesas
 */
export function isPanelTabLocked(
  tabId: string,
  access: PanelAccessForLocks | null | undefined
): boolean {
  if (!access) return false;
  if (access.reason === 'legacy') return false;

  if (access.reason === 'expired' || access.reason === 'past_due') {
    return (EXPIRED_LOCKED_TAB_IDS as readonly string[]).includes(tabId);
  }

  const effectivePlan: PartnershipPlanId | null =
    access.reason === 'trial'
      ? 'start'
      : access.planId ?? null;

  if (access.reason === 'trial' || effectivePlan === 'start') {
    return (START_LOCKED_TAB_IDS as readonly string[]).includes(tabId);
  }

  // active sem planId, pro ou max: por enquanto sem cadeado de plano
  return false;
}

/** @deprecated use isPanelTabLocked */
export function isPartnershipLockedTab(tabId: string): boolean {
  return (EXPIRED_LOCKED_TAB_IDS as readonly string[]).includes(tabId);
}
