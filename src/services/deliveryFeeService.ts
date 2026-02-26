import type { DeliveryFeeRule } from '../types/restaurant';

export const FALLBACK_FIXED_FEE = 5.0;

/**
 * Arredonda valor monetário para 2 casas decimais.
 */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula a taxa de entrega com base na distância e na regra configurada.
 * Aplica: base + (perKm * distância), depois min/máx, depois isenção por subtotal.
 * Retorna null se distância > raio máximo (entrega não permitida).
 */
export function calculateDeliveryFee(
  distanceKm: number,
  subtotal: number,
  rule: DeliveryFeeRule
): number | null {
  if (rule.maxRadiusKm <= 0) return null;
  if (distanceKm > rule.maxRadiusKm) return null;

  let fee = rule.baseFee + rule.perKmFee * distanceKm;
  fee = roundMoney(fee);

  if (rule.minFee != null && rule.minFee >= 0) {
    fee = Math.max(fee, rule.minFee);
  }
  if (rule.maxFee != null && rule.maxFee >= 0) {
    fee = Math.min(fee, rule.maxFee);
  }
  fee = roundMoney(fee);

  if (rule.freeDeliveryAboveSubtotal != null && rule.freeDeliveryAboveSubtotal > 0 && subtotal >= rule.freeDeliveryAboveSubtotal) {
    fee = 0;
  }

  return roundMoney(fee);
}

/**
 * Valida a regra de taxa. Retorna array de mensagens de erro (vazio se válida).
 */
export function validateFeeRule(rule: Partial<DeliveryFeeRule>): string[] {
  const errors: string[] = [];
  if (rule.baseFee == null || rule.baseFee < 0) {
    errors.push('Valor base deve ser maior ou igual a 0.');
  }
  if (rule.perKmFee == null || rule.perKmFee < 0) {
    errors.push('Valor por km deve ser maior ou igual a 0.');
  }
  if (rule.maxRadiusKm == null || rule.maxRadiusKm <= 0) {
    errors.push('Raio máximo deve ser maior que 0.');
  }
  if (rule.minFee != null && rule.minFee < 0) {
    errors.push('Taxa mínima deve ser maior ou igual a 0.');
  }
  if (rule.maxFee != null && rule.maxFee < 0) {
    errors.push('Taxa máxima deve ser maior ou igual a 0.');
  }
  if (rule.minFee != null && rule.maxFee != null && rule.minFee > rule.maxFee) {
    errors.push('Taxa mínima não pode ser maior que a taxa máxima.');
  }
  if (rule.freeDeliveryAboveSubtotal != null && rule.freeDeliveryAboveSubtotal <= 0) {
    errors.push('Pedido mínimo para isenção deve ser maior que 0.');
  }
  return errors;
}

/**
 * Verifica se a regra está preenchida o suficiente para usar cálculo por distância
 * (base, perKm e maxRadiusKm presentes e válidos).
 */
export function isFeeRuleUsable(rule: DeliveryFeeRule | undefined | null): rule is DeliveryFeeRule {
  if (!rule) return false;
  const err = validateFeeRule(rule);
  return err.length === 0;
}
