import type { MenuShift } from '../types/menuShift';
import type { Product } from '../types/product';
import { isTimeWithinInterval } from './openingHours';

export type MenuOrderChannel = 'dine_in' | 'delivery';

export function shiftAppliesToChannel(shift: MenuShift, channel: MenuOrderChannel): boolean {
  if (!shift.enabled) return false;
  if (shift.channels === 'both') return true;
  return shift.channels === channel;
}

export function isShiftActiveNow(shift: MenuShift, now: Date = new Date()): boolean {
  if (!shift.enabled) return false;
  const currentMin = now.getHours() * 60 + now.getMinutes();
  return isTimeWithinInterval(currentMin, shift.start, shift.end);
}

export function getActiveShifts(
  shifts: MenuShift[] | undefined,
  channel: MenuOrderChannel,
  now: Date = new Date()
): MenuShift[] {
  if (!shifts?.length) return [];
  return shifts.filter(
    (shift) => shiftAppliesToChannel(shift, channel) && isShiftActiveNow(shift, now)
  );
}

export function isProductVisibleForMenuShift(
  product: Pick<Product, 'shiftIds'>,
  shifts: MenuShift[] | undefined,
  channel: MenuOrderChannel,
  now: Date = new Date()
): boolean {
  const enabledShifts = (shifts ?? []).filter((shift) => shift.enabled);
  if (enabledShifts.length === 0) return true;

  const assigned = (product.shiftIds ?? []).filter(Boolean);
  if (assigned.length === 0) return true;

  const assignedSet = new Set(assigned);
  return enabledShifts.some(
    (shift) =>
      assignedSet.has(shift.id) &&
      shiftAppliesToChannel(shift, channel) &&
      isShiftActiveNow(shift, now)
  );
}

export function filterProductsByMenuShift<T extends Pick<Product, 'shiftIds'>>(
  products: T[],
  shifts: MenuShift[] | undefined,
  channel: MenuOrderChannel,
  now: Date = new Date()
): T[] {
  return products.filter((product) =>
    isProductVisibleForMenuShift(product, shifts, channel, now)
  );
}

export function formatShiftHours(shift: Pick<MenuShift, 'start' | 'end'>): string {
  return `${shift.start} – ${shift.end}`;
}
