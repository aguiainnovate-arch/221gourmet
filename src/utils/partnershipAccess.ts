import type { Restaurant } from '../types/restaurant';
import type { PartnershipSubscription } from '../types/partnership';

export type PartnershipAccessState =
  | { access: true; reason: 'legacy' | 'active' | 'trial'; daysLeft?: number }
  | { access: false; reason: 'expired' | 'past_due'; daysLeft: 0 };

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Acesso à plataforma como parceiro.
 * - Sem `partnershipSubscription`: legado (não bloqueia).
 * - `active`: ok.
 * - `trial` com data vigente: ok.
 * - Caso contrário: bloqueado (restaurante some do delivery).
 */
export function getPartnershipAccessState(
  restaurant: Pick<Restaurant, 'partnershipSubscription'>,
  now: Date = new Date()
): PartnershipAccessState {
  const sub = restaurant.partnershipSubscription;
  if (!sub) {
    return { access: true, reason: 'legacy' };
  }

  if (sub.status === 'active') {
    return { access: true, reason: 'active' };
  }

  if (sub.status === 'trial') {
    if (sub.trialEndsAt.getTime() > now.getTime()) {
      return {
        access: true,
        reason: 'trial',
        daysLeft: daysBetween(now, sub.trialEndsAt),
      };
    }
    return { access: false, reason: 'expired', daysLeft: 0 };
  }

  if (sub.status === 'past_due') {
    return { access: false, reason: 'past_due', daysLeft: 0 };
  }

  return { access: false, reason: 'expired', daysLeft: 0 };
}

export function hasRestaurantPlatformAccess(
  restaurant: Pick<Restaurant, 'partnershipSubscription'>,
  now?: Date
): boolean {
  return getPartnershipAccessState(restaurant, now).access;
}

export function resolveEffectiveSubscriptionStatus(
  sub: PartnershipSubscription | undefined,
  now: Date = new Date()
): PartnershipSubscription['status'] | 'legacy' {
  if (!sub) return 'legacy';
  if (sub.status === 'trial' && sub.trialEndsAt.getTime() <= now.getTime()) {
    return 'expired';
  }
  return sub.status;
}
