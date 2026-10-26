/**
 * Calculadora comercial Bora Comer!: lucro mensal + dias até a mensalidade se pagar.
 * Usa as mesmas regras dos planos (taxa %, mensalidade, isenção até o limiar).
 */

import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
  PARTNERSHIP_PLANS,
  type PartnershipDeliveryMode,
} from '../types/partnership';

export const CALCULATOR_DAYS_IN_MONTH = 30;

export interface ProfitCalculatorInput {
  ordersPerDay: number;
  ticketAverage: number;
  /** CMV: custo do prato como % do ticket (0–100). */
  foodCostPercent: number;
  deliveryMode: PartnershipDeliveryMode;
}

export interface ProfitCalculatorResult {
  deliveryMode: PartnershipDeliveryMode;
  feePercent: number;
  monthlyFeeList: number;
  waiverThreshold: number;
  daysInMonth: number;
  grossRevenue: number;
  platformFee: number;
  foodCost: number;
  monthlyFeeCharged: number;
  monthlyFeeWaived: boolean;
  netProfit: number;
  dailyContribution: number;
  /** Dias de operação até a mensalidade se pagar com a margem líquida diária. */
  breakEvenDays: number | null;
  alreadyProfitable: boolean;
  ordersPerMonth: number;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function computeProfit(input: ProfitCalculatorInput): ProfitCalculatorResult {
  const ordersPerDay = clamp(input.ordersPerDay, 0, 10_000);
  const ticketAverage = clamp(input.ticketAverage, 0, 10_000);
  const foodCostPercent = clamp(input.foodCostPercent, 0, 95);
  const plan = PARTNERSHIP_PLANS[input.deliveryMode];
  const feePercent = plan.platformFeePercent;
  const monthlyFeeList = PARTNERSHIP_MONTHLY_FEE;
  const waiverThreshold = PARTNERSHIP_FEE_WAIVER_THRESHOLD;
  const daysInMonth = CALCULATOR_DAYS_IN_MONTH;

  const ordersPerMonth = ordersPerDay * daysInMonth;
  const grossRevenue = ordersPerMonth * ticketAverage;
  const platformFee = grossRevenue * (feePercent / 100);
  const foodCost = grossRevenue * (foodCostPercent / 100);
  const monthlyFeeWaived = grossRevenue > 0 && grossRevenue < waiverThreshold;
  const monthlyFeeCharged = monthlyFeeWaived || grossRevenue <= 0 ? 0 : monthlyFeeList;
  const netProfit = grossRevenue - platformFee - foodCost - monthlyFeeCharged;

  const dailyGross = ordersPerDay * ticketAverage;
  const dailyContribution =
    dailyGross * (1 - feePercent / 100 - foodCostPercent / 100);

  let breakEvenDays: number | null = null;
  if (monthlyFeeCharged <= 0) {
    breakEvenDays = 0;
  } else if (dailyContribution > 0) {
    breakEvenDays = monthlyFeeList / dailyContribution;
  } else {
    breakEvenDays = null;
  }

  return {
    deliveryMode: input.deliveryMode,
    feePercent,
    monthlyFeeList,
    waiverThreshold,
    daysInMonth,
    grossRevenue,
    platformFee,
    foodCost,
    monthlyFeeCharged,
    monthlyFeeWaived,
    netProfit,
    dailyContribution,
    breakEvenDays,
    alreadyProfitable: netProfit > 0,
    ordersPerMonth,
  };
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDays(value: number | null): string {
  if (value === null) return 'Indefinido';
  if (value === 0) return '0 dias';
  if (value < 1) return 'menos de 1 dia';
  if (value < 2) return '1 dia';
  const rounded = Math.ceil(value * 10) / 10;
  return `${rounded.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
}
