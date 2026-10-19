import type { Weekday } from './restaurant';
import { WEEKDAY_ORDER } from './restaurant';

export interface CashbackProductOverride {
  productId: string;
  /** null = produto sem cashback */
  percent: number | null;
}

export interface CashbackDayRule {
  id: string;
  days: Weekday[];
  percent: number;
}

export interface CashbackComboRule {
  id: string;
  name: string;
  productIds: string[];
  /** R$ fixo a mais quando o combo completa */
  bonusFixed?: number;
  /** % extra sobre o subtotal dos itens do combo */
  bonusPercent?: number;
}

export interface RestaurantCashbackSettings {
  enabled: boolean;
  /** % padrão sobre o subtotal dos itens (sem frete) */
  defaultPercent: number;
  maxEarnPerOrder?: number;
  /** teto de uso do saldo: % do total do pedido */
  maxSpendPercentOfTotal?: number;
  productOverrides: CashbackProductOverride[];
  dayOfWeekRules: CashbackDayRule[];
  comboRules: CashbackComboRule[];
}

export const DEFAULT_CASHBACK_SETTINGS: RestaurantCashbackSettings = {
  enabled: false,
  defaultPercent: 5,
  maxEarnPerOrder: undefined,
  maxSpendPercentOfTotal: 50,
  productOverrides: [],
  dayOfWeekRules: [],
  comboRules: [],
};

function clampPercent(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

function asWeekdays(raw: unknown): Weekday[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set(WEEKDAY_ORDER);
  return raw.filter((d): d is Weekday => typeof d === 'string' && set.has(d as Weekday));
}

export function normalizeCashbackSettings(raw: unknown): RestaurantCashbackSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CASHBACK_SETTINGS, productOverrides: [], dayOfWeekRules: [], comboRules: [] };
  }
  const data = raw as Record<string, unknown>;
  const productOverrides: CashbackProductOverride[] = [];
  if (Array.isArray(data.productOverrides)) {
    for (const item of data.productOverrides) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      if (typeof row.productId !== 'string' || !row.productId) continue;
      const percent =
        row.percent === null || row.percent === undefined
          ? null
          : clampPercent(row.percent, 0);
      productOverrides.push({ productId: row.productId, percent });
    }
  }

  const dayOfWeekRules: CashbackDayRule[] = [];
  if (Array.isArray(data.dayOfWeekRules)) {
    for (const item of data.dayOfWeekRules) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const days = asWeekdays(row.days);
      if (!days.length) continue;
      dayOfWeekRules.push({
        id: typeof row.id === 'string' && row.id ? row.id : `day_${dayOfWeekRules.length + 1}`,
        days,
        percent: clampPercent(row.percent, 0),
      });
    }
  }

  const comboRules: CashbackComboRule[] = [];
  if (Array.isArray(data.comboRules)) {
    for (const item of data.comboRules) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const productIds = Array.isArray(row.productIds)
        ? row.productIds.filter((id): id is string => typeof id === 'string' && Boolean(id))
        : [];
      if (productIds.length < 2) continue;
      const bonusFixed =
        typeof row.bonusFixed === 'number' && Number.isFinite(row.bonusFixed)
          ? Math.max(0, row.bonusFixed)
          : undefined;
      const bonusPercent =
        row.bonusPercent === undefined || row.bonusPercent === null
          ? undefined
          : clampPercent(row.bonusPercent, 0);
      comboRules.push({
        id: typeof row.id === 'string' && row.id ? row.id : `combo_${comboRules.length + 1}`,
        name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Combo',
        productIds,
        bonusFixed,
        bonusPercent,
      });
    }
  }

  const maxEarn =
    typeof data.maxEarnPerOrder === 'number' && Number.isFinite(data.maxEarnPerOrder)
      ? Math.max(0, data.maxEarnPerOrder)
      : undefined;
  const maxSpend =
    data.maxSpendPercentOfTotal === undefined || data.maxSpendPercentOfTotal === null
      ? 50
      : clampPercent(data.maxSpendPercentOfTotal, 50);

  return {
    enabled: data.enabled === true,
    defaultPercent: clampPercent(data.defaultPercent, 5),
    maxEarnPerOrder: maxEarn,
    maxSpendPercentOfTotal: maxSpend,
    productOverrides,
    dayOfWeekRules,
    comboRules,
  };
}

export function weekdayFromDate(date: Date = new Date()): Weekday {
  const map: Weekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return map[date.getDay()] ?? 'monday';
}

export interface CashbackLineItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface CashbackEarnPreview {
  earnReais: number;
  earnCents: number;
  percentApplied: number;
  breakdown: Array<{ productId: string; percent: number; earnCents: number }>;
  comboBonusCents: number;
}

export function previewCashbackEarn(
  settings: RestaurantCashbackSettings,
  items: CashbackLineItem[],
  weekday: Weekday = weekdayFromDate()
): CashbackEarnPreview {
  if (!settings.enabled || !items.length) {
    return { earnReais: 0, earnCents: 0, percentApplied: 0, breakdown: [], comboBonusCents: 0 };
  }

  const dayRule = settings.dayOfWeekRules.find((rule) => rule.days.includes(weekday));
  const basePercent = dayRule?.percent ?? settings.defaultPercent;
  const overrideMap = new Map(settings.productOverrides.map((o) => [o.productId, o.percent]));

  let earnCents = 0;
  const breakdown: CashbackEarnPreview['breakdown'] = [];

  for (const item of items) {
    const qty = Math.max(0, item.quantity);
    const line = Math.round(item.price * qty * 100);
    if (line <= 0) continue;
    const override = overrideMap.get(item.productId);
    if (override === null) {
      breakdown.push({ productId: item.productId, percent: 0, earnCents: 0 });
      continue;
    }
    const percent = typeof override === 'number' ? override : basePercent;
    const lineEarn = Math.round((line * percent) / 100);
    earnCents += lineEarn;
    breakdown.push({ productId: item.productId, percent, earnCents: lineEarn });
  }

  let comboBonusCents = 0;
  const qtyByProduct = new Map<string, number>();
  for (const item of items) {
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
  }
  for (const combo of settings.comboRules) {
    const ok = combo.productIds.every((id) => (qtyByProduct.get(id) ?? 0) > 0);
    if (!ok) continue;
    if (combo.bonusFixed && combo.bonusFixed > 0) {
      comboBonusCents += Math.round(combo.bonusFixed * 100);
    }
    if (combo.bonusPercent && combo.bonusPercent > 0) {
      let comboSubtotalCents = 0;
      for (const id of combo.productIds) {
        const item = items.find((i) => i.productId === id);
        if (!item) continue;
        comboSubtotalCents += Math.round(item.price * item.quantity * 100);
      }
      comboBonusCents += Math.round((comboSubtotalCents * combo.bonusPercent) / 100);
    }
  }
  earnCents += comboBonusCents;

  if (settings.maxEarnPerOrder != null) {
    earnCents = Math.min(earnCents, Math.round(settings.maxEarnPerOrder * 100));
  }

  return {
    earnCents,
    earnReais: earnCents / 100,
    percentApplied: basePercent,
    breakdown,
    comboBonusCents,
  };
}

export function maxSpendableCents(
  settings: RestaurantCashbackSettings,
  balanceCents: number,
  orderTotalCents: number
): number {
  if (!settings.enabled || balanceCents <= 0 || orderTotalCents <= 0) return 0;
  const maxPct = settings.maxSpendPercentOfTotal ?? 50;
  const cap = Math.round((orderTotalCents * maxPct) / 100);
  return Math.max(0, Math.min(balanceCents, cap, orderTotalCents));
}
